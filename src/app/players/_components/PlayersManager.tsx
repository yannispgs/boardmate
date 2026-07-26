"use client";

import { useState } from "react";

import { ListBody } from "@/components/ListBody";
import { ScreenHeader } from "@/components/ScreenHeader";
import { StickyActionBar } from "@/components/StickyActionBar";
import { useConfirm } from "@/components/use-confirm";
import { useSearch } from "@/components/use-search";
import type { Player } from "@/lib/domain";
import { searchByName } from "@/lib/game/player-search";
import { usePlayers } from "@/lib/hooks/use-players";
import { PlayerInUseError } from "@/lib/repositories/errors";
import { PlayerCardList } from "./PlayerCardList";
import { useNewPlayer } from "./use-new-player";

/**
 * What stands in for the list: nobody recorded yet, or a search nobody answers.
 * `null` once there is someone to show.
 */
function emptyMessage(
  recorded: number,
  found: number,
  query: string,
): string | null {
  if (recorded === 0) {
    return "Aucun joueur pour l'instant.";
  }

  if (found === 0) {
    return `Aucun joueur ne correspond à « ${query} ».`;
  }

  return null;
}

export function PlayersManager() {
  const { players, loading, error, addPlayer, setActive, removePlayer } =
    usePlayers();
  const [actionError, setActionError] = useState<string | null>(null);
  // In-app confirmation (replaces window.confirm, which browsers suppress).
  const { requestConfirm, confirmDialog } = useConfirm();
  const { query, searchToggle, searchField } = useSearch({
    label: "Rechercher un joueur",
    placeholder: "Nom du joueur",
  });
  const { newPlayerForm } = useNewPlayer({
    players,
    addPlayer,
    requestConfirm,
    onFailure: setActionError,
  });

  // Searching cuts across both lists: a name you are hunting for is worth
  // finding whether or not its player is still active.
  const found = searchByName(players, query);
  const active = found.filter(p => p.isActive);
  const inactive = found.filter(p => !p.isActive);

  async function deactivate(player: Player) {
    setActionError(null);
    try {
      await setActive(player.id, false);
    } catch {
      setActionError("Désactivation impossible. Réessaie.");
    }
  }

  function handleToggle(player: Player, nextActive: boolean) {
    // Reactivating, or hiding a player who never played, is harmless — do it
    // straight away. Only confirm when deactivating a player with history,
    // since they can no longer be deleted.
    if (nextActive) {
      setActive(player.id, true);
      return;
    }
    if (!player.hasPlayed) {
      deactivate(player);
      return;
    }
    requestConfirm({
      message:
        `Désactiver « ${player.name} » ?\n\n` +
        "Il a déjà participé à une partie : il sortira des sélections mais " +
        "gardera son historique. Tu pourras le réactiver à tout moment.",
      confirmLabel: "Désactiver",
      onConfirm: () => deactivate(player),
    });
  }

  function handleDelete(player: Player) {
    requestConfirm({
      message: `Supprimer « ${player.name} » ? Cette action est définitive.`,
      confirmLabel: "Supprimer",
      onConfirm: () => deletePlayer(player),
    });
  }

  async function deletePlayer(player: Player) {
    setActionError(null);
    try {
      await removePlayer(player.id);
    } catch (e) {
      if (e instanceof PlayerInUseError) {
        setActionError(
          `« ${player.name} » a déjà participé à une partie : impossible de ` +
            "le supprimer. Tu peux le désactiver à la place.",
        );
      } else {
        setActionError("Suppression impossible. Réessaie.");
      }
    }
  }

  return (
    <>
      <ScreenHeader
        title="Joueurs"
        description="Les joueurs désactivés sortent des sélections mais gardent leur historique."
        action={searchToggle}
      >
        {searchField}
      </ScreenHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {actionError ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {actionError}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <ListBody
          loading={loading}
          message={emptyMessage(players.length, found.length, query)}
        >
          <PlayerCardList
            title="Joueurs actifs"
            players={active}
            onToggle={p => handleToggle(p, false)}
            actionLabel="Désactiver"
            onDelete={handleDelete}
          />

          {inactive.length > 0 ? (
            <PlayerCardList
              title="Désactivés"
              players={inactive}
              onToggle={p => handleToggle(p, true)}
              actionLabel="Réactiver"
              onDelete={handleDelete}
              dimmed
              collapsible
            />
          ) : null}
        </ListBody>

        {/* Add a player: fixed at the bottom, the form expands in place. */}
        <StickyActionBar>{newPlayerForm}</StickyActionBar>

        {confirmDialog}
      </div>
    </>
  );
}
