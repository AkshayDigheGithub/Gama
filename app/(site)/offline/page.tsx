import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Offline",
  description: "You are offline.",
  robots: { index: false, follow: false },
};

/** Served by the service worker when a navigation fails offline. */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60svh] w-full max-w-md flex-col items-center justify-center pad-safe text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-2 text-ink-faint">
        <WifiOff className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">You&apos;re offline</h1>
      <p className="mt-2 text-sm text-ink-dim">
        ONE MORE needs a connection to load a game. Your scores and streak are safe in this browser.
      </p>
      <Button asChild size="lg" block className="mt-8">
        <Link href="/">Try again</Link>
      </Button>
    </div>
  );
}
