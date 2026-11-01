"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type {
  PlayerId,
  PopulatedGame,
  StageScore,
  TieBreakRule,
} from "@/lib/domain";
import type { EndOutcome } from "@/lib/game/end-outcome";
import { composeGoals } from "@/lib/game/extensions";
import {
  type FinishedWinners,
  finishedWinners,
} from "@/lib/game/finished-winner";
import {
  type CorrectionSeed,
  changedStages,
  correctedWinners,
  correctionSeed,
  correctsByStage,
  keptTieBreak,
  recordedStages,
  stageDerivedKeys,
  stageTotals,
  withStageEntry,
} from "@/lib/game/score-correction";
import { mergePrefill, scoreDirectionOf } from "@/lib/game/scoring";
import { stageGoalLabel, stageGoalPrefill } from "@/lib/game/stage";
import { type StageEntry, stageFlags } from "@/lib/game/stage-tally";
import { getGameRepository } from "@/lib/repositories";
import { toggled } from "@/lib/ui/selection";
import {
  type EntryMode,
  finishedEntry,
} from "../../../_components/finished-entry";
import { ScoreEntrySection } from "../../../_components/ScoreEntrySection";
import { WinnerChoice } from "../../../_components/WinnerChoice";
import { BetPointsPrompt } from "./BetPointsPrompt";
import { PastStageCardList } from "./PastStageCardList";
import { StagePointsPrompt } from "./StagePointsPrompt";
import { goalIntro } from "./stage-intro";
import { stageTally } from "./stage-tallies";

/**
 * Correcting a finished party's scores, from its final score panel.
 *
 * The entry is the one « Ajouter une partie terminée » uses — the totals, the
 * category grid or the ring of piles — opened on what was recorded rather than
 * on blanks. A game that recorded its manches reopens them one by one, with the
 * prompt the table filled in during play: Odin's total is their sum, Wingspan's
 * « Objectifs de manche » line too. The winner is read off the corrected sheet; when leaders come out
 * level the table picks among them, with whoever was crowned before still
 * picked if they are still in the lead. Everything that is derived from the
 * scores — records, statistics — follows on its own, and the history keeps the
 * before and after of every line.
 *
 * The caller decides whether this may be offered at all (the permission, and a
 * scored game).
 */
export function ScoreCorrection({
  game,
  onSaved,
}: Readonly<{
  game: PopulatedGame;
  onSaved: () => void;
}>) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-center rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        Corriger les scores
      </button>
    );
  }

  return (
    <CorrectionForm
      game={game}
      onCancel={() => setOpen(false)}
      onSaved={() => {
        // Closed before the reload lands: reopened, it seeds itself afresh
        // from the corrected party rather than from the one it replaced.
        setOpen(false);
        onSaved();
      }}
    />
  );
}

function CorrectionForm({
  game,
  onCancel,
  onSaved,
}: Readonly<{
  game: PopulatedGame;
  onCancel: () => void;
  onSaved: () => void;
}>) {
  const scoring = game.boardgame.scoring;
  const stageSpec = game.boardgame.stages;
  const seats = [...game.players].sort((a, b) => a.seatOrder - b.seatOrder);
  const players = seats.map(s => s.player);
  const ids = players.map(p => p.id);

  const [seed] = useState<CorrectionSeed | null>(() =>
    scoring ? correctionSeed(scoring, seats) : null,
  );
  const [entryMode, setEntryMode] = useState<EntryMode>(
    seed?.entryMode ?? "total",
  );
  const [totals, setTotals] = useState(seed?.totals ?? {});
  const [catRaw, setCatRaw] = useState(seed?.catRaw ?? {});
  const [piles, setPiles] = useState(seed?.piles ?? {});
  const [stageScores, setStageScores] = useState<StageScore[]>(
    game.stageScores,
  );
  const [editedStage, setEditedStage] = useState<number | null>(null);
  const [picked, setPicked] = useState<PlayerId[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (scoring === null) {
    return null;
  }

  const byStage = correctsByStage(game.boardgame, game.stageScores);
  const lockedKeys = stageDerivedKeys(scoring, game.stageScores);
  const sheet = scoring.entry === "categories" ? (scoring.sheet ?? []) : [];
  const shownRaw =
    lockedKeys.length === 0
      ? catRaw
      : mergePrefill([catRaw, stageGoalPrefill(sheet, ids, stageScores)]);
  const stageLabel = stageSpec?.label ?? "Manche";
  const catalogue = composeGoals(game.boardgame.roundGoals, game.extensions);
  const recorded = recordedStages(stageScores);

  // Manches the table closed itself are read the way they were played — the
  // totals summed (Odin), or the climb (Phase 10): the same tally the board
  // runs on, its rules and its winner.
  const tally = byStage
    ? stageTally(game, players, scoreDirectionOf(scoring))
    : null;
  const ended = tally?.end(stageScores) ?? null;
  const climb = ended?.kind === "outcome" ? ended.outcome : null;

  const entry = finishedEntry(
    scoring,
    players,
    byStage ? "total" : entryMode,
    byStage ? stageTotals(ids, stageScores) : totals,
    shownRaw,
    piles,
  );
  const candidates =
    climb === null
      ? entry.winnerCandidates
      : players.filter(p => climb.contenders?.includes(p.id));
  const choice =
    climb === null
      ? finishedWinners(scoring, players.length, entry.winnerCandidates)
      : climbChoice(climb, scoring.tieBreak ?? []);
  const previousWinners = seats.filter(s => s.isWinner).map(s => s.playerId);
  const winners =
    picked ??
    correctedWinners(
      choice.asked,
      choice.preselected,
      previousWinners,
      candidates.map(p => p.id),
    );
  const canSave = entry.scoresComplete && winners.length > 0 && !busy;

  /** Puts a reopened manche back with what was entered, and closes it. */
  function reenter(stage: number, points: StageEntry[]) {
    setStageScores(scores => withStageEntry(scores, stage, points));
    setPicked(null);
    setEditedStage(null);
  }

  async function save() {
    if (!canSave || scoring === null) {
      return;
    }

    setBusy(true);
    setError(null);

    const after = Object.fromEntries(
      players.map(p => [p.id, entry.scoreOf(p.id) ?? 0]),
    );
    const before = Object.fromEntries(seats.map(s => [s.playerId, s.score]));

    try {
      const repository = getGameRepository();

      await Promise.all(
        changedStages(game.stageScores, stageScores).map(stage =>
          repository.setStageScores(
            game.id,
            stage,
            stageScores.filter(s => s.stage === stage),
          ),
        ),
      );
      await repository.rescore(
        game.id,
        winners,
        players.map(p => ({
          playerId: p.id,
          score: entry.scoreOf(p.id) ?? 0,
          // Null on purpose when the totals were typed: a detail kept from
          // before would no longer add up to the corrected total.
          breakdown: entry.breakdownOf(p.id),
        })),
        keptTieBreak(
          game.tieBreak,
          scoring,
          before,
          after,
          previousWinners,
          winners,
        ),
      );
      onSaved();
    } catch {
      setError("Impossible d'enregistrer la correction.");
      setBusy(false);
    }
  }

  return (
    <section
      data-testid="score-correction"
      className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10"
    >
      <h3 className="text-sm font-semibold">Corriger les scores</h3>

      {tally !== null ? (
        tally.board(stageScores, Number.POSITIVE_INFINITY, false)
      ) : (
        <ScoreEntrySection
          scoring={scoring}
          entry={entry}
          players={players}
          entryMode={entryMode}
          totals={totals}
          catRaw={shownRaw}
          piles={piles}
          readOnlyKeys={lockedKeys}
          disabled={busy}
          onEntryMode={setEntryMode}
          onTotal={(id, text) => setTotals(t => ({ ...t, [id]: text }))}
          onCell={(id, key, text) =>
            setCatRaw(r => ({ ...r, [id]: { ...r[id], [key]: text } }))
          }
          onPile={(key, value) => setPiles(p => ({ ...p, [key]: value }))}
        />
      )}

      <PastStageCardList
        closed={recorded}
        stageLabel={stageLabel}
        players={players}
        disabled={busy}
        open
        onEdit={setEditedStage}
      />

      {choice.asked ? (
        <WinnerChoice
          candidates={candidates}
          winners={winners}
          tied={choice.tied}
          rules={choice.rules}
          onToggle={id => setPicked(toggled(winners, id))}
        />
      ) : null}

      <ErrorText message={error} />

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={save}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Enregistrer la correction
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
      </div>

      {editedStage !== null &&
      stageSpec?.bet !== undefined &&
      tally !== null ? (
        <BetPointsPrompt
          stage={editedStage}
          stageLabel={stageLabel}
          players={players}
          bet={stageSpec.bet}
          initial={recorded.find(st => st.stage === editedStage)?.points ?? {}}
          initialHedged={stageFlags(stageScores, editedStage, "hedged")}
          validate={entries => tally.validate(entries, editedStage)}
          disabled={busy}
          confirmLabel="Valider"
          onConfirm={points => reenter(editedStage, points)}
          onCancel={() => setEditedStage(null)}
        />
      ) : null}

      {editedStage === null || stageSpec?.bet !== undefined ? null : (
        <StagePointsPrompt
          stage={editedStage}
          stageLabel={stageLabel}
          intro={
            tally !== null
              ? tally.intro
              : goalIntro(
                  stageGoalLabel(
                    game.stages.find(st => st.stage === editedStage),
                    catalogue,
                  ),
                )
          }
          players={players}
          initial={recorded.find(st => st.stage === editedStage)?.points ?? {}}
          initialCleared={stageFlags(stageScores, editedStage, "cleared")}
          rungs={tally?.rungs(stageScores, editedStage) ?? null}
          validate={
            tally === null
              ? undefined
              : entries => tally.validate(entries, editedStage)
          }
          max={tally?.max ?? null}
          step={tally?.step ?? 1}
          disabled={busy}
          confirmLabel="Valider"
          onConfirm={points => reenter(editedStage, points)}
          onCancel={() => setEditedStage(null)}
        />
      )}
    </section>
  );
}

/**
 * Who a corrected laddered party (Phase 10) is crowned by: the climb names the
 * winner when one player alone tops it on the fewest points; level, the table
 * is asked among those level — with the game's own tie-break named.
 */
function climbChoice(
  climb: EndOutcome,
  rules: TieBreakRule[],
): FinishedWinners {
  const settled = climb.winners.length === 1;

  return {
    asked: !settled,
    preselected: climb.winners,
    rules: settled ? [] : rules,
    tied: !settled,
  };
}
