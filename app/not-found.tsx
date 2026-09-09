import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative z-10 mx-auto flex min-h-[70svh] w-full max-w-md flex-col items-center justify-center pad-safe text-center">
      <span className="text-[clamp(4rem,20vw,7rem)] leading-none font-black tracking-tighter text-accent">
        404
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Nothing to play here</h1>
      <p className="mt-2 text-sm text-ink-dim">
        That page does not exist. The games are one tap away.
      </p>
      <Button asChild size="xl" block className="mt-8">
        <Link href="/games">Browse games</Link>
      </Button>
    </div>
  );
}
