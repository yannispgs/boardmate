import { CategoryIcon } from "@/components/CategoryIcon";
import { fieldClass } from "@/components/ui";
import type { PlayerId } from "@/lib/domain";
import type { MilestoneRow } from "@/lib/game/milestones";

/** The table, reduced to what naming a claimer needs. */
type Seats = ReadonlyArray<{ id: PlayerId; name: string }>;

/** What the picker calls the empty choice — a milestone nobody has taken. */
const NOBODY = "— Personne —";

/**
 * One milestone: its drawing, its name, what it takes, and a picker naming who
 * has it.
 *
 * A picker rather than one button per player: five seats of buttons wrap onto
 * three lines and push the next milestone off the screen, where a closed picker
 * is one line whatever the table's size. It also gives « personne » and « the
 * other player » the same gesture as claiming — the wrong name gets picked, and
 * correcting it shouldn't be a different control.
 */
export function MilestoneCard({
  row,
  seats,
  points,
  disabled,
  onChange,
}: Readonly<{
  row: MilestoneRow;
  seats: Seats;
  /** What holding it is worth, shown once it has a holder. */
  points: number;
  /** A write is already in flight — no second change until it lands. */
  disabled: boolean;
  onChange: (playerId: PlayerId | null) => void;
}>) {
  const claimed = row.claimedBy !== null;

  return (
    <li className="flex flex-col gap-1.5 border-b border-black/5 pb-3 last:border-0 last:pb-0 dark:border-white/10">
      <div className="flex items-center gap-2">
        {row.icon === null ? null : (
          <span
            // Bigger than the text beside it, and coloured: the drawing is what
            // the eye lands on first when the panel is opened to check one
            // milestone out of five. Its colour comes from the catalogue, so a
            // game that replaces its milestones brings its own.
            style={row.color === null ? undefined : { color: row.color }}
            className="shrink-0 text-indigo-600 dark:text-indigo-300"
          >
            <CategoryIcon id={row.icon} title={row.label} className="h-7 w-7" />
          </span>
        )}

        <span className="font-medium">{row.label}</span>

        {claimed ? (
          <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
            {`+${points}`}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.hint}</p>

      <select
        aria-label={`Preneur — ${row.label}`}
        value={row.claimedBy ?? ""}
        // Nobody is the empty value, so the picker has a way back to it.
        onChange={e => onChange((e.target.value || null) as PlayerId | null)}
        // Closed once the game has given out its last one: the remaining
        // milestones stay listed, as the board still shows them, but greyed.
        disabled={disabled || (!claimed && !row.open)}
        className={`${fieldClass} w-full bg-transparent disabled:opacity-50`}
      >
        <option value="">{NOBODY}</option>

        {seats.map(seat => (
          <option key={seat.id} value={seat.id}>
            {seat.name}
          </option>
        ))}

        {/* A claimer who has since left the table still has to read back. */}
        {claimed && !seats.some(s => s.id === row.claimedBy) ? (
          <option value={row.claimedBy as string}>Joueur retiré</option>
        ) : null}
      </select>
    </li>
  );
}
