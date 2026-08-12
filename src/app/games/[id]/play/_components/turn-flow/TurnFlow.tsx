"use client";

import { useMemo } from "react";

import type { GameTurn, PlayerId, StagePass } from "@/lib/domain";
import { stageEndTurn } from "@/lib/game/stage";
import {
  generationSequence,
  lapSequence,
  stageSequence,
} from "@/lib/game/turn-ribbon";

import { EndCap } from "./EndCap";
import { AHEAD, buildItems, measurePlayers, PAD_LEFT, SVG_H } from "./geometry";
import { RoundBar } from "./RoundBar";
import { StageEndCap } from "./StageEndCap";
import { Tag } from "./Tag";

/** What a game played in generations needs the ribbon to know. */
export interface GenerationFlow {
  /** The generation being played. */
  stage: number;
  /** The turn log, which is where the ribbon reads the past from. */
  turns: GameTurn[];
  /** Every pass recorded this game, of any generation. */
  passes: StagePass[];
}

/** What a game played on a calendar needs the ribbon to know. */
export interface CalendarFlow {
  /** What the box calls one stage — « Manche ». */
  label: string;
  /** The laps each stage lasts, in order. */
  turnsPerStage: number[];
}

/**
 * The turn order as a scrolling chevron ribbon. The current player is pinned to
 * the left with a gradient fill; on each turn the ribbon slides left (the player
 * who just played fades out, upcoming players fade against the right edge). A
 * "Tour N" divider bar travels before each lap's opening player. Each lap is
 * bounded: its first player has no left chevron, its last no right chevron.
 *
 * What the ribbon draws is a plain **sequence** of turns (`turn-ribbon.ts`) laid
 * end to end (`geometry.ts`), each at its absolute x, with only the strip's
 * offset changing per turn. That keeps the CSS transition well-defined — a
 * sliding window with flex margins shifts the origin as items mount/unmount,
 * which broke the animation on mobile — and it means the ribbon always travels
 * forward, even when a generation reshuffles who plays next.
 */
export function TurnFlow({
  players,
  currentPlayerId,
  turn,
  roundLimit,
  generation = null,
  calendar = null,
}: Readonly<{
  /** Everyone at the table, in seat order — nobody is ever dropped. */
  players: { id: PlayerId; name: string }[];
  currentPlayerId: PlayerId | null;
  /** The play screen's 1-based global turn counter. */
  turn: number;
  /** Fixed game length in rounds, or null for an open-ended game. */
  roundLimit: number | null;
  /** Set for a game played in generations, null for one played in plain laps. */
  generation?: GenerationFlow | null;
  /** Set for a game played on a calendar, null for one that follows none. */
  calendar?: CalendarFlow | null;
}>) {
  const n = players.length;
  const metrics = useMemo(() => measurePlayers(players), [players]);

  // Global turn index, read off the game's own counter. Seat arithmetic would
  // not do: a generation's laps hold different players, and a calendar hands the
  // first-player marker on at each new stage, so the seat a turn falls on is no
  // longer where the lap started.
  const current = turn - 1;
  // 0-based index of the game's very last turn (last seat of the last round).
  const lastTurn =
    roundLimit !== null && !generation ? roundLimit * n - 1 : null;

  const seq = useMemo(() => {
    const seats = players.map(p => p.id);

    if (calendar) {
      return stageSequence(
        seats,
        current,
        AHEAD,
        lastTurn,
        calendar.turnsPerStage,
      );
    }

    if (!generation) {
      return lapSequence(seats, current, AHEAD, lastTurn);
    }

    return generationSequence({
      seats,
      played: generation.turns.map(t => ({
        turn: t.turnNo - 1,
        playerId: t.playerId,
        stage: t.stage ?? generation.stage,
      })),
      current,
      currentPlayerId: currentPlayerId ?? seats[0],
      stage: generation.stage,
      passes: generation.passes,
      ahead: AHEAD,
    });
  }, [players, generation, calendar, current, currentPlayerId, lastTurn]);

  // Where the manche being played stops, and what to write there.
  const stageEnd = useMemo(() => {
    if (!calendar || n === 0) {
      return null;
    }

    const at = stageEndTurn(turn, n, calendar.turnsPerStage);

    return {
      turn: at.turn - 1,
      label: `Fin ${calendar.label.toLowerCase()} ${at.stage}`,
    };
  }, [calendar, n, turn]);

  const { items, currentLeft } = useMemo(
    () => buildItems(seq, current, metrics, { lastTurn, stageEnd }),
    [seq, current, metrics, lastTurn, stageEnd],
  );

  if (n === 0) {
    return null;
  }

  const scrollX = currentLeft - PAD_LEFT;

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
                key={`bar-${item.turn}`}
                round={item.round}
                left={item.left}
                faded={item.faded}
              />
            );
          }

          if (item.kind === "end") {
            return <EndCap key="end" left={item.left} />;
          }

          if (item.kind === "stage-end") {
            return (
              <StageEndCap
                key="stage-end"
                label={item.label}
                left={item.left}
              />
            );
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
