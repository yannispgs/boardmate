/**
 * Which games can say how long a *player* took.
 *
 * Every per-player time figure — « Tour moy. », « Part du temps » — divides the
 * turn log by the person who owned each turn. Two kinds of game never write
 * that owner down:
 *
 * - a **simultaneous** game (Splito) records one shared turn per round, owned by
 *   nobody: the table played at once, so no share of the time belongs to anyone;
 * - a game counted **manche by manche** (Odin) records no turn at all — the
 *   manche is closed by hand and only its points are kept.
 *
 * In both cases the figure isn't small or missing, it doesn't exist; showing it
 * as a zero or a dash invites the reader to compare players on something that
 * was never measured.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { StageSpec, TurnMode } from "@/lib/domain";

/** Whether this game attributes the time it records to a single player. */
export function tracksPlayerTime(
  game: Readonly<{ turnMode: TurnMode; stages?: StageSpec | null }>,
): boolean {
  return game.turnMode !== "simultaneous" && game.stages?.advance !== "manual";
}
