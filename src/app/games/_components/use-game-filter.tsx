"use client";

import { useState } from "react";

import { FilterIcon } from "@/components/icons";
import { iconButtonClass } from "@/components/ui";
import type { BoardgameId, GameListItem } from "@/lib/domain";
import {
  activeFilterCount,
  type GameFilter,
  NO_GAME_FILTER,
} from "@/lib/game/game-filters";
import { GameFilterPanel } from "./GameFilterPanel";

/**
 * Drives the games list's filter the way {@link useSearch} drives its search:
 * render `filterToggle` in the screen heading's action slot and `filterPanel`
 * right under the heading, then narrow the list with `filter`.
 *
 * Folding the panel away leaves the criteria in place — you fold it *because*
 * you are done choosing — so the funnel carries a count of what is still on.
 */
export function useGameFilter({
  games,
  nameOf,
}: {
  /** Every game the filter chooses from, unfiltered. */
  games: GameListItem[];
  nameOf: (id: BoardgameId) => string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<GameFilter>(NO_GAME_FILTER);
  const count = activeFilterCount(filter);

  const filterToggle = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      aria-label={open ? "Masquer les filtres" : "Filtrer les parties"}
      title="Filtrer les parties"
      className={`relative ${iconButtonClass} ${
        open || count > 0 ? "bg-black/5 dark:bg-white/10" : ""
      }`}
    >
      <FilterIcon />
      {count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[0.625rem] font-semibold text-white">
          {count}
        </span>
      ) : null}
    </button>
  );

  const filterPanel = open ? (
    <GameFilterPanel
      games={games}
      nameOf={nameOf}
      filter={filter}
      onChange={setFilter}
    />
  ) : null;

  return { filter, filterToggle, filterPanel };
}
