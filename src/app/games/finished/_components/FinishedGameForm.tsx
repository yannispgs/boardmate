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
import { composeGoals, composeScoring } from "@/lib/game/extensions";
import { finishedGoals, type StageGoalRaw } from "@/lib/game/finished-goals";
import { localDay } from "@/lib/game/game-filters";
import { derivedKeys } from "@/lib/game/scoring";
import type { StagePick } from "@/lib/game/stage";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useExtensions } from "@/lib/hooks/use-extensions";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import type { CategoryRaw } from "../../_components/CategoryScoreGrid";
import { ExtensionPicker } from "../../_components/ExtensionPicker";
import { type EntryMode, finishedEntry } from "./finished-entry";
import { PlayerSeatPicker } from "./PlayerSeatPicker";
import { ScoreEntrySection } from "./ScoreEntrySection";
import { StageGoalsSection } from "./StageGoalsSection";
import { WinnerChoice } from "./WinnerChoice";

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
  const active = extensions.filter(e => extensionIds.includes(e.id));
  // A game played with Oceania is scored on Oceania's sheet and was laid out
  // with its tiles, exactly as it would have been at launch.
  const scoring = composeScoring(boardgame?.scoring ?? null, active);
  const catalogue = composeGoals(boardgame?.roundGoals ?? [], active);

  const schedule =
    boardgame?.stages?.advance === "schedule"
      ? (boardgame.stages.schedule ?? [])
      : [];
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
    const next = finishedGoals(
      schedule,
      nextPicks,
      catalogue,
      selected.map(p => p.id),
      nextRaw,
    );

    if (!next.complete || scoring?.sheet === undefined) {
      return;
    }

    const keys = derivedKeys(scoring.sheet, "stageGoals");

    setWinnerIds(null);
    setCatRaw(raw => {
      const filled = { ...raw };

      for (const p of selected) {
        const cells = { ...filled[p.id] };

        for (const key of keys) {
          cells[key] = String(next.totals[p.id] ?? 0);
        }

        filled[p.id] = cells;
      }

      return filled;
    });
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
      <section className={sectionClass}>
        <h2 className="text-sm font-semibold">Jeu</h2>
        <div className="flex flex-wrap gap-2">
          {games.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => chooseBoardgame(b)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                boardgame?.id === b.id
                  ? "border-indigo-500 bg-indigo-600 text-white"
                  : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </section>

      {boardgame && extensions.length > 0 ? (
        <ExtensionPicker
          extensions={extensions}
          selected={extensionIds}
          scenarioByExtension={scenarioByExtension}
          players={selected.length}
          onToggle={id => {
            setWinnerIds(null);
            setExtensionIds(prev =>
              prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id],
            );
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
        <section className={sectionClass}>
          <h2 className="text-sm font-semibold">Résultat</h2>

          <label className="flex items-center justify-between gap-2 text-sm">
            <span>Date de fin</span>
            <input
              type="date"
              value={endedAt}
              max={today()}
              onChange={e => setEndedAt(e.target.value)}
              className="rounded-lg border border-black/15 bg-white px-2 py-1 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
            />
          </label>

          {schedule.length > 0 && catalogue.length > 0 ? (
            <StageGoalsSection
              stageLabel={boardgame.stages?.label ?? "Manche"}
              players={selected}
              catalogue={catalogue}
              picks={picks}
              raw={stageRaw}
              goals={goals}
              disabled={submitting}
              onPicks={next => {
                setPicks(next);
                fillDerived(next, stageRaw);
              }}
              onCell={(id, key, text) => {
                const next: StageGoalRaw = {
                  ...stageRaw,
                  [id]: { ...stageRaw[id], [key]: text },
                };

                setStageRaw(next);
                fillDerived(picks, next);
              }}
            />
          ) : null}

          {scoring !== null ? (
            <ScoreEntrySection
              scoring={scoring}
              entry={entry}
              players={selected}
              entryMode={entryMode}
              totals={totals}
              catRaw={catRaw}
              piles={piles}
              disabled={submitting}
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
                setCatRaw(r => ({
                  ...r,
                  [id]: { ...r[id], [key]: text },
                }));
              }}
              onPile={(key, value) => {
                setWinnerIds(null);
                setPiles(p => ({ ...p, [key]: value }));
              }}
            />
          ) : null}

          {needsWinnerChoice ? (
            <WinnerChoice
              candidates={entry.winnerCandidates}
              winners={effectiveWinners}
              scored={scoring !== null}
              onToggle={id => {
                setWinnerIds(
                  effectiveWinners.includes(id)
                    ? effectiveWinners.filter(w => w !== id)
                    : [...effectiveWinners, id],
                );
              }}
            />
          ) : null}
        </section>
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
