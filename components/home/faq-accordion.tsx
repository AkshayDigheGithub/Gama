import { ChevronDown } from "lucide-react";

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * The FAQ, as disclosures.
 *
 * Deliberately built on `<details>` rather than state: it needs no JavaScript,
 * it is keyboard-operable for free, and the answers stay in the DOM while
 * closed, so the FAQ markup a crawler reads is the same one before and after a
 * click.
 */
export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="mt-5 grid gap-2 md:grid-cols-2 md:gap-x-3">
      {items.map((item) => (
        <details
          key={item.question}
          className="group h-fit rounded-2xl border border-line bg-surface/40 px-4 transition-colors hover:border-ink-faint/40 open:bg-surface/70"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-3.5 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
            {item.question}
            <ChevronDown
              aria-hidden
              className="size-4 shrink-0 text-ink-faint transition-transform duration-200 group-open:rotate-180"
            />
          </summary>
          <p className="pb-4 text-sm leading-relaxed text-ink-dim">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}
