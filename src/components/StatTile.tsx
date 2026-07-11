/**
 * A labelled value in a stats summary grid: a large value with a small caption
 * beneath, optionally tinted to stand out (e.g. a headline figure). Shared by
 * the end-of-game panel, the live panel, and the global stats page.
 */
export function StatTile({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-0.5 rounded-xl border p-3 ${
        accent
          ? "border-indigo-500/30 bg-indigo-500/5"
          : "border-black/10 dark:border-white/10"
      }`}
    >
      <span
        className={`text-lg font-semibold tabular-nums ${
          accent ? "text-indigo-600 dark:text-indigo-400" : ""
        }`}
      >
        {value}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
    </div>
  );
}
