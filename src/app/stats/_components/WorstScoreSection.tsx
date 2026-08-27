"use client";

import { useState } from "react";

import type { WorstScoreSlice } from "@/lib/game/worst-scores";

import { WorstScoreList } from "./WorstScoreList";

/** One game's hall of shame, ready to be read one slice at a time. */
export interface WorstScoreGameView {
  id: string;
  name: string;
  /**
   * One entry per table size, or a single sizeless one when the game's totals
   * compare across tables. Never empty — a game with nothing to show is left
   * out of the section rather than offered in its menu.
   */
  slices: readonly WorstScoreSliceView[];
}

/** A slice of parties, and what else those parties have to say. */
export interface WorstScoreSliceView extends WorstScoreSlice {
  /**
   * A line under the list — « 2 parties à 0 sur 8 jouées ». Null where the
   * figure means nothing on this game.
   */
  note: string | null;
}

/** The slice to open on: the one built on the most parties. */
function busiest(
  slices: readonly WorstScoreSliceView[],
): WorstScoreSliceView | undefined {
  return [...slices].sort((a, b) => b.scores.length - a.scores.length)[0];
}

/** The slice the reader asked for, falling back to the busiest one. */
function chosen(
  slices: readonly WorstScoreSliceView[],
  playerCount: number | null,
): WorstScoreSliceView | undefined {
  return slices.find(s => s.playerCount === playerCount) ?? busiest(slices);
}

/**
 * The scores nobody wants back, with the two questions that make them readable
 * asked as controls rather than as a wall.
 *
 * The section used to print every game it had something to say about, each one
 * split into a card per table size — five blocks to scroll past to reach the
 * one being looked for. Both cuts are now picked: **which game**, in a menu
 * beside the title, and **which table**, in a row of sizes underneath.
 *
 * Two rules keep the controls from becoming furniture:
 *
 * - a menu offering a single game is not a choice, so the game's name goes back
 *   into the title instead;
 * - a game whose totals compare across tables gets no size row at all, and one
 *   played at a single size gets none either.
 *
 * There is deliberately **no « toutes les tables »**: on a game listed here at
 * all, the seat count is precisely what makes two totals comparable or not, so
 * an « all » option would offer a reading we know to be false.
 *
 * The selection is the section's own — it narrows this list and nothing else on
 * the screen. Give it a `key` naming the subject read (the player, the game) so
 * moving to another one starts the section over rather than leaving it on a
 * table size that subject was never played at.
 */
export function WorstScoreSection({
  games,
  nameGame = false,
}: Readonly<{
  games: readonly WorstScoreGameView[];
  /**
   * Whether the title has to name the game it is reading. True on a screen
   * devoted to a player, where nothing else says where these totals come from;
   * false on a screen already devoted to one game, where repeating it is noise.
   * Moot as soon as there are several games — the menu names the one in view.
   */
  nameGame?: boolean;
}>) {
  const [gameId, setGameId] = useState(games[0]?.id);
  const [playerCount, setPlayerCount] = useState<number | null>(null);

  const game = games.find(g => g.id === gameId) ?? games[0];

  if (game === undefined) {
    return null;
  }

  const slice = chosen(game.slices, playerCount);

  /* c8 ignore next 3 -- a game in the menu always carries at least one slice */
  if (slice === undefined) {
    return null;
  }

  const sizes = game.slices.filter(s => s.playerCount !== null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Pires scores{nameGame && games.length === 1 ? ` — ${game.name}` : ""}
        </h3>

        {games.length > 1 ? (
          <select
            aria-label="Jeu des pires scores"
            value={game.id}
            onChange={e => {
              setGameId(e.target.value);
              setPlayerCount(null);
            }}
            className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {sizes.length > 1 ? (
        <div className="flex flex-wrap gap-1">
          {sizes.map(s => (
            <button
              key={s.playerCount}
              type="button"
              onClick={() => setPlayerCount(s.playerCount)}
              className={`rounded-lg px-2.5 py-1 text-sm tabular-nums transition ${
                s.playerCount === slice.playerCount
                  ? "bg-indigo-500 font-semibold text-white"
                  : "bg-black/[0.04] text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300"
              }`}
            >
              {s.playerCount} joueurs
            </button>
          ))}
        </div>
      ) : null}

      {/* One size played so far: still say which, since it is what makes these
          totals comparable — but as a label, not as a choice of one. */}
      {sizes.length === 1 ? (
        <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          À {sizes[0].playerCount} joueurs
        </p>
      ) : null}

      <WorstScoreList scores={slice.scores} />

      {slice.note === null ? null : (
        <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
          {slice.note}
        </p>
      )}
    </div>
  );
}
