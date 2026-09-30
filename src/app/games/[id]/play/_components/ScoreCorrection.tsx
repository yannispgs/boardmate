"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { finishedWinners } from "@/lib/game/finished-winner";
import {
  type CorrectionSeed,
  correctedWinners,
  correctionSeed,
  keptTieBreak,
} from "@/lib/game/score-correction";
import { getGameRepository } from "@/lib/repositories";
import { toggled } from "@/lib/ui/selection";
import {
  type EntryMode,
  finishedEntry,
} from "../../../_components/finished-entry";
import { ScoreEntrySection } from "../../../_components/ScoreEntrySection";
import { WinnerChoice } from "../../../_components/WinnerChoice";

/**
 * Correcting a finished party's scores, from its final score panel.
 *
 * The entry is the one « Ajouter une partie terminée » uses — the totals, the
 * category grid or the ring of piles — opened on what was recorded rather than
 * on blanks. The winner is read off the corrected sheet; when leaders come out
 * level the table picks among them, with whoever was crowned before still
 * picked if they are still in the lead. Everything that is derived from the
 * scores — records, statistics — follows on its own, and the history keeps the
 * before and after of every line.
 *
 * The caller decides whether this may be offered at all (the permission, and a
 * game whose scores are typed rather than counted as it went).
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
  const seats = [...game.players].sort((a, b) => a.seatOrder - b.seatOrder);
  const players = seats.map(s => s.player);

  const [seed] = useState<CorrectionSeed | null>(() =>
    scoring ? correctionSeed(scoring, seats) : null,
  );
  const [entryMode, setEntryMode] = useState<EntryMode>(
    seed?.entryMode ?? "total",
  );
  const [totals, setTotals] = useState(seed?.totals ?? {});
  const [catRaw, setCatRaw] = useState(seed?.catRaw ?? {});
  const [piles, setPiles] = useState(seed?.piles ?? {});
  const [picked, setPicked] = useState<PlayerId[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (scoring === null) {
    return null;
  }

  const entry = finishedEntry(
    scoring,
    players,
    entryMode,
    totals,
    catRaw,
    piles,
  );
  const choice = finishedWinners(
    scoring,
    players.length,
    entry.winnerCandidates,
  );
  const previousWinners = seats.filter(s => s.isWinner).map(s => s.playerId);
  const winners =
    picked ??
    correctedWinners(
      choice.asked,
      choice.preselected,
      previousWinners,
      entry.winnerCandidates.map(p => p.id),
    );
  const canSave = entry.scoresComplete && winners.length > 0 && !busy;

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
      await getGameRepository().rescore(
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

      <ScoreEntrySection
        scoring={scoring}
        entry={entry}
        players={players}
        entryMode={entryMode}
        totals={totals}
        catRaw={catRaw}
        piles={piles}
        disabled={busy}
        onEntryMode={setEntryMode}
        onTotal={(id, text) => setTotals(t => ({ ...t, [id]: text }))}
        onCell={(id, key, text) =>
          setCatRaw(r => ({ ...r, [id]: { ...r[id], [key]: text } }))
        }
        onPile={(key, value) => setPiles(p => ({ ...p, [key]: value }))}
      />

      {choice.asked ? (
        <WinnerChoice
          candidates={entry.winnerCandidates}
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
    </section>
  );
}
