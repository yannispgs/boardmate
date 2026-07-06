/**
 * Pure turn / round rotation logic.
 *
 * `turn` is a 1-based **global** counter. The active seat and the round are
 * *derived* from it, so there is no separate "current player" state that can
 * drift out of sync (a deliberate change from board-nest, which stored and
 * mutated `currentPlayer` directly).
 */

export interface TurnPosition {
  /** 1-based round number. */
  round: number;
  /** 0-based index into the seat-ordered players. */
  seatIndex: number;
}

/** Round and active seat for a given global turn number. */
export function turnPosition(turn: number, seatCount: number): TurnPosition {
  if (!Number.isInteger(turn) || turn < 1) {
    throw new Error("turn must be a positive integer");
  }
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    throw new Error("seatCount must be a positive integer");
  }
  const zero = turn - 1;
  return {
    round: Math.floor(zero / seatCount) + 1,
    seatIndex: zero % seatCount,
  };
}

export interface AdvancedTurn extends TurnPosition {
  /** The next global turn number. */
  turn: number;
}

/** Advances to the next turn, returning its number, round and active seat. */
export function advanceTurn(turn: number, seatCount: number): AdvancedTurn {
  const next = turn + 1;
  return { turn: next, ...turnPosition(next, seatCount) };
}

/**
 * Whether `turn` is the very last turn of a fixed-length game — the last seat of
 * the final round — after which the game ends. Always false when there is no
 * round limit. The last turn is `roundLimit * seatCount` (round `roundLimit`,
 * seat `seatCount - 1`).
 */
export function isFinalTurn(
  turn: number,
  seatCount: number,
  roundLimit: number | null,
): boolean {
  if (roundLimit === null) {
    return false;
  }

  const { round, seatIndex } = turnPosition(turn, seatCount);

  return round === roundLimit && seatIndex === seatCount - 1;
}
