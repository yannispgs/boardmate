import type { ReactNode } from "react";

import type { Player, PlayerId, ScoringSpec } from "@/lib/domain";
import type { MancheMode } from "@/lib/game/ladder-finished";

import { EntryModeToggle } from "../../_components/EntryModeToggle";
import { finishedEntry } from "../../_components/finished-entry";
import { ScoreEntrySection } from "../../_components/ScoreEntrySection";

/**
 * How a night counted manche by manche (Phase 10, Luz) is written down
 * afterwards: the final totals alone, or the manches one by one in the game's
 * own grid — which then decides the winner.
 */
export function MancheEntrySection({
  scoring,
  stageLabel,
  players,
  mode,
  totals,
  grid,
  error,
  disabled,
  onMode,
  onTotal,
  onAddManche,
}: Readonly<{
  scoring: ScoringSpec;
  /** What a manche is called (« Manche », « Donne »). */
  stageLabel: string;
  players: Player[];
  mode: MancheMode;
  totals: Record<string, string>;
  /** The game's grid of manches. */
  grid: ReactNode;
  /** What the entry still lacks, shown under the manches. */
  error: string | null;
  disabled: boolean;
  onMode: (mode: MancheMode) => void;
  onTotal: (id: PlayerId, text: string) => void;
  onAddManche: () => void;
}>) {
  const unit = stageLabel.toLowerCase();

  return (
    <div className="flex flex-col gap-3">
      <EntryModeToggle
        name="mancheMode"
        value={mode}
        options={[
          { value: "total", label: "Score final" },
          { value: "detail", label: `${stageLabel} par ${unit}` },
        ]}
        onChange={onMode}
      />

      {mode === "total" ? (
        <ScoreEntrySection
          scoring={scoring}
          entry={finishedEntry(scoring, players, "total", totals, {}, {})}
          players={players}
          entryMode="total"
          totals={totals}
          catRaw={{}}
          piles={{}}
          disabled={disabled}
          onEntryMode={() => undefined}
          onTotal={onTotal}
          onCell={() => undefined}
          onPile={() => undefined}
        />
      ) : (
        <>
          {grid}
          <button
            type="button"
            disabled={disabled}
            onClick={onAddManche}
            className="self-start rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            + Ajouter une {unit}
          </button>
          {error === null ? null : (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
