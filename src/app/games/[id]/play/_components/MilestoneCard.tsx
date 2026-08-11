import type { PlayerId } from "@/lib/domain";
import type { MilestoneRow } from "@/lib/game/milestones";

/** The table, reduced to what naming a claimer needs. */
type Seats = ReadonlyArray<{ id: PlayerId; name: string }>;

/**
 * One milestone: what it is, what it takes, and who has it. Free and still
 * claimable, it shows the table as buttons — the milestone is announced out
 * loud and given in one tap, without a name picker in between. Taken, it shows
 * the holder and the way to take it back, because the wrong name gets tapped.
 */
export function MilestoneCard({
  row,
  seats,
  points,
  disabled,
  onClaim,
  onRelease,
}: Readonly<{
  row: MilestoneRow;
  seats: Seats;
  /** What holding it is worth, shown on the claimed card. */
  points: number;
  /** A write is already in flight — no second tap until it lands. */
  disabled: boolean;
  onClaim: (playerId: PlayerId) => void;
  onRelease: () => void;
}>) {
  const holder = seats.find(s => s.id === row.claimedBy);

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{row.label}</span>

        {row.claimedBy === null ? null : (
          <span className="shrink-0 text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-300">
            {`+${points}`}
          </span>
        )}
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{row.hint}</p>

      {row.claimedBy !== null ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">
            {holder?.name ?? "Joueur retiré"}
          </span>

          <button
            type="button"
            onClick={onRelease}
            disabled={disabled}
            className="shrink-0 rounded-lg border border-black/10 px-2 py-1 text-xs transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
          >
            Retirer
          </button>
        </div>
      ) : (
        <MilestoneClaimRow
          seats={seats}
          open={row.open}
          disabled={disabled}
          onClaim={onClaim}
        />
      )}
    </li>
  );
}

/**
 * The way a free milestone is handed out: one button per seat. Once the game
 * has claimed its last milestone the remaining ones can no longer be taken —
 * they stay listed (the board still shows them) but say why instead.
 */
function MilestoneClaimRow({
  seats,
  open,
  disabled,
  onClaim,
}: Readonly<{
  seats: Seats;
  open: boolean;
  disabled: boolean;
  onClaim: (playerId: PlayerId) => void;
}>) {
  if (!open) {
    return (
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        Plus aucun jalon ne peut être pris.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {seats.map(seat => (
        <button
          key={seat.id}
          type="button"
          onClick={() => onClaim(seat.id)}
          disabled={disabled}
          className="rounded-full border border-black/10 px-3 py-1 text-xs transition hover:bg-indigo-600 hover:text-white disabled:opacity-50 dark:border-white/15"
        >
          {seat.name}
        </button>
      ))}
    </div>
  );
}
