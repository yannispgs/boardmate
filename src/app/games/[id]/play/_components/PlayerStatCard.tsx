import { InfoTip } from "@/components/InfoTip";
import { timeShareColor } from "@/lib/game/colors";
import { formatDuration } from "@/lib/game/format-time";
import type { PlayerTimeStats } from "@/lib/game/stats";

/**
 * One player's time card: a proportion bar for their share of the table's
 * active time, and a compact "rhythm" track spanning their fastest→slowest turn
 * (scaled to the game's longest turn so players compare at a glance), with a tick
 * at their mean. The proportion bar reddens as the player monopolises the time
 * (fully red at the monopoly threshold); a non-monopolising winner stays amber.
 */
export function PlayerStatCard({
  stat,
  rank,
  scaleS,
  playerCount,
}: Readonly<{
  stat: PlayerTimeStats;
  rank: number;
  /** Longest single turn of the whole game — shared scale for the rhythm track. */
  scaleS: number;
  /** Seated players — sets the fair share the bar's redness is measured against. */
  playerCount: number;
}>) {
  const played = stat.turnCount > 0;
  const pct = (v: number) => (scaleS > 0 ? (v / scaleS) * 100 : 0);
  const spanLeft = stat.minS !== null ? pct(stat.minS) : 0;
  const spanWidth =
    stat.minS !== null && stat.maxS !== null
      ? Math.max(2, pct(stat.maxS - stat.minS))
      : 0;

  return (
    <li className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="text-xs text-zinc-400 tabular-nums">{rank}.</span>
          {stat.name}
          {stat.isWinner ? (
            <span role="img" aria-label="Vainqueur">
              🏆
            </span>
          ) : null}
        </span>
        <span className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {Math.round(stat.sharePct)}%
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full transition-colors"
          style={{
            width: `${stat.sharePct}%`,
            backgroundColor: timeShareColor(
              stat.sharePct,
              playerCount,
              stat.isWinner,
            ),
          }}
        />
      </div>

      {played ? (
        <>
          <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
            {stat.turnCount} tour{stat.turnCount > 1 ? "s" : ""} ·{" "}
            {formatDuration(stat.totalS)} · {formatDuration(stat.avgS)} / tour
            {stat.overtimeS > 0 ? (
              <span className="text-red-600 dark:text-red-400">
                {" "}
                · +{formatDuration(stat.overtimeS)} de dépassement
              </span>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-zinc-400">
              Rythme
              <InfoTip label="Le rythme du joueur">
                <p>
                  La barre s&apos;étend de son{" "}
                  <strong>tour le plus rapide</strong> à son{" "}
                  <strong>plus lent</strong>&nbsp;; le trait marque sa{" "}
                  <strong>durée moyenne</strong> par tour.
                </p>
                <p>
                  Toutes les cartes partagent la même échelle (le plus long tour
                  de la partie).
                </p>
              </InfoTip>
            </span>
            <div className="relative h-1.5 flex-1 rounded-full bg-black/5 dark:bg-white/10">
              <div
                className="absolute h-full rounded-full bg-zinc-300 dark:bg-zinc-600"
                style={{ left: `${spanLeft}%`, width: `${spanWidth}%` }}
              />
              <div
                className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 rounded-full bg-zinc-600 dark:bg-zinc-300"
                style={{ left: `${pct(stat.avgS)}%` }}
              />
            </div>
            <span className="text-[11px] text-zinc-500 tabular-nums dark:text-zinc-400">
              {formatDuration(stat.minS ?? 0)}–{formatDuration(stat.maxS ?? 0)}
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-zinc-400">N'a joué aucun tour</p>
      )}
    </li>
  );
}
