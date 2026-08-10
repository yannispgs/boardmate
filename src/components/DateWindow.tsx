"use client";

/**
 * An inclusive end-date window (from / until) for narrowing which parties are
 * aggregated. Either bound is optional — leaving one empty makes the window
 * open on that side.
 */
export function DateWindow({
  from,
  until,
  onFrom,
  onUntil,
}: Readonly<{
  from: string;
  until: string;
  onFrom: (v: string) => void;
  onUntil: (v: string) => void;
}>) {
  const field =
    "rounded-lg border border-black/10 bg-transparent px-3 py-1.5 text-sm dark:border-white/15";

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Période
      </span>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-zinc-500 dark:text-zinc-400">Du</span>
          <input
            type="date"
            value={from}
            max={until || undefined}
            onChange={e => onFrom(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-zinc-500 dark:text-zinc-400">au</span>
          <input
            type="date"
            value={until}
            min={from || undefined}
            onChange={e => onUntil(e.target.value)}
            className={field}
          />
        </label>
        {from || until ? (
          <button
            type="button"
            onClick={() => {
              onFrom("");
              onUntil("");
            }}
            className="rounded-lg border border-black/10 px-2 py-1 text-xs transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            Réinitialiser
          </button>
        ) : null}
      </div>
    </div>
  );
}
