import type { PlayerId } from "./ids";

/** A real person in the group. Decoupled from authentication. */
export interface Player {
  id: PlayerId;
  name: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface NewPlayer {
  name: string;
}

export type PlayerUpdate = Partial<NewPlayer>;
