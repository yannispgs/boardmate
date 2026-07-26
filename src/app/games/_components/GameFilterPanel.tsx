"use client";

import { ChipPicker } from "@/components/ChipPicker";
import { DateWindow } from "@/components/DateWindow";
import { MultiSelectField } from "@/components/MultiSelectField";
import type { BoardgameId, GameListItem, GameStatus } from "@/lib/domain";
import {
  filterablePlayers,
  type GameFilter,
  NO_GAME_FILTER,
  playedBoardgames,
} from "@/lib/game/game-filters";

/** "Toutes" is the absence of a status criterion, spelled as a chip. */
const STATUS_OPTIONS: Array<{ id: GameStatus | "all"; name: string }> = [
  { id: "all", name: "Toutes" },
  { id: "ongoing", name: "En cours" },
  { id: "ended", name: "Terminées" },
];

/**
 * The criteria the games list is narrowed by: which game, who was at the table,
 * when, and whether it is over. Only what has actually been played is offered —
 * a criterion that can only return nothing is not worth a tap.
 */
export function GameFilterPanel({
  games,
  nameOf,
  filter,
  onChange,
}: {
  /** Every game the filter chooses from, unfiltered. */
  games: GameListItem[];
  nameOf: (id: BoardgameId) => string | undefined;
  filter: GameFilter;
  onChange: (filter: GameFilter) => void;
}) {
  const boardgames = playedBoardgames(games, nameOf);
  const players = filterablePlayers(games, filter.playerIds);
  const active =
    filter.boardgameIds.length > 0 ||
    filter.playerIds.length > 0 ||
    filter.from !== null ||
    filter.until !== null ||
    filter.status !== null;

  return (
    <div className="mt-3 flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <ChipPicker
        label="Statut"
        options={STATUS_OPTIONS}
        selected={filter.status ?? "all"}
        onSelect={id =>
          onChange({ ...filter, status: id === "all" ? null : id })
        }
      />

      <MultiSelectField
        label="Jeux"
        options={boardgames}
        selected={filter.boardgameIds}
        onChange={boardgameIds => onChange({ ...filter, boardgameIds })}
      />

      <MultiSelectField
        label="Joueurs"
        options={players}
        selected={filter.playerIds}
        onChange={playerIds => onChange({ ...filter, playerIds })}
      />

      {/* The list files a game under the day it started — an unfinished game
          has no end date to file it under. */}
      <DateWindow
        from={filter.from ?? ""}
        until={filter.until ?? ""}
        onFrom={v => onChange({ ...filter, from: v || null })}
        onUntil={v => onChange({ ...filter, until: v || null })}
      />

      {active ? (
        <button
          type="button"
          onClick={() => onChange(NO_GAME_FILTER)}
          className="self-start rounded-lg border border-black/10 px-3 py-1.5 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Tout effacer
        </button>
      ) : null}
    </div>
  );
}
