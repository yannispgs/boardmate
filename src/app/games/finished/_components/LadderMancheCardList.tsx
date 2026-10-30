import type { Player, PlayerId, StageLadder } from "@/lib/domain";
import { ladderRungs, workingRung } from "@/lib/game/ladder";
import { type LadderManche, mancheScores } from "@/lib/game/ladder-finished";

import { LadderMancheCard } from "./LadderMancheCard";

/** The manches typed in so far, oldest first, each told what phase was on. */
export function LadderMancheCardList({
  manches,
  keys,
  players,
  ladder,
  step,
  disabled,
  onChange,
  onRemove,
}: Readonly<{
  manches: readonly LadderManche[];
  /** A stable identity per manche, for the list — removing one shifts the rest. */
  keys: readonly number[];
  players: Player[];
  ladder: StageLadder;
  step: number;
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

  return (
    <ul className="flex flex-col gap-3">
      {manches.map((manche, index) => {
        const before = ladderRungs(ids, scores, index, top, false);

        return (
          <LadderMancheCard
            key={keys[index]}
            index={index}
            manche={manche}
            players={players}
            rungLabel={ladder.label}
            working={Object.fromEntries(
              ids.map(id => {
                const rung = workingRung(before[id], top);

                return [id, { rung, step: ladder.steps[rung - 1] }];
              }),
            )}
            step={step}
            disabled={disabled}
            onChange={(playerId, patch) => onChange(index, playerId, patch)}
            onRemove={() => onRemove(index)}
          />
        );
      })}
    </ul>
  );
}
