"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ErrorText } from "@/components/ErrorText";
import type { PlayerId, PopulatedGame } from "@/lib/domain";
import { chainedGame, chainedSeats } from "@/lib/game/chained-game";
import { composeConfigFields } from "@/lib/game/extensions";
import { useConfigs } from "@/lib/hooks/use-configs";
import { getGameRepository } from "@/lib/repositories";
import { FirstPlayerWheel } from "../../../_components/FirstPlayerWheel";
import { ChainRecap } from "./ChainRecap";

const DEAL_FAILED = "Impossible d'ouvrir la partie suivante.";

/**
 * Deals the same party again from the screen the last one ended on — same
 * players, same seats, same config, same evening. Offered by the games whose
 * boardgame says a party of it is one short deal: walking back through
 * « Parties » → « Nouvelle partie » → jeu → joueurs between two of them takes
 * longer than the deal itself.
 *
 * The setup is not asked for again, but it **is** shown: pressing opens a recap
 * of what the next party will be dealt with, and deals only once that is taken.
 * Chaining is the one way into a party that never passes the funnel, so without
 * this the table agrees to a setup it is never shown — and the attributes are
 * exactly what a party can have been launched with off the beaten track, since
 * the funnel lets a party tweak them over its named configuration.
 *
 * The one thing that can change on the way is who starts: a game that hands the
 * turn round offers the first-player wheel from the recap, for an evening where
 * the lead should not simply stay put. It is on offer and never asked for.
 *
 * The party behind this button is already recorded, so dealing twice would open
 * two: `router.push` fetches the next party before the screen moves, and that
 * wait is exactly the window a table presses again in, thinking nothing
 * happened. The latch shuts on the first deal and only re-opens on a real
 * failure — nothing was dealt then, and the table has to be able to try again.
 * It is a latch rather than a disabled button on purpose: the guard has to hold
 * against a press that lands, which is the only kind the bug ever came from. It
 * is kept **behind** the confirmation rather than replaced by it: the modal
 * stops the second press, it does not stop the second deal.
 */
export function ChainPartyButton({ game }: Readonly<{ game: PopulatedGame }>) {
  const router = useRouter();
  // The confirmation is held here rather than through `useConfirm`, which keeps
  // the recap it was asked with: this one has to follow the wheel's result.
  const [asking, setAsking] = useState(false);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [leader, setLeader] = useState<PlayerId | null>(null);
  const { template, loading } = useConfigs(game.boardgame.id);
  const [error, setError] = useState<string | null>(null);
  const dealt = useRef(false);

  // Composed with the extensions this party is playing, the way the funnel
  // composed them to set it up: an extension can add an attribute or move one,
  // and the recap has to name what the party actually carries.
  const fields = composeConfigFields(template?.fields ?? [], game.extensions);

  async function deal() {
    if (dealt.current) {
      return;
    }

    dealt.current = true;
    setError(null);

    try {
      const next = await getGameRepository().create(chainedGame(game, leader));

      router.push(`/games/${next.id}/play`);
    } catch {
      dealt.current = false;
      setError(DEAL_FAILED);
    }
  }

  function cancel() {
    setAsking(false);
    setLeader(null);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
      >
        Enchaîner une nouvelle partie
      </button>

      <ErrorText message={error} />
      {asking ? (
        <ConfirmDialog
          message="Enchaîner une nouvelle partie avec cette configuration ?"
          confirmLabel="Enchaîner"
          details={
            <ChainRecap
              game={game}
              fields={fields}
              loading={loading}
              leader={leader}
              onDrawFirstPlayer={() => setWheelOpen(true)}
            />
          }
          onCancel={cancel}
          onConfirm={() => {
            setAsking(false);
            void deal();
          }}
        />
      ) : null}

      {wheelOpen ? (
        <FirstPlayerWheel
          players={chainedSeats(game.players, leader).map(p => p.player)}
          onResult={ordered => {
            setLeader(ordered[0]?.id ?? null);
            setWheelOpen(false);
          }}
          onClose={() => setWheelOpen(false)}
        />
      ) : null}
    </div>
  );
}
