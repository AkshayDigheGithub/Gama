import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] [&_svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "border-line bg-surface-2/70 text-ink-dim",
        accent: "border-accent/30 bg-accent/10 text-accent",
        cool: "border-cool/30 bg-cool/10 text-cool",
        royal: "border-royal/35 bg-royal/12 text-royal",
        hot: "border-hot/30 bg-hot/10 text-hot",
        good: "border-good/30 bg-good/10 text-good",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
