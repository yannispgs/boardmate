"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Boardgame, Player, PlayerId } from "@/lib/domain";
import {
  leaderByScore,
  rankByTotal,
  scoreCategories,
  winnerDirection,
} from "@/lib/game/scoring";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { usePlayers } from "@/lib/hooks/use-players";
import { CategoryScoreEntry } from "../../_components/CategoryScoreEntry";

/** Local date (YYYY-MM-DD) for the default end-date field. */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const sectionClass =
  "flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10";

export function FinishedGameForm() {
  const router = useRouter();
  const { boardgames } = useBoardgames();
  const { players } = usePlayers();
  const { createFinished } = useGames();

  const [boardgame, setBoardgame] = useState<Boardgame | null>(null);
  const [selected, setSelected] = useState<Player[]>([]);
  const [endedAt, setEndedAt] = useState(today());
  const [totals, setTotals] = useState<Record<string, string>>({});
  const [catValues, setCatValues] = useState<Record<
    string,
    Record<string, number>
  > | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [winnerId, setWinnerId] = useState<PlayerId | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const games = boardgames.filter(b => b.isActive && b.kind === "competitive");
  const activePlayers = players.filter(p => p.isActive);

  const scoring = boardgame?.scoring ?? null;
  const sheet =
    scoring?.entry === "categories" ? (scoring.sheet ?? null) : null;
  const ids = selected.map(p => p.id);

  // Final score per player, per the game's scoring model.
  const scored =
    sheet && catValues ? scoreCategories(sheet, catValues, ids) : null;

  function scoreOf(id: PlayerId): number | null {
    if (scoring === null) {
      return null;
    }

    if (sheet) {
      return scored ? (scored[id]?.total ?? 0) : null;
    }

    const n = Number.parseInt(totals[id] ?? "", 10);

    return Number.isFinite(n) ? n : null;
  }

  const scoresComplete =
    scoring === null || selected.every(p => scoreOf(p.id) !== null);

  // Winner suggested from the scores; overridable (tie-breaks the app doesn't
  // model). Unscored games have no suggestion — the winner must be picked.
  const suggestedWinner: PlayerId | null = (() => {
    if (!scoresComplete || scoring === null) {
      return null;
    }

    const entries = selected.map(p => ({
      playerId: p.id,
      score: scoreOf(p.id),
    }));

    if (sheet) {
      return (
        rankByTotal(
          entries.map(e => ({ playerId: e.playerId, total: e.score ?? 0 })),
        )[0]?.playerId ?? null
      );
    }

    return leaderByScore(entries, winnerDirection(scoring.winCondition));
  })();

  const effectiveWinner = winnerId ?? suggestedWinner;

  function chooseBoardgame(b: Boardgame) {
    setBoardgame(b);
    setTotals({});
    setCatValues(null);
    setWinnerId(null);
  }

  function togglePlayer(p: Player) {
    setWinnerId(null);
    setCatValues(null);
    setSelected(prev =>
      prev.some(s => s.id === p.id)
        ? prev.filter(s => s.id !== p.id)
        : [...prev, p],
    );
  }

  const canSubmit =
    boardgame !== null &&
    selected.length >= 2 &&
    scoresComplete &&
    effectiveWinner !== null &&
    !submitting;

  async function submit() {
    if (!boardgame || effectiveWinner === null) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createFinished({
        boardgameId: boardgame.id,
        endedAt: new Date(`${endedAt}T12:00:00`).toISOString(),
        winnerId: effectiveWinner,
        players: selected.map((p, index) => ({
          playerId: p.id,
          seatOrder: index,
          score: scoreOf(p.id),
          breakdown: sheet && catValues ? (catValues[p.id] ?? {}) : null,
        })),
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

      {boardgame ? (
        <section className={sectionClass}>
          <h2 className="text-sm font-semibold">
            Joueurs{" "}
            <span className="text-zinc-400">(dans l&apos;ordre de jeu)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {activePlayers.map(p => {
              const seat = selected.findIndex(s => s.id === p.id);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => togglePlayer(p)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    seat >= 0
                      ? "border-indigo-500 bg-indigo-600 text-white"
                      : "border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                  }`}
                >
                  {seat >= 0 ? (
                    <span className="tabular-nums opacity-80">{seat + 1}.</span>
                  ) : null}
                  {p.name}
                </button>
              );
            })}
          </div>
          {selected.length < 2 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Sélectionne au moins deux joueurs.
            </p>
          ) : null}
        </section>
      ) : null}

      {boardgame && selected.length >= 2 ? (
        <section className={sectionClass}>
          <h2 className="text-sm font-semibold">Résultat</h2>

          <label className="flex items-center justify-between gap-2 text-sm">
            Date de fin
            <input
              type="date"
              value={endedAt}
              max={today()}
              onChange={e => setEndedAt(e.target.value)}
              className="rounded-lg border border-black/15 bg-white px-2 py-1 outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
            />
          </label>

          {scoring !== null && !sheet ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Score final</span>
              {selected.map(p => (
                <label
                  key={p.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  {p.name}
                  <input
                    type="number"
                    inputMode="numeric"
                    min={scoring.allowNegative ? undefined : 0}
                    value={totals[p.id] ?? ""}
                    onChange={e => {
                      setWinnerId(null);
                      setTotals(t => ({ ...t, [p.id]: e.target.value }));
                    }}
                    className="no-spinners w-20 rounded-lg border border-black/15 bg-white px-2 py-1 text-right tabular-nums outline-none focus:border-indigo-500 dark:border-white/15 dark:bg-zinc-900"
                  />
                </label>
              ))}
            </div>
          ) : null}

          {sheet ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setCatOpen(true)}
                className="self-start rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300"
              >
                {catValues ? "Modifier les points" : "Compter les points"}
              </button>
              {scored ? (
                <ul className="flex flex-col gap-1 text-sm">
                  {selected.map(p => (
                    <li key={p.id} className="flex justify-between">
                      <span>{p.name}</span>
                      <span className="font-medium tabular-nums">
                        {scored[p.id]?.total ?? 0} pts
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {catOpen ? (
                <CategoryScoreEntry
                  players={selected.map(p => ({ id: p.id, name: p.name }))}
                  sheet={sheet}
                  disabled={submitting}
                  onCancel={() => setCatOpen(false)}
                  onSubmit={values => {
                    setWinnerId(null);
                    setCatValues(values);
                    setCatOpen(false);
                  }}
                />
              ) : null}
            </div>
          ) : null}

          {scoresComplete ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Vainqueur</span>
              {selected.map(p => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="winner"
                    checked={effectiveWinner === p.id}
                    onChange={() => setWinnerId(p.id)}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  {p.name}
                </label>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p className="text-sm text-red-600" aria-live="polite">
          {error}
        </p>
      ) : null}

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
