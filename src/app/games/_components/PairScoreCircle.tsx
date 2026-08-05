"use client";

import { useState } from "react";

import type { PlayerId } from "@/lib/domain";
import { pilesFor, pilesOfSeat, scorePiles } from "@/lib/game/pair-scoring";

/** The highest a single pile may be set to — well past anything the game deals. */
const MAX_PILE = 99;

/**
 * What a pile is worth the moment it is selected. Not 0 but a typical pile, so
 * the −/+ stepper starts near the answer instead of a dozen taps below it.
 */
const TYPICAL_PILE = 6;

/**
 * Where things sit, as a percentage of the square's half-width — the table seen
 * from above: the players sit AROUND it, the shared piles lie ON it, between
 * them. Two rings and not one interleaved: at eight players a single ring of
 * sixteen items has them elbowing each other.
 */
const PILE_RING = 26;
const SEAT_RING = 44;

const stepBtn =
  "flex h-12 w-12 items-center justify-center rounded-xl border border-black/15 text-2xl font-semibold leading-none transition active:bg-black/10 disabled:opacity-40 dark:border-white/15 dark:active:bg-white/10";

/** A player, and where round the table he sits. */
export interface Seat {
  id: PlayerId;
  name: string;
}

/**
 * The Splito score sheet, drawn as the table itself: the players sit in a
 * circle and the shared piles sit *between* them, exactly where the printed
 * sheet puts its ovals — straddling the border of two neighbouring cells.
 *
 * A pile is entered once for the two players it belongs to. Tapping one selects
 * it (and lights up its two owners); the −/+ stepper under the circle then sets
 * it, so no keyboard ever covers the table and the control stays under the
 * thumb instead of moving with the selection.
 *
 * Fully controlled: the piles live in the parent.
 */
export function PairScoreCircle({
  seats,
  piles,
  onPile,
  disabled,
}: {
  seats: Seat[];
  piles: Record<string, number>;
  onPile: (key: string, value: number) => void;
  disabled: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);

  const ids = seats.map(s => s.id);
  const ring = pilesFor(ids);
  const scores = scorePiles(ids, piles);
  const step = 360 / Math.max(ring.length, 1);
  const activePile = ring.find(p => p.key === active) ?? null;
  const activeValue = active === null ? undefined : piles[active];
  const nameOf = (id: PlayerId) => seats.find(s => s.id === id)?.name ?? "";

  // Selecting a pile for the first time seeds it: tapping it is already saying
  // "I've counted this one". An untouched pile stays blank rather than showing
  // a value nobody entered, so the gate below can still tell them apart.
  function select(key: string) {
    setActive(key);

    if (piles[key] === undefined) {
      onPile(key, TYPICAL_PILE);
    }
  }

  function bump(delta: number) {
    if (active === null) {
      return;
    }

    const next = (piles[active] ?? 0) + delta;

    onPile(active, Math.min(Math.max(next, 0), MAX_PILE));
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`relative mx-auto aspect-square w-full ${tableWidth(seats.length)}`}
      >
        {/* The table the piles lie on, with the players seated around it. */}
        <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-100/70 dark:bg-zinc-800/70" />

        {seats.map((s, i) => {
          const flanking = pilesOfSeat(ids, s.id);
          const owning =
            active !== null &&
            (flanking?.left === active || flanking?.right === active);

          return (
            <SeatMark
              key={s.id}
              name={s.name}
              owning={owning}
              angle={-90 + i * step}
            />
          );
        })}

        {ring.map((pile, i) => (
          <PileOval
            key={pile.key}
            label={`Tas entre ${nameOf(pile.between[0])} et ${nameOf(pile.between[1])}`}
            value={piles[pile.key]}
            active={pile.key === active}
            disabled={disabled}
            onSelect={() => select(pile.key)}
            angle={-90 + (i + 0.5) * step}
          />
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-3 dark:border-white/10">
        {activePile === null ? (
          <p className="py-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Touchez un tas pour compter ses points.
          </p>
        ) : (
          <>
            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Tas de {nameOf(activePile.between[0])} et{" "}
              {nameOf(activePile.between[1])}
            </p>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => bump(-1)}
                disabled={disabled || (activeValue ?? 0) <= 0}
                aria-label="Retirer un point au tas"
                className={stepBtn}
              >
                −
              </button>

              <span className="w-10 text-center text-3xl font-bold tabular-nums">
                {activeValue ?? 0}
              </span>

              <button
                type="button"
                onClick={() => bump(1)}
                disabled={disabled || (activeValue ?? 0) >= MAX_PILE}
                aria-label="Ajouter un point au tas"
                className={stepBtn}
              >
                +
              </button>
            </div>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {seats.map(s => {
          const flanking = pilesOfSeat(ids, s.id);
          // Both piles have to be counted before a product means anything: a
          // missing one would read as a genuine zero.
          const counted =
            flanking !== null &&
            piles[flanking.left] !== undefined &&
            piles[flanking.right] !== undefined;
          const score = scores[s.id];

          return (
            <li
              key={s.id}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{s.name}</span>

              <span
                className="shrink-0 tabular-nums text-zinc-500 dark:text-zinc-400"
                aria-label={`Score de ${s.name}`}
              >
                {counted ? (
                  <>
                    {score.left} × {score.right} ={" "}
                    <strong
                      className={
                        score.total === 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }
                    >
                      {score.total}
                    </strong>
                  </>
                ) : (
                  "—"
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * How wide the table is drawn: a big circle for a full table, a smaller one for
 * three players, who would otherwise sit around a lot of nothing.
 */
function tableWidth(players: number): string {
  if (players >= 6) {
    return "max-w-[19rem]";
  }

  if (players >= 5) {
    return "max-w-[17rem]";
  }

  return "max-w-[14rem]";
}

/** One player round the table: the score sheet's little figure, and his name. */
function SeatMark({
  name,
  owning,
  angle,
}: {
  name: string;
  owning: boolean;
  angle: number;
}) {
  return (
    <div
      style={polar(angle, SEAT_RING)}
      className={`absolute flex w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-lg px-0.5 py-0.5 ${
        owning ? "bg-indigo-500/20 ring-1 ring-indigo-500" : ""
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-5 w-5 fill-zinc-700 dark:fill-zinc-300"
      >
        <circle cx="12" cy="7" r="4" />
        <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z" />
      </svg>

      <span className="w-full truncate text-center text-[0.6rem] leading-tight text-zinc-700 dark:text-zinc-300">
        {name}
      </span>
    </div>
  );
}

/** One shared pile: the score sheet's white oval, straddling two players. */
function PileOval({
  label,
  value,
  active,
  disabled,
  onSelect,
  angle,
}: {
  label: string;
  value: number | undefined;
  active: boolean;
  disabled: boolean;
  onSelect: () => void;
  angle: number;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      style={polar(angle, PILE_RING)}
      className={`absolute flex h-10 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-lg font-bold tabular-nums shadow-sm transition disabled:opacity-50 ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-zinc-300 bg-white text-zinc-900"
      }`}
    >
      {value ?? "–"}
    </button>
  );
}

/** Places an element on a ring, `angle` in degrees clockwise from the top. */
function polar(angle: number, radius: number): { left: string; top: string } {
  const rad = (angle * Math.PI) / 180;

  return {
    left: `${50 + radius * Math.cos(rad)}%`,
    top: `${50 + radius * Math.sin(rad)}%`,
  };
}
