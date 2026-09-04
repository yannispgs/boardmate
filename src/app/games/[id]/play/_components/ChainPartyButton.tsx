"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import type { PopulatedGame } from "@/lib/domain";
import { chainedGame } from "@/lib/game/chained-game";
import { getGameRepository } from "@/lib/repositories";

const DEAL_FAILED = "Impossible d'ouvrir la partie suivante.";

/**
 * Deals the same party again from the screen the last one ended on — same
 * players, same seats, same config, same evening. Offered by the games whose
 * boardgame says a party of it is one short deal: walking back through
 * « Parties » → « Nouvelle partie » → jeu → joueurs between two of them takes
 * longer than the deal itself.
 *
 * The party behind this button is already recorded, so pressing it twice would
 * deal two: `router.push` fetches the next party before the screen moves, and
 * that wait is exactly the window a table presses again in, thinking nothing
 * happened. The latch shuts on the first press and only re-opens on a real
 * failure — nothing was dealt then, and the table has to be able to try again.
 * It is a latch rather than a disabled button on purpose: the guard has to hold
 * against a press that lands, which is the only kind the bug ever came from.
 */
export function ChainPartyButton({ game }: Readonly<{ game: PopulatedGame }>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const dealt = useRef(false);

  async function deal() {
    if (dealt.current) {
      return;
    }

    dealt.current = true;
    setError(null);

    try {
      const next = await getGameRepository().create(chainedGame(game));

      router.push(`/games/${next.id}/play`);
    } catch {
      dealt.current = false;
      setError(DEAL_FAILED);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void deal()}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
      >
        Enchaîner une nouvelle partie
      </button>

      <ErrorText message={error} />
    </div>
  );
}
