/** One stable colour per seat, cycled if there are more players than colours. */
export const PLAYER_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
  "#0ea5e9",
  "#8b5cf6",
];

/**
 * The chart colour of a player, taken from their position in `players` so the
 * same seat keeps the same colour across every chart. A player who isn't in the
 * list falls back to the first colour rather than leaving a series uncoloured.
 */
export function playerColorOf(
  players: readonly { id: string }[],
  playerId: string,
): string {
  const index = players.findIndex(p => p.id === playerId);

  return PLAYER_COLORS[Math.max(index, 0) % PLAYER_COLORS.length];
}
