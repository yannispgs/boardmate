"use client";

import type { Player, PlayerId, StageBet } from "@/lib/domain";
import { betValues } from "@/lib/game/bet";
import type { BetManche } from "@/lib/game/bet-finished";

import { MancheGrid } from "./MancheGrid";

/**
 * The donnes of a Luz night typed in afterwards: each cell what the bet paid
 * and the tick of the safety token, which decides what the wheel offers.
 */
export function BetMancheGrid({
  stageLabel,
  manches,
  keys,
  players,
  bet,
  disabled,
  onChange,
  onRemove,
}: Readonly<{
  /** What a manche is called (« Donne »). */
  stageLabel: string;
  manches: readonly BetManche[];
  /** A stable identity per donne, for the rows — removing one shifts the rest. */
  keys: readonly number[];
  players: Player[];
  bet: StageBet;
  disabled: boolean;
  onChange: (
    index: number,
    playerId: PlayerId,
    patch: Partial<BetManche[string]>,
  ) => void;
  onRemove: (index: number) => void;
}>) {
  return (
    <MancheGrid
      testId="bet-grid"
      stageLabel={stageLabel}
      manches={manches.map(manche =>
        Object.fromEntries(
          Object.entries(manche).map(([id, line]) => [
            id,
            { points: line.points, checked: line.hedged },
          ]),
        ),
      )}
      keys={keys}
      players={players}
      tagOf={() => bet.hedgeLabel.charAt(bet.hedgeLabel.lastIndexOf(" ") + 1)}
      checkNameOf={() => bet.hedgeLabel}
      valuesOf={(index, hedged) => betValues(bet, index + 1, hedged)}
      disabled={disabled}
      onPoints={(index, id, points) => onChange(index, id, { points })}
      onCheck={(index, id, hedged) => onChange(index, id, { hedged })}
      onRemove={onRemove}
    />
  );
}
