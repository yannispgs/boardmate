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
 * The scroll offset is computed analytically from the (measured) tag widths and
 * set as the strip transform in render, so the CSS transition animates reliably
 * (measuring layout in an effect broke the transition on mobile).
 */

const PAD_X = 16; // horizontal text padding inside a tag
const P = 10; // chevron point depth
const CH = 9; // chevron half-height
const TOP = 18;
const BOT = 50;
const MID = 34;
const SVG_H = 56;
const GAP = -6; // negative → chevrons nearly nest, hairline between them
const BAR_W = 3;
const BAR_GAP = 9; // breathing room on each side of a round bar
const PAD_LEFT = 8; // where the current player sits from the left
const AHEAD = 9; // upcoming turns kept rendered beyond the current one

/** Measures a name's rendered width (client-only; the ribbon never SSRs). */
function measureName(name: string): number {
  const cache = measureName as unknown as { _c?: CanvasRenderingContext2D };
  if (!cache._c && typeof document !== "undefined") {
    const ctx = document.createElement("canvas").getContext("2d");
    if (ctx) {
      ctx.font = "500 13px ui-sans-serif, system-ui, sans-serif";
      cache._c = ctx;
    }
  }

  return cache._c ? cache._c.measureText(name).width : name.length * 8.2;
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
  firstOfRound: boolean;
  lastOfRound: boolean;
  isCurrent: boolean;
  faded: boolean;
}
interface BarItem {
  kind: "bar";
  round: number;
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

  const widths = useMemo(
    () => players.map(p => Math.round(measureName(p.name)) + PAD_X * 2),
    [players],
  );

  const curSeat = Math.max(
    0,
    players.findIndex(p => p.id === currentPlayerId),
  );
  const current = (round - 1) * n + curSeat; // global turn index

  // Build the visible window and, in the same pass, accumulate x-offsets so we
  // know exactly where the current tag sits (→ how far to slide the strip).
  const { items, scrollX } = useMemo(() => {
    if (n === 0) {
      return { items: [] as Item[], scrollX: 0 };
    }

    const out: Item[] = [];
    let x = 0;
    let currentLeft = 0;
    const start = Math.max(0, current - 1);

    for (let turn = start; turn <= current + AHEAD; turn++) {
      const seat = turn % n;

      if (seat === 0) {
        // The bar precedes this round-starter; hide it once the round begins.
        out.push({
          kind: "bar",
          round: Math.floor(turn / n) + 1,
          faded: current >= turn,
        });
        x += BAR_W + BAR_GAP;
      }

      const lastOfRound = seat === n - 1;
      const width = (lastOfRound ? widths[seat] : widths[seat] + P) + 1;
      if (turn === current) {
        currentLeft = x;
      }

      out.push({
        kind: "tag",
        turn,
        name: players[seat].name,
        w: widths[seat],
        firstOfRound: seat === 0,
        lastOfRound,
        isCurrent: turn === current,
        faded: turn < current,
      });
      x += width + (lastOfRound ? BAR_GAP : GAP);
    }

    return { items: out, scrollX: currentLeft - PAD_LEFT };
  }, [current, n, players, widths]);

  if (n === 0) {
    return null;
  }

  return (
    <div
      className="relative w-full max-w-sm overflow-hidden"
      style={{
        height: SVG_H,
        maskImage:
          "linear-gradient(to right, transparent 0, #000 8px, #000 calc(100% - 64px), transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, #000 8px, #000 calc(100% - 64px), transparent 100%)",
      }}
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

      <div
        className="absolute left-0 top-0 flex items-start transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ height: SVG_H, transform: `translateX(${-scrollX}px)` }}
      >
        {items.map(item =>
          item.kind === "bar" ? (
            <RoundBar
              key={`bar-${item.round}`}
              round={item.round}
              faded={item.faded}
            />
          ) : (
            <Tag key={`turn-${item.turn}`} item={item} />
          ),
        )}
      </div>
    </div>
  );
}

function Tag({ item }: { item: TagItem }) {
  const hasLeft = !item.firstOfRound;
  const hasRight = !item.lastOfRound;
  const width = (hasRight ? item.w + P : item.w) + 1;

  return (
    <div
      className="shrink-0 transition-opacity duration-500"
      style={{
        marginRight: item.lastOfRound ? BAR_GAP : GAP,
        opacity: item.faded ? 0 : 1,
      }}
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
          y={MID + 4.5}
          textAnchor="middle"
          className={`text-[13px] ${
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

function RoundBar({ round, faded }: { round: number; faded: boolean }) {
  return (
    <div
      className="relative shrink-0 transition-opacity duration-500"
      style={{
        width: BAR_W,
        height: SVG_H,
        marginRight: BAR_GAP,
        opacity: faded ? 0 : 1,
      }}
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        style={{ top: -1 }}
      >
        Tour {round}
      </span>
      <span
        className="absolute left-0 rounded-full bg-black/40 dark:bg-white/45"
        style={{ top: 18, width: BAR_W, height: 32 }}
      />
    </div>
  );
}
