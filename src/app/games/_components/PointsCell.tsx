/**
 * A player's points for one manche, as a figure that opens the wheel to be
 * changed — so the line it sits on stays one line high. « — » until set.
 */
export function PointsCell({
  label,
  points,
  disabled,
  onEdit,
}: Readonly<{
  /** Whose points, and which manche — what the cell is found by. */
  label: string;
  points: number | null;
  disabled: boolean;
  onEdit: () => void;
}>) {
  const said = points === null ? "à saisir" : `${points} points`;

  return (
    <button
      type="button"
      aria-label={`${label} : ${said}`}
      disabled={disabled}
      onClick={onEdit}
      className="min-w-11 rounded-md border border-black/15 px-1.5 py-1 text-right text-sm font-semibold tabular-nums transition hover:border-indigo-500 dark:border-white/15"
    >
      {points ?? "—"}
    </button>
  );
}
