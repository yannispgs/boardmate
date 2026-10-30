import type { Player, PlayerId } from "@/lib/domain";
import type { LadderManche } from "@/lib/game/ladder-finished";
import { digitsOnly, numberOf } from "@/lib/ui/number-input";

/**
 * One manche of the grid: in each player's cell, the points left in his hand
 * and the box he ticks if he laid down the phase he was on — tagged with that
 * phase (« P3 »), which the manches above decide.
 */
export function LadderMancheGridRow({
  index,
  manche,
  players,
  tag,
  working,
  disabled,
  onChange,
  onRemove,
}: Readonly<{
  index: number;
  manche: LadderManche;
  players: Player[];
  /** The letter a rung is tagged with (« P » for « Phase »). */
  tag: string;
  /** The rung each player was on as this manche opened. */
  working: Record<string, number>;
  disabled: boolean;
  onChange: (playerId: PlayerId, patch: Partial<LadderManche[string]>) => void;
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
        const line = manche[p.id] ?? { points: 0, cleared: false };

        return (
          <td key={p.id} className="px-0.5 py-1.5">
            <div className="flex flex-col items-center gap-1">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`${p.name} — manche ${number}`}
                value={String(line.points)}
                disabled={disabled}
                onFocus={e => e.currentTarget.select()}
                onChange={e =>
                  onChange(p.id, {
                    points: numberOf(digitsOnly(e.target.value)),
                  })
                }
                className="w-11 rounded-md border border-black/15 bg-white px-1.5 py-1 text-right text-sm tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
              />
              <label className="flex items-center gap-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                <input
                  type="checkbox"
                  aria-label={`${tag}${working[p.id]} réalisée — ${p.name}, manche ${number}`}
                  checked={line.cleared}
                  disabled={disabled}
                  onChange={e => onChange(p.id, { cleared: e.target.checked })}
                  className="h-4 w-4 accent-emerald-600"
                />
                {tag}
                {working[p.id]}
              </label>
            </div>
          </td>
        );
      })}

      <td className="py-1.5 pl-1 text-right">
        <button
          type="button"
          aria-label={`Retirer la manche ${number}`}
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
