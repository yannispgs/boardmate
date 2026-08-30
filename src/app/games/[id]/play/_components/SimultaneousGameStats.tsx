import { StatTile } from "@/components/StatTile";
import type { PopulatedGame } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { computeSimultaneousStats } from "@/lib/game/simultaneous-stats";

/**
 * End-of-game statistics for a simultaneous game (everyone plays each round at
 * once). No per-player time breakdown — instead the time each *round* took, and
 * who the table waited on most (tapped during play).
 */
export function SimultaneousGameStats({
  game,
}: Readonly<{ game: PopulatedGame }>) {
  const stats = computeSimultaneousStats({
    players: game.players,
    turns: game.turns,
  });

  const scale = stats.longestRound?.durationS ?? 0;

  const tiles: { label: string; value: string; accent?: boolean }[] = [
    {
      label: "Temps de jeu",
      value: formatDuration(stats.totalS),
      accent: true,
    },
    { label: "Tours", value: String(stats.roundCount) },
  ];
  if (stats.longestRound) {
    tiles.push({
      label: "Tour le plus long",
      value: formatDuration(stats.longestRound.durationS),
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-center text-lg font-semibold">La partie</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {tiles.map(t => (
          <StatTile
            key={t.label}
            label={t.label}
            value={t.value}
            accent={t.accent}
          />
        ))}
      </div>

      {stats.waited.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <span aria-hidden>⏳</span>
            <span>On a attendu — nombre de fois &amp; temps total</span>
          </h3>
          <ul className="flex flex-col gap-1.5">
            {stats.waited.map(w => (
              <li
                key={w.playerId}
                className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-sm"
              >
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {w.name}
                </span>
                <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                  {w.count} fois · {formatDuration(w.totalS)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {stats.rounds.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Temps par tour
          </h3>
          <ul className="flex flex-col gap-1.5">
            {stats.rounds.map(r => (
              <li key={r.round} className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                  Tour {r.round}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-indigo-500"
                    style={{
                      width: `${scale > 0 ? (r.durationS / scale) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                  {formatDuration(r.durationS)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
