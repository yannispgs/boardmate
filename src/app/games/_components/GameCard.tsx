"use client";

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
 * One ongoing game in the list: the boardgame logo, name, progress, start date
 * and player count. The date reveals the full timestamp on hover, and the
 * player count reveals the participants in play order.
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
  const playOrder =
    game.players.map((p, i) => `${i + 1}. ${p.name}`).join("\n") ||
    "Aucun joueur";

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
      </div>
      <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
        En cours
      </span>
    </li>
  );
}
