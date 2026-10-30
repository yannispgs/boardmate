import type { Player, PlayerId } from "@/lib/domain";
import type { LadderManche } from "@/lib/game/ladder-finished";

/**
 * One manche of the grid: in each player's cell, the points left in his hand —
 * nudged up and down by the game's step, never typed — and the box he ticks if
 * he laid down the phase he was on, tagged with that phase (« P3 »), which the
 * manches above decide.
 */
export function LadderMancheGridRow({
  index,
  manche,
  players,
  tag,
  working,
  step,
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
  /** How far one tap moves the points — 5 at Phase 10. */
  step: number;
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
              <PointsNudge
                label={`${p.name}, manche ${number}`}
                value={line.points}
                step={step}
                disabled={disabled}
                onChange={points => onChange(p.id, { points })}
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

const NUDGE =
  "flex h-6 w-8 items-center justify-center rounded-md border border-black/10 text-sm leading-none transition hover:bg-black/5 disabled:opacity-30 dark:border-white/15 dark:hover:bg-white/5";

/** The points of one cell, stacked so a column stays narrow: + / figure / −. */
function PointsNudge({
  label,
  value,
  step,
  disabled,
  onChange,
}: Readonly<{
  /** Who and which manche — names the two buttons. */
  label: string;
  value: number;
  step: number;
  disabled: boolean;
  onChange: (value: number) => void;
}>) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        aria-label={`${label} : ${step} de plus`}
        disabled={disabled}
        onClick={() => onChange(value + step)}
        className={NUDGE}
      >
        +
      </button>
      <span
        data-testid="manche-points"
        className="text-sm font-semibold tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`${label} : ${step} de moins`}
        disabled={disabled || value - step < 0}
        onClick={() => onChange(value - step)}
        className={NUDGE}
      >
        −
      </button>
    </div>
  );
}
