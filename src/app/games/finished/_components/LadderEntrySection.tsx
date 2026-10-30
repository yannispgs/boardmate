import type { Player, PlayerId, ScoringSpec, StageLadder } from "@/lib/domain";
import type { LadderManche, LadderMode } from "@/lib/game/ladder-finished";

import { EntryModeToggle } from "../../_components/EntryModeToggle";
import { finishedEntry } from "../../_components/finished-entry";
import { ScoreEntrySection } from "../../_components/ScoreEntrySection";
import { LadderMancheCardList } from "./LadderMancheCardList";

/**
 * How a Phase 10 night is written down afterwards: the final totals alone —
 * the winner then named by hand, since totals hold no climb — or the manches
 * one by one with who laid his phase down, the winner then read off them.
 */
export function LadderEntrySection({
  scoring,
  ladder,
  step,
  players,
  mode,
  totals,
  manches,
  mancheKeys,
  error,
  disabled,
  onMode,
  onTotal,
  onManche,
  onAddManche,
  onRemoveManche,
}: Readonly<{
  scoring: ScoringSpec;
  ladder: StageLadder;
  step: number;
  players: Player[];
  mode: LadderMode;
  totals: Record<string, string>;
  manches: readonly LadderManche[];
  mancheKeys: readonly number[];
  /** What the entry still lacks, shown under the manches. */
  error: string | null;
  disabled: boolean;
  onMode: (mode: LadderMode) => void;
  onTotal: (id: PlayerId, text: string) => void;
  onManche: (
    index: number,
    playerId: PlayerId,
    patch: Partial<LadderManche[string]>,
  ) => void;
  onAddManche: () => void;
  onRemoveManche: (index: number) => void;
}>) {
  return (
    <div className="flex flex-col gap-3">
      <EntryModeToggle
        name="ladderMode"
        value={mode}
        options={[
          { value: "total", label: "Score final" },
          { value: "detail", label: "Manche par manche" },
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
          <LadderMancheCardList
            manches={manches}
            keys={mancheKeys}
            players={players}
            ladder={ladder}
            step={step}
            disabled={disabled}
            onChange={onManche}
            onRemove={onRemoveManche}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={onAddManche}
            className="self-start rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
          >
            + Ajouter une manche
          </button>
          {error === null ? null : (
            <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
