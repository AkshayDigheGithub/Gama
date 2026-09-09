import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-surface-2/70 px-4 text-base text-ink",
        "placeholder:text-ink-faint transition-colors outline-none",
        "focus:border-accent/60 focus:ring-4 focus:ring-accent/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
