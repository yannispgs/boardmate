"use client";

import { InfoTip } from "@/components/InfoTip";
import { SpreadBar } from "@/components/stats/SpreadBar";
import type { PlayerRecap, RecapMeasure } from "@/lib/game/player-recap";
import type { Tone } from "@/lib/game/recap-spread";
import { spread } from "@/lib/game/recap-spread";

import {
  measureHint,
  measureLabel,
  measureStanding,
  measureValue,
} from "./recap-measure";

/**
 * « 4 parties avant celle-ci » — or the line that says there were none.
 *
 * « avant ce soir » would have been a lie on the usual evening: two or three
 * parties of the same game in a row is the normal way this app gets used, and
 * the earlier ones are in the count.
 */
function partiesLine(parties: number): string {
  if (parties === 0) {
    return "Première partie sur ce jeu";
  }

  return parties === 1
    ? "1 partie avant celle-ci"
    : `${parties} parties avant celle-ci`;
}

/**
 * The colour a standing is said in: the top fifth of his own parties reads as a
 * good evening, the bottom fifth as a bad one, everything between as a figure.
 * Only the sentence is painted — the figure itself keeps the text colour, since
 * « 54 pts » is neither good nor bad until it is placed.
 */
const TONE: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-zinc-500 dark:text-zinc-400",
};

/**
 * The three places that get a metal, largest first. Nothing below the podium is
 * painted: a fourth place named in a colour of its own would be a fourth medal.
 *
 * The place is the one the table finished on, crown first: two players level on
 * points whom the game's tie-break separated give **one** gold and one silver,
 * since the app has already crowned one of them by name. Only a victory the
 * table genuinely shared leaves two golds and nobody in silver.
 */
const PODIUM: Record<number, string> = {
  1: "text-xl font-bold text-amber-500 dark:text-amber-400",
  // Silver is the awkward one: a pale grey on a dark screen is white, which is
  // the colour every other name already has. It is therefore taken a shade
  // down, where it reads as metal rather than as text — the size and the weight
  // are what say « second », the colour only says which metal.
  2: "text-lg font-bold text-slate-500 dark:text-slate-400",
  3: "font-bold text-orange-800 dark:text-orange-500",
};

/**
 * One measure, on two lines: the figure and where it falls above, the spread of
 * his own parties below with this party's cursor on it.
 *
 * The two lines are the compromise the width forces. Squeezed onto one, the bar
 * keeps about 150 px on a phone, and four parties within a few points of each
 * other become a single smudge — the one thing the bar exists to show.
 */
function Measure({ measure }: Readonly<{ measure: RecapMeasure }>) {
  const bar = spread(measure.past, measure.value, measure.direction);
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
            <span className={TONE[standing.tone]}>
              {" · "}
              {standing.text}
            </span>
          )}
        </span>
      </div>

      {bar === null ? null : (
        <div className="flex items-center gap-1.5">
          <span className="w-10 shrink-0 text-right text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {measureValue(measure.key, bar.left)}
          </span>

          <SpreadBar
            bar={bar}
            label={`${measureLabel(measure.key)} — ${measureValue(
              measure.key,
              measure.value,
            )} parmi ses ${measure.past.length + 1} parties`}
          />

          <span className="w-10 shrink-0 text-[10px] tabular-nums text-zinc-400 dark:text-zinc-500">
            {measureValue(measure.key, bar.right)}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * One player's party: his name, how many of his own parties it is read
 * against, then one bar per figure with this party's cursor on it.
 *
 * It used to be a card you pressed to reveal the spread in a modal. The spread
 * is now on the bar, so there is nothing left behind the press and nothing left
 * for the card's frame to hold apart — six framed cards at the end of a
 * six-handed game were a scrolling exercise. A name and a rule are enough to
 * say where one player stops and the next begins.
 *
 * The rows come ordered by where each player finished, and the first three
 * names wear their metal. Nothing here recomputes that order: a ranking done
 * twice is a ranking that will one day disagree with itself.
 */
export function PlayerRecapCard({ recap }: Readonly<{ recap: PlayerRecap }>) {
  const podium = recap.place === null ? undefined : PODIUM[recap.place];

  return (
    <li className="flex flex-col gap-2 border-t border-black/[0.07] pt-3 first:border-t-0 first:pt-0 dark:border-white/10">
      <div className="flex items-baseline justify-between gap-2">
        <span className={`truncate ${podium ?? "font-medium"}`}>
          {recap.name}
        </span>
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
