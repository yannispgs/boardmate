"use client";

import type { DraftDirection, PhaseSpec } from "@/lib/domain";
import { DraftBanner } from "./DraftBanner";
import { PhaseCardList } from "./PhaseCardList";

/**
 * The head of the phase: where the stage stands, and anything the table has to
 * be told before playing it — the draft's direction, today.
 */
export function PhaseBar({
  phases,
  current,
  draft,
}: Readonly<{
  phases: PhaseSpec[];
  current: number;
  /** Which way the cards go, or null when this phase is not drafted. */
  draft: DraftDirection | null;
}>) {
  return (
    <div className="flex w-full flex-col items-center gap-3">
      <PhaseCardList phases={phases} current={current} />

      {draft === null ? null : <DraftBanner direction={draft} />}
    </div>
  );
}
