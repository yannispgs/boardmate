"use client";

import Link from "next/link";

import { Tooltip } from "@/components/Tooltip";
import type { GameListItem } from "@/lib/domain";

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
 * One ongoing game in the list: boardgame, progress, start date and player
 * count, linking to the play screen. The date reveals the full timestamp on
 * hover, and the player count reveals the participants in play order.
 */
export function GameCard({
  game,
  boardgameName,
}: {
  game: GameListItem;
  boardgameName: string;
}) {
  const count = game.players.length;
  const playOrder =
    game.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n") ||
    "Aucun joueur";

  return (
    <li>
      <Link
        href={`/games/${game.id}/play`}
        className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900"
      >
        <div className="flex flex-col">
          <span className="font-medium">{boardgameName}</span>
          <span className="text-xs text-zinc-500">
            Manche {game.round} · tour {game.turn} ·{" "}
            <Tooltip label={fullStart(game.startedAt)}>
              {new Date(game.startedAt).toLocaleDateString("fr-FR")}
            </Tooltip>{" "}
            ·{" "}
            <Tooltip label={playOrder}>
              {count} {count > 1 ? "joueurs" : "joueur"}
            </Tooltip>
          </span>
        </div>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
          Reprendre
        </span>
      </Link>
    </li>
  );
}
