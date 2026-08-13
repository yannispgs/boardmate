"use client";

import { ChevronRightIcon } from "@/components/icons";
import type { Player, PlayerId, RoundGoal } from "@/lib/domain";
import type { FinishedGoals, StageGoalRaw } from "@/lib/game/finished-goals";
import {
  mergeCells,
  stageGoalSheet,
  unscoredStageCells,
  unscoredStageKeys,
} from "@/lib/game/finished-goals";
import { goalGroups } from "@/lib/game/round-goals";
import { otherPicks, pickAt, type StagePick } from "@/lib/game/stage";
import { CategoryScoreGrid } from "../../_components/CategoryScoreGrid";
import { StageGoalPicker } from "../../_components/StageGoalPicker";

/**
 * The end-of-stage goals of a game played away from the app — which tile scored
 * each manche, and what everyone took from it. Folded away by default: it is
 * the one part of a night nobody writes down, so the form must not insist on it.
 *
 * Opened, it is all or nothing (see `finishedGoals`), which is why the footer
 * says how many cells are still missing rather than silently recording half of
 * them.
 */
export function StageGoalsSection({
  stageLabel,
  players,
  catalogue,
  picks,
  raw,
  goals,
  disabled,
  onPicks,
  onCell,
}: Readonly<{
  /** What this game calls a stage — « Manche ». */
  stageLabel: string;
  players: Player[];
  /** Every tile that could be laid, the chosen extensions' included. */
  catalogue: RoundGoal[];
  picks: StagePick[];
  raw: StageGoalRaw;
  goals: FinishedGoals;
  disabled: boolean;
  onPicks: (picks: StagePick[]) => void;
  onCell: (playerId: PlayerId, key: string, text: string) => void;
}>) {
  const groups = goalGroups(catalogue);
  const sheet = stageGoalSheet(stageLabel, goals.stages, catalogue);
  const lower = stageLabel.toLowerCase();

  // A « Pas d'objectif » manche pays nobody: its line is shown filled with the
  // zero it is recorded as, and locked. Derived from the tiles laid, so undoing
  // the tile hands the line straight back to the table.
  const unscored = unscoredStageKeys(goals.stages, catalogue);
  const cells = mergeCells(
    raw,
    unscoredStageCells(
      goals.stages,
      catalogue,
      players.map(p => p.id),
    ),
  );

  function setPick(index: number, pick: StagePick) {
    onPicks(
      goals.stages.map((_, i) => (i === index ? pick : pickAt(picks, i))),
    );
  }

  return (
    <details className="group rounded-xl border border-black/10 dark:border-white/10">
      <summary className="flex cursor-pointer items-center gap-1.5 px-4 py-3 text-sm font-medium">
        <ChevronRightIcon className="size-4 shrink-0 transition group-open:rotate-90" />
        <span>Détail des objectifs de {lower} (facultatif)</span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-black/10 p-4 dark:border-white/10">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Dans l&apos;ordre où ils ont été comptés. Une fois les {lower}s
          complètes, la ligne « Objectifs de {lower} » de la feuille se remplit
          toute seule — tu peux toujours la corriger ensuite.
        </p>

        <div className="flex flex-col gap-3">
          {goals.stages.map(({ stage }) => (
            <div
              key={stage}
              className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10"
            >
              <span className="text-sm font-semibold">
                {stageLabel} {stage}
              </span>

              <StageGoalPicker
                groups={groups}
                catalogue={catalogue}
                pick={pickAt(picks, stage - 1)}
                taken={otherPicks(picks, stage - 1)}
                onPick={pick => setPick(stage - 1, pick)}
              />
            </div>
          ))}
        </div>

        <CategoryScoreGrid
          players={players.map(p => ({ id: p.id, name: p.name }))}
          sheet={sheet}
          raw={cells}
          readOnlyKeys={unscored}
          disabled={disabled}
          onCell={onCell}
        />

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {footer(goals, lower)}
        </p>
      </div>
    </details>
  );
}

/** What is still missing before the block can be recorded at all. */
function footer(goals: FinishedGoals, lower: string): string {
  if (goals.complete) {
    return `${goals.stages.map(s => s.turns).join(" · ")} tours — détail complet, il sera enregistré avec la partie.`;
  }

  // In the order the block is filled: the tiles name the lines of the grid, so
  // counting its empty cells before they are down reads backwards.
  if (!goals.tilesReady) {
    return `Choisis l'objectif de chaque ${lower} : tant que le détail est incomplet, il n'est pas enregistré.`;
  }

  return `Encore ${goals.remaining} case${goals.remaining > 1 ? "s" : ""} à remplir : tant que le détail est incomplet, il n'est pas enregistré.`;
}
