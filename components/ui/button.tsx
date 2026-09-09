"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-tight transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] select-none disabled:pointer-events-none disabled:opacity-40 active:scale-[0.97] motion-reduce:active:scale-100 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-[0_0_0_1px_rgba(201,255,59,0.35),0_10px_30px_-12px_rgba(201,255,59,0.65)] hover:bg-accent-dim hover:shadow-[0_0_0_1px_rgba(201,255,59,0.5),0_14px_36px_-12px_rgba(201,255,59,0.8)]",
        secondary:
          "bg-surface-2 text-ink border border-line hover:bg-surface hover:border-ink-faint/60",
        outline: "border border-line text-ink hover:bg-surface-2 hover:border-ink-faint/60",
        ghost: "text-ink-dim hover:text-ink hover:bg-surface-2",
        danger: "bg-hot/15 text-hot border border-hot/30 hover:bg-hot/25",
      },
      size: {
        sm: "h-9 rounded-xl px-3.5 text-sm [&_svg]:size-4",
        md: "h-11 rounded-xl px-5 text-sm [&_svg]:size-4",
        lg: "h-13 rounded-2xl px-7 text-base [&_svg]:size-5",
        xl: "h-16 rounded-2xl px-8 text-lg [&_svg]:size-5",
        icon: "size-10 rounded-xl [&_svg]:size-4.5",
      },
      block: {
        true: "w-full",
        false: "",
      },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/** Minimum 44px touch target at `md` and above — this is a mobile-first game. */
export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  type,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size, block }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
