"use client";

import { useMemo } from "react";

import type { PlayerId } from "@/lib/domain";

import { EndCap } from "./EndCap";
import { buildItems, layoutRound, PAD_LEFT, SVG_H } from "./geometry";
import { RoundBar } from "./RoundBar";
import { Tag } from "./Tag";

/**
 * The turn order as a scrolling chevron ribbon. The current player is pinned to
 * the left with a gradient fill; on each turn the ribbon slides left (the player
 * who just played fades out, upcoming players fade against the right edge). A
 * "Tour N" divider bar travels before each round's opening player. Each round is
 * bounded: its first player has no left chevron, its last no right chevron.
 *
 * Items are placed at ABSOLUTE x-offsets in a stable coordinate space (see
 * `geometry.ts`), and only the strip's offset changes per turn. That keeps the
 * CSS transition well-defined — a sliding window with flex margins shifts the
 * origin as items mount/unmount, which broke the animation on mobile.
 */
export function TurnFlow({
  players,
  currentPlayerId,
  round,
  roundLimit,
  futureBlocks = true,
}: Readonly<{
  players: { id: PlayerId; name: string }[];
  currentPlayerId: PlayerId | null;
  round: number;
  /** Fixed game length in rounds, or null for an open-ended game. */
  roundLimit: number | null;
  /**
   * Whether the rounds still to come get their divider. False for a game played
   * in generations, whose end nobody can see coming — see `buildItems`.
   */
  futureBlocks?: boolean;
}>) {
  const n = players.length;
  const layout = useMemo(() => layoutRound(players), [players]);

  const curSeat = Math.max(
    0,
    players.findIndex(p => p.id === currentPlayerId),
  );
  const current = (round - 1) * n + curSeat; // global turn index
  // 0-based index of the game's very last turn (last seat of the last round).
  const lastTurn = roundLimit !== null ? roundLimit * n - 1 : null;

  const items = useMemo(
    () => buildItems(players, current, layout, { lastTurn, futureBlocks }),
    [players, current, layout, lastTurn, futureBlocks],
  );

  if (n === 0) {
    return null;
  }

  const currentAbsX = (round - 1) * layout.roundWidth + layout.seatX[curSeat];
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
        {items.map(item => {
          if (item.kind === "bar") {
            return (
              <RoundBar
                key={`bar-${item.round}`}
                round={item.round}
                left={item.left}
                faded={item.faded}
              />
            );
          }

          if (item.kind === "end") {
            return <EndCap key="end" left={item.left} />;
          }

          return <Tag key={`turn-${item.turn}`} item={item} />;
        })}
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
