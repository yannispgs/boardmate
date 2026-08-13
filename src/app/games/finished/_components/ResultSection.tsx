"use client";

import type { Player, PlayerId, RoundGoal, ScoringSpec } from "@/lib/domain";
import type { FinishedGoals, StageGoalRaw } from "@/lib/game/finished-goals";
import type { StagePick } from "@/lib/game/stage";
import type { CategoryRaw } from "../../_components/CategoryScoreGrid";
import type { EntryMode, FinishedEntry } from "./finished-entry";
import { ScoreEntrySection } from "./ScoreEntrySection";
import { StageGoalsSection } from "./StageGoalsSection";
import { WinnerChoice } from "./WinnerChoice";

/**
 * Everything the night ended on: the day it was played, the manches' goals when
 * the table kept them, the scores, and who won. Shown only once there is a game
 * and a table, because none of it can be asked before that.
 *
 * Each block appears only if this game has something to ask there — a game with
 * no calendar has no goals to detail, an unscored one no sheet to fill.
 */
export function ResultSection({
  className,
  endedAt,
  maxDay,
  players,
  scoring,
  entry,
  entryMode,
  stageLabel,
  catalogue,
  schedule,
  picks,
  stageRaw,
  goals,
  totals,
  catRaw,
  piles,
  winners,
  needsWinnerChoice,
  disabled,
  onEndedAt,
  onPicks,
  onStageCell,
  onEntryMode,
  onTotal,
  onCell,
  onPile,
  onWinner,
}: Readonly<{
  className: string;
  /** The local day the game ended, as the date input holds it. */
  endedAt: string;
  /** Today where the reader is — a game can't have ended tomorrow. */
  maxDay: string;
  players: Player[];
  scoring: ScoringSpec | null;
  entry: FinishedEntry;
  entryMode: EntryMode;
  stageLabel: string;
  catalogue: RoundGoal[];
  schedule: number[];
  picks: StagePick[];
  stageRaw: StageGoalRaw;
  goals: FinishedGoals;
  totals: Record<string, string>;
  catRaw: CategoryRaw;
  piles: Record<string, number>;
  winners: PlayerId[];
  needsWinnerChoice: boolean;
  disabled: boolean;
  onEndedAt: (day: string) => void;
  onPicks: (picks: StagePick[]) => void;
  onStageCell: (playerId: PlayerId, key: string, text: string) => void;
  onEntryMode: (mode: EntryMode) => void;
  onTotal: (id: PlayerId, text: string) => void;
  onCell: (id: PlayerId, key: string, text: string) => void;
  onPile: (key: string, value: number) => void;
  onWinner: (id: PlayerId) => void;
}>) {
  return (
    <section className={className}>
      <h2 className="text-sm font-semibold">Résultat</h2>

      <label className="flex items-center justify-between gap-2 text-sm">
        <span>Date de fin</span>
        <input
          type="date"
          value={endedAt}
          max={maxDay}
          onChange={e => onEndedAt(e.target.value)}
          className="rounded-lg border border-black/15 bg-white px-2 py-1 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
        />
      </label>

      {schedule.length > 0 && catalogue.length > 0 ? (
        <StageGoalsSection
          stageLabel={stageLabel}
          players={players}
          catalogue={catalogue}
          picks={picks}
          raw={stageRaw}
          goals={goals}
          disabled={disabled}
          onPicks={onPicks}
          onCell={onStageCell}
        />
      ) : null}

      {scoring !== null ? (
        <ScoreEntrySection
          scoring={scoring}
          entry={entry}
          players={players}
          entryMode={entryMode}
          totals={totals}
          catRaw={catRaw}
          piles={piles}
          disabled={disabled}
          onEntryMode={onEntryMode}
          onTotal={onTotal}
          onCell={onCell}
          onPile={onPile}
        />
      ) : null}

      {needsWinnerChoice ? (
        <WinnerChoice
          candidates={entry.winnerCandidates}
          winners={winners}
          scored={scoring !== null}
          onToggle={onWinner}
        />
      ) : null}
    </section>
  );
}
