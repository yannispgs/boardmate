import type { MilestoneClaim, MilestoneSpec, PlayerId } from "@/lib/domain";

import { type CategoryIconId, isCategoryIconId } from "./category-icons";

/** A milestone as the panel shows it: its name, and who has it if anyone. */
export interface MilestoneRow {
  key: string;
  label: string;
  hint: string;
  /** The drawing shown beside the name, `null` when it reads as text alone. */
  icon: CategoryIconId | null;
  /** Who took it, or `null` while it is still free. */
  claimedBy: PlayerId | null;
  /**
   * Whether it can be taken right now. False once somebody has it, and false
   * for every free one after the game has claimed its last.
   */
  open: boolean;
}

/**
 * The milestone row of the board, as it stands: every milestone the game
 * offers, in catalogue order, each with its claimer and whether it is still
 * open.
 *
 * The catalogue order is the rulebook's, deliberately — the panel is read
 * against the physical board, and re-sorting it (taken first, say) would make
 * the two disagree.
 */
export function milestoneRows(
  spec: MilestoneSpec,
  claims: MilestoneClaim[],
): MilestoneRow[] {
  const claimedBy = new Map(claims.map(c => [c.milestoneKey, c.playerId]));
  const full = claims.length >= spec.max;

  return spec.catalogue.map(milestone => {
    const taken = claimedBy.get(milestone.key) ?? null;

    return {
      key: milestone.key,
      label: milestone.label,
      hint: milestone.hint,
      icon: isCategoryIconId(milestone.icon) ? milestone.icon : null,
      claimedBy: taken,
      open: taken === null && !full,
    };
  });
}

/** How many more the game may claim before the last one is gone. */
export function milestonesLeft(
  spec: MilestoneSpec,
  claims: MilestoneClaim[],
): number {
  return Math.max(0, spec.max - claims.length);
}

/**
 * The points each player has earned from milestones, keyed by player. Only
 * players holding at least one appear — a player with none has nothing to write
 * on the sheet, which is not the same as writing a zero.
 */
export function milestonePoints(
  spec: MilestoneSpec,
  claims: MilestoneClaim[],
): Map<PlayerId, number> {
  const points = new Map<PlayerId, number>();

  for (const claim of claims) {
    points.set(claim.playerId, (points.get(claim.playerId) ?? 0) + spec.points);
  }

  return points;
}

/**
 * The end-of-game scoresheet, pre-filled with what the milestone panel already
 * knows: the claimers' line, and nobody else's.
 *
 * Returned in the grid's own raw shape — player, then field, then the typed
 * text — so the sheet opens on it and every cell stays editable. A milestone
 * nobody thought to record during the game is simply not there, and is typed in
 * by hand like before.
 */
export function milestonePrefill(
  spec: MilestoneSpec,
  claims: MilestoneClaim[],
): Record<string, Record<string, string>> {
  const prefill: Record<string, Record<string, string>> = {};

  for (const [playerId, points] of milestonePoints(spec, claims)) {
    prefill[playerId] = { [spec.scoreKey]: String(points) };
  }

  return prefill;
}
