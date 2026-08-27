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
/**
 * The sitting a game belongs to — the evening, not the party. Shared by the
 * parties dealt one after another from the score sheet; a party played on its
 * own owns one all to itself. It names no row of its own: a session is a group
 * of games and nothing else.
 */
export type GameSessionId = Id<"gameSession">;
export type GameTurnId = Id<"gameTurn">;
export type FeedbackId = Id<"feedback">;
export type ExtensionId = Id<"extension">;
export type ExtensionScenarioId = Id<"extensionScenario">;
export type FaqEntryId = Id<"faqEntry">;
export type RoleId = Id<"role">;
/**
 * An account that can sign in — a row of the authentication schema, which is a
 * different thing from a `PlayerId`: a player is somebody at the table, and
 * most of them will never own an account.
 */
export type UserId = Id<"user">;
