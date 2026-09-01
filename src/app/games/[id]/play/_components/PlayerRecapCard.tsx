"use client";

import { InfoTip } from "@/components/InfoTip";
import { SpreadBar } from "@/components/stats/SpreadBar";
import type { PlayerRecap, RecapMeasure } from "@/lib/game/player-recap";
import { spread } from "@/lib/game/recap-spread";

import {
  measureHint,
  measureLabel,
  measureStanding,
  measureValue,
} from "./recap-measure";

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
 * One measure, on two lines: the figure and where it falls above, the spread of
 * his own evenings below with tonight's cursor on it.
 *
 * The two lines are the compromise the width forces. Squeezed onto one, the bar
 * keeps about 150 px on a phone, and four evenings within a few points of each
 * other become a single smudge — the one thing the bar exists to show.
 */
function Measure({ measure }: Readonly<{ measure: RecapMeasure }>) {
  const bar = spread(measure.past, measure.value);
  const standing = measureStanding(measure);
  const hint = measureHint(measure.key);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="flex items-baseline gap-1 text-zinc-500 dark:text-zinc-400">
          {measureLabel(measure.key)}
          {hint === null ? null : (
            <InfoTip label={measureLabel(measure.key)}>
              <p>{hint}</p>
            </InfoTip>
          )}
        </span>

        <span className="shrink-0 tabular-nums">
          <span className="font-semibold">
            {measureValue(measure.key, measure.value)}
          </span>
          {standing === null ? null : (
            <span className="text-zinc-500 dark:text-zinc-400">
              {" · "}
              {standing}
            </span>
          )}
        </span>
      </div>

      {bar === null ? null : (
        <div className="flex items-center gap-1.5">
          <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {measureValue(measure.key, bar.min)}
          </span>

          <SpreadBar
            bar={bar}
            label={`${measureLabel(measure.key)} — ${measureValue(
              measure.key,
              measure.value,
            )} parmi ses ${measure.past.length + 1} soirées`}
          />

          <span className="w-10 shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {measureValue(measure.key, bar.max)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * One player's evening: his name, how many of his own evenings it is read
 * against, then one bar per figure with tonight's cursor on it.
 *
 * It used to be a card you pressed to reveal the spread in a modal. The spread
 * is now on the bar, so there is nothing left behind the press and nothing left
 * for the card's frame to hold apart — six framed cards at the end of a
 * six-handed game were a scrolling exercise. A name and a rule are enough to
 * say where one player stops and the next begins.
 */
export function PlayerRecapCard({ recap }: Readonly<{ recap: PlayerRecap }>) {
  return (
    <li className="flex flex-col gap-2 border-t border-black/[0.07] pt-3 first:border-t-0 first:pt-0 dark:border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-medium">{recap.name}</span>
        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
          {partiesLine(recap.parties)}
        </span>
      </div>

      <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-x-6">
        {recap.measures.map(measure => (
          <Measure key={measure.key} measure={measure} />
        ))}
      </div>
    </li>
  );
}
