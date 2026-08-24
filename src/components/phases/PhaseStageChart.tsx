import type { PhaseSpec } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { phaseColorOf } from "@/lib/game/phase-colors";
import type { StageBreakdown } from "@/lib/game/phase-stats";

/** « Génération » 6 written short enough to sit under a column: « G6 ». */
function shortStage(stageLabel: string, stage: number): string {
  return `${stageLabel.slice(0, 1).toUpperCase()}${stage}`;
}

/**
 * One column per stage, stacked with the phases it was played in.
 *
 * The column's **height** is the stage's total time, read against the longest
 * one, so a generation growing heavier is visible at a glance; its **segments**
 * are that stage's own split. Reading only the split would flatten every
 * generation to the same height and hide the very thing the phase clocks were
 * added for.
 *
 * Drawn as columns rather than as a row of bars because a party runs left to
 * right: ten generations stacked vertically read as a list nobody compares,
 * where ten columns side by side *are* the evening's shape. They keep a minimum
 * width and the strip scrolls once they no longer fit, rather than shrinking
 * into stripes.
 *
 * The first phase sits at the bottom of every column — anchored on the axis, a
 * phase can be followed from one generation to the next.
 */
export function PhaseStageChart({
  stages,
  phases,
  stageLabel,
}: Readonly<{
  stages: readonly StageBreakdown[];
  phases: readonly PhaseSpec[];
  /** What this game calls a stage — « Génération », « Manche ». */
  stageLabel: string;
}>) {
  // A party of nothing but instant phases has no tallest column; the guard only
  // keeps the division defined, since every height is then zero anyway.
  const longest = Math.max(1, ...stages.map(s => s.totalS));

  return (
    <div className="overflow-x-auto">
      <ul className="flex min-w-full items-end gap-1.5">
        {stages.map(stage => (
          <li
            key={stage.stage}
            className="flex min-w-9 flex-1 flex-col items-center gap-1"
          >
            {/* The padding is where the totals go: the tallest column then
                still has room for its own figure above it. */}
            <div className="flex h-32 w-full items-end pt-4">
              <div
                className="relative min-h-0.5 w-full"
                style={{ height: `${(stage.totalS / longest) * 100}%` }}
              >
                <span className="absolute inset-x-0 -top-4 text-center text-[10px] leading-none text-zinc-500 tabular-nums dark:text-zinc-400">
                  {formatDuration(stage.totalS)}
                </span>

                <div className="flex h-full flex-col-reverse overflow-hidden rounded">
                  {stage.slices.map(slice => (
                    <div
                      key={slice.key}
                      title={`${slice.label} — ${formatDuration(slice.durationS)}`}
                      style={{
                        height: `${slice.share * 100}%`,
                        backgroundColor: phaseColorOf(phases, slice.key),
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <span className="text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
              {shortStage(stageLabel, stage.stage)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
