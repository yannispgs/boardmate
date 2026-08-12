"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type {
  Boardgame,
  ExtensionId,
  ExtensionScenarioId,
  Player,
  PlayerId,
} from "@/lib/domain";
import {
  finishedGoals,
  mergeCells,
  type StageGoalRaw,
} from "@/lib/game/finished-goals";
import { finishedSetup } from "@/lib/game/finished-setup";
import { localDay } from "@/lib/game/game-filters";
import { type StagePick, stageGoalPrefill } from "@/lib/game/stage";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useExtensions } from "@/lib/hooks/use-extensions";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import { toggled } from "@/lib/ui/selection";
import type { CategoryRaw } from "../../_components/CategoryScoreGrid";
import { ExtensionPicker } from "../../_components/ExtensionPicker";
import { BoardgamePicker } from "./BoardgamePicker";
import { type EntryMode, finishedEntry } from "./finished-entry";
import { PlayerSeatPicker } from "./PlayerSeatPicker";
import { ResultSection } from "./ResultSection";

/** Today where the reader is, for the default end-date field. */
function today(): string {
  return localDay(new Date().toISOString());
}

const sectionClass =
  "flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10";

/**
 * Records a game that was played away from the app — pick the game and what it
 * was played with, the table in seat order, the day it ended, then whatever was
 * written down: the final totals, or the sheet the game is really scored on.
 */
export function FinishedGameForm() {
  const router = useRouter();
  const { boardgames } = useBoardgames();
  const { players } = usePlayers();
  const { createFinished } = useGames();

  const [boardgame, setBoardgame] = useState<Boardgame | null>(null);
  const [selected, setSelected] = useState<Player[]>([]);
  const [endedAt, setEndedAt] = useState(today());
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [entryMode, setEntryMode] = useState<EntryMode>("total");
  const [catRaw, setCatRaw] = useState<CategoryRaw>({});
  const [piles, setPiles] = useState<Record<string, number>>({});
  const [extensionIds, setExtensionIds] = useState<ExtensionId[]>([]);
  const [scenarioByExtension, setScenarioByExtension] = useState<
    Record<ExtensionId, ExtensionScenarioId>
  >({});
  const [picks, setPicks] = useState<StagePick[]>([]);
  const [stageRaw, setStageRaw] = useState<StageGoalRaw>({});
  // Null while the form's own suggestion stands; set once the table picks.
  const [winnerIds, setWinnerIds] = useState<PlayerId[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const games = boardgames.filter(b => b.isActive && b.kind === "competitive");
  const extensions = useExtensions(boardgame?.id ?? null);
  // A game played with Oceania is scored on Oceania's sheet and was laid out
  // with its tiles, exactly as it would have been at launch.
  const { scoring, catalogue, schedule, stageLabel } = finishedSetup(
    boardgame,
    extensions.filter(e => extensionIds.includes(e.id)),
  );

  const goals = finishedGoals(
    schedule,
    picks,
    catalogue,
    selected.map(p => p.id),
    stageRaw,
  );

  const entry = finishedEntry(
    scoring,
    selected,
    entryMode,
    totals,
    catRaw,
    piles,
  );

  const needsWinnerChoice =
    scoring === null ? selected.length >= 1 : entry.winnerCandidates.length > 1;
  // A scored game proposes its co-leaders (one of them when there is a clear
  // top scorer, all of them on a tie — a shared victory until narrowed down);
  // an unscored one has nothing to propose.
  const suggestedWinners =
    scoring === null ? [] : entry.winnerCandidates.map(p => p.id);
  const effectiveWinners = winnerIds ?? suggestedWinners;

  function chooseBoardgame(b: Boardgame) {
    setBoardgame(b);
    setTotals({});
    setCatRaw({});
    setPiles({});
    setExtensionIds([]);
    setScenarioByExtension({});
    setPicks([]);
    setStageRaw({});
    // A category sheet is long to fill in after the fact, so it opens on the
    // total. Shared piles are the opposite: they are what was on the table, and
    // the total is the multiplication the app is there to do.
    setEntryMode(b.scoring?.entry === "pairs" ? "detail" : "total");
    setWinnerIds(null);
  }

  function togglePlayer(p: Player) {
    setWinnerIds(null);
    // A pile is named after its place round the table, so changing who sits
    // there makes the counted ones meaningless.
    setPiles({});
    setSelected(prev =>
      prev.some(s => s.id === p.id)
        ? prev.filter(s => s.id !== p.id)
        : [...prev, p],
    );
  }

  /**
   * Writes the manches' sum into the sheet's « Objectifs de manche » line. The
   * line stays typeable afterwards: the detail proposes the total it implies,
   * it doesn't own it — a sheet and a board can legitimately disagree, and the
   * one written down that night wins.
   */
  function fillDerived(nextPicks: StagePick[], nextRaw: StageGoalRaw) {
    const playerIds = selected.map(p => p.id);
    const next = finishedGoals(
      schedule,
      nextPicks,
      catalogue,
      playerIds,
      nextRaw,
    );

    if (!next.complete || scoring?.sheet === undefined) {
      return;
    }

    // The same cells a game played in the app carries to its end-of-game sheet.
    const cells = stageGoalPrefill(scoring.sheet, playerIds, next.scores);

    setWinnerIds(null);
    setCatRaw(raw => mergeCells(raw, cells));
  }

  const canSubmit =
    boardgame !== null &&
    selected.length >= 2 &&
    entry.scoresComplete &&
    effectiveWinners.length > 0 &&
    !submitting;

  async function submit() {
    if (!canSubmit || !boardgame) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createFinished({
        boardgameId: boardgame.id,
        endedAt: new Date(`${endedAt}T12:00:00`).toISOString(),
        winnerIds: effectiveWinners,
        players: selected.map((p, index) => ({
          playerId: p.id,
          seatOrder: index,
          score: entry.scoreOf(p.id),
          breakdown: entry.breakdownOf(p.id),
        })),
        extensionIds,
        scenarioByExtension,
        // All or nothing: a half-remembered calendar is not recorded at all.
        stages: goals.complete ? goals.stages : [],
        stageScores: goals.scores,
      });
      router.push("/games");
    } catch {
      setError("Impossible d'enregistrer la partie.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <BoardgamePicker
        boardgames={games}
        selected={boardgame}
        className={sectionClass}
        onPick={chooseBoardgame}
      />

      {boardgame && extensions.length > 0 ? (
        <ExtensionPicker
          extensions={extensions}
          selected={extensionIds}
          scenarioByExtension={scenarioByExtension}
          players={selected.length}
          onToggle={id => {
            setWinnerIds(null);
            setExtensionIds(prev => toggled(prev, id));
          }}
          onPickScenario={(extension, id) => {
            setScenarioByExtension(prev => ({ ...prev, [extension]: id }));
          }}
        />
      ) : null}

      {boardgame ? (
        <PlayerSeatPicker
          className={sectionClass}
          players={players.filter(p => p.isActive)}
          selected={selected}
          onToggle={togglePlayer}
        />
      ) : null}

      {boardgame && selected.length >= 2 ? (
        <ResultSection
          className={sectionClass}
          endedAt={endedAt}
          maxDay={today()}
          players={selected}
          scoring={scoring}
          entry={entry}
          entryMode={entryMode}
          stageLabel={stageLabel}
          catalogue={catalogue}
          schedule={schedule}
          picks={picks}
          stageRaw={stageRaw}
          goals={goals}
          totals={totals}
          catRaw={catRaw}
          piles={piles}
          winners={effectiveWinners}
          needsWinnerChoice={needsWinnerChoice}
          disabled={submitting}
          onEndedAt={setEndedAt}
          onPicks={next => {
            setPicks(next);
            fillDerived(next, stageRaw);
          }}
          onStageCell={(id, key, text) => {
            const next: StageGoalRaw = {
              ...stageRaw,
              [id]: { ...stageRaw[id], [key]: text },
            };

            setStageRaw(next);
            fillDerived(picks, next);
          }}
          onEntryMode={mode => {
            setWinnerIds(null);
            setEntryMode(mode);
          }}
          onTotal={(id, text) => {
            setWinnerIds(null);
            setTotals(t => ({ ...t, [id]: text }));
          }}
          onCell={(id, key, text) => {
            setWinnerIds(null);
            setCatRaw(r => ({ ...r, [id]: { ...r[id], [key]: text } }));
          }}
          onPile={(key, value) => {
            setWinnerIds(null);
            setPiles(p => ({ ...p, [key]: value }));
          }}
          onWinner={id => setWinnerIds(toggled(effectiveWinners, id))}
        />
      ) : null}

      <ErrorText message={error} />

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        className="self-start rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {submitting ? "Enregistrement…" : "Enregistrer la partie"}
      </button>
    </div>
  );
}
