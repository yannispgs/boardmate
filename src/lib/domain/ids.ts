/**
 * Branded ID types.
 *
 * They are plain strings at runtime (UUIDs from the database), but the brand
 * prevents accidentally passing, say, a PlayerId where a GameId is expected.
 * Only the data-access adapters cast raw DB strings into these branded types.
 */
export type Id<TBrand extends string> = string & { readonly __brand: TBrand };

export type PlayerId = Id<"player">;
export type BoardgameId = Id<"boardgame">;
export type ConfigId = Id<"config">;
export type GameId = Id<"game">;
export type GameTurnId = Id<"gameTurn">;
