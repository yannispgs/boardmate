"use client";

import { ListState } from "@/components/ListState";
import { Modal } from "@/components/Modal";
import type { Player } from "@/lib/domain";
import { PlayerCountNote } from "../../../_components/PlayerCountNote";
import { PlayerPickCardList } from "../../../_components/PlayerPickCardList";
import { usePlayerPick } from "../../../_components/use-player-pick";

/**
 * Who sits down at the next party, when somebody arrives or goes home between
 * two deals. The same list as the new-game funnel's, opened on the table as it
 * is: a newcomer takes the last seat, the others keep theirs, and any of them
 * can be moved by holding their card.
 */
export function ChainPlayersPicker({
  table,
  minPlayers,
  maxPlayers,
  ordered,
  onDone,
  onClose,
}: Readonly<{
  /** The table as the recap shows it, first seat first. */
  table: readonly Player[];
  minPlayers: number | null;
  maxPlayers: number | null;
  /** Whether the game hands the turn from one player to the next. */
  ordered: boolean;
  onDone: (table: Player[]) => void;
  onClose: () => void;
}>) {
  const pick = usePlayerPick({ initial: table, minPlayers, maxPlayers });

  return (
    <Modal
      onClose={onClose}
      label="Joueurs de la prochaine partie"
      className="flex max-h-[90dvh] w-full max-w-sm flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-900"
    >
      <h2 className="text-lg font-semibold">Joueurs de la prochaine partie</h2>

      {/* Room for the picked cards' ring, as in the funnel. */}
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 pt-1">
        <ListState
          loading={pick.loading}
          empty={pick.active.length === 0}
          emptyLabel="Aucun joueur actif. Ajoute-en dans « Joueurs »."
        >
          <PlayerPickCardList
            players={pick.listed}
            selected={pick.selected}
            ordered={ordered}
            onToggle={pick.toggle}
            onReorder={pick.reorder}
          />
        </ListState>
      </div>

      <PlayerCountNote
        count={pick.selected.length}
        minPlayers={minPlayers}
        maxPlayers={maxPlayers}
        tooMany={pick.tooMany}
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={!pick.canContinue}
          onClick={() => onDone(pick.picked)}
          className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
        >
          Valider
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-black/10 px-4 py-2 transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
      </div>
    </Modal>
  );
}
