"use client";

import { Fragment } from "react";

import { ChevronRightIcon } from "@/components/icons";
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
 *
 * A chevron sits between two phases, so the strip reads as an order and not as
 * a set: a table that has never played the game can tell what comes after what
 * without opening the rulebook.
 */
export function PhaseCardList({
  phases,
  current,
}: Readonly<{ phases: PhaseSpec[]; current: number }>) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-1.5">
      {phases.map((phase, index) => (
        <Fragment key={phase.key}>
          {index === 0 ? null : (
            <li className="shrink-0 text-zinc-400">
              <ChevronRightIcon className="h-4 w-4" />
            </li>
          )}
          <PhaseCard
            rank={index + 1}
            label={phase.label}
            state={stateOf(index, current)}
          />
        </Fragment>
      ))}
    </ul>
  );
}
