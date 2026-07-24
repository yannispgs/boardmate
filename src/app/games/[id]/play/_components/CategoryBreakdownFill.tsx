"use client";

import { useState } from "react";

import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { rankByTotal, scoreCategories } from "@/lib/game/scoring";
import { getGameRepository } from "@/lib/repositories";
import {
  type CategoryRaw,
  CategoryScoreGrid,
  gridRemaining,
  gridValues,
} from "../../../_components/CategoryScoreGrid";

/**
 * For a category game recorded with only a total (e.g. added after the fact),
 * lets you fill in the per-category detail from its stats screen. Saving
 * re-derives each player's total and the winner from the sheet and stores the
 * breakdown, so the game becomes complete for the category charts.
 */
export function CategoryBreakdownFill({
  game,
  onSaved,
}: {
  game: PopulatedGame;
  onSaved: () => void;
}) {
  const scoring = game.boardgame.scoring;
  const sheet =
    scoring?.entry === "categories" ? (scoring.sheet ?? null) : null;
  const players = game.players.map(p => ({
    id: p.playerId,
    name: p.player.name,
  }));

  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState<CategoryRaw>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sheet) {
    return null;
  }

  const remaining = gridRemaining(players, sheet, raw);
  const complete = remaining === 0;

  const ids = players.map(p => p.id);
  const values = gridValues(players, sheet, raw);
  const scored = scoreCategories(sheet, values, ids);
  // The total already recorded when the game was added — the categories must
  // reconstruct it. Null means no total was recorded (no constraint).
  const recordedOf = (id: PlayerId): number | null =>
    game.players.find(p => p.playerId === id)?.score ?? null;
  const totalsMatch = players.every(p => {
    const target = recordedOf(p.id);

    return target === null || (scored[p.id]?.total ?? 0) === target;
  });

  async function save() {
    if (!sheet || !complete || !totalsMatch) {
      return;
    }

    setBusy(true);
    setError(null);

    const winnerId =
      rankByTotal(
        ids.map(id => ({ playerId: id, total: scored[id]?.total ?? 0 })),
      )[0]?.playerId ?? null;

    if (winnerId === null) {
      setBusy(false);

      return;
    }

    try {
      await getGameRepository().setBreakdown(
        game.id,
        winnerId,
        ids.map(id => ({
          playerId: id,
          score: scored[id]?.total ?? 0,
          breakdown: values[id] ?? {},
        })),
      );
      onSaved();
    } catch {
      setError("Impossible d'enregistrer le détail.");
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-center rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        Ajouter le détail des points
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <h3 className="text-sm font-semibold">Détail des points par catégorie</h3>
      <CategoryScoreGrid
        players={players}
        sheet={sheet}
        raw={raw}
        disabled={busy}
        onCell={(pid, key, text) =>
          setRaw(r => ({ ...r, [pid]: { ...(r[pid] ?? {}), [key]: text } }))
        }
      />

      <ul className="flex flex-col gap-1 border-black/10 border-t pt-2 text-sm dark:border-white/10">
        {players.map(p => {
          const computed = scored[p.id]?.total ?? 0;
          const target = recordedOf(p.id);
          const bad = complete && target !== null && computed !== target;

          return (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <span>{p.name}</span>
              <span
                className={`tabular-nums ${
                  bad ? "font-medium text-red-600 dark:text-red-400" : ""
                }`}
              >
                {computed} pts
                {bad ? (
                  <span className="font-normal">
                    {" "}
                    · attendu&nbsp;: {target}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {complete && !totalsMatch ? (
        <p className="text-xs text-red-600 dark:text-red-400">
          Le total des catégories doit égaler le score enregistré à l&apos;ajout
          de la partie.
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !complete || !totalsMatch}
          onClick={save}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-black/15 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        {complete ? null : (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Encore {remaining} case{remaining > 1 ? "s" : ""} à remplir.
          </span>
        )}
      </div>
    </div>
  );
}
