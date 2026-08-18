"use client";

import type { PhaseSpec } from "@/lib/domain";
import type { PhaseState } from "./PhaseCard";
import { PhaseCard } from "./PhaseCard";

/** Where a phase stands, given the one the table is playing. */
function stateOf(index: number, current: number): PhaseState {
  if (index === current) {
    return "current";
  }

  return index < current ? "done" : "todo";
}

/**
 * The stage laid out as its phases, the current one lit. It is the answer to
 * « on en est où dans la génération ? », which the round counter alone has
 * never been able to give.
 */
export function PhaseCardList({
  phases,
  current,
}: Readonly<{ phases: PhaseSpec[]; current: number }>) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-2">
      {phases.map((phase, index) => (
        <PhaseCard
          key={phase.key}
          label={phase.label}
          state={stateOf(index, current)}
        />
      ))}
    </ul>
  );
}
