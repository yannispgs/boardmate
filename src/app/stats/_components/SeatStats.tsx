import { InfoTip } from "@/components/InfoTip";
import type { SeatBucket, SeatStat } from "@/lib/game/seat-stats";

const LABEL: Record<SeatBucket, string> = {
  first: "Premier",
  middle: "Intermédiaire",
  last: "Dernier",
};

const cellClass = "px-3 py-2 text-right tabular-nums";

/**
 * Results broken down by turn order for games where playing first matters
 * (Catan): win rate and average relative position for the first, the
 * intermediate and the last player to play. The position is normalised per
 * player count and weighted one-per-game (explained via an {@link InfoTip}).
 * Buckets with no game in scope are hidden.
 */
export function SeatStats({ stats }: Readonly<{ stats: SeatStat[] }>) {
  const shown = stats.filter(s => s.games > 0);

  if (shown.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Selon l&apos;ordre de jeu
      </h2>
      <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-black/[0.03] text-xs text-zinc-500 dark:bg-white/[0.03] dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Position</th>
              <th className="px-3 py-2 text-right font-medium">Victoires</th>
              <th className="px-3 py-2 text-right font-medium">
                <span className="inline-flex items-center justify-end gap-1">
                  Position moy.
                  <InfoTip label="Détails sur la position moyenne">
                    <strong>Position moyenne.</strong>&nbsp;Indice de 0 à 100
                    basé sur le classement final&nbsp;: 0 = a toujours fini
                    premier, 100 = toujours dernier. Normalisé par nombre de
                    joueurs (pour comparer des parties à 3 et à 6) et pondéré
                    par partie (les intermédiaires d&apos;une même partie sont
                    moyennés ensemble). Différent du taux de victoire, qui
                    compte le vainqueur désigné et non le rang au score.
                  </InfoTip>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(s => (
              <tr
                key={s.bucket}
                className="border-black/5 border-t dark:border-white/5"
              >
                <td className="px-3 py-2 font-medium">{LABEL[s.bucket]}</td>
                <td className={cellClass}>
                  {s.winRate === null
                    ? "—"
                    : `${Math.round(s.winRate * 100)} %`}
                </td>
                <td className={cellClass}>
                  {s.avgPosition === null
                    ? "—"
                    : String(Math.round(s.avgPosition * 100))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
