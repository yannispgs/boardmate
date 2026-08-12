"use client";

import { ErrorText } from "@/components/ErrorText";
import type { RoundGoal } from "@/lib/domain";
import { type GoalGroup, goalGroups } from "@/lib/game/round-goals";
import {
  isCalendarReady,
  otherPicks,
  pickAt,
  type StagePick,
  stageCalendar,
} from "@/lib/game/stage";
import { StageGoalPicker } from "../../_components/StageGoalPicker";
import { FunnelStep } from "./FunnelStep";

/**
 * The goal tiles laid on the board before the first bird is played (Wingspan):
 * one per manche, in the order they will be scored. They are asked here rather
 * than manche by manche because they are drawn at setup — and because the tile
 * that scores nothing hands the table an extra turn in every following manche,
 * so the game's whole length only becomes known once the four are down.
 */
export function StageGoalsStep({
  stageLabel,
  schedule,
  catalogue,
  picks,
  creating,
  error,
  onPicks,
  onBack,
  onValidate,
}: Readonly<{
  /** What this game calls a stage — « Manche ». */
  stageLabel: string;
  /** The box's laps per stage, before any tile lengthens them. */
  schedule: number[];
  /** Every tile that can be laid, the active extensions' included. */
  catalogue: RoundGoal[];
  picks: StagePick[];
  creating: boolean;
  error: string | null;
  onPicks: (picks: StagePick[]) => void;
  onBack: () => void;
  onValidate: () => void;
}>) {
  const groups = goalGroups(catalogue);
  const stages = stageCalendar(schedule, picks, catalogue);
  const ready = isCalendarReady(stages, catalogue);

  function setPick(index: number, pick: StagePick) {
    onPicks(schedule.map((_, i) => (i === index ? pick : pickAt(picks, i))));
  }

  return (
    <FunnelStep
      title={`5 · Choix des objectifs de ${stageLabel.toLowerCase()}`}
      onBack={onBack}
      footer={
        <>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {stages.map(stage => stage.turns).join(" · ")} tours
          </p>

          <ErrorText message={error} />

          <button
            type="button"
            disabled={creating || !ready}
            onClick={onValidate}
            className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
          >
            {creating ? "Création…" : "Lancer la partie"}
          </button>
        </>
      }
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Dans l&apos;ordre où ils seront comptés. Un objectif qui ne rapporte
        rien rend son cube, ce qui allonge les {stageLabel.toLowerCase()}s
        suivantes.
      </p>

      <div className="flex flex-col gap-3">
        {stages.map(({ stage, turns }) => (
          // The stages have no identity of their own: their rank in the
          // calendar is what tells them apart, and it never moves.
          <StageRow
            key={stage}
            label={`${stageLabel} ${stage}`}
            turns={turns}
            groups={groups}
            catalogue={catalogue}
            pick={pickAt(picks, stage - 1)}
            taken={otherPicks(picks, stage - 1)}
            onPick={pick => setPick(stage - 1, pick)}
          />
        ))}
      </div>
    </FunnelStep>
  );
}

/** One manche: the tile it scores, its variable part, and how long it runs. */
function StageRow({
  label,
  turns,
  groups,
  catalogue,
  pick,
  taken,
  onPick,
}: Readonly<{
  label: string;
  turns: number;
  groups: GoalGroup[];
  catalogue: RoundGoal[];
  pick: StagePick;
  taken: StagePick[];
  onPick: (pick: StagePick) => void;
}>) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {turns} tours
        </span>
      </div>

      <StageGoalPicker
        groups={groups}
        catalogue={catalogue}
        pick={pick}
        taken={taken}
        onPick={onPick}
      />
    </div>
  );
}
