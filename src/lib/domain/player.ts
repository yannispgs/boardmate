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
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface NewPlayer {
  name: string;
}

export type PlayerUpdate = Partial<NewPlayer>;
