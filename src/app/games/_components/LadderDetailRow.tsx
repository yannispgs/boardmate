import type { PlayerId } from "@/lib/domain";
import type { LadderRow } from "@/lib/game/ladder";

/**
 * One manche of the detail table: what it cost each player, and « P3 » next to
 * the points of whoever laid his third phase down in it.
 */
export function LadderDetailRow({
  row,
  playerIds,
  tag,
}: Readonly<{
  row: LadderRow;
  playerIds: readonly PlayerId[];
  /** The letter a cleared rung is tagged with (« P » for « Phase »). */
  tag: string;
}>) {
  return (
    <tr className="border-black/5 border-t dark:border-white/10">
      <th
        scope="row"
        className="py-1.5 pr-2 text-left font-normal text-zinc-500 dark:text-zinc-400"
      >
        {row.stage}
      </th>
      {playerIds.map(id => {
        const cell = row.cells[id];

        return (
          <td key={id} className="px-1 py-1.5 text-right tabular-nums">
            <span className="inline-flex items-center justify-end gap-1">
              {cell?.cleared ? (
                <span className="rounded bg-emerald-500/15 px-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  {tag}
                  {cell.cleared}
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
