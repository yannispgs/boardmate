import type { PhaseSpec } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { phaseColorOf } from "@/lib/game/phase-colors";
import type { StageBreakdown } from "@/lib/game/phase-stats";

/** « Génération » 6 written short enough to sit in front of a bar: « G6 ». */
function shortStage(stageLabel: string, stage: number): string {
  return `${stageLabel.slice(0, 1).toUpperCase()}${stage}`;
}

/**
 * One bar per stage, split into the phases it was played in.
 *
 * The bar's **length** is the stage's total time, read against the longest one,
 * so a generation growing heavier is visible at a glance; its **segments** are
 * that stage's own split. Reading only the split would flatten every generation
 * to the same width and hide the very thing the phase clocks were added for.
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
  const longest = Math.max(...stages.map(s => s.totalS));

  return (
    <ul className="flex flex-col gap-1.5">
      {stages.map(stage => (
        <li key={stage.stage} className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-xs font-medium text-zinc-500 tabular-nums dark:text-zinc-400">
            {shortStage(stageLabel, stage.stage)}
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className="flex h-4 overflow-hidden rounded"
              style={{ width: `${(stage.totalS / longest) * 100}%` }}
            >
              {stage.slices.map(slice => (
                <div
                  key={slice.key}
                  title={`${slice.label} — ${formatDuration(slice.durationS)}`}
                  style={{
                    width: `${slice.share * 100}%`,
                    backgroundColor: phaseColorOf(phases, slice.key),
                  }}
                />
              ))}
            </div>

            <span className="shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {formatDuration(stage.totalS)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
