import type { Player, PlayerId } from "@/lib/domain";

import { PointsCell } from "../../_components/PointsCell";
import type { MancheCell } from "./MancheGrid";

/**
 * One manche of the grid: in each player's cell, their points — a figure that
 * opens its own dialog to be changed, so the row stays one line high — and the
 * box the game has them tick, tagged short (« P3 » for the phase they were on,
 * « S » for the safety token).
 */
export function MancheGridRow({
  index,
  unit,
  manche,
  players,
  tagOf,
  checkNameOf,
  disabled,
  onCheck,
  onEditPoints,
  onRemove,
}: Readonly<{
  index: number;
  /** What a manche is called, lower case (« manche », « donne »). */
  unit: string;
  manche: Readonly<Record<string, MancheCell>>;
  players: Player[];
  /** The box's short tag, by player. */
  tagOf: (playerId: PlayerId) => string;
  /** What ticking the box says, by player (« P3 réalisée »). */
  checkNameOf: (playerId: PlayerId) => string;
  disabled: boolean;
  onCheck: (playerId: PlayerId, checked: boolean) => void;
  /** Opens the dialog that changes one player's points. */
  onEditPoints: (playerId: PlayerId) => void;
  onRemove: () => void;
}>) {
  const number = index + 1;

  return (
    <tr className="border-black/5 border-t dark:border-white/10">
      <th
        scope="row"
        className="py-1.5 pr-2 text-left text-sm font-normal text-zinc-500 tabular-nums dark:text-zinc-400"
      >
        {number}
      </th>

      {players.map(p => {
        const cell = manche[p.id] ?? { points: null, checked: false };

        return (
          <td key={p.id} className="px-0.5 py-1.5">
            <div className="flex items-center justify-center gap-1">
              <PointsCell
                label={`${p.name}, ${unit} ${number}`}
                points={cell.points}
                disabled={disabled}
                onEdit={() => onEditPoints(p.id)}
              />
              <label className="flex items-center gap-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <input
                  type="checkbox"
                  aria-label={`${checkNameOf(p.id)} — ${p.name}, ${unit} ${number}`}
                  checked={cell.checked}
                  disabled={disabled}
                  onChange={e => onCheck(p.id, e.target.checked)}
                  className="h-4 w-4 accent-emerald-600"
                />
                {tagOf(p.id)}
              </label>
            </div>
          </td>
        );
      })}

      <td className="py-1.5 pl-1 text-right">
        <button
          type="button"
          aria-label={`Retirer la ${unit} ${number}`}
          disabled={disabled}
          onClick={onRemove}
          className="rounded px-1.5 text-zinc-400 hover:text-rose-600"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
