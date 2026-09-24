"use client";

import { PlayerCountFilter } from "@/components/catan/PlayerCountFilter";
import {
  type PlayerFilter,
  playerCountsOf,
} from "@/lib/catan/scenario-listing";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import type { ExtensionScenario } from "@/lib/domain";
import { AuthoredScenarioCardList } from "./AuthoredScenarioCardList";

/**
 * The scenarios of an extension, filtered by the table they seat, and what each
 * account is allowed to do to one.
 *
 * The three rights arrive already resolved: this decides which control to draw,
 * not who holds what. An act the account may not perform is left out rather
 * than disabled — a greyed button still says « this exists for you », which is
 * the opposite of the truth.
 */
export function ScenarioListPanel({
  scenarios,
  specs,
  players,
  onPlayers,
  loading,
  mayUpdate,
  mayCopy,
  mayDelete,
  onEdit,
  onExport,
  onDelete,
}: Readonly<{
  /** What the filter leaves, which is what gets listed. */
  scenarios: ExtensionScenario[];
  /** Every drawn map of the extension, filter included — the counts to offer. */
  specs: ScenarioSpec[];
  players: PlayerFilter;
  onPlayers: (players: PlayerFilter) => void;
  loading: boolean;
  mayUpdate: boolean;
  mayCopy: boolean;
  mayDelete: boolean;
  onEdit: (scenario: ExtensionScenario) => void;
  onExport: (spec: ScenarioSpec) => void;
  onDelete: (scenario: ExtensionScenario) => void;
}>) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

  return (
    <>
      <div className="self-start">
        <PlayerCountFilter
          counts={playerCountsOf(specs)}
          value={players}
          onChange={onPlayers}
        />
      </div>

      <AuthoredScenarioCardList
        scenarios={scenarios}
        onEdit={mayUpdate ? onEdit : undefined}
        onExport={mayCopy ? onExport : undefined}
        onDelete={mayDelete ? onDelete : undefined}
        empty={
          players === "all"
            ? "Aucun scénario pour l'instant."
            : `Aucun scénario jouable à ${players} joueurs.`
        }
      />
    </>
  );
}
