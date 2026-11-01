import { percent } from "@/components/stats/BetPlayerCard";
import type { BetPlayerStat } from "@/lib/game/bet-stats";

/**
 * How often each player took the safety token, donne by donne: a row per
 * player, a column per donne — « — » where they never played it.
 */
export function HedgeByStageTable({
  players,
  stageLabel,
}: Readonly<{ players: readonly BetPlayerStat[]; stageLabel: string }>) {
  const stages = players[0]?.hedgeByStage.map((_rate, i) => i + 1) ?? [];
  const tag = stageLabel.charAt(0).toUpperCase();

  return (
    <div className="overflow-x-auto">
      <table data-testid="hedge-table" className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-500 dark:text-zinc-400">
            <th scope="col" className="text-left font-medium">
              Joueur
            </th>
            {stages.map(stage => (
              <th
                key={stage}
                scope="col"
                className="px-1 text-right font-medium"
              >
                {tag}
                {stage}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map(p => (
            <tr
              key={p.playerId}
              className="border-black/5 border-t dark:border-white/10"
            >
              <th
                scope="row"
                className="max-w-28 truncate py-1.5 text-left font-medium"
              >
                {p.name}
              </th>
              {p.hedgeByStage.map((rate, i) => (
                <td
                  key={stages[i]}
                  className="px-1 py-1.5 text-right tabular-nums"
                >
                  {rate === null ? "—" : percent(rate)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
