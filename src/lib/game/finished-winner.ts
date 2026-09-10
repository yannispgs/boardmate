import type { Player, PlayerId, ScoringSpec, TieBreakRule } from "@/lib/domain";

/** What the « partie terminée » form still has to settle about the winner. */
export interface FinishedWinners {
  /** Whether the table has to say who took it before the night can be filed. */
  asked: boolean;
  /** Who the form carries while nobody has been designated. */
  preselected: PlayerId[];
  /** The rulebook's own secondary rules, in the order it runs them. */
  rules: TieBreakRule[];
  /** Whether the candidates are level on the score, rather than merely unscored. */
  tied: boolean;
}

/**
 * Who an evening typed in after the fact is recorded as won by.
 *
 * A lone top scorer is carried silently — the sheet already says it. A **tie**
 * is the opposite question: proposing every co-leader would file a shared
 * victory for a table that merely never answered, so nothing is proposed at all
 * and the form has no winner to submit until somebody is designated.
 *
 * The game's own secondary rules come back alongside, to be **named** rather
 * than applied: the table breaks the tie over the box and hands back the
 * answer. The value a rule ranks on — leftover cards, tokens — is the first
 * thing gone weeks later, while who won is exactly what is remembered.
 *
 * An unscored game has no leader to read at all, so its winner is always
 * designated.
 */
export function finishedWinners(
  scoring: ScoringSpec | null,
  selected: number,
  candidates: readonly Player[],
): FinishedWinners {
  if (scoring === null) {
    return { asked: selected >= 1, preselected: [], rules: [], tied: false };
  }

  // Zero candidates is a sheet still being filled in — nothing to ask yet.
  if (candidates.length <= 1) {
    return {
      asked: false,
      preselected: candidates.map(p => p.id),
      rules: [],
      tied: false,
    };
  }

  return {
    asked: true,
    preselected: [],
    rules: scoring.tieBreak ?? [],
    tied: true,
  };
}
