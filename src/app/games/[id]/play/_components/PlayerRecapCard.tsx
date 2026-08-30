"use client";

import type { PlayerRecap } from "@/lib/game/player-recap";

import { measureLabel, measureStanding, measureValue } from "./recap-measure";

/** « 4 parties avant ce soir » — or the line that says there were none. */
function partiesLine(parties: number): string {
  if (parties === 0) {
    return "Première partie sur ce jeu";
  }

  return parties === 1
    ? "1 partie avant ce soir"
    : `${parties} parties avant ce soir`;
}

/**
 * One player's evening, compact: his name, how many of his own evenings it is
 * read against, and each of tonight's figures with where it stands among them.
 *
 * The card carries the figures and nothing else — the spread behind each one is
 * a graph, and a graph per player would turn the end of a six-handed game into
 * a scrolling exercise. Tapping the card opens them.
 */
export function PlayerRecapCard({
  recap,
  onOpen,
}: Readonly<{ recap: PlayerRecap; onOpen: () => void }>) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 text-left transition hover:bg-black/[0.02] dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-white/[0.04]"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate font-medium">{recap.name}</span>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {partiesLine(recap.parties)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {recap.measures.map(measure => {
            const standing = measureStanding(measure);

            return (
              <div key={measure.key} className="flex flex-col">
                <span className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {measureLabel(measure.key)}
                </span>
                <span className="font-semibold tabular-nums">
                  {measureValue(measure.key, measure.value)}
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {standing ?? " "}
                </span>
              </div>
            );
          })}
        </div>
      </button>
    </li>
  );
}
