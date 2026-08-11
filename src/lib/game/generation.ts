/**
 * Turn rotation for games played in **generations** (Terraforming Mars).
 *
 * A lap-based game gives everyone exactly one turn per lap, so its active seat
 * is arithmetic — see `turnPosition` in `./turn`. A generation does not: a
 * player *passes*, ending his own turns while the others carry on taking as
 * many as they want, so the turn counts inside one generation are unequal and
 * cannot be predicted.
 *
 * The active seat is therefore worked out from two persisted facts — the last
 * turn actually taken in this generation, and who is already out — rather than
 * from the turn counter. It stays **derived**: nothing here reads a stored
 * "current player" that could drift out of sync with the turns.
 */

/**
 * The seat that opens a generation. The first-player marker moves one seat
 * along at each new generation, so generation 1 opens on seat 0, generation 2
 * on seat 1, and it wraps.
 */
export function openingSeat(stage: number, seatCount: number): number {
  guard(stage, "stage");
  guard(seatCount, "seatCount");

  return (stage - 1) % seatCount;
}

/**
 * The next seat still in the generation, strictly after `fromSeat` and wrapping
 * around the table. Null once every seat has passed — which is exactly the
 * moment the generation is over.
 */
export function nextActiveSeat(
  fromSeat: number,
  seatCount: number,
  passedSeats: ReadonlySet<number>,
): number | null {
  guard(seatCount, "seatCount");

  for (let step = 1; step <= seatCount; step++) {
    const seat = (fromSeat + step) % seatCount;

    if (!passedSeats.has(seat)) {
      return seat;
    }
  }

  return null;
}

/**
 * Whose turn it is now, or null when the generation is over.
 *
 * `lastSeat` is the seat that took the most recent turn **of this generation**,
 * or null when none has been taken yet — the generation then opens on its
 * first-player marker, skipping anyone already out (which only happens if a
 * player passed without the table advancing, but the rotation stays correct
 * either way).
 */
export function activeSeat(
  stage: number,
  seatCount: number,
  lastSeat: number | null,
  passedSeats: ReadonlySet<number>,
): number | null {
  if (lastSeat !== null) {
    return nextActiveSeat(lastSeat, seatCount, passedSeats);
  }

  const opening = openingSeat(stage, seatCount);

  if (!passedSeats.has(opening)) {
    return opening;
  }

  return nextActiveSeat(opening, seatCount, passedSeats);
}

/**
 * Whether passing leaves nobody in, which ends the generation: the table moves
 * on to the next one and everybody is back in.
 */
export function generationOver(
  seatCount: number,
  passedSeats: ReadonlySet<number>,
): boolean {
  guard(seatCount, "seatCount");

  return passedSeats.size >= seatCount;
}

function guard(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
}
