"use client";

import { useState } from "react";
import type { MilestoneClaim, PlayerId, PopulatedGame } from "@/lib/domain";
import { getGameRepository } from "@/lib/repositories";
import { AlreadyClaimedError } from "@/lib/repositories/errors";

export interface MilestoneLog {
  /** Who holds what, owned locally so a tap shows instantly. */
  claims: MilestoneClaim[];
  /** A claim is being written: no second tap until this one has landed. */
  busy: boolean;
  /** Why the last tap didn't take, `null` when everything went through. */
  error: string | null;
  claim: (milestoneKey: string, playerId: PlayerId) => Promise<void>;
  release: (milestoneKey: string) => Promise<void>;
}

/**
 * The milestones taken during the game (Terraforming Mars): given to a player
 * on a tap, taken back on another, each stamped with the generation it was
 * claimed in.
 *
 * The list is held here and updated before the write lands, so the table sees
 * the milestone change hands at the moment somebody says they take it. A
 * refused claim — the milestone was already somebody else's — puts the list
 * back and says so, rather than leaving the screen telling a lie the board
 * disagrees with.
 */
export function useMilestones(game: PopulatedGame): MilestoneLog {
  const repo = getGameRepository();
  const [claims, setClaims] = useState<MilestoneClaim[]>(
    () => game.milestoneClaims,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Shows the new list at once, writes it, and puts the old one back if the
   * write is refused — the panel never keeps a claim the database rejected.
   */
  async function write(
    next: MilestoneClaim[],
    failure: string,
    persist: () => Promise<void>,
  ) {
    const before = claims;

    setClaims(next);
    setError(null);
    setBusy(true);

    try {
      await persist();
    } catch (cause) {
      setClaims(before);
      setError(cause instanceof AlreadyClaimedError ? cause.message : failure);
    } finally {
      setBusy(false);
    }
  }

  async function claim(milestoneKey: string, playerId: PlayerId) {
    await write(
      [...claims, { playerId, milestoneKey, stage: game.stage }],
      "Impossible d'attribuer le jalon.",
      () => repo.claimMilestone(game.id, playerId, milestoneKey),
    );
  }

  async function release(milestoneKey: string) {
    await write(
      claims.filter(c => c.milestoneKey !== milestoneKey),
      "Impossible de retirer le jalon.",
      () => repo.releaseMilestone(game.id, milestoneKey),
    );
  }

  return { claims, busy, error, claim, release };
}
