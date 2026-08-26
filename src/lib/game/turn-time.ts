/**
 * Which games can say how long a *player* took.
 *
 * Every per-player time figure — « Tour moy. », « Part du temps » — divides the
 * turn log by the person who owned each turn. Two kinds of game never write
 * that owner down:
 *
 * - an **untimed** game (Papayoo, Odin) runs no clock at all: a trick is laid
 *   down in two seconds, or the table closes a manche by hand, so no turn is
 *   recorded and there is nothing to divide;
 * - a **simultaneous** game (Splito) records one shared turn per round, owned by
 *   nobody: the table played at once, so no share of the time belongs to anyone.
 *
 * In both cases the figure isn't small or missing, it doesn't exist; showing it
 * as a zero or a dash invites the reader to compare players on something that
 * was never measured.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { StageSpec, TurnMode } from "@/lib/domain";

/**
 * Whether this game hands the turn from one player to the next.
 *
 * The same two kinds of game that never write a turn's owner down never move
 * one either: an untimed game records no turn at all, and a simultaneous round
 * belongs to the whole table. Their games do carry a `currentPlayerId` — the
 * launch seats the first player, as every game does — but it stays on him from
 * the first card to the last, so reading it as « whose turn is it » names
 * somebody at random.
 */
export function tracksPlayerTurns(
  game: Readonly<{ turnMode: TurnMode; timed: boolean }>,
): boolean {
  return game.timed && game.turnMode !== "simultaneous";
}

/**
 * Whether this game attributes the time it records to a single player — which
 * is exactly the games that hand a turn from one player to the next, since the
 * owner of the time is the owner of the turn.
 */
export function tracksPlayerTime(
  game: Readonly<{ turnMode: TurnMode; timed: boolean }>,
): boolean {
  return tracksPlayerTurns(game);
}

/**
 * Whether a finished party has anything to summarise. An untimed game counted
 * in no manches either (Papayoo) records neither a turn nor a manche: the
 * end-of-game panel would be a wall of zeros, and the only figures the evening
 * produced — the scores — are already on the sheet. Such a game shows no panel,
 * and no link down to one.
 */
export function hasPlayStats(
  game: Readonly<{ timed: boolean; stages: StageSpec | null }>,
): boolean {
  return game.timed || game.stages?.advance === "manual";
}
