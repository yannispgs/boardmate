"use client";

/**
 * Who leads the party about to start, and the way to leave it to the wheel. The
 * draw is on offer, never asked for: the table may well know who starts.
 */
export function FirstPlayerDraw({
  name,
  onDraw,
}: Readonly<{ name: string | undefined; onDraw: () => void }>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.02]">
      <span>
        <span className="text-zinc-500 dark:text-zinc-400">
          Premier joueur ·{" "}
        </span>
        <span className="font-medium">{name}</span>
      </span>
      <button
        type="button"
        onClick={onDraw}
        className="rounded-lg border border-indigo-500/40 px-3 py-1.5 font-medium text-indigo-600 transition hover:bg-indigo-500/10 dark:text-indigo-400"
      >
        🎡 Tirer au sort
      </button>
    </div>
  );
}
