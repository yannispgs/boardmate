"use client";

import { useState } from "react";
import type { Player, PlayerId } from "@/lib/domain";
import { usePlayers } from "@/lib/hooks/use-players";
import { toggled } from "@/lib/ui/selection";

export interface PlayerPick {
  /** Whether the players are still being fetched. */
  loading: boolean;
  /** Every player who can sit down, picked or not. */
  active: Player[];
  /** The picked players' ids, in seat order. */
  selected: PlayerId[];
  /** The picked players, in seat order. */
  picked: Player[];
  /** The list to draw: the picked ones first, seat by seat, then the others. */
  listed: Player[];
  toggle: (id: PlayerId) => void;
  reorder: (selected: PlayerId[]) => void;
  /** Fewer players than the game is played with. */
  tooFew: boolean;
  /** More players than the game is played with. */
  tooMany: boolean;
  /** A table the game can be dealt to. */
  canContinue: boolean;
}

/**
 * Picking who sits down at a party, as the new-game funnel and the chaining of
 * the next party both ask it: tapping a player seats them at the end of the
 * table or gets them up, and the picked ones can be put in another order.
 *
 * `initial` is the table to start from, in its seat order.
 */
export function usePlayerPick({
  initial,
  minPlayers,
  maxPlayers,
}: Readonly<{
  initial: readonly Player[];
  minPlayers: number | null;
  maxPlayers: number | null;
}>): PlayerPick {
  const { players, loading } = usePlayers();
  const [selected, setSelected] = useState<PlayerId[]>(() =>
    initial.map(p => p.id),
  );

  const active = players.filter(p => p.isActive);
  // The click order is the seat / turn order.
  const picked = selected
    .map(id => active.find(p => p.id === id))
    .filter((p): p is Player => p != null);
  // Picked players sit at the top of the list, first seat first, so the order
  // being built is read at a glance rather than hunted for among the others.
  const listed = [...picked, ...active.filter(p => !selected.includes(p.id))];

  const tooFew = minPlayers != null && selected.length < minPlayers;
  const tooMany = maxPlayers != null && selected.length > maxPlayers;

  return {
    loading,
    active,
    selected,
    picked,
    listed,
    toggle: id => setSelected(prev => toggled(prev, id)),
    reorder: setSelected,
    tooFew,
    tooMany,
    canContinue: selected.length >= 1 && !tooFew && !tooMany,
  };
}
