import type { PlayerId } from "./ids";

/** A real person in the group. Decoupled from authentication. */
export interface Player {
  id: PlayerId;
  name: string;
  /**
   * When false, the player is hidden from selection lists but kept in the
   * database. Players are never hard-deleted, to preserve history & stats.
   */
  isActive: boolean;
  /**
   * True once the player has taken part in at least one game. Such a player can
   * no longer be deleted (only deactivated), so the UI confirms before hiding
   * them.
   */
  hasPlayed: boolean;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface NewPlayer {
  name: string;
}

export type PlayerUpdate = Partial<NewPlayer>;
