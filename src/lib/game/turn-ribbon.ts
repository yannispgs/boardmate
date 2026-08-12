import type { PlayerId } from "@/lib/domain";

import { scheduledPosition, stageEndTurn } from "./stage";

/**
 * The order the turn ribbon draws, as an explicit **sequence** of turns.
 *
 * A lap-based game could be placed by arithmetic alone — turn `k` belongs to
 * seat `k % n` of lap `⌊k / n⌋` — and that is exactly what this used to do. A
 * game played in generations cannot: players drop out one by one, so the laps
 * inside a generation hold different players and the turn counts are unequal.
 *
 * Both are therefore expressed the same way, as a list of turns in the order
 * they are (or will be) played, which the ribbon lays out end to end. Positions
 * then only ever move **forward**: a turn already taken keeps the place it was
 * given, whatever happens to the ones after it.
 */

/** One turn on the ribbon — played, being played, or still only expected. */
export interface RibbonTurn {
  /** 0-based global turn index, the play screen's counter minus one. */
  turn: number;
  playerId: PlayerId;
  /**
   * The lap of the table this turn belongs to, 1-based. Counted **within its
   * generation**, so it restarts at 1 on each new one — a generation is a fresh
   * carousel, not a continuation of the previous one.
   */
  lap: number;
  /** Opens its lap: the ribbon draws the « Tour N » divider before it. */
  firstOfLap: boolean;
  /** Closes its lap, as far as the ribbon can tell. */
  lastOfLap: boolean;
}

/**
 * The turns of a game that turns in plain laps: everyone plays once per lap, in
 * seat order, for as long as the game lasts. `lastTurn` caps a fixed-length game
 * (Cascadia's 20 laps) so the ribbon stops instead of rolling into another lap.
 */
export function lapSequence(
  seats: PlayerId[],
  current: number,
  ahead: number,
  lastTurn: number | null,
): RibbonTurn[] {
  const n = seats.length;

  if (n === 0) {
    return [];
  }

  const stop =
    lastTurn === null ? current + ahead : Math.min(current + ahead, lastTurn);
  const out: RibbonTurn[] = [];

  for (let turn = 0; turn <= stop; turn++) {
    const seat = turn % n;

    out.push({
      turn,
      playerId: seats[seat],
      lap: Math.floor(turn / n) + 1,
      firstOfLap: seat === 0,
      lastOfLap: seat === n - 1,
    });
  }

  return out;
}

/**
 * The turns of a game played on a calendar (Wingspan). Everyone still plays
 * exactly once per lap, so the whole ribbon can be worked out in advance — but
 * the laps are cut into stages, and the first-player marker moves one seat along
 * at each new stage, so the sequence is generated rather than counted off.
 *
 * It stops at the end of the stage being played. What follows the table's last
 * lap is not another player's turn but the goal tile being scored, and offering
 * the next manche's opener would promise a turn nobody is about to take.
 */
export function stageSequence(
  seats: PlayerId[],
  current: number,
  ahead: number,
  lastTurn: number | null,
  turnsPerStage: number[],
): RibbonTurn[] {
  const n = seats.length;

  if (n === 0) {
    return [];
  }

  const closing = stageEndTurn(current + 1, n, turnsPerStage).turn - 1;
  const stop = Math.min(
    lastTurn ?? Number.POSITIVE_INFINITY,
    current + ahead,
    closing,
  );
  const turns: Array<{ turn: number; playerId: PlayerId; stage: number }> = [];

  for (let turn = 0; turn <= stop; turn++) {
    const at = scheduledPosition(turn + 1, n, turnsPerStage);

    turns.push({ turn, playerId: seats[at.seatIndex], stage: at.stage });
  }

  const out = withLaps(seats, turns);

  // A stage's last lap does close, unlike the open-ended future `withLaps`
  // leaves at the end of a run it only guessed at.
  if (stop === closing) {
    out[out.length - 1].lastOfLap = true;
  }

  return out;
}

/** What a game played in generations needs to lay its ribbon out. */
export interface GenerationRibbon {
  /** Every player at the table, in seat order. */
  seats: PlayerId[];
  /** Turns already played, with the generation each belongs to. */
  played: Array<{ turn: number; playerId: PlayerId | null; stage: number }>;
  /** The turn being played now (0-based) and who is taking it. */
  current: number;
  currentPlayerId: PlayerId;
  /** The generation being played. */
  stage: number;
  /** Every pass recorded this game, of any generation. */
  passes: Array<{ playerId: PlayerId; stage: number }>;
  /** How many turns to announce beyond the current one. */
  ahead: number;
}

/**
 * The turns of a game played in generations, from the first one ever taken to a
 * few beyond the current one.
 *
 * The past is read from the turn log rather than recomputed: it is the only
 * account of who actually played, and it is what makes the ribbon's positions
 * stable. The future is a **guess** — the rotation carried on among the players
 * still in, assuming nobody else passes — because a generation ends whenever its
 * last player steps out and nobody can see that coming.
 */
export function generationSequence(input: GenerationRibbon): RibbonTurn[] {
  const { seats, current, currentPlayerId, stage } = input;

  if (seats.length === 0) {
    return [];
  }

  const taken = input.played
    .filter(t => t.playerId !== null && t.turn < current)
    .sort((a, b) => a.turn - b.turn)
    .map(t => ({
      turn: t.turn,
      playerId: t.playerId as PlayerId,
      stage: t.stage,
    }));

  return withLaps(
    seats,
    taken.concat(
      { turn: current, playerId: currentPlayerId, stage },
      ...expected(input),
    ),
  );
}

/**
 * The turns the table is about to take, if the generation runs its course
 * untouched: the players still in, rotating on from whoever is up.
 */
function expected(
  input: GenerationRibbon,
): Array<{ turn: number; playerId: PlayerId; stage: number }> {
  const out = new Set(
    input.passes.filter(p => p.stage === input.stage).map(p => p.playerId),
  );
  const stillIn = input.seats.filter(id => !out.has(id));
  const from = stillIn.indexOf(input.currentPlayerId);

  /* c8 ignore next 3 -- the player up has by definition not passed */
  if (from === -1) {
    return [];
  }

  return Array.from({ length: input.ahead }, (_, k) => ({
    turn: input.current + k + 1,
    playerId: stillIn[(from + k + 1) % stillIn.length],
    stage: input.stage,
  }));
}

/**
 * Cuts a run of turns into laps of the table. A lap ends when the rotation wraps
 * — the next player sits no further round the table than the one who just
 * played — which holds however many players have dropped out, since the seating
 * itself never moves. A new generation always opens a lap of its own.
 */
function withLaps(
  seats: PlayerId[],
  turns: Array<{ turn: number; playerId: PlayerId; stage: number }>,
): RibbonTurn[] {
  const n = seats.length;
  const seatOf = new Map(seats.map((id, seat) => [id, seat]));
  const out: RibbonTurn[] = [];
  let lap = 0;
  let prevPos = -1;
  let prevStage = 0;

  for (const t of turns) {
    // Seats are read from the generation's first player, so the wrap is where
    // the marker is, not where the table happens to be numbered from.
    const opening = (t.stage - 1) % n;
    /* c8 ignore next -- `?? 0` guards a turn played by an unseated player */
    const pos = ((seatOf.get(t.playerId) ?? 0) - opening + n) % n;
    const opensLap = t.stage !== prevStage || pos <= prevPos;

    if (opensLap) {
      lap = t.stage === prevStage ? lap + 1 : 1;
    }

    out.push({
      turn: t.turn,
      playerId: t.playerId,
      lap,
      firstOfLap: opensLap,
      lastOfLap: false,
    });
    prevPos = pos;
    prevStage = t.stage;
  }

  // A turn closes its lap when the next one opens another. The very last is left
  // open: the ribbon is showing a future it only guessed at.
  for (let i = 0; i < out.length - 1; i++) {
    out[i].lastOfLap = out[i + 1].firstOfLap;
  }

  return out;
}
