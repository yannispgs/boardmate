"use client";

import { useState } from "react";

import { OptionPicker } from "@/components/OptionPicker";
import type { GameStatsRecord, RoundGoal } from "@/lib/domain";
import { type GoalStat, goalStats } from "@/lib/game/goal-stats";

/** The two readings of a tile: the family it belongs to, or the board it was on. */
const READINGS = [
  { value: "family", label: "Par objectif" },
  { value: "value", label: "Par valeur" },
];

/**
 * What each end-of-manche goal tile paid at this table. Read by family by
 * default — « Œufs dans X » across every habitat, which is what says whether
 * to draft eggs at all — with the finer per-value reading one tap away.
 */
export function GoalStatsTable({
  records,
  catalogue,
}: Readonly<{
  records: GameStatsRecord[];
  catalogue: RoundGoal[];
}>) {
  const [reading, setReading] = useState("family");

  const rows = goalStats(records, catalogue, reading === "value");

  if (rows.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Aucun objectif de manche enregistré sur ces parties.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <OptionPicker
        variant="chips"
        options={READINGS}
        value={reading}
        onChange={setReading}
      />

      <ul className="flex flex-col gap-1">
        {rows.map(row => (
          <GoalStatRow key={row.id} stat={row} />
        ))}
      </ul>
    </div>
  );
}

/** One tile's line: what it is called, what it paid, and how often it came up. */
function GoalStatRow({ stat }: Readonly<{ stat: GoalStat }>) {
  return (
    <li className="flex items-baseline justify-between gap-3 rounded-lg border border-black/10 px-3 py-2 dark:border-white/10">
      <span className="min-w-0 truncate text-sm">{stat.label}</span>
      <span className="flex shrink-0 items-baseline gap-3 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {stat.avgPoints.toFixed(1)} pts
        </span>
        <span>max {stat.bestPoints}</span>
        <span>
          ×{stat.played} manche{stat.played > 1 ? "s" : ""}
        </span>
      </span>
    </li>
  );
}
