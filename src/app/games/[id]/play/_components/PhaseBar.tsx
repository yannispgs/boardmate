"use client";

import type { DraftDirection, PhaseSpec } from "@/lib/domain";
import { DraftBanner } from "./DraftBanner";
import { PhaseCardList } from "./PhaseCardList";

/**
 * The head of the phase: where the stage stands, and anything the table has to
 * be told before playing it — the draft's direction, today.
 *
 * A game that declares no phases has no bar, and that is settled here rather
 * than on the screen holding it: the bar *is* the phases, so whether there is
 * one to draw is the bar's own question.
 */
export function PhaseBar({
  phases,
  current,
  draft,
}: Readonly<{
  /** The phases this game is played in, or null for a game with none. */
  phases: PhaseSpec[] | null;
  current: number;
  /** Which way the cards go, or null when this phase is not drafted. */
  draft: DraftDirection | null;
}>) {
  if (phases === null) {
    return null;
  }

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <PhaseCardList phases={phases} current={current} />

      {draft === null ? null : <DraftBanner direction={draft} />}
    </div>
  );
}
