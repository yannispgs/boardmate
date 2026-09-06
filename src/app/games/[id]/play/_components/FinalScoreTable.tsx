"use client";

import { Fragment } from "react";

import { CategoryIcon } from "@/components/CategoryIcon";
import { ScoreSheetLegend } from "@/components/ScoreSheetLegend";
import type { CategoryDef, PlayerId, ScoreSheetItem } from "@/lib/domain";
import { categoryIconOf } from "@/lib/game/category-icons";
import type { ScoreRecord } from "@/lib/game/score-records";
import { isSubsection, type Ranked, scoreCategories } from "@/lib/game/scoring";
import { RecordBadgeList } from "./RecordBadgeList";
import { SheetDoneButton } from "./SheetDoneButton";

/**
 * The filled scoresheet after the reveal: every category per player, grouped as
 * on the box's paper sheet, with the totals and final rank. When `onDone` is
 * given a button closes the sheet; omit it to embed the bare table (e.g. inside
 * the finished-game score panel).
 */
export function FinalScoreTable({
  sheet,
  players,
  values,
  ranking,
  records,
  onDone,
}: Readonly<{
  sheet: ScoreSheetItem[];
  players: { id: PlayerId; name: string }[];
  values: Record<string, Record<string, number>>;
  ranking: Ranked[];
  /** The records each player took, worn on the total that took them. */
  records?: ReadonlyMap<PlayerId, ScoreRecord[]>;
  onDone?: () => void;
}>) {
  const rankOf = (id: PlayerId) => ranking.find(r => r.playerId === id);
  const cell = "px-2 py-1 text-right tabular-nums";
  const rowLabel = "px-2 py-1 text-left font-normal";

  const scored = scoreCategories(
    sheet,
    values,
    players.map(p => p.id),
  );
  // Show a placement-bonus line only when the sheet actually awards one.
  const hasBonus = players.some(p => (scored[p.id]?.bonus ?? 0) !== 0);

  function line(category: CategoryDef) {
    const { key, label } = category;
    const icon = categoryIconOf(category);

    return (
      <tr key={key} className="border-t border-black/5 dark:border-white/5">
        <th scope="row" className={rowLabel} title={label}>
          {/* The drawing stands in for the words here too, so the sheet reads
              the same as the one it was filled in on. */}
          {icon ? <CategoryIcon id={icon} title={label} /> : label}
        </th>
        {players.map(p => (
          <td key={p.id} className={cell}>
            {values[p.id]?.[key] ?? 0}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <section className="flex flex-col items-center gap-6 py-4">
      <h2 className="text-center text-lg font-semibold">Feuille de scores</h2>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 dark:border-white/10">
              {/* The empty corner cell doubles as the legend of the sheet's
                  pictograms, above the lines wearing them. */}
              <th className="px-2 py-1 text-left">
                <ScoreSheetLegend sheet={sheet} />
              </th>
              {players.map(p => (
                <th key={p.id} className="px-2 py-1 text-right font-semibold">
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.map(item =>
              isSubsection(item) ? (
                <Fragment key={item.label}>
                  <tr className="bg-black/[0.03] dark:bg-white/[0.03]">
                    <th
                      scope="colgroup"
                      colSpan={players.length + 1}
                      className="px-2 py-1 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
                    >
                      {item.label}
                    </th>
                  </tr>
                  {item.categories.map(cat => line(cat))}
                </Fragment>
              ) : (
                line(item)
              ),
            )}

            {hasBonus ? (
              <tr className="border-t border-black/10 text-indigo-600 dark:border-white/10 dark:text-indigo-400">
                <th scope="row" className={rowLabel}>
                  Bonus classement
                </th>
                {players.map(p => (
                  <td key={p.id} className={cell}>
                    +{scored[p.id]?.bonus ?? 0}
                  </td>
                ))}
              </tr>
            ) : null}

            <tr className="border-t-2 border-black/20 font-semibold dark:border-white/20">
              <th scope="row" className="px-2 py-1 text-left">
                Total
              </th>
              {players.map(p => (
                <td key={p.id} className={cell}>
                  {/* The sheet is read down a column, so the mark belongs on
                      the total rather than beside a name three rows up. */}
                  <span className="flex items-center justify-end gap-1.5">
                    {scored[p.id]?.total ?? 0}
                    <RecordBadgeList records={records?.get(p.id) ?? []} />
                  </span>
                </td>
              ))}
            </tr>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <th scope="row" className={rowLabel}>
                Rang
              </th>
              {players.map(p => {
                const r = rankOf(p.id);

                return (
                  <td key={p.id} className={cell}>
                    {r?.rank === 1 ? "🏆 " : ""}
                    {r?.rank ?? "—"}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      <SheetDoneButton onDone={onDone} />
    </section>
  );
}
