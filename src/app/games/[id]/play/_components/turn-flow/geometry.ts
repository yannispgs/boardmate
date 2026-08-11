import type { PlayerId } from "@/lib/domain";

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
  left: number;
  faded: boolean;
}

/** End-of-game flag, placed just after the last player of a fixed-length game. */
export interface EndItem {
  kind: "end";
  left: number;
}

export type Item = TagItem | BarItem | EndItem;

export interface RoundLayout {
  /** X of each seat's tag within one round. */
  seatX: number[];
  /** Total width of one round, repeated per round to place later turns. */
  roundWidth: number;
  /** Rectangle width (name + padding, chevron excluded) of each seat's tag. */
  widths: number[];
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

/** Per-round tag positions and widths, in a stable coordinate space. */
export function layoutRound(players: { name: string }[]): RoundLayout {
  const seatX: number[] = [];
  const widths: number[] = [];
  let x = BAR_W + BAR_GAP; // after the round's opening bar

  for (let i = 0; i < players.length; i++) {
    const rect = Math.round(measureName(players[i].name)) + PAD_X * 2;
    widths[i] = rect;
    seatX[i] = x;
    const lastOfRound = i === players.length - 1;
    const width = (lastOfRound ? rect : rect + P) + 1;
    x += width + (lastOfRound ? BAR_GAP : GAP);
  }

  return { seatX, roundWidth: x, widths };
}

/**
 * The visible window of items — the just-played turn, the current one and the
 * next `AHEAD` — as tags plus a "Tour N" bar before each round's opener. Each is
 * placed at its absolute x so only the strip's offset animates per turn.
 *
 * `lastTurn` (0-based global index of a fixed-length game's final turn) caps the
 * ribbon: no turns are drawn past it — the game doesn't roll into another round
 * — and an end flag is placed just after that last player.
 *
 * `futureBlocks` draws the dividers of the rounds still to come. Turn it off for
 * a game played in generations: a generation ends whenever its last player
 * passes, so where the next one starts is unknowable and announcing it would be
 * a lie.
 */
export function buildItems(
  players: { id: PlayerId; name: string }[],
  current: number,
  layout: RoundLayout,
  opts?: { lastTurn?: number | null; futureBlocks?: boolean },
): Item[] {
  const n = players.length;
  if (n === 0) {
    return [];
  }

  const lastTurn = opts?.lastTurn;
  const futureBlocks = opts?.futureBlocks !== false;
  const out: Item[] = [];
  const start = Math.max(0, current - 1);
  const stop =
    lastTurn == null ? current + AHEAD : Math.min(current + AHEAD, lastTurn);

  for (let turn = start; turn <= stop; turn++) {
    const roundIdx = Math.floor(turn / n);
    const seat = turn % n;
    const base = roundIdx * layout.roundWidth;

    // Hide a round's divider once that round has begun.
    const started = current >= turn;

    if (seat === 0 && (started || futureBlocks)) {
      out.push({
        kind: "bar",
        round: roundIdx + 1,
        left: base,
        faded: started,
      });
    }
    out.push({
      kind: "tag",
      turn,
      name: players[seat].name,
      w: layout.widths[seat],
      left: base + layout.seatX[seat],
      firstOfRound: seat === 0,
      lastOfRound: seat === n - 1,
      isCurrent: turn === current,
      faded: turn < current,
    });
  }

  // Cap the ribbon with an end flag once the game's final turn is in view.
  if (lastTurn != null && lastTurn <= current + AHEAD) {
    const seat = lastTurn % n;
    const base = Math.floor(lastTurn / n) * layout.roundWidth;
    const tagEnd = base + layout.seatX[seat] + layout.widths[seat];
    out.push({ kind: "end", left: tagEnd + BAR_GAP });
  }

  return out;
}
