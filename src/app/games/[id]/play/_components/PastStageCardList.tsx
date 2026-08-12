"use client";

import { ChevronRightIcon } from "@/components/icons";
import type { PlayerId } from "@/lib/domain";
import type { ClosedStage } from "@/lib/game/stage-tally";

import { PastStageCard } from "./PastStageCard";

/**
 * The manches already behind the table, folded away. Correcting one is rare and
 * the standings above are what the game is played on, so this stays shut until
 * somebody goes looking for the manche he mis-heard.
 */
export function PastStageCardList({
  closed,
  stageLabel,
  players,
  disabled,
  onEdit,
}: Readonly<{
  closed: ClosedStage[];
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  players: Array<{ id: PlayerId; name: string }>;
  disabled: boolean;
  onEdit: (stage: number) => void;
}>) {
  if (closed.length === 0) {
    return null;
  }

  return (
    <details className="group flex flex-col gap-2">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
        <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        Corriger une {stageLabel.toLowerCase()}
      </summary>

      <div className="mt-2 flex flex-col gap-2">
        {closed.map(stage => (
          <PastStageCard
            key={stage.stage}
            closed={stage}
            stageLabel={stageLabel}
            players={players}
            disabled={disabled}
            onEdit={() => onEdit(stage.stage)}
          />
        ))}
      </div>
    </details>
  );
}
