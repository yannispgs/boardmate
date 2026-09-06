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
 * How a podium name is worn, largest first: its size, and its metal taken
 * towards the **light** rather than towards the dark.
 *
 * This screen paints itself dark whatever the reader's system says, so the two
 * instincts pull apart there: a colour deepened to stand out from its
 * background stands out from a white page and sinks into this one. Bronze
 * proves it — an `orange-800` name on the bronze wash below comes out dimmer
 * than the plain grey « 5 parties avant celle-ci » on its own line, which is a
 * medal that costs its holder legibility.
 *
 * Silver is deliberately the odd one. A light grey **is** the colour every
 * other name on the screen already has, so there is no silver to take: pushed
 * lighter it is white, pushed darker it is faded text. Second place is
 * therefore said by the wash behind it and by the size — the name only stops
 * short of claiming a metal it cannot have.
 *
 * Nothing below the podium is grown or painted: a fourth place with a size and
 * a colour of its own would be a fourth medal.
 *
 * The place is the one the table finished on, crown first: two players level on
 * points whom the game's tie-break separated give **one** gold and one silver,
 * since the app has already crowned one of them by name. Only a victory the
 * table genuinely shared leaves two golds and nobody in silver.
 */
const PODIUM_NAME: Record<number, string> = {
  1: "text-xl font-bold text-amber-300",
  2: "text-lg font-bold text-slate-300",
  3: "font-bold text-orange-400",
};

/**
 * The metal, washed under the **whole block** — the name and the bars that
 * belong to it — rather than behind the name alone.
 *
 * A tint on the name is a label; a tint under the block also says which lines
 * belong to which player, which is the thing this list was hardest to read
 * without: a hairline rule between two players is a pixel, and at six players
 * the reader is scrolling. The wash carries the grouping and the medal at once.
 *
 * A quarter strength, which a name-sized chip could never have got away with:
 * the figures and the bars are printed **on** this, so it has to stay under
 * what would compete with them — and a surface this large registers at a
 * strength a chip would be invisible at.
 */
const PODIUM_TINT: Record<number, string> = {
  1: "bg-amber-400/25",
  2: "bg-slate-400/25",
  3: "bg-orange-600/25",
};

/**
 * What a player off the podium sits on. Barely a tint — but the row has to be a
 * panel like the others, or the medals would read as « these three blocks
 * exist » against « this one is floating », which is not what a podium says.
 */
const PLAIN_TINT = "bg-black/[0.03] dark:bg-white/[0.04]";

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
 * is now on the bar, so there is nothing left behind the press — six framed
 * cards at the end of a six-handed game were a scrolling exercise. What is left
 * is a panel with no frame and no press: it groups a player's lines and, on the
 * podium, carries his metal, which a hairline rule could do neither of.
 *
 * The rows come ordered by where each player finished, and the first three wear
 * their metal. Nothing here recomputes that order: a ranking done twice is a
 * ranking that will one day disagree with itself.
 */
export function PlayerRecapCard({ recap }: Readonly<{ recap: PlayerRecap }>) {
  const place = recap.place;
  const podium = place === null ? undefined : PODIUM_NAME[place];

  return (
    // Every row is the same panel with the same padding, painted or not, so the
    // bars of a medalled block line up with the bars of the one below it. A
    // tint that indented its own player would read as a layout fault, not as a
    // medal.
    <li
      className={`flex flex-col gap-2 rounded-lg p-2.5 ${
        (place === null ? undefined : PODIUM_TINT[place]) ?? PLAIN_TINT
      }`}
    >
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
