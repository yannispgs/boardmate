"use client";

import type { PlayerId } from "@/lib/domain";
import { scorePiles } from "@/lib/game/pair-scoring";
import type { ScoreRecord } from "@/lib/game/score-records";
import type { Ranked } from "@/lib/game/scoring";
import { RecordBadgeList } from "./RecordBadgeList";
import { SheetDoneButton } from "./SheetDoneButton";

/**
 * The filled scoresheet of a pair-scored game (Splito) after the reveal: one
 * row per player, showing the two piles he shares with his neighbours and the
 * product they make. Written out as a multiplication rather than a column of
 * totals, because that is what the sheet and the argument at the table are
 * about — a pile counts for two people.
 *
 * When `onDone` is given a button closes the sheet; omit it to embed the bare
 * table.
 */
export function PairScoreTable({
  seats,
  piles,
  ranking,
  records,
  onDone,
}: Readonly<{
  seats: { id: PlayerId; name: string }[];
  piles: Record<string, number>;
  ranking: Ranked[];
  /** The records each player took, worn on the total that took them. */
  records?: ReadonlyMap<PlayerId, ScoreRecord[]>;
  onDone?: () => void;
}>) {
  const scored = scorePiles(
    seats.map(s => s.id),
    piles,
  );
  const cell = "px-2 py-2 text-right tabular-nums";

  return (
    <section className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-center text-lg font-semibold">Feuille de scores</h2>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              <th className="px-2 py-1 text-left font-semibold">Joueur</th>
              <th className="px-2 py-1 text-right font-semibold">Tas</th>
              <th className="px-2 py-1 text-right font-semibold">Total</th>
              <th className="px-2 py-1 text-right font-semibold">Rang</th>
            </tr>
          </thead>
          <tbody>
            {seats.map(s => {
              const score = scored[s.id];
              const rank = ranking.find(r => r.playerId === s.id);

              return (
                <tr
                  key={s.id}
                  className="border-t border-black/5 dark:border-white/5"
                >
                  <th scope="row" className="px-2 py-2 text-left font-normal">
                    {s.name}
                  </th>
                  <td className={`${cell} text-zinc-500 dark:text-zinc-400`}>
                    {score.left} × {score.right}
                  </td>
                  <td className={`${cell} font-semibold`}>
                    <span className="flex items-center justify-end gap-1.5">
                      {score.total}
                      <RecordBadgeList records={records?.get(s.id) ?? []} />
                    </span>
                  </td>
                  <td className={`${cell} text-zinc-500 dark:text-zinc-400`}>
                    {rank?.rank === 1 ? "🏆 " : ""}
                    {rank?.rank ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <SheetDoneButton onDone={onDone} />
    </section>
  );
}
