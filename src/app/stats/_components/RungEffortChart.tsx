import { MiniBarChart } from "@/components/stats/MiniBarChart";
import type { RungEffort } from "@/lib/game/ladder-stats";

/**
 * What each phase costs to clear (Phase 10), failed manches included: the laps
 * of the table spent on it, once the table has counted some, and the manches.
 * The tall bars are the phases that drag on.
 */
export function RungEffortChart({
  efforts,
  rungLabel,
}: Readonly<{ efforts: readonly RungEffort[]; rungLabel: string }>) {
  const counted = efforts.filter(effort => effort.laps !== null);

  return (
    <div className="flex flex-col gap-4">
      {counted.length === 0 ? null : (
        <div className="flex flex-col gap-2">
          <MiniBarChart
            testId="rung-laps"
            bars={counted.map(effort => ({
              key: String(effort.rung),
              label: String(effort.rung),
              value: effort.laps ?? 0,
              caption: (effort.laps ?? 0).toFixed(1),
            }))}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Tours de table passés en moyenne sur chaque {rungLabel} avant de la
            réaliser, échecs compris.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <MiniBarChart
          testId="rung-manches"
          bars={efforts.map(effort => ({
            key: String(effort.rung),
            label: String(effort.rung),
            value: effort.manches,
            caption: effort.manches.toFixed(1),
          }))}
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Manches qu&apos;il faut en moyenne pour réaliser chaque {rungLabel} (1
          = du premier coup).
        </p>
      </div>
    </div>
  );
}
