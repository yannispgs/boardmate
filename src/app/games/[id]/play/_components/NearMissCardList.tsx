import type { NearMiss } from "@/lib/game/score-pace";

import { NearMissCard } from "./NearMissCard";

/** Every « dommage pour X » of the game, top of the ranking first. */
export function NearMissCardList({ misses }: Readonly<{ misses: NearMiss[] }>) {
  return (
    <ul className="flex flex-col gap-2">
      {misses.map(miss => (
        <NearMissCard key={miss.behind.playerId} miss={miss} />
      ))}
    </ul>
  );
}
