import type { Player, PlayerId } from "@/lib/domain";
import type { LadderManche } from "@/lib/game/ladder-finished";

import { StagePointsRow } from "../../_components/StagePointsRow";

/**
 * One manche of a Phase 10 night typed in afterwards: each player's points, and
 * the box he ticks if he laid his phase down — named after the phase he was on
 * by then, which the manches above decide.
 */
export function LadderMancheCard({
  index,
  manche,
  players,
  rungLabel,
  working,
  step,
  disabled,
  onChange,
  onRemove,
}: Readonly<{
  index: number;
  manche: LadderManche;
  players: Player[];
  rungLabel: string;
  /** The rung each player was on as this manche opened, and its name. */
  working: Record<string, { rung: number; step: string }>;
  step: number;
  disabled: boolean;
  onChange: (playerId: PlayerId, patch: Partial<LadderManche[string]>) => void;
  onRemove: () => void;
}>) {
  return (
    <li
      data-testid="ladder-manche"
      className="flex flex-col gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Manche {index + 1}</span>
        <button
          type="button"
          disabled={disabled}
          onClick={onRemove}
          className="text-xs text-zinc-500 hover:underline"
        >
          Retirer
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {players.map(p => (
          <StagePointsRow
            key={p.id}
            player={{ id: p.id, name: p.name }}
            points={manche[p.id]?.points ?? 0}
            max={null}
            step={step}
            rung={working[p.id] ?? null}
            rungLabel={rungLabel}
            cleared={manche[p.id]?.cleared === true}
            disabled={disabled}
            onPoints={points => onChange(p.id, { points })}
            onCleared={cleared => onChange(p.id, { cleared })}
          />
        ))}
      </ul>
    </li>
  );
}
