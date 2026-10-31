"use client";

import type { Player, PlayerId, StageLadder } from "@/lib/domain";
import {
  type LadderEntryRules,
  ladderRungs,
  ladderWheel,
  workingRung,
} from "@/lib/game/ladder";
import { type LadderManche, mancheScores } from "@/lib/game/ladder-finished";

import { MancheGrid } from "./MancheGrid";

/**
 * The manches of a Phase 10 night typed in afterwards: each cell the points
 * left in a player's hand and the tick of the phase they were on. The phase a
 * box stands for follows from the rows above it, so ticking one moves the
 * boxes of the manches below.
 */
export function LadderMancheGrid({
  manches,
  keys,
  players,
  ladder,
  rules,
  disabled,
  onChange,
  onRemove,
}: Readonly<{
  manches: readonly LadderManche[];
  /** A stable identity per manche, for the rows — removing one shifts the rest. */
  keys: readonly number[];
  players: Player[];
  ladder: StageLadder;
  /** What a manche's points are checked against: the step, the cap, the floor. */
  rules: LadderEntryRules;
  disabled: boolean;
  onChange: (
    index: number,
    playerId: PlayerId,
    patch: Partial<LadderManche[string]>,
  ) => void;
  onRemove: (index: number) => void;
}>) {
  const ids = players.map(p => p.id);
  const scores = mancheScores(manches, ids);
  const top = ladder.steps.length;
  const tag = ladder.label.charAt(0).toUpperCase();
  const tagOf = (index: number, id: PlayerId) =>
    `${tag}${workingRung(ladderRungs(ids, scores, index, top, false)[id], top)}`;

  return (
    <MancheGrid
      testId="ladder-grid"
      stageLabel="Manche"
      manches={manches.map(manche =>
        Object.fromEntries(
          Object.entries(manche).map(([id, line]) => [
            id,
            { points: line.points, checked: line.cleared },
          ]),
        ),
      )}
      keys={keys}
      players={players}
      tagOf={tagOf}
      checkNameOf={(index, id) => `${tagOf(index, id)} réalisée`}
      // An unset cell opens on the wheel's first value: 0 with the phase down,
      // a whole hand without.
      valuesOf={(_index, cleared) => ladderWheel(cleared, rules)}
      disabled={disabled}
      onPoints={(index, id, points) => onChange(index, id, { points })}
      onCheck={(index, id, cleared) => onChange(index, id, { cleared })}
      onRemove={onRemove}
    />
  );
}
