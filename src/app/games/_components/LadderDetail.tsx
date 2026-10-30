"use client";

import { useState } from "react";

import type { PlayerId, StageScore, StageSpec } from "@/lib/domain";
import { ladderRows } from "@/lib/game/ladder";

import { LadderDetailRow } from "./LadderDetailRow";

/**
 * The manches one by one, folded under « Afficher le détail des scores »: a
 * row per manche, a column per player, the points it cost him and — tagged
 * « P3 » — the phase he cleared in it, then the totals. Read during the game
 * and on the final score alike.
 */
export function LadderDetail({
  players,
  scores,
  stages,
  fixed,
}: Readonly<{
  players: ReadonlyArray<{ id: PlayerId; name: string }>;
  scores: readonly StageScore[];
  /** The game's manches; nothing shows without a ladder. */
  stages: StageSpec | null;
  fixed: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const ladder = stages?.ladder;

  if (ladder === undefined || scores.length === 0) {
    return null;
  }

  const ids = players.map(p => p.id);
  const rows = ladderRows(ids, scores, ladder.steps.length, fixed);
  const tag = ladder.label.charAt(0).toUpperCase();

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
          <table data-testid="ladder-detail" className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 dark:text-zinc-400">
                <th scope="col" className="pr-2 text-left font-medium">
                  Manche
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
                <LadderDetailRow
                  key={row.stage}
                  row={row}
                  playerIds={ids}
                  tag={tag}
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
