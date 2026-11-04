"use client";

import type {
  Boardgame,
  BoardgameId,
  GameId,
  GameListItem,
} from "@/lib/domain";
import { gameProgress } from "@/lib/game/game-progress";
import type { SessionEntry } from "@/lib/game/game-sessions";
import type { ScoreRecord } from "@/lib/game/score-records";
import { tracksPlayerTurns } from "@/lib/game/turn-time";
import { GameCard } from "./GameCard";
import { GameSessionCard } from "./GameSessionCard";

/**
 * One section of « Parties »; resolves each game's boardgame (name + logo) via
 * `boardgameFor`.
 *
 * The list is given **entries**, not games: parties dealt one after another
 * without leaving the table are folded into their sitting upstream, where both
 * sections are known at once — an evening with one deal still running belongs
 * whole to the running side, and neither section can decide that on its own.
 * Each card then reads its own status, since a running evening shows its
 * finished deals alongside the one on the table.
 */
export function GameCardList({
  entries,
  boardgameFor,
  records,
  partyRanks,
  onAbandon,
}: Readonly<{
  entries: ReadonlyArray<SessionEntry<GameListItem>>;
  boardgameFor: (id: BoardgameId) => Boardgame | undefined;
  /**
   * Which parties hold their game's record. Resolved once by the list, against
   * **every** finished party — filtering the screen must not move a record.
   */
  records?: ReadonlyMap<GameId, ScoreRecord>;
  /**
   * Which party of its evening each game is. Resolved once by the list against
   * **every** party — this section only holds part of an evening, and half of
   * one would be numbered from one.
   */
  partyRanks?: ReadonlyMap<GameId, number>;
  /** Abandon (delete) a game; only offered on the ones still running. */
  onAbandon?: (game: GameListItem) => void;
}>) {
  /** One party's card — the same one whether it stands alone or in a sitting. */
  function card(game: GameListItem) {
    const boardgame = boardgameFor(game.boardgameId);
    const abandonable = onAbandon !== undefined && game.status !== "ended";

    return (
      <GameCard
        key={game.id}
        game={game}
        boardgameName={boardgame?.name ?? "Partie"}
        logoUrl={boardgame?.logoUrl ?? null}
        progress={gameProgress(game, boardgame?.stages ?? null)}
        tracksTurns={boardgame !== undefined && tracksPlayerTurns(boardgame)}
        coop={boardgame?.kind === "cooperative"}
        record={records?.get(game.id) ?? null}
        partyRank={partyRanks?.get(game.id) ?? null}
        onAbandon={abandonable ? () => onAbandon(game) : undefined}
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

  return (
    <ul className="flex flex-col gap-2">
      {entries.map(entry => {
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
            records={sittingRecords(entry.session.games)}
          >
            {entry.session.games.map(card)}
          </GameSessionCard>
        );
      })}
    </ul>
  );
}
