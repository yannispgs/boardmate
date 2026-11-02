"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type {
  Boardgame,
  ExtensionId,
  ExtensionScenarioId,
  Player,
  PlayerId,
  ScoringSpec,
} from "@/lib/domain";
import {
  type BetManche,
  betFinished,
  blankBetManche,
  patchBetManche,
} from "@/lib/game/bet-finished";
import {
  finishedGoals,
  mergeCells,
  type StageGoalRaw,
} from "@/lib/game/finished-goals";
import { finishedSetup } from "@/lib/game/finished-setup";
import {
  type FinishedWinners,
  finishedWinners,
} from "@/lib/game/finished-winner";
import { localDay } from "@/lib/game/game-filters";
import type { LadderEntryRules } from "@/lib/game/ladder";
import {
  blankManche,
  type LadderManche,
  ladderFinished,
  type MancheFinished,
  type MancheMode,
  patchManche,
} from "@/lib/game/ladder-finished";
import { type StagePick, stageGoalPrefill } from "@/lib/game/stage";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useExtensions } from "@/lib/hooks/use-extensions";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import { toggled } from "@/lib/ui/selection";
import type { CategoryRaw } from "../../_components/CategoryScoreGrid";
import { ExtensionPicker } from "../../_components/ExtensionPicker";
import {
  type EntryMode,
  type FinishedEntry,
  finishedEntry,
} from "../../_components/finished-entry";
import { BetMancheGrid } from "./BetMancheGrid";
import { BoardgamePicker } from "./BoardgamePicker";
import { LadderMancheGrid } from "./LadderMancheGrid";
import { MancheEntrySection } from "./MancheEntrySection";
import { PlayerSeatPicker } from "./PlayerSeatPicker";
import { ResultSection } from "./ResultSection";

/** Today where the reader is, for the default end-date field. */
function today(): string {
  return localDay(new Date().toISOString());
}

/**
 * What the form can file, read off the sheet — or, on a game entered manche by
 * manche, off the manches: who can win, whether the table has to say it, and
 * the scores.
 */
function readResult(
  entry: FinishedEntry,
  climb: MancheFinished | null,
  scoring: ScoringSpec | null,
  selected: Player[],
): {
  candidates: Player[];
  choice: FinishedWinners;
  scoresComplete: boolean;
  scoreOf: (id: PlayerId) => number | null;
} {
  if (climb === null) {
    return {
      candidates: entry.winnerCandidates,
      choice: finishedWinners(scoring, selected.length, entry.winnerCandidates),
      scoresComplete: entry.scoresComplete,
      scoreOf: entry.scoreOf,
    };
  }

  return {
    candidates: selected.filter(p => climb.candidates.includes(p.id)),
    choice: {
      asked: climb.asked,
      preselected: climb.preselected,
      rules: climb.tied ? (scoring?.tieBreak ?? []) : [],
      tied: climb.tied,
    },
    scoresComplete: climb.error === null,
    scoreOf: climb.scoreOf,
  };
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
  // Phase 10 and Luz: the totals alone, or the manches one by one — each
  // keyed by a number of its own, since removing one shifts the others' places.
  const [mancheMode, setMancheMode] = useState<MancheMode>("total");
  const [manches, setManches] = useState<
    Array<{ key: number; manche: LadderManche }>
  >([]);
  const [betManches, setBetManches] = useState<
    Array<{ key: number; manche: BetManche }>
  >([]);
  const [nextKey, setNextKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Everything but a co-operative box, which has no result to record here yet.
  // Written as what is turned away rather than what is let in: a hybrid game is
  // played, ended and ranked exactly like a competitive one everywhere else in
  // the app, so an allow-list dropped it from this screen alone.
  const games = boardgames.filter(b => b.isActive && b.kind !== "cooperative");
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

  // A laddered game is read off its climb, not off the sheet: who can win, and
  // whether the table has to say it, come from there. So is a game played on
  // bets entered donne by donne, off its donnes.
  const ladder = boardgame?.stages?.ladder ?? null;
  const bet = boardgame?.stages?.bet ?? null;
  // How many manches the grid opens on: the game's own count, or a rung each.
  const opening = boardgame?.stages?.count ?? ladder?.steps.length ?? 0;
  // Phase 10's checks of a manche: points in fives, under what a hand can
  // hold, and a whole hand at the least without the phase down.
  const entryRules: LadderEntryRules = {
    fixed: false,
    step: boardgame?.stages?.pointsStep ?? 1,
    maxPoints: boardgame?.stages?.maxPoints ?? null,
    unclearedMin: ladder?.unclearedMin ?? 0,
  };
  const climb = readManches();
  const { candidates, choice, scoresComplete, scoreOf } = readResult(
    entry,
    climb,
    scoring,
    selected,
  );
  const effectiveWinners = winnerIds ?? choice.preselected;

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
    setMancheMode("total");
    setManches([]);
    setBetManches([]);
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

  /** The night read off its manches, on a game entered that way — or null. */
  function readManches(): MancheFinished | null {
    const ids = selected.map(p => p.id);

    if (ladder !== null) {
      return ladderFinished(
        mancheMode,
        ids,
        totals,
        manches.map(m => m.manche),
        ladder.steps.length,
        entryRules,
      );
    }

    // The totals alone go through the ordinary sheet: they say who won.
    return bet === null || mancheMode === "total"
      ? null
      : betFinished(
          ids,
          betManches.map(m => m.manche),
          bet,
          stageLabel,
        );
  }

  /** Adds `count` empty manches at the end of the grid. */
  function addManches(count: number) {
    const ids = selected.map(p => p.id);
    const keys = Array.from({ length: count }, (_unused, i) => nextKey + i);

    setWinnerIds(null);

    if (bet === null) {
      setManches(list => [
        ...list,
        ...keys.map(key => ({ key, manche: blankManche(ids) })),
      ]);
    } else {
      setBetManches(list => [
        ...list,
        ...keys.map(key => ({ key, manche: blankBetManche(ids) })),
      ]);
    }

    setNextKey(k => k + count);
  }

  /** Puts one manche's line right in whichever grid the game uses. */
  function patchRow<T>(
    list: Array<{ key: number; manche: T }>,
    index: number,
    patch: (manche: T) => T,
  ): Array<{ key: number; manche: T }> {
    return list.map((m, i) =>
      i === index ? { ...m, manche: patch(m.manche) } : m,
    );
  }

  /** The grid of the game's manches: Luz's donnes, or Phase 10's climb. */
  function mancheGrid(): ReactNode {
    if (bet !== null) {
      return (
        <BetMancheGrid
          stageLabel={stageLabel}
          manches={betManches.map(m => m.manche)}
          keys={betManches.map(m => m.key)}
          players={selected}
          bet={bet}
          disabled={submitting}
          onChange={(index, playerId, patch) => {
            setWinnerIds(null);
            setBetManches(list =>
              patchRow(list, index, manche =>
                patchBetManche(manche, playerId, patch, bet, index + 1),
              ),
            );
          }}
          onRemove={removeManche}
        />
      );
    }

    return ladder === null ? null : (
      <LadderMancheGrid
        manches={manches.map(m => m.manche)}
        keys={manches.map(m => m.key)}
        players={selected}
        ladder={ladder}
        rules={entryRules}
        disabled={submitting}
        onChange={(index, playerId, patch) => {
          setWinnerIds(null);
          setManches(list =>
            patchRow(list, index, manche =>
              patchManche(manche, playerId, patch, entryRules),
            ),
          );
        }}
        onRemove={removeManche}
      />
    );
  }

  function removeManche(index: number) {
    setWinnerIds(null);
    setManches(list => list.filter((_m, i) => i !== index));
    setBetManches(list => list.filter((_m, i) => i !== index));
  }

  const canSubmit =
    boardgame !== null &&
    selected.length >= 2 &&
    scoresComplete &&
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
          score: scoreOf(p.id),
          breakdown: climb === null ? entry.breakdownOf(p.id) : null,
        })),
        extensionIds,
        scenarioByExtension,
        // All or nothing: a half-remembered calendar is not recorded at all.
        stages: goals.complete ? goals.stages : [],
        stageScores: climb === null ? goals.scores : climb.stageScores,
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
          candidates={candidates}
          scoreEntry={
            (ladder !== null || bet !== null) && scoring !== null ? (
              <MancheEntrySection
                scoring={scoring}
                stageLabel={stageLabel}
                players={selected}
                mode={mancheMode}
                totals={totals}
                grid={mancheGrid()}
                error={climb?.error ?? null}
                disabled={submitting}
                onMode={mode => {
                  setWinnerIds(null);
                  setMancheMode(mode);

                  // A game played to its end lasts at least as many manches as
                  // the ladder has rungs (Phase 10), or exactly its count (Luz),
                  // so the grid opens on that many rather than on nothing.
                  if (
                    mode === "detail" &&
                    manches.length === 0 &&
                    betManches.length === 0
                  ) {
                    addManches(opening);
                  }
                }}
                onTotal={(id, text) => {
                  setWinnerIds(null);
                  setTotals(t => ({ ...t, [id]: text }));
                }}
                onAddManche={() => addManches(1)}
              />
            ) : null
          }
          choice={choice}
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
