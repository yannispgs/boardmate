import type { PlayerId, PopulatedGame } from "@/lib/domain";

/** The table reduced to what every end-of-game panel needs: who, and named. */
export function namedPlayers(
  game: PopulatedGame,
): Array<{ id: PlayerId; name: string }> {
  return game.players.map(p => ({ id: p.playerId, name: p.player.name }));
}
