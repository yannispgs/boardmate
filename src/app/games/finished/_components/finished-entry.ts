import type { Boardgame, Player, PlayerId, ScoreSheetItem } from "@/lib/domain";
import {
  pairBreakdown,
  pilesRemaining,
  scorePiles,
} from "@/lib/game/pair-scoring";
import { scoreCategories, winnerDirection } from "@/lib/game/scoring";
import {
  type CategoryRaw,
  gridRemaining,
  gridValues,
} from "../../_components/CategoryScoreGrid";

/** Enter just the final total, or the detail the game is really scored on. */
export type EntryMode = "total" | "detail";

export interface FinishedEntry {
  /** The game's category sheet, when it has one. */
  sheet: ScoreSheetItem[] | null;
  /** Whether the game is scored on shared piles (Splito). */
  pairs: boolean;
  /** Whether either sheet is currently being filled in rather than totals. */
  catMode: boolean;
  pairMode: boolean;
  /** Cells / piles still empty, so the form can say what is missing. */
  remainingCells: number;
  remainingPiles: number;
  /** Per-player, per-category values — null unless the grid is in use. */
  catValues: Record<string, Record<string, number>> | null;
  /** Per-player totals off the category sheet, once it is complete. */
  scored: Record<string, { total: number }> | null;
  /** Every selected player has a score the form can record. */
  scoresComplete: boolean;
  /** The players sharing the best score (everyone, for an unscored game). */
  winnerCandidates: Player[];
  /** This player's final score, or null while it is still missing. */
  scoreOf: (id: PlayerId) => number | null;
  /** The detail kept behind that total, for the sheet it was entered on. */
  breakdownOf: (id: PlayerId) => Record<string, number> | null;
}

/**
 * Reads a half-filled "partie déjà jouée" form into the scores it describes.
 *
 * A game recorded after the fact is often only remembered as its final totals,
 * so both sheets a game can be scored on (per-category, shared piles) are
 * optional: the form offers whichever the game uses and falls back to a plain
 * total per player. A sheet only yields totals once it is **complete** — a
 * missing category, or a pile nobody counted, would otherwise read as a
 * genuine zero.
 */
export function finishedEntry(
  boardgame: Boardgame | null,
  selected: Player[],
  entryMode: EntryMode,
  totals: Record<string, string>,
  catRaw: CategoryRaw,
  piles: Record<string, number>,
): FinishedEntry {
  const scoring = boardgame?.scoring ?? null;
  const sheet =
    scoring?.entry === "categories" ? (scoring.sheet ?? null) : null;
  const pairs = scoring?.entry === "pairs";
  const ids = selected.map(p => p.id);

  const catMode = sheet !== null && entryMode === "detail";
  const pairMode = pairs && entryMode === "detail";
  const catValues = catMode ? gridValues(selected, sheet, catRaw) : null;
  const pairScores = pairMode ? scorePiles(ids, piles) : null;
  const remainingCells = catMode ? gridRemaining(selected, sheet, catRaw) : 0;
  const remainingPiles = pairMode ? pilesRemaining(ids, piles) : 0;
  const detailComplete =
    (catMode && remainingCells === 0) || (pairMode && remainingPiles === 0);

  const scored =
    sheet === null || catValues === null
      ? null
      : scoreCategories(sheet, catValues, ids);
  const usesSheet = catMode || pairMode;
  const sheetTotals: Record<string, { total: number }> | null = detailComplete
    ? (scored ?? pairScores)
    : null;

  function scoreOf(id: PlayerId): number | null {
    if (scoring === null) {
      return null;
    }

    if (usesSheet) {
      return sheetTotals?.[id]?.total ?? null;
    }

    const n = Number.parseInt(totals[id] ?? "", 10);

    return Number.isFinite(n) ? n : null;
  }

  function breakdownOf(id: PlayerId): Record<string, number> | null {
    if (catValues) {
      return catValues[id] ?? {};
    }

    if (pairScores) {
      return pairBreakdown(pairScores[id]);
    }

    return null;
  }

  const scoresComplete =
    scoring === null || selected.every(p => scoreOf(p.id) !== null);

  return {
    sheet,
    pairs,
    catMode,
    pairMode,
    remainingCells,
    remainingPiles,
    catValues,
    scored: detailComplete ? scored : null,
    scoresComplete,
    winnerCandidates: leaders(
      scoring,
      // A sheet is always read highest-first, whether it sums or multiplies.
      sheet !== null || pairs,
      scoresComplete,
      selected,
      scoreOf,
    ),
    scoreOf,
    breakdownOf,
  };
}

/**
 * The players sharing the best score. The winner is only worth asking about on
 * a TIE: then the table says who takes it — one of them, or all of them on a
 * shared victory. Otherwise it's simply the top scorer, no picker. An unscored
 * game has no score, so its winner is always picked (everyone).
 */
function leaders(
  scoring: Boardgame["scoring"] | null,
  readHighest: boolean,
  scoresComplete: boolean,
  selected: Player[],
  scoreOf: (id: PlayerId) => number | null,
): Player[] {
  if (scoring === null) {
    return selected;
  }

  if (!scoresComplete) {
    return [];
  }

  const direction = readHighest
    ? "highest"
    : winnerDirection(scoring.winCondition);
  const withScore = selected.map(p => ({ p, score: scoreOf(p.id) as number }));
  const best = withScore.reduce(
    (b, x) =>
      direction === "highest" ? Math.max(b, x.score) : Math.min(b, x.score),
    withScore[0]?.score ?? 0,
  );

  return withScore.filter(x => x.score === best).map(x => x.p);
}
