import type { GameId, GameListItem } from "@/lib/domain";
import { partyNumber } from "@/lib/game/game-sessions";

/**
 * Which deal of the evening is on the table — « 2ᵉ partie de la soirée ».
 *
 * Shows itself from the second party on: a first deal has no evening behind it
 * to be the third of, and a party played on its own would carry a « 1ʳᵉ partie »
 * that says nothing.
 */
export function PartyRank({
  games,
  gameId,
}: Readonly<{
  /** The sitting's parties, oldest first — position in it *is* the number. */
  games: readonly GameListItem[];
  gameId: GameId;
}>) {
  const party = partyNumber(games, gameId);

  if (party === null) {
    return null;
  }

  return (
    <p className="text-sm uppercase tracking-wide text-indigo-500 dark:text-indigo-400">
      {party}ᵉ partie de la soirée
    </p>
  );
}
