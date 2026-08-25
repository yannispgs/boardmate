import type { GameListItem } from "@/lib/domain";
import type { ScoreDirection } from "@/lib/game/scoring";
import { sessionParties, sessionStanding } from "@/lib/game/session-stats";

import { SessionPlayerCardList } from "./SessionPlayerCardList";

/**
 * How the evening is going, beside the party being played.
 *
 * Everything here is recomputed from the parties sharing this one's session id
 * — nothing about a sitting is stored, and nothing needs to be. It appears from
 * the second party on: a first deal has no evening to summarise, and the
 * parties played on their own would all carry an empty panel.
 */
export function SessionStats({
  games,
  direction,
}: Readonly<{
  /** The sitting's parties, oldest first — the one on the table included. */
  games: readonly GameListItem[];
  /** Which end of the score wins, so a place is the game's own idea of one. */
  direction: ScoreDirection;
}>) {
  const played = games.filter(game => game.status === "ended");

  // One party is not an evening, and an evening whose first deal is still on
  // the table has nothing to average yet.
  if (games.length < 2 || played.length === 0) {
    return null;
  }

  const stats = sessionStanding(sessionParties(games), direction);

  return (
    <section className="flex w-full max-w-sm flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Cette soirée — {played.length}{" "}
        {played.length > 1 ? "parties terminées" : "partie terminée"}
      </h2>

      <SessionPlayerCardList stats={stats} />

      {/* Said once, here, rather than left to be guessed from four columns:
          the evening keeps no score of its own, on purpose. */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Moyennes sur les parties terminées de la soirée — rien n&apos;est
        cumulé, chaque partie compte pour elle-même.
      </p>
    </section>
  );
}
