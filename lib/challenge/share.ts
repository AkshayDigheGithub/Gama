export type ShareMethod = "web-share" | "clipboard" | "failed";

export interface SharePayload {
  title: string;
  text: string;
  url: string;
}

/**
 * Web Share API where it exists (every modern mobile browser), clipboard
 * everywhere else. A cancelled share sheet is a no-op, not an error.
 */
export async function shareOrCopy(payload: SharePayload): Promise<ShareMethod> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return "web-share";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "failed";
      // Fall through to clipboard on any other share failure.
    }
  }
  return (await copyText(payload.url)) ? "clipboard" : "failed";
}

export async function copyText(value: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      /* fall through */
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const field = document.createElement("textarea");
    field.value = value;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}
