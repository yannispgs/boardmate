import type { NearMiss } from "@/lib/game/score-pace";

/**
 * The « dommage pour X » remark: a player the end of the game cut short, who
 * would have gone past their neighbour on one more turn at their own pace.
 * A what-if, said as one — the ranking above is the result.
 */
export function NearMissCard({ miss }: Readonly<{ miss: NearMiss }>) {
  return (
    <li className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-3 text-sm">
      <span aria-hidden>🤏</span>
      <span>
        Dommage pour <strong>{miss.behind.name}</strong>&nbsp;: un tour de plus
        l&apos;aurait fait passer devant <strong>{miss.ahead.name}</strong> (
        {miss.behind.score} + {miss.gain} &gt; {miss.ahead.score}). Qui
        sait&nbsp;!
      </span>
    </li>
  );
}
