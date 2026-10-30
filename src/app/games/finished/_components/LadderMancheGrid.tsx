import type { Player, PlayerId, StageLadder } from "@/lib/domain";
import { ladderRungs, workingRung } from "@/lib/game/ladder";
import { type LadderManche, mancheScores } from "@/lib/game/ladder-finished";

import { LadderMancheGridRow } from "./LadderMancheGridRow";

/**
 * The manches of a Phase 10 night typed in afterwards, as one compact grid: a
 * row per manche, a column per player, each cell his points and the tick of
 * the phase he was on. The phase a box stands for follows from the rows above
 * it, so ticking one moves the boxes of the manches below.
 */
export function LadderMancheGrid({
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
  /** A stable identity per manche, for the rows — removing one shifts the rest. */
  keys: readonly number[];
  players: Player[];
  ladder: StageLadder;
  /** How far one tap moves a cell's points. */
  step: number;
  disabled: boolean;
  onChange: (
    index: number,
    playerId: PlayerId,
    patch: Partial<LadderManche[string]>,
  ) => void;
  onRemove: (index: number) => void;
}>) {
  if (manches.length === 0) {
    return null;
  }

  const ids = players.map(p => p.id);
  const scores = mancheScores(manches, ids);
  const top = ladder.steps.length;
  const tag = ladder.label.charAt(0).toUpperCase();

  return (
    <div className="overflow-x-auto">
      <table data-testid="ladder-grid" className="w-full">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-400">
            <th scope="col" className="pr-2 text-left font-medium">
              Manche
            </th>
            {players.map(p => (
              <th
                key={p.id}
                scope="col"
                className="max-w-16 truncate px-0.5 text-center font-medium"
              >
                {p.name}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">Retirer</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {manches.map((manche, index) => {
            const before = ladderRungs(ids, scores, index, top, false);

            return (
              <LadderMancheGridRow
                key={keys[index]}
                index={index}
                manche={manche}
                players={players}
                tag={tag}
                working={Object.fromEntries(
                  ids.map(id => [id, workingRung(before[id], top)]),
                )}
                step={step}
                disabled={disabled}
                onChange={(playerId, patch) => onChange(index, playerId, patch)}
                onRemove={() => onRemove(index)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
