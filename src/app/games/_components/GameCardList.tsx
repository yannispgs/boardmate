"use client";

import { ChevronRightIcon } from "@/components/icons";
import type {
  Boardgame,
  BoardgameId,
  GameId,
  GameListItem,
} from "@/lib/domain";
import { gameProgress } from "@/lib/game/game-progress";
import { sessionEntries } from "@/lib/game/game-sessions";
import type { ScoreRecord } from "@/lib/game/score-records";
import { GameCard } from "./GameCard";
import { GameSessionCard } from "./GameSessionCard";

const headingClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";

/**
 * A list of games; resolves each game's boardgame (name + logo) via
 * `boardgameFor`. The ended list passes `ended` (dimmed, "Terminée" badge) and
 * `collapsible` to hide its cards behind a disclosure, like deactivated
 * players/boardgames.
 *
 * Parties dealt one after another without leaving the table are folded into
 * their sitting, so an evening of short games takes one row instead of a dozen.
 */
export function GameCardList({
  games,
  boardgameFor,
  ended = false,
  collapsible = false,
  title,
  records,
  onAbandon,
}: Readonly<{
  games: GameListItem[];
  boardgameFor: (id: BoardgameId) => Boardgame | undefined;
  ended?: boolean;
  collapsible?: boolean;
  title?: string;
  /**
   * Which parties hold their game's record. Resolved once by the list, against
   * **every** finished party — filtering the screen must not move a record.
   */
  records?: ReadonlyMap<GameId, ScoreRecord>;
  /** Ongoing games only: abandon (delete) a game. */
  onAbandon?: (game: GameListItem) => void;
}>) {
  /** One party's card — the same one whether it stands alone or in a sitting. */
  function card(game: GameListItem) {
    const boardgame = boardgameFor(game.boardgameId);

    return (
      <GameCard
        key={game.id}
        game={game}
        boardgameName={boardgame?.name ?? "Partie"}
        logoUrl={boardgame?.logoUrl ?? null}
        progress={gameProgress(game, boardgame?.stages ?? null)}
        ended={ended}
        coop={boardgame?.kind === "cooperative"}
        record={records?.get(game.id) ?? null}
        onAbandon={onAbandon ? () => onAbandon(game) : undefined}
      />
    );
  }

  /** The records worn by the parties of a sitting, to lift onto its row. */
  function sittingRecords(sitting: GameListItem[]): ScoreRecord[] {
    return sitting.flatMap(game => {
      const record = records?.get(game.id);

      return record === undefined ? [] : [record];
    });
  }

  const cards = (
    <ul className="flex flex-col gap-2">
      {sessionEntries(games).map(entry => {
        if (entry.kind === "game") {
          return card(entry.game);
        }

        // A sitting is one boardgame from end to end — chaining deals the same
        // party again — so the first party names the whole row.
        const first = entry.session.games[0];
        const boardgame = boardgameFor(first.boardgameId);

        return (
          <GameSessionCard
            key={entry.session.sessionId}
            games={entry.session.games}
            boardgameName={boardgame?.name ?? "Partie"}
            logoUrl={boardgame?.logoUrl ?? null}
            ended={ended}
            records={sittingRecords(entry.session.games)}
          >
            {entry.session.games.map(card)}
          </GameSessionCard>
        );
      })}
    </ul>
  );

  if (collapsible) {
    return (
      <details className="group flex flex-col">
        <summary
          className={`sticky top-0 z-10 flex cursor-pointer list-none items-center gap-1.5 bg-[var(--background)] pt-1 pb-2 ${headingClass}`}
        >
          <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
          {title} · {games.length}
        </summary>
        {cards}
      </details>
    );
  }

  return cards;
}
