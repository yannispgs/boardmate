/**
 * One notable moment of the game, read as a single line: what it is on the
 * left, the figure and who it belongs to on the right. `alert` tints the row
 * red — used for the overtime, the only highlight that reads as a reproach.
 */
export function HighlightRow({
  icon,
  label,
  value,
  detail,
  alert = false,
}: Readonly<{
  icon: string;
  label: string;
  value: string;
  detail: string;
  alert?: boolean;
}>) {
  const frame = alert
    ? "border-red-500/20 bg-red-500/[0.04]"
    : "border-black/10 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.02]";
  const figure = alert
    ? "font-semibold text-red-600 dark:text-red-400"
    : "font-semibold";

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${frame}`}
    >
      <span className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span aria-hidden>{icon}</span>
        {label}
      </span>
      <span className="text-sm tabular-nums">
        <span className={figure}>{value}</span>{" "}
        <span className="text-zinc-500 dark:text-zinc-400">· {detail}</span>
      </span>
    </div>
  );
}
