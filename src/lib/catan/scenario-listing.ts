/**
 * What a scenario looks like from the outside — the line under its name in a
 * list, and the player counts a list can be filtered on.
 *
 * A scenario is chosen before it is drawn, so what a list shows about it has to
 * be what tells one apart from another: how many players it seats, how many
 * harbours are traded on it, and the two things a Marins map is really built
 * around — its gold rivers and its fog. How many tiles are land and how many are
 * sea says nothing anyone picks a scenario on.
 */

import {
  boardTotals,
  type ScenarioBoardSpec,
  type ScenarioSpec,
} from "./scenario-spec";

/** Every player count a scenario has a map for, ascending and without repeats. */
export function scenarioPlayers(spec: ScenarioSpec): number[] {
  const counts = new Set(spec.boards.flatMap(board => board.players));

  return [...counts].sort((a, b) => a - b);
}

/** Whether a scenario has a map for that many players. */
export function servesPlayers(spec: ScenarioSpec, players: number): boolean {
  return spec.boards.some(board => board.players.includes(players));
}

/** What a list is filtered on: one player count, or none in particular. */
export type PlayerFilter = number | "all";

/** Every player count served by any scenario of a list, ascending. */
export function playerCountsOf(specs: ScenarioSpec[]): number[] {
  const counts = new Set(specs.flatMap(scenarioPlayers));

  return [...counts].sort((a, b) => a - b);
}

/** Whether a scenario belongs in a list filtered that way. */
export function matchesPlayers(
  spec: ScenarioSpec,
  filter: PlayerFilter,
): boolean {
  return filter === "all" || servesPlayers(spec, filter);
}

/** The runs of consecutive counts, so 3, 4 and 6 read as `3-4` and `6`. */
function runs(counts: number[]): number[][] {
  const out: number[][] = [];

  for (const count of counts) {
    const last = out.at(-1);

    if (last !== undefined && last[last.length - 1] === count - 1) {
      last.push(count);
    } else {
      out.push([count]);
    }
  }

  return out;
}

/** `3-4 joueurs`, `3-4, 6 joueurs` — the counts a scenario seats. */
export function playerCountsLabel(counts: number[]): string {
  if (counts.length === 0) {
    return "Aucun plateau";
  }

  const parts = runs(counts).map(run =>
    run.length > 1 ? `${run[0]}-${run[run.length - 1]}` : `${run[0]}`,
  );
  const last = counts[counts.length - 1];

  return `${parts.join(", ")} joueur${last > 1 ? "s" : ""}`;
}

/** The face-down tiles of a board — the fog someone has to sail into. */
function fogTiles(board: ScenarioBoardSpec): number {
  return board.zones
    .filter(zone => zone.hidden === true)
    .reduce((sum, zone) => sum + zone.cells.length, 0);
}

/**
 * A count read off every board of a scenario, as `9` when they agree and `9-11`
 * when they do not — a map drawn for six players holds more than the same one
 * drawn for three, and the list says so rather than picking one board's word.
 */
function span(spec: ScenarioSpec, of: (board: ScenarioBoardSpec) => number) {
  const values = spec.boards.map(of);
  const low = Math.min(...values);
  const high = Math.max(...values);

  return { low, high, text: low === high ? `${low}` : `${low}-${high}` };
}

/** `9 ports`, or nothing at all when there is none to speak of. */
function countPart(
  spec: ScenarioSpec,
  of: (board: ScenarioBoardSpec) => number,
  one: string,
  many: string,
): string[] {
  const { high, text } = span(spec, of);

  if (high === 0) {
    return [];
  }

  return [`${text} ${high > 1 ? many : one}`];
}

/**
 * The line under a scenario's name: who it seats, then what its maps hold that
 * is worth knowing before drawing one. Gold rivers and fog only show up on the
 * scenarios that have them.
 */
export function scenarioSummary(spec: ScenarioSpec): string {
  if (spec.boards.length === 0) {
    return "Aucun plateau";
  }

  return [
    playerCountsLabel(scenarioPlayers(spec)),
    ...countPart(spec, board => boardTotals(board).ports, "port", "ports"),
    ...countPart(
      spec,
      board => boardTotals(board).terrainCounts.gold,
      "rivière d'or",
      "rivières d'or",
    ),
    ...countPart(spec, fogTiles, "tuile face cachée", "tuiles face cachée"),
  ].join(" · ");
}
