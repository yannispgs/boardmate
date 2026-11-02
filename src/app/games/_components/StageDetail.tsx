"use client";

import { useState } from "react";

import type { PlayerId, StageScore, StageSpec } from "@/lib/domain";
import { ladderRows, stagesUpTo } from "@/lib/game/ladder";

import { type StageDetailCell, StageDetailRow } from "./StageDetailRow";

/**
 * The manches as the table reads them: each player's points, tagged with what
 * the game notes by them — « P3 » for the phase cleared in it on Phase 10,
 * « S » for the safety token on Luz. Null on a game that notes nothing.
 */
function detailRows(
  stages: StageSpec | null,
  ids: readonly PlayerId[],
  scores: readonly StageScore[],
  fixed: boolean,
): Array<{ stage: number; cells: Record<string, StageDetailCell> }> | null {
  const ladder = stages?.ladder;

  if (ladder !== undefined) {
    const tag = ladder.label.charAt(0).toUpperCase();

    return ladderRows(ids, scores, ladder.steps.length, fixed).map(row => ({
      stage: row.stage,
      cells: Object.fromEntries(
        ids.map(id => {
          const cell = row.cells[id];

          return [
            id,
            {
              points: cell?.points ?? null,
              tag: cell?.cleared ? `${tag}${cell.cleared}` : null,
            },
          ];
        }),
      ),
    }));
  }

  const bet = stages?.bet;

  if (bet === undefined) {
    return null;
  }

  const tag = bet.hedgeLabel.charAt(bet.hedgeLabel.lastIndexOf(" ") + 1);

  return stagesUpTo(scores, Number.POSITIVE_INFINITY).map(stage => ({
    stage,
    cells: Object.fromEntries(
      ids.map(id => {
        const line = scores.find(s => s.stage === stage && s.playerId === id);

        return [
          id,
          {
            points: line?.points ?? null,
            tag: line?.hedged === true ? tag : null,
          },
        ];
      }),
    ),
  }));
}

/**
 * The manches one by one, folded under « Afficher le détail des scores »: a
 * row per manche, a column per player, the points it gave them and the tag of
 * what the game notes by them, then the totals. Read during the game and on
 * the final score alike.
 */
export function StageDetail({
  players,
  scores,
  stages,
  fixed,
}: Readonly<{
  players: ReadonlyArray<{ id: PlayerId; name: string }>;
  scores: readonly StageScore[];
  /** The game's manches; nothing shows unless it notes something by them. */
  stages: StageSpec | null;
  fixed: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const ids = players.map(p => p.id);
  const rows = detailRows(stages, ids, scores, fixed);

  if (rows === null || scores.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="self-start text-sm font-medium text-indigo-600 transition hover:text-indigo-500 dark:text-indigo-400"
      >
        {open
          ? "Masquer le détail des scores"
          : "Afficher le détail des scores"}
      </button>

      {open ? (
        <div className="overflow-x-auto">
          <table data-testid="stage-detail" className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 dark:text-zinc-400">
                <th scope="col" className="pr-2 text-left font-medium">
                  {stages?.label}
                </th>
                {players.map(p => (
                  <th
                    key={p.id}
                    scope="col"
                    className="max-w-20 truncate px-1 text-right font-medium"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <StageDetailRow
                  key={row.stage}
                  stage={row.stage}
                  cells={row.cells}
                  playerIds={ids}
                />
              ))}
            </tbody>
            <tfoot>
              <tr className="border-black/10 border-t font-semibold dark:border-white/15">
                <th scope="row" className="py-1.5 pr-2 text-left">
                  Total
                </th>
                {ids.map(id => (
                  <td key={id} className="px-1 py-1.5 text-right tabular-nums">
                    {scores
                      .filter(s => s.playerId === id)
                      .reduce((sum, s) => sum + s.points, 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </div>
  );
}
