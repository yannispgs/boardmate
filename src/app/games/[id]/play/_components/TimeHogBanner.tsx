"use client";

import type { GamePlayer, GameTurn, Player } from "@/lib/domain";
import { liveTimeHog } from "@/lib/game/stats";

/**
 * Whoever is monopolising the table's time, judged on COMPLETED rounds only
 * (see `liveTimeHog`): it refreshes when the table moves to the next round —
 * not mid-round, where whoever is a turn ahead would look like the hog.
 */
export function TimeHogBanner({
  players,
  turns,
  round,
}: Readonly<{
  players: Array<GamePlayer & { player: Player }>;
  turns: GameTurn[];
  round: number;
}>) {
  const hog = liveTimeHog(players, turns, round);

  if (hog === null) {
    return null;
  }

  return (
    <div className="flex w-full max-w-sm items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
      <span aria-hidden>⏱️</span>
      <span>
        <span className="font-semibold">{hog.name}</span>{" "}
        {`monopolise le temps (${Math.round(hog.sharePct)} %)`}
      </span>
    </div>
  );
}
