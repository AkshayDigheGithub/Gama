/**
 * Generates the PWA / favicon set.
 *
 * Written by hand rather than pulled from an image library: the mark is a few
 * primitives, and this keeps the dependency list (and the install) small.
 * Run with `npm run icons` after changing the mark.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CANVAS = "#05060a";
const ACCENT = "#c9ff3b";

/* ------------------------------------------------------------- png codec -- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* --------------------------------------------------------------- drawing -- */

const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));

function roundedRectCoverage(x, y, half, radius) {
  const dx = Math.abs(x) - (half - radius);
  const dy = Math.abs(y) - (half - radius);
  const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  return outside - radius <= 0;
}

/** The mark: a replay ring with an arrowhead — "go again", in one glyph. */
function glyphCoverage(x, y, scale) {
  const radius = 0.3 * scale;
  const halfThickness = 0.055 * scale;
  const distance = Math.hypot(x, y);
  const angle = Math.atan2(-y, x); // y grows downward in image space

  const gapStart = (-95 * Math.PI) / 180;
  const gapEnd = (-25 * Math.PI) / 180;
  const inGap = angle > gapStart && angle < gapEnd;

  if (!inGap && Math.abs(distance - radius) <= halfThickness) return true;

  // Arrowhead at the open end, pointing clockwise into the gap.
  const at = (deg, r) => {
    const a = (deg * Math.PI) / 180;
    return [Math.cos(a) * r, -Math.sin(a) * r];
  };
  const tip = at(-52, radius);
  const left = at(-25, radius - halfThickness * 2.6);
  const right = at(-25, radius + halfThickness * 2.6);

  const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
  const d1 = sign(x, y, tip[0], tip[1], left[0], left[1]);
  const d2 = sign(x, y, left[0], left[1], right[0], right[1]);
  const d3 = sign(x, y, right[0], right[1], tip[0], tip[1]);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function render(size, { maskable = false, transparent = false } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const [br, bg, bb] = hex(CANVAS);
  const [ar, ag, ab] = hex(ACCENT);
  const samples = 3;
  const glyphScale = maskable ? 0.95 : 1.2;
  const cornerRadius = maskable ? 0.5 : 0.22; // fraction of half-size

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bgHits = 0;
      let glyphHits = 0;

      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          // Normalised to [-1, 1] with the centre at 0.
          const x = ((px + (sx + 0.5) / samples) / size) * 2 - 1;
          const y = ((py + (sy + 0.5) / samples) / size) * 2 - 1;
          if (maskable || roundedRectCoverage(x, y, 1, cornerRadius * 2)) bgHits += 1;
          if (glyphCoverage(x, y, glyphScale)) glyphHits += 1;
        }
      }

      const total = samples * samples;
      const bgAlpha = transparent ? 0 : bgHits / total;
      const glyphAlpha = glyphHits / total;
      const alpha = Math.max(bgAlpha, glyphAlpha);
      const i = (py * size + px) * 4;

      if (alpha === 0) continue;
      // Composite the glyph over the background, then flatten to straight alpha.
      const mix = glyphAlpha / Math.max(alpha, 1e-6);
      rgba[i] = Math.round(br * (1 - mix) + ar * mix);
      rgba[i + 1] = Math.round(bg * (1 - mix) + ag * mix);
      rgba[i + 2] = Math.round(bb * (1 - mix) + ab * mix);
      rgba[i + 3] = Math.round(alpha * 255);
    }
  }

  return encodePng(size, rgba);
}

const targets = [
  ["public/icons/icon-192.png", 192, {}],
  ["public/icons/icon-512.png", 512, {}],
  ["public/icons/icon-maskable-512.png", 512, { maskable: true }],
  ["app/icon.png", 96, {}],
  ["app/apple-icon.png", 180, { maskable: true }],
];

const root = resolve(import.meta.dirname, "..");
for (const [file, size, options] of targets) {
  const path = resolve(root, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, render(size, options));
  console.log(`icon → ${file} (${size}px)`);
}
