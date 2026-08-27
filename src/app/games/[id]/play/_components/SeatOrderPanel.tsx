"use client";

import { ErrorText } from "@/components/ErrorText";
import { ChevronRightIcon } from "@/components/icons";
import type { GameId } from "@/lib/domain";
import { canReorderSeats, seatingMatters } from "@/lib/game/seat-order";
import { SeatOrderCardList } from "./SeatOrderCardList";
import { type Seat, useSeatOrder } from "./use-seat-order";

/**
 * Putting the table back in the right order, for a seating mis-entered when the
 * game was created — so a night doesn't have to be started over, and its turns
 * lost, over a wrong first player.
 *
 * Folded away, and shown on two conditions. The seating has to **mean
 * something** to the game — on Papayoo or Odin it is row order and nothing
 * else, so the panel offered all evening to correct what no screen reads (see
 * `seatingMatters`). And it has to still be **honourable**: once a game turning
 * seat by seat has actually gone round, the recorded turns *are* that order and
 * moving the seats would make them lie (see `canReorderSeats`).
 */
export function SeatOrderPanel({
  gameId,
  boardgame,
  turnsPlayed,
  seats,
  onSaved,
}: Readonly<{
  gameId: GameId;
  boardgame: Parameters<typeof seatingMatters>[0];
  turnsPlayed: number;
  /** The table as it is recorded, first seat first. */
  seats: Seat[];
  /** Re-reads the game once the new order has landed. */
  onSaved: () => Promise<void>;
}>) {
  if (
    !seatingMatters(boardgame) ||
    !canReorderSeats(boardgame.turnMode, turnsPlayed)
  ) {
    return null;
  }

  return <SeatOrderEditor gameId={gameId} seats={seats} onSaved={onSaved} />;
}

/**
 * The editor itself, kept apart so its state is only ever created for a game
 * that may be reordered — and dropped for good the moment one stops being.
 */
function SeatOrderEditor({
  gameId,
  seats,
  onSaved,
}: Readonly<{
  gameId: GameId;
  seats: Seat[];
  onSaved: () => Promise<void>;
}>) {
  const edit = useSeatOrder(gameId, seats, onSaved);

  return (
    <details className="group w-full max-w-sm">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
        <ChevronRightIcon className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        Corriger l'ordre des joueurs
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        <p className="text-xs text-zinc-500">
          L'ordre saisi à la création se corrige ici tant que rien ne s'appuie
          dessus.
        </p>

        <SeatOrderCardList
          seats={edit.seats}
          disabled={edit.busy}
          onMove={edit.move}
        />

        <ErrorText message={edit.error} />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void edit.save()}
            disabled={!edit.dirty || edit.busy}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {edit.busy ? "Enregistrement…" : "Enregistrer l'ordre"}
          </button>
          <button
            type="button"
            onClick={edit.reset}
            disabled={!edit.dirty || edit.busy}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/5"
          >
            Annuler
          </button>
        </div>
      </div>
    </details>
  );
}
