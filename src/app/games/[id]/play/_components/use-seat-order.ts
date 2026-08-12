"use client";

import { useState } from "react";

import type { GameId, PlayerId } from "@/lib/domain";
import { type MoveDirection, moveItem } from "@/lib/game/reorder";
import { getGameRepository } from "@/lib/repositories";

/** One seat of the table being put back in order. */
export interface Seat {
  id: PlayerId;
  name: string;
}

export interface SeatOrderEdit {
  /** The seating as it currently reads on screen, first seat first. */
  seats: Seat[];
  /** Something has been moved and not yet saved. */
  dirty: boolean;
  /** A save is in flight: nothing else is taken until it lands. */
  busy: boolean;
  /** Why the last save didn't take, `null` when everything went through. */
  error: string | null;
  /** Swaps the seat at `index` with the one above or below it. */
  move: (index: number, direction: MoveDirection) => void;
  /** Puts the table back the way it is recorded, dropping what was moved. */
  reset: () => void;
  /** Writes the new seating; leaves it untouched on screen if it is refused. */
  save: () => Promise<void>;
}

/**
 * The seating being corrected, held locally until it is saved: a reorder takes
 * several taps to express, and writing after each one would send the table
 * through orders nobody asked for — and, on a game scored in shared piles,
 * re-pair every pile in between.
 */
export function useSeatOrder(
  gameId: GameId,
  recorded: Seat[],
  onSaved: () => Promise<void>,
): SeatOrderEdit {
  const repo = getGameRepository();
  const [seats, setSeats] = useState<Seat[]>(recorded);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = seats.some((seat, i) => seat.id !== recorded[i]?.id);

  function move(index: number, direction: MoveDirection) {
    setError(null);
    setSeats(current => moveItem(current, index, direction));
  }

  function reset() {
    setError(null);
    setSeats(recorded);
  }

  async function save() {
    setError(null);
    setBusy(true);

    try {
      await repo.setSeatOrder(
        gameId,
        seats.map(seat => seat.id),
      );
      await onSaved();
    } catch {
      setError("Impossible d'enregistrer le nouvel ordre.");
    } finally {
      setBusy(false);
    }
  }

  return { seats, dirty, busy, error, move, reset, save };
}
