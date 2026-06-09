import type { BoardgameId } from "./ids";

/**
 * v1 only handles `competitive` games, but the field exists so cooperative /
 * hybrid games can be added later without a schema change.
 */
export type BoardgameKind = "competitive" | "cooperative" | "hybrid";

export interface Boardgame {
  id: BoardgameId;
  name: string;
  /** Public URL of the logo stored in Supabase Storage, or null. */
  logoUrl: string | null;
  /** Hard limits allowed by the box. */
  minPlayers: number | null;
  maxPlayers: number | null;
  /** Recommended ("sweet spot") range, e.g. 2-8 allowed but best at 3-4. */
  recMinPlayers: number | null;
  recMaxPlayers: number | null;
  kind: BoardgameKind;
  avgDurationMin: number | null;
  tags: string[];
  createdAt: string;
}

export interface NewBoardgame {
  name: string;
  logoUrl?: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  recMinPlayers?: number | null;
  recMaxPlayers?: number | null;
  kind?: BoardgameKind;
  avgDurationMin?: number | null;
  tags?: string[];
}

export type BoardgameUpdate = Partial<NewBoardgame>;
