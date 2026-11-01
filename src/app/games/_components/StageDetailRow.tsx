import type { PlayerId } from "@/lib/domain";

/** One player's cell of the detail table: the points, and a tag by them. */
export interface StageDetailCell {
  points: number | null;
  /** « P3 » for the phase cleared in it, « S » for the token taken; or null. */
  tag: string | null;
}

/**
 * One manche of the detail table: what it gave each player, tagged with what
 * the game notes by the points — the phase laid down, the token taken.
 */
export function StageDetailRow({
  stage,
  cells,
  playerIds,
}: Readonly<{
  stage: number;
  cells: Readonly<Record<string, StageDetailCell>>;
  playerIds: readonly PlayerId[];
}>) {
  return (
    <tr className="border-black/5 border-t dark:border-white/10">
      <th
        scope="row"
        className="py-1.5 pr-2 text-left font-normal text-zinc-500 dark:text-zinc-400"
      >
        {stage}
      </th>
      {playerIds.map(id => {
        const cell = cells[id];

        return (
          <td key={id} className="px-1 py-1.5 text-right tabular-nums">
            <span className="inline-flex items-center justify-end gap-1">
              {cell?.tag ? (
                <span className="rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {cell.tag}
                </span>
              ) : null}
              {cell?.points ?? "—"}
            </span>
          </td>
        );
      })}
    </tr>
  );
}
