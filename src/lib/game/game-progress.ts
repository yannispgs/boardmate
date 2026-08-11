import type { Game, GameStage, StageSpec } from "@/lib/domain";

import { stagePosition } from "./stage";

/** How far a game has got, named the way its own rulebook names it. */
export interface GameProgress {
  /** One unit of progress, singular (« Tour », « Génération »). */
  label: string;
  /** The one being played, or how many the game lasted once it ended. */
  count: number;
}

/**
 * How far along a game is — which is not the same notion from one box to the
 * next. Most games go round the table in laps; Terraforming Mars advances a
 * *generation*, and reading one of its games as « Tour 14 » names something
 * nobody at that table would recognise.
 *
 * The word comes from the boardgame itself, so a box that calls them « Manche »
 * or « Ère » brings its own rather than being special-cased here.
 */
export function gameProgress(
  game: Pick<Game, "round" | "stage">,
  stages: StageSpec | null,
): GameProgress {
  if (stages === null) {
    return { label: "Tour", count: game.round };
  }

  return { label: stages.label, count: game.stage };
}

/**
 * The line the play screen leads with. Three ways of playing, three sentences:
 *
 * - plain laps, counted against the game's length — « Tour 3 / 20 » ;
 * - generations, which nobody can see the end of — « Génération 2 » ;
 * - a calendar, which needs both, since the lap count restarts on every new
 *   stage and each stage has its own length — « Manche 2 · Tour 3 / 7 ».
 */
export function playProgress(
  game: Pick<Game, "round" | "stage">,
  stages: StageSpec | null,
  calendar: readonly GameStage[],
  roundLimit: number | null,
): string {
  if (stages === null) {
    return counted("Tour", game.round, roundLimit);
  }

  if (stages.advance === "pass") {
    return `${stages.label} ${game.stage}`;
  }

  const turns = calendar.map(s => s.turns);
  const at = stagePosition(game.round, turns);
  const lap = counted("Tour", at.round, turns[at.stage - 1] ?? null);

  return `${stages.label} ${at.stage} · ${lap}`;
}

function counted(label: string, value: number, limit: number | null): string {
  return limit === null ? `${label} ${value}` : `${label} ${value} / ${limit}`;
}

/** The same, counted out: « 12 générations », « 12 tours », « 1 tour ». */
export function progressSummary({ label, count }: GameProgress): string {
  return `${count} ${label.toLowerCase()}${count > 1 ? "s" : ""}`;
}
