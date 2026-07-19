import type { SeatBucket, SeatStat } from "@/lib/game/seat-stats";

const LABEL: Record<SeatBucket, string> = {
  first: "Premier",
  middle: "Intermédiaire",
  last: "Dernier",
};

const cellClass = "px-3 py-2 text-right tabular-nums";

/**
 * Results broken down by turn order for games where playing first matters
 * (Catan): win rate and average final placement for the first, the intermediate
 * and the last player to play. Buckets with no game in scope are hidden.
 */
export function SeatStats({ stats }: { stats: SeatStat[] }) {
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
                Classement moy.
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
                  {s.avgPlacement === null ? "—" : s.avgPlacement.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
