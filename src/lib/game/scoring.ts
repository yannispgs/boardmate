import type { PlayerId, ScoreWinnerBy } from "@/lib/domain";

/**
 * The leading player by score, per the game's `winnerBy` direction. Players with
 * no score yet are ignored; a tie keeps the first seated among the leaders (the
 * end-of-game form lets the user override). Returns null when nobody has a score.
 */
export function leaderByScore(
  entries: Array<{ playerId: PlayerId; score: number | null }>,
  winnerBy: ScoreWinnerBy,
): PlayerId | null {
  let leader: { playerId: PlayerId; score: number } | null = null;

  for (const e of entries) {
    if (e.score === null) {
      continue;
    }

    if (
      leader === null ||
      (winnerBy === "highest" ? e.score > leader.score : e.score < leader.score)
    ) {
      leader = { playerId: e.playerId, score: e.score };
    }
  }

  return leader?.playerId ?? null;
}
