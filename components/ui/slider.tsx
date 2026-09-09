"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

export function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none py-4 data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-surface-2 border border-line">
        <SliderPrimitive.Range className="absolute h-full bg-accent/70" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label="Your number"
        className="block size-9 rounded-full border-2 border-accent bg-canvas shadow-[0_0_0_6px_rgba(201,255,59,0.12),0_8px_24px_-8px_rgba(0,0,0,0.9)] transition-transform duration-150 hover:scale-105 active:scale-110 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/25"
      />
    </SliderPrimitive.Root>
  );
}
