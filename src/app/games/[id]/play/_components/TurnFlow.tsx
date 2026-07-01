"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";

import type { PlayerId } from "@/lib/domain";

/**
 * The turn order as a scrolling chevron ribbon. The current player is pinned to
 * the left; on each turn the ribbon slides left (the player who just played
 * fades out and re-enters at the far right), while upcoming players fade out
 * against the right edge. A round-divider bar with "Tour N" travels before the
 * round's opening player. Each round is bounded: its first player has no left
 * chevron, its last no right chevron.
 */

const PAD_X = 16; // horizontal text padding inside a tag
const P = 10; // chevron point depth
const CH = 9; // chevron half-height
const TOP = 18;
const BOT = 50;
const MID = 34;
const SVG_H = 56;
const GAP = -6; // negative → chevrons nearly nest, hairline between them
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
}
interface BarItem {
  kind: "bar";
  round: number;
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

  const items = useMemo<Item[]>(() => {
    if (n === 0) {
      return [];
    }

    const out: Item[] = [];
    const start = Math.max(0, current - 1);
    for (let turn = start; turn <= current + AHEAD; turn++) {
      const seat = turn % n;
      if (seat === 0) {
        out.push({ kind: "bar", round: Math.floor(turn / n) + 1 });
      }
      out.push({
        kind: "tag",
        turn,
        name: players[seat].name,
        w: widths[seat],
        firstOfRound: seat === 0,
        lastOfRound: seat === n - 1,
      });
    }

    return out;
  }, [current, n, players, widths]);

  // Slide the strip so the current tag sits at PAD_LEFT; the transform change
  // animates via CSS whenever the turn (and thus the layout) shifts.
  const stripRef = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  useLayoutEffect(() => {
    if (items.length === 0) {
      return;
    }

    const el = stripRef.current?.querySelector<HTMLElement>(
      '[data-current="true"]',
    );
    if (el) {
      setScrollX(el.offsetLeft - PAD_LEFT);
    }
  }, [items]);

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
        ref={stripRef}
        className="absolute left-0 top-0 flex items-start transition-transform duration-500 ease-[cubic-bezier(.4,0,.2,1)]"
        style={{ height: SVG_H, transform: `translateX(${-scrollX}px)` }}
      >
        {items.map(item =>
          item.kind === "bar" ? (
            <RoundBar key={`bar-${item.round}`} round={item.round} />
          ) : (
            <Tag
              key={`turn-${item.turn}`}
              item={item}
              isCurrent={item.turn === current}
              faded={item.turn < current}
            />
          ),
        )}
      </div>
    </div>
  );
}

function Tag({
  item,
  isCurrent,
  faded,
}: {
  item: TagItem;
  isCurrent: boolean;
  faded: boolean;
}) {
  const hasLeft = !item.firstOfRound;
  const hasRight = !item.lastOfRound;
  const width = (hasRight ? item.w + P : item.w) + 1;

  return (
    <div
      data-current={isCurrent}
      className="shrink-0 transition-opacity duration-500"
      style={{
        marginRight: item.lastOfRound ? BAR_GAP : GAP,
        opacity: faded ? 0 : 1,
      }}
    >
      <svg width={width} height={SVG_H} viewBox={`0 0 ${width} ${SVG_H}`}>
        <title>{isCurrent ? `${item.name} — joueur courant` : item.name}</title>
        <path
          d={tagPath(item.w, hasLeft, hasRight)}
          strokeLinejoin="round"
          className={
            isCurrent
              ? "fill-[url(#tf-grad)]"
              : "fill-zinc-200 dark:fill-zinc-800"
          }
        />
        <text
          x={item.w / 2}
          y={MID + 4.5}
          textAnchor="middle"
          className={`text-[13px] ${
            isCurrent
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

function RoundBar({ round }: { round: number }) {
  return (
    <div
      className="relative shrink-0"
      style={{ width: 3, height: SVG_H, marginRight: BAR_GAP }}
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-zinc-500 dark:text-zinc-400"
        style={{ top: -1 }}
      >
        Tour {round}
      </span>
      <span
        className="absolute left-0 rounded-full bg-black/40 dark:bg-white/45"
        style={{ top: 18, width: 3, height: 32 }}
      />
    </div>
  );
}
