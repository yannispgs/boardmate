import type { PlayerId } from "@/lib/domain";
import type { RibbonTurn } from "@/lib/game/turn-ribbon";

/**
 * Layout constants and pure geometry for the turn ribbon. Kept apart from the
 * React pieces so the maths (measuring names, placing tags at absolute offsets,
 * enumerating the visible window of turns) stays testable and comment-free at
 * the call sites.
 */

export const FONT = 16; // player-name font size
export const PAD_X = 18; // horizontal text padding inside a tag
export const P = 12; // chevron point depth
export const CH = 11; // chevron half-height
export const TOP = 18; // room above the pill for the "Tour N" label
export const BOT = 58;
export const MID = 38;
export const SVG_H = 64;
export const GAP = -7; // negative → chevrons nearly nest, hairline between them
export const BAR_W = 3;
export const BAR_GAP = 10; // breathing room on each side of a round bar
export const PAD_LEFT = 10; // where the current player sits from the left
export const AHEAD = 9; // upcoming turns kept rendered beyond the current one

export interface TagItem {
  kind: "tag";
  turn: number;
  name: string;
  w: number;
  left: number;
  firstOfRound: boolean;
  lastOfRound: boolean;
  isCurrent: boolean;
  faded: boolean;
}

export interface BarItem {
  kind: "bar";
  round: number;
  /** Turn the bar opens — the ribbon's stable key for it. */
  turn: number;
  left: number;
  faded: boolean;
}

/** End-of-game flag, placed just after the last player of a fixed-length game. */
export interface EndItem {
  kind: "end";
  left: number;
}

/** End-of-stage note (« Fin manche 2 »), placed where the ribbon stops. */
export interface StageEndItem {
  kind: "stage-end";
  label: string;
  left: number;
}

export type Item = TagItem | BarItem | EndItem | StageEndItem;

/** What each player's tag is called and how wide its rectangle is. */
export interface RibbonMetrics {
  name: Map<PlayerId, string>;
  /** Rectangle width (name + padding, chevron excluded). */
  width: Map<PlayerId, number>;
}

/** Measures a name's rendered width (client-only; the ribbon never SSRs). */
export function measureName(name: string): number {
  const cache = measureName as unknown as { _c?: CanvasRenderingContext2D };
  if (!cache._c && typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = `500 ${FONT}px ui-sans-serif, system-ui, sans-serif`;
      cache._c = ctx;
    }
  }

  return cache._c ? cache._c.measureText(name).width : name.length * FONT * 0.6;
}

/** Names and rectangle widths, measured once per table. */
export function measurePlayers(
  players: { id: PlayerId; name: string }[],
): RibbonMetrics {
  const name = new Map<PlayerId, string>();
  const width = new Map<PlayerId, number>();

  for (const p of players) {
    name.set(p.id, p.name);
    width.set(p.id, Math.round(measureName(p.name)) + PAD_X * 2);
  }

  return { name, width };
}

/** A turn of the sequence, given its place on the ribbon. */
interface PlacedTurn extends RibbonTurn {
  /** X of the "Tour N" bar this turn opens its lap with, if it opens one. */
  barLeft: number | null;
  /** X of the tag's rectangle. */
  left: number;
  /** Width of that rectangle, chevron excluded. */
  w: number;
}

/**
 * Lays the whole sequence out end to end, each turn taking the space its own
 * name needs. Positions are therefore **cumulative**, never arithmetic: a turn
 * already placed keeps its x whatever the turns after it turn out to be, so the
 * ribbon only ever travels forward.
 */
function place(seq: RibbonTurn[], metrics: RibbonMetrics): PlacedTurn[] {
  const out: PlacedTurn[] = [];
  let x = 0;

  for (const t of seq) {
    // `?? 0` only bites on a turn played by someone no longer at the table.
    const w = metrics.width.get(t.playerId) ?? 0;
    let barLeft: number | null = null;

    if (t.firstOfLap) {
      barLeft = x;
      x += BAR_W + BAR_GAP;
    }

    const left = x;
    // A tag that closes its lap drops its chevron, so it needs no overlap with
    // the next one — the lap's bar goes in the space instead.
    x += (t.lastOfLap ? w : w + P) + 1 + (t.lastOfLap ? BAR_GAP : GAP);
    out.push({ ...t, barLeft, left, w });
  }

  return out;
}

/**
 * The visible window of items — the just-played turn, the current one and the
 * next `AHEAD` — as tags plus a "Tour N" bar before each lap's opener, together
 * with the current turn's x so the ribbon knows how far to scroll.
 *
 * `lastTurn` (0-based global index of a fixed-length game's final turn) puts an
 * end flag just after that last player, once it comes into view; `stageEnd` does
 * the same with a « Fin manche N » note where a stage stops.
 */
export function buildItems(
  seq: RibbonTurn[],
  current: number,
  metrics: RibbonMetrics,
  opts?: {
    lastTurn?: number | null;
    stageEnd?: { turn: number; label: string } | null;
  },
): { items: Item[]; currentLeft: number } {
  const placed = place(seq, metrics);
  const start = Math.max(0, current - 1);
  const stop = current + AHEAD;
  const items: Item[] = [];
  let currentLeft = 0;

  for (const t of placed) {
    if (t.turn === current) {
      currentLeft = t.left;
    }

    if (t.turn < start || t.turn > stop) {
      continue;
    }

    if (t.barLeft !== null) {
      // A lap's divider dims once that lap has begun.
      items.push({
        kind: "bar",
        round: t.lap,
        turn: t.turn,
        left: t.barLeft,
        faded: current >= t.turn,
      });
    }

    items.push({
      kind: "tag",
      turn: t.turn,
      name: metrics.name.get(t.playerId) ?? "",
      w: t.w,
      left: t.left,
      firstOfRound: t.firstOfLap,
      lastOfRound: t.lastOfLap,
      isCurrent: t.turn === current,
      faded: t.turn < current,
    });
  }

  const lastTurn = opts?.lastTurn ?? null;
  const endLeft = capLeft(placed, lastTurn, stop);

  if (endLeft !== null) {
    items.push({ kind: "end", left: endLeft });
  }

  const stageEnd = opts?.stageEnd ?? null;

  // The finish flag wins when both fall on the same turn: a game that is over is
  // over, and the manche closing with it says nothing more.
  if (stageEnd !== null && stageEnd.turn !== lastTurn) {
    const left = capLeft(placed, stageEnd.turn, stop);

    if (left !== null) {
      items.push({ kind: "stage-end", label: stageEnd.label, left });
    }
  }

  return { items, currentLeft };
}

/**
 * Where a cap sits — just past the turn it closes — once that turn is in view.
 * Null when it is still too far ahead to announce.
 */
function capLeft(
  placed: PlacedTurn[],
  turn: number | null,
  stop: number,
): number | null {
  if (turn === null || turn > stop) {
    return null;
  }

  const last = placed.find(t => t.turn === turn);

  // The sequence stops on that turn, so it is there — unless the table is empty.
  return last ? last.left + last.w + BAR_GAP : null;
}
