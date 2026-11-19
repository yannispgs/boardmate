import { InfoTip } from "@/components/InfoTip";
import {
  type Duo,
  MIN_PARTNER_ENCOUNTERS,
  MIN_SEATS,
} from "@/lib/game/neighbour-stats";

import { pileFigure } from "./NeighbourCard";
import { StatsSection } from "./StatsSection";

/** « 1 partie », « 4 parties ». */
function partiesLabel(count: number): string {
  return `${count} partie${count > 1 ? "s" : ""}`;
}

/**
 * Every pair that has sat side by side often enough, ranked on the pile they
 * build together — the one figure that belongs to the two of them and nobody
 * else. The best and the worst pair are flagged; the bar reads each pile
 * against the best one, the average of every pile sits underneath.
 */
export function DuoRanking({
  duos,
  thinDuos,
  pileAverage,
}: Readonly<{
  duos: Duo[];
  /** Pairs seen side by side, but not often enough to be ranked yet. */
  thinDuos: number;
  pileAverage: number | null;
}>) {
  const top = Math.max(0, ...duos.map(d => d.sharedPile ?? 0));

  return (
    <StatsSection
      title={
        <>
          Les duos
          <InfoTip label="Détails sur les duos">
            <p>
              Un duo, ce sont deux joueurs assis <strong>côte à côte</strong> :
              ils montent ensemble la pile posée entre eux. Le chiffre est la
              hauteur moyenne de cette pile, à comparer à la moyenne de toutes
              les piles.
            </p>
            <p>
              Ne comptent que les parties à {MIN_SEATS} joueurs ou plus, et un
              duo n&apos;est classé qu&apos;après {MIN_PARTNER_ENCOUNTERS}{" "}
              parties côte à côte.
            </p>
          </InfoTip>
        </>
      }
    >
      {duos.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun duo n&apos;a encore joué {MIN_PARTNER_ENCOUNTERS} parties côte à
          côte, à {MIN_SEATS} joueurs ou plus.
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {duos.map((duo, i) => (
            <DuoRow
              key={duo.players.map(p => p.playerId).join("|")}
              duo={duo}
              top={top}
              flag={flagOf(i, duos.length)}
            />
          ))}
        </ol>
      )}

      {pileAverage === null ? null : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Moyenne de toutes les piles : {pileFigure(pileAverage)}
        </p>
      )}

      {thinDuos > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {thinDuos} duo{thinDuos > 1 ? "s" : ""} pas encore assez joué
          {thinDuos > 1 ? "s" : ""} (moins de {MIN_PARTNER_ENCOUNTERS} parties
          côte à côte).
        </p>
      ) : null}
    </StatsSection>
  );
}

/** 🥇 on the best pair, 🪨 on the worst — once there are two to tell apart. */
function flagOf(index: number, count: number): string | null {
  if (count < 2) {
    return null;
  }
  if (index === 0) {
    return "🥇";
  }

  return index === count - 1 ? "🪨" : null;
}

function DuoRow({
  duo,
  top,
  flag,
}: Readonly<{ duo: Duo; top: number; flag: string | null }>) {
  const [a, b] = duo.players;
  const width = top > 0 && duo.sharedPile !== null ? duo.sharedPile / top : 0;

  return (
    <li className="flex flex-col gap-1.5 rounded-xl p-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate font-medium">
          {flag === null ? null : <span aria-hidden>{flag} </span>}
          {a.name} + {b.name}
        </span>
        <span className="shrink-0 text-sm tabular-nums">
          <span className="font-semibold">
            {duo.sharedPile === null ? "—" : pileFigure(duo.sharedPile)}
          </span>{" "}
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            ({partiesLabel(duo.parties)})
          </span>
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${Math.round(width * 100)}%` }}
        />
      </div>
    </li>
  );
}
