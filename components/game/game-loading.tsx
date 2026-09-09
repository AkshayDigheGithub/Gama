export function GameLoading({ label = "Loading game" }: { label?: string }) {
  return (
    <div className="flex min-h-[100svh] items-center justify-center" role="status" aria-label={label}>
      <div className="flex flex-col items-center gap-3">
        <span className="size-8 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="text-xs uppercase tracking-[0.2em] text-ink-faint">{label}</span>
      </div>
    </div>
  );
}
