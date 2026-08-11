import type { Game, StageSpec } from "@/lib/domain";

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

/** The same, counted out: « 12 générations », « 12 tours », « 1 tour ». */
export function progressSummary({ label, count }: GameProgress): string {
  return `${count} ${label.toLowerCase()}${count > 1 ? "s" : ""}`;
}
