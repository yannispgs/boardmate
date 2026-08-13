"use client";

import type { PlayerId } from "@/lib/domain";
import type { ClosedStage } from "@/lib/game/stage-tally";

/**
 * One manche already written down, and the way back into it: a miscount nobody
 * spotted at the time is put right from here, three manches later, without
 * anything else in the game moving.
 */
export function PastStageCard({
  closed,
  stageLabel,
  players,
  disabled,
  onEdit,
}: Readonly<{
  closed: ClosedStage;
  /** What the box calls a stage (« Manche »). */
  stageLabel: string;
  players: Array<{ id: PlayerId; name: string }>;
  disabled: boolean;
  onEdit: () => void;
}>) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onEdit}
      className="flex flex-col items-start gap-0.5 rounded-lg border border-black/10 px-3 py-2 text-left transition hover:bg-black/5 disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/5"
    >
      <span className="font-medium text-sm">
        {stageLabel} {closed.stage}
      </span>
      <span className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        {players
          .map(p => `${p.name} ${closed.points[p.id] ?? "—"}`)
          .join(" · ")}
      </span>
    </button>
  );
}
