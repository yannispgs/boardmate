"use client";

import Link from "next/link";
import { useState } from "react";

import { PlayerCountFilter } from "@/components/catan/PlayerCountFilter";
import {
  drawableOf,
  matchesPlayers,
  type PlayerFilter,
  playerCountsOf,
} from "@/lib/catan/scenario-listing";
import {
  extensionScenariosHref,
  MARINS_KEY,
  MARINS_ORIGIN,
} from "@/lib/game/scenario-editor";
import { useScenarios } from "@/lib/hooks/use-extensions";
import { MarinsScenarioDraw } from "./MarinsScenarioDraw";

/**
 * Interactive **Catan - Marins** board generator. Every scenario it offers is
 * one **authored in the app** and read back from the database — the generator
 * ships with none of its own, so what you draw here is what you saved there.
 */
export function MarinsBoardGenerator() {
  const { scenarios, baseGameId, loading } = useScenarios(MARINS_KEY);
  const [filter, setFilter] = useState<PlayerFilter>("all");

  const drawable = drawableOf(scenarios);
  const shown = drawable.filter(d => matchesPlayers(d.spec, filter));

  // Scenarios are authored on the game they extend, not here: this generator
  // only draws what it finds.
  const manageHref =
    baseGameId === null
      ? null
      : extensionScenariosHref(baseGameId, MARINS_ORIGIN);

  if (loading) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Chargement des scénarios…
      </p>
    );
  }

  if (drawable.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun scénario n&apos;a encore de carte. Dessine-en un pour que le
          générateur ait quelque chose à tirer.
        </p>
        {manageHref === null ? null : (
          <Link
            href={manageHref}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white transition hover:bg-indigo-500"
          >
            Gérer les scénarios
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <PlayerCountFilter
        counts={playerCountsOf(drawable.map(d => d.spec))}
        value={filter}
        onChange={setFilter}
      />

      {shown.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucun scénario n&apos;a de plateau pour ce nombre de joueurs.
        </p>
      ) : (
        // Filtering on a count is also choosing which map to draw: the draw
        // starts over on it rather than staying on the board shown before.
        <MarinsScenarioDraw
          key={filter}
          drawable={shown}
          seats={filter === "all" ? null : filter}
          manageHref={manageHref}
        />
      )}
    </div>
  );
}
