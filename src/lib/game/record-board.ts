/**
 * The board of records one game holds: every basket a mark can be set in, the
 * mark standing in each, and who holds it — including the baskets **nobody has
 * ever played**, which is the point. A record page that only listed what has
 * been achieved would answer « qu'a-t-on fait ? »; this one answers « qu'y
 * a-t-il à prendre ? », so an empty cell is a result, not a gap.
 *
 * Nothing is stored: every figure here is derived from the parties already in
 * the books. There is no table of records to fall out of date, and no mark can
 * be typed in.
 *
 * Three things cut the board, and each for its own reason:
 *
 * - **The extensions in play** (the tabs). A score made with an extension does
 *   not compare to one made without it — Marins adds points to the board,
 *   Océanie moves the nectar. The base game is a basket of its own, not a
 *   missing value.
 * - **The size of the table** (the rows), but only where the game says its
 *   scale moves with it (`playerCountSensitive`). Everywhere else the whole
 *   game answers to one figure, and splitting it by seats would contradict what
 *   the end-of-game banner announces.
 * - **The scenario and the finish line**, inside a cell, for a game that is
 *   raced: two races to different targets are not the same race
 *   ({@link speedRuns}), but they are the same extension, so they share a tab
 *   and take a line each.
 *
 * Pure: no vendor types, no React, unit-tested.
 */

import type {
  Boardgame,
  GameStatsRecord,
  PlayedExtension,
  PlayerId,
} from "@/lib/domain";
import { extensionTab } from "./extensions";
import type { ScoreDirection } from "./scoring";
import { scoreDirectionOf } from "./scoring";
import type { SpeedRun } from "./speed-records";
import { speedRuns, tracksSpeedRecord } from "./speed-records";

/** What a mark on this board is measured in. */
export type RecordMetric = "score" | "speed";

/** How the base game names its own tab. */
export const BASE_TAB_LABEL = "Jeu de base";

/** How a tab names itself — the base game included. */
export function tabLabel(key: string): string {
  return key === "" ? BASE_TAB_LABEL : key;
}

/** How a row names itself, on a game read at one table size or at all of them. */
export function sizeLabel(playerCount: number | null): string {
  return playerCount === null ? "Toutes tailles" : `${playerCount} joueurs`;
}

/**
 * The same, shrunk to the grid's left rail: « 3J ». The rail is a column of
 * figures read side by side, not a sentence — the word « joueurs » repeated
 * down it costs a fifth of a phone's width to say what the column already says
 * once, above the marks it holds.
 */
export function sizeShort(playerCount: number | null): string {
  return playerCount === null ? "" : `${playerCount}J`;
}

/** The finish line of a race, shrunk the same way: « 15P ». */
export function targetShort(target: number): string {
  return `${target}P`;
}

/** The finish line said in full, where there is room for it to be read. */
export function targetLong(target: number): string {
  return `objectif ${target} points`;
}

/** One player's own best inside a basket, and how often he played it. */
export interface PlayerBest {
  playerId: PlayerId;
  name: string;
  value: number;
  /** Parties of his that count towards this mark — see {@link RecordEntry}. */
  parties: number;
}

/** One mark of a cell: the figure standing, who holds it, and everyone's own. */
export interface RecordEntry {
  key: string;
  /**
   * The finish line this mark was set against, on a race. Null for a score,
   * which a cell holds one of and which is raced towards nothing.
   */
  target: number | null;
  /**
   * What else separates this mark from the others of its cell — the scenario
   * played, when there is one. Null everywhere else.
   */
  label: string | null;
  metric: RecordMetric;
  value: number;
  /** Who holds the mark; several when they are level on it. */
  holders: string[];
  /**
   * Parties this mark was set among — the ones on **its own course**, not the
   * ones played at its table size. A size that holds two races holds two counts,
   * and crediting either with the other's parties would say a mark was fought
   * over more than it was.
   */
  parties: number;
  /**
   * Each player's own best, best first. A score counts everybody who posted
   * one; a race counts only its winners, since reaching the target is what the
   * laps are counted to.
   */
  bests: PlayerBest[];
}

/** One row of a tab: a table size, and the marks set at it. */
export interface BoardRow {
  /** Null on a game whose scores compare across every table size. */
  playerCount: number | null;
  label: string;
  entries: RecordEntry[];
  /** Parties in the books here — zero is « personne n'y est encore allé ». */
  parties: number;
}

/** One tab of the board: a set of extensions, read at every table size. */
export interface BoardTab {
  /** The extensions in play, empty for the base game. */
  key: string;
  label: string;
  rows: BoardRow[];
}

export interface RecordBoard {
  /** What this game keeps a record of at all — empty when it keeps none. */
  metrics: RecordMetric[];
  tabs: BoardTab[];
}

/** The table sizes the grid offers: what the box allows, plus what was played. */
export function boardSizes(
  boardgame: Readonly<Pick<Boardgame, "minPlayers" | "maxPlayers">>,
  played: readonly number[],
): number[] {
  // Played sizes come first so a table the box never promised still shows its
  // record — Forêt Mixte is declared 2–4 and has a party at 5.
  const sizes = new Set<number>(played);

  if (boardgame.minPlayers !== null && boardgame.maxPlayers !== null) {
    for (let n = boardgame.minPlayers; n <= boardgame.maxPlayers; n += 1) {
      sizes.add(n);
    }
  }

  return [...sizes].sort((a, b) => a - b);
}

/**
 * The tabs the board offers: the base game, then every extension the game
 * declares — so one nobody has played yet still shows what is up for grabs —
 * then any combination actually played that the declared list doesn't name.
 */
export function boardTabs(
  declared: readonly string[],
  played: readonly string[],
): string[] {
  const tabs = ["", ...declared];

  for (const key of played) {
    if (!tabs.includes(key)) {
      tabs.push(key);
    }
  }

  return tabs;
}

/** A single figure somebody posted, before the bests are folded together. */
interface Mark {
  playerId: PlayerId;
  name: string;
  value: number;
}

/** The better of two figures, at whichever end of the scale wins the game. */
function bestValue(a: number, b: number, direction: ScoreDirection): number {
  return direction === "highest" ? Math.max(a, b) : Math.min(a, b);
}

/** Each player's own best among `marks`, best first. */
function bestsOf(
  marks: readonly Mark[],
  direction: ScoreDirection,
): PlayerBest[] {
  const byPlayer = new Map<PlayerId, PlayerBest>();

  for (const mark of marks) {
    const held = byPlayer.get(mark.playerId);

    if (held === undefined) {
      byPlayer.set(mark.playerId, { ...mark, parties: 1 });
    } else {
      held.parties += 1;
      held.value = bestValue(mark.value, held.value, direction);
    }
  }

  return [...byPlayer.values()].sort((a, b) =>
    direction === "highest" ? b.value - a.value : a.value - b.value,
  );
}

/** The marks folded into one entry, or null when nobody posted any. */
function entryOf(
  {
    key,
    target,
    label,
    metric,
    parties,
  }: Readonly<
    Pick<RecordEntry, "key" | "target" | "label" | "metric" | "parties">
  >,
  marks: readonly Mark[],
  direction: ScoreDirection,
): RecordEntry | null {
  const bests = bestsOf(marks, direction);
  const top = bests[0];

  if (top === undefined) {
    return null;
  }

  return {
    key,
    target,
    label,
    metric,
    parties,
    value: top.value,
    holders: bests.filter(b => b.value === top.value).map(b => b.name),
    bests,
  };
}

/** The best score posted in a cell, whoever posted it and whether he won. */
function scoreEntry(
  parties: readonly GameStatsRecord[],
  direction: ScoreDirection,
): RecordEntry | null {
  const marks = parties.flatMap(party =>
    party.players.flatMap(seat =>
      seat.score === null
        ? []
        : [{ playerId: seat.playerId, name: seat.name, value: seat.score }],
    ),
  );

  return entryOf(
    {
      key: "score",
      target: null,
      label: null,
      metric: "score",
      parties: parties.length,
    },
    marks,
    direction,
  );
}

/**
 * « Les quatre îles » : the map a race was laid out on, or null when the
 * extensions in play chose none.
 *
 * Kept apart from the finish line, which the grid reads on its own rail as a
 * figure. A scenario is a name and belongs with the holder; a target is a
 * number and belongs in the column of numbers.
 */
export function scenarioLabel(
  extensions: readonly PlayedExtension[],
): string | null {
  const scenarios = extensions
    .flatMap(e => (e.scenarioName === null ? [] : [e.scenarioName]))
    .join(" + ");

  return scenarios === "" ? null : scenarios;
}

/**
 * The fastest race of each course run in a cell — one line per scenario and
 * finish line, since two races to different targets never compared.
 */
function speedEntries(
  parties: readonly GameStatsRecord[],
  runs: readonly SpeedRun[],
): RecordEntry[] {
  const here = new Map(parties.map(p => [p.gameId, p]));
  const courses = new Map<
    string,
    { target: number; label: string | null; parties: number; marks: Mark[] }
  >();

  for (const run of runs) {
    const party = here.get(run.gameId);

    if (party === undefined) {
      continue;
    }

    const key = `${run.setup}|${run.target}`;
    const course = courses.get(key) ?? {
      target: run.target,
      label: scenarioLabel(party.extensions ?? []),
      parties: 0,
      marks: [],
    };

    course.parties += 1;

    // The laps go to whoever reached the target — several only on a shared
    // victory. A runner-up ran the same race but never finished it.
    const winners = party.players.filter(p => run.winners.includes(p.playerId));

    for (const seat of winners) {
      course.marks.push({
        playerId: seat.playerId,
        name: seat.name,
        value: run.rounds,
      });
    }

    courses.set(key, course);
  }

  return (
    [...courses.entries()]
      // The rail climbs: 10P, then 12P, then 15P. Left alone, the courses come
      // out in the order the parties happened to be played, which is the
      // notebook's order and not the reader's — he looks down the rail for one
      // finish line among several, and a sorted column is scanned where an
      // unsorted one has to be read. Ties keep their order, so two scenarios
      // raced to the same line stay as the notebook filed them.
      .sort(([, a], [, b]) => a.target - b.target)
      .map(([key, course]) =>
        entryOf(
          {
            key: `speed:${key}`,
            target: course.target,
            label: course.label,
            metric: "speed",
            parties: course.parties,
          },
          course.marks,
          "lowest",
        ),
      )
      .filter(entry => entry !== null)
  );
}

/** The whole board of one game, tab by tab and row by row. */
export function recordBoard({
  boardgame,
  extensions,
  records,
}: Readonly<{
  boardgame: Readonly<
    Pick<Boardgame, "id" | "minPlayers" | "maxPlayers" | "scoring">
  >;
  /** The extensions the game declares, in their own order. */
  extensions: readonly string[];
  /** Every finished party the app knows of; other games are dropped here. */
  records: readonly GameStatsRecord[];
}>): RecordBoard {
  const scoring = boardgame.scoring;
  const parties = records.filter(r => r.boardgameId === boardgame.id);
  const metrics: RecordMetric[] = [];

  // A game can silence its score record and still hold a speed one: Catan lets
  // the scenario decide the total, so the total says nothing and the laps say
  // everything ([[boardmate-record-flag-model]]).
  if (scoring !== null && scoring.trackRecords !== false) {
    metrics.push("score");
  }

  if (tracksSpeedRecord(scoring)) {
    metrics.push("speed");
  }

  const direction = scoreDirectionOf(scoring);
  const sizes: Array<number | null> =
    scoring?.playerCountSensitive === true
      ? boardSizes(
          boardgame,
          parties.map(p => p.players.length),
        )
      : [null];
  // Read once for the whole board rather than per cell: the disqualifiers of a
  // race (a party keyed in after the fact, an unknown finish line, nobody to
  // credit) belong to the party, not to the basket it lands in.
  const runs = speedRuns(scoring, boardgame.id, parties);

  return {
    metrics,
    tabs: boardTabs(
      extensions,
      parties.map(p => extensionTab(p.extensions ?? [])),
    ).map(key => ({
      key,
      label: tabLabel(key),
      rows: sizes.map(playerCount => {
        const cell = parties.filter(
          party =>
            extensionTab(party.extensions ?? []) === key &&
            (playerCount === null || party.players.length === playerCount),
        );
        const entries: RecordEntry[] = [];
        const score = metrics.includes("score")
          ? scoreEntry(cell, direction)
          : null;

        if (score !== null) {
          entries.push(score);
        }

        if (metrics.includes("speed")) {
          entries.push(...speedEntries(cell, runs));
        }

        return {
          playerCount,
          label: sizeLabel(playerCount),
          entries,
          parties: cell.length,
        };
      }),
    })),
  };
}
