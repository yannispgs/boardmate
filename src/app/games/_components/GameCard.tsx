"use client";

import { Tooltip } from "@/components/Tooltip";
import type { GameListItem, PlayerId } from "@/lib/domain";

/** Full start timestamp (date + HH:mm:ss), shown when hovering the date. */
function fullStart(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * The participant list in play order, used as the player-count tooltip. The
 * player whose turn it is is emphasised so hovering the count highlights them.
 */
function PlayOrder({
  players,
  currentPlayerId,
}: {
  players: GameListItem["players"];
  currentPlayerId: PlayerId | null;
}) {
  if (players.length === 0) {
    return <span>Aucun joueur</span>;
  }

  return (
    <ol className="flex flex-col gap-0.5">
      {players.map((p, i) => {
        const isCurrent = p.id === currentPlayerId;

        return (
          <li
            key={p.id}
            className={isCurrent ? "font-semibold text-white" : "text-zinc-300"}
          >
            {i + 1}. {p.name}
            {isCurrent ? " ←" : ""}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * One ongoing game in the list: the boardgame logo, name, progress, start date
 * and player count. The date reveals the full timestamp on hover, and the
 * player count reveals the participants in play order — emphasising whose turn
 * it is. A `round` is one full table cycle (everyone has played once); for an
 * ongoing game we also surface whose turn it is right now.
 */
export function GameCard({
  game,
  boardgameName,
  logoUrl,
}: {
  game: GameListItem;
  boardgameName: string;
  logoUrl: string | null;
}) {
  const count = game.players.length;
  const currentPlayer = game.players.find(p => p.id === game.currentPlayerId);

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex min-w-0 items-center gap-3">
        {logoUrl ? (
          // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
          <img
            src={logoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 text-lg dark:bg-white/5"
          >
            🎲
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{boardgameName}</span>
          <span className="text-xs text-zinc-500">
            Tour {game.round} ·{" "}
            <Tooltip label={fullStart(game.startedAt)}>
              {new Date(game.startedAt).toLocaleDateString("fr-FR")}
            </Tooltip>{" "}
            ·{" "}
            <Tooltip
              label={
                <PlayOrder
                  players={game.players}
                  currentPlayerId={game.currentPlayerId}
                />
              }
            >
              {count} {count > 1 ? "joueurs" : "joueur"}
            </Tooltip>
          </span>
          {currentPlayer ? (
            <span className="mt-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              Au tour de {currentPlayer.name}
            </span>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        En cours
      </span>
    </li>
  );
}
