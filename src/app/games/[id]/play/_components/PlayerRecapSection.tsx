"use client";

import { useState } from "react";

import { Checkbox } from "@/components/Checkbox";
import type { PlayerId } from "@/lib/domain";
import type { PlayerRecap, RecapScope } from "@/lib/game/player-recap";

import { PlayerRecapCardList } from "./PlayerRecapCardList";
import { PlayerRecapDialog } from "./PlayerRecapDialog";

/**
 * How each scope is named. Only the narrow one is ever offered — it is the box
 * you tick — but the detail's header still has to name the wide one, since a
 * modale that says nothing about its scope reads as « all evenings » whichever
 * one is in force.
 */
export const SCOPE_LABELS: Record<RecapScope, string> = {
  all: "Toutes les parties",
  sameTable: "À nombre de joueurs égal",
};

/**
 * The « joueurs » half of the end-of-game screen: each player of the party
 * against **his own** past evenings on this game.
 *
 * It sits beside the party's own figures rather than inside them because the
 * two answer different questions — « combien de temps a duré la partie » is a
 * fact of the evening, « 82 points, est-ce beaucoup pour moi » is a fact of a
 * career. And it is a sibling of the statistics panel, not a part of it: a game
 * that records neither turn nor manche (Papayoo) has no panel at all, and its
 * players still have a history worth reading.
 *
 * The whole section carries **one** switch, at the top. Per-card switches would
 * let two players be read on two different sets of evenings side by side, which
 * is exactly the comparison this section is built not to invite.
 *
 * That switch is a **tick box on the narrow reading**, not a pair of pills: the
 * pills would be a second row of them right under the tab bar that opens this
 * section, two identical-looking rows saying two different kinds of thing. A
 * box left unticked is also the honest default — all of a player's evenings —
 * where a lit pill reads as a filter somebody chose.
 *
 * Its name lives on the tab that opens it ({@link EndRecapTabs}), not here.
 */
export function PlayerRecapSection({
  recaps,
  byTable,
  scope,
  onScope,
}: Readonly<{
  recaps: readonly PlayerRecap[];
  /** Whether the « à nombre de joueurs égal » switch is worth offering. */
  byTable: boolean;
  scope: RecapScope;
  onScope: (scope: RecapScope) => void;
}>) {
  const [open, setOpen] = useState<PlayerId | null>(null);
  const opened = recaps.find(r => r.playerId === open) ?? null;

  return (
    <section className="flex flex-col gap-4">
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        Chacun face à ses propres parties sur ce jeu.
      </p>

      {byTable ? (
        <Checkbox
          label={SCOPE_LABELS.sameTable}
          checked={scope === "sameTable"}
          onChange={on => onScope(on ? "sameTable" : "all")}
          className="justify-center text-zinc-500 dark:text-zinc-400"
        />
      ) : null}

      <PlayerRecapCardList recaps={recaps} onOpen={setOpen} />

      {opened === null ? null : (
        <PlayerRecapDialog
          recap={opened}
          scopeLabel={SCOPE_LABELS[scope]}
          onClose={() => setOpen(null)}
        />
      )}
    </section>
  );
}
