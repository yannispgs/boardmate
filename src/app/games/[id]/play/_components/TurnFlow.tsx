"use client";

import { useMemo } from "react";

import type { PlayerId } from "@/lib/domain";

/**
 * The turn order as a scrolling chevron ribbon. The current player is pinned to
 * the left with a gradient fill; on each turn the ribbon slides left (the player
 * who just played fades out, upcoming players fade against the right edge). A
 * "Tour N" divider bar travels before each round's opening player and fades away
 * once that round has started. Each round is bounded: its first player has no
 * left chevron, its last no right chevron.
 *
 * Items are placed at ABSOLUTE x-offsets in a stable coordinate space (a round
 * has a fixed width, repeated), and only the strip's transform changes per turn.
 * That keeps the CSS transition well-defined — a sliding window with flex margins
 * shifts the coordinate origin as items mount/unmount, which broke the animation
 * on mobile (it jumped instead of sliding).
 */

const FONT = 16; // player-name font size
const PAD_X = 18; // horizontal text padding inside a tag
const P = 12; // chevron point depth
const CH = 11; // chevron half-height
const TOP = 18; // room above the pill for the "Tour N" label
const BOT = 58;
const MID = 38;
const SVG_H = 64;
const GAP = -7; // negative → chevrons nearly nest, hairline between them
const BAR_W = 3;
const BAR_GAP = 10; // breathing room on each side of a round bar
const PAD_LEFT = 10; // where the current player sits from the left
const AHEAD = 9; // upcoming turns kept rendered beyond the current one

/** Measures a name's rendered width (client-only; the ribbon never SSRs). */
function measureName(name: string): number {
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

/** The tag outline: vertical top/bottom edges + a chevron notch/point per side. */
function tagPath(w: number, hasLeft: boolean, hasRight: boolean): string {
  const my0 = MID - CH;
  const my1 = MID + CH;
  let d = `M 0 ${TOP} L ${w} ${TOP} `;
  d += hasRight ? `L ${w} ${my0} L ${w + P} ${MID} L ${w} ${my1} ` : "";
  d += `L ${w} ${BOT} L 0 ${BOT} `;
  d += hasLeft ? `L 0 ${my1} L ${P} ${MID} L 0 ${my0} ` : "";

  return `${d}Z`;
}

interface TagItem {
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
interface BarItem {
  kind: "bar";
  round: number;
  left: number;
  faded: boolean;
}
type Item = TagItem | BarItem;

export function TurnFlow({
  players,
  currentPlayerId,
  round,
}: {
  players: { id: PlayerId; name: string }[];
  currentPlayerId: PlayerId | null;
  round: number;
}) {
  const n = players.length;

  // Stable per-round layout: each seat's x within a round, and the round width.
  const geom = useMemo(() => {
    const seatX: number[] = [];
    let x = BAR_W + BAR_GAP; // after the round's opening bar
    for (let i = 0; i < players.length; i++) {
      seatX[i] = x;
      const lastOfRound = i === players.length - 1;
      const width =
        (lastOfRound
          ? Math.round(measureName(players[i].name)) + PAD_X * 2
          : Math.round(measureName(players[i].name)) + PAD_X * 2 + P) + 1;
      x += width + (lastOfRound ? BAR_GAP : GAP);
    }

    return { seatX, roundWidth: x };
  }, [players]);

  const widths = useMemo(
    () => players.map(p => Math.round(measureName(p.name)) + PAD_X * 2),
    [players],
  );

  const curSeat = Math.max(
    0,
    players.findIndex(p => p.id === currentPlayerId),
  );
  const current = (round - 1) * n + curSeat; // global turn index

  const items = useMemo<Item[]>(() => {
    if (n === 0) {
      return [];
    }

    const out: Item[] = [];
    const start = Math.max(0, current - 1);
    for (let turn = start; turn <= current + AHEAD; turn++) {
      const roundIdx = Math.floor(turn / n);
      const seat = turn % n;
      const base = roundIdx * geom.roundWidth;

      if (seat === 0) {
        out.push({
          kind: "bar",
          round: roundIdx + 1,
          left: base,
          faded: current >= turn, // hide once this round has begun
        });
      }
      out.push({
        kind: "tag",
        turn,
        name: players[seat].name,
        w: widths[seat],
        left: base + geom.seatX[seat],
        firstOfRound: seat === 0,
        lastOfRound: seat === n - 1,
        isCurrent: turn === current,
        faded: turn < current,
      });
    }

    return out;
  }, [current, n, players, widths, geom]);

  if (n === 0) {
    return null;
  }

  const currentAbsX = (round - 1) * geom.roundWidth + geom.seatX[curSeat];
  const scrollX = currentAbsX - PAD_LEFT;

  return (
    <div
      className="relative w-full max-w-sm overflow-hidden"
      style={{ height: SVG_H }}
    >
      <svg width="0" height="0" className="absolute" aria-hidden>
        <title>Dégradé du joueur courant</title>
        <defs>
          <linearGradient id="tf-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
      </svg>

      {/* Animate `left` (CPU paint), not `transform`: a GPU-composited layer
          repaints the SVG ribbon to black mid-animation on WebKit/iOS. */}
      <div
        className="absolute top-0 transition-[left] duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ height: SVG_H, left: -scrollX }}
      >
        {items.map(item =>
          item.kind === "bar" ? (
            <RoundBar
              key={`bar-${item.round}`}
              round={item.round}
              left={item.left}
              faded={item.faded}
            />
          ) : (
            <Tag key={`turn-${item.turn}`} item={item} />
          ),
        )}
      </div>

      {/* Edge fades as overlays (not a CSS mask, which flickers to black over a
          transformed child on WebKit) — they fade to the page background. */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-2"
        style={{
          background:
            "linear-gradient(to right, var(--background), transparent)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-16"
        style={{
          background:
            "linear-gradient(to left, var(--background), transparent)",
        }}
      />
    </div>
  );
}

function Tag({ item }: { item: TagItem }) {
  const hasLeft = !item.firstOfRound;
  const hasRight = !item.lastOfRound;
  const width = (hasRight ? item.w + P : item.w) + 1;

  return (
    <div
      className="absolute top-0 transition-opacity duration-500"
      style={{ left: item.left, opacity: item.faded ? 0 : 1 }}
    >
      <svg width={width} height={SVG_H} viewBox={`0 0 ${width} ${SVG_H}`}>
        <title>
          {item.isCurrent ? `${item.name} — joueur courant` : item.name}
        </title>
        <path
          d={tagPath(item.w, hasLeft, hasRight)}
          strokeLinejoin="round"
          className={
            item.isCurrent
              ? "fill-[url(#tf-grad)]"
              : "fill-zinc-200 dark:fill-zinc-800"
          }
        />
        <text
          x={item.w / 2}
          y={MID + FONT * 0.35}
          textAnchor="middle"
          className={`text-[16px] ${
            item.isCurrent
              ? "fill-white font-semibold"
              : "fill-zinc-700 font-medium dark:fill-zinc-300"
          }`}
        >
          {item.name}
        </text>
      </svg>
    </div>
  );
}

function RoundBar({
  round,
  left,
  faded,
}: {
  round: number;
  left: number;
  faded: boolean;
}) {
  return (
    <div
      className="absolute top-0 transition-opacity duration-500"
      style={{ left, width: BAR_W, height: SVG_H, opacity: faded ? 0 : 1 }}
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        style={{ top: -1 }}
      >
        Tour {round}
      </span>
      <span
        className="absolute left-0 rounded-full bg-black/40 dark:bg-white/45"
        style={{ top: TOP, width: BAR_W, height: BOT - TOP }}
      />
    </div>
  );
}
