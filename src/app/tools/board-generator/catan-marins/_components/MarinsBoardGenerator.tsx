"use client";

import Link from "next/link";
import { useState } from "react";

import {
  type SegmentedOption,
  SegmentedPicker,
} from "@/components/catan/SegmentedPicker";
import { PencilIcon } from "@/components/icons";
import { iconButtonClass } from "@/components/ui";
import { marinsPlayerGroups, playerGroupLabel } from "@/lib/catan/marins";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import type { ExtensionScenario, ExtensionScenarioId } from "@/lib/domain";
import { extensionScenariosHref, MARINS_KEY } from "@/lib/game/scenario-editor";
import { useScenarios } from "@/lib/hooks/use-extensions";
import { MarinsScenarioBoard } from "./MarinsScenarioBoard";

/** A scenario that has a map, so the generator can actually draw it. */
interface Drawable {
  scenario: ExtensionScenario;
  spec: ScenarioSpec;
}

/** The scenarios of the extension that carry a map, in menu order. */
function drawableOf(scenarios: ExtensionScenario[]): Drawable[] {
  return scenarios.flatMap(scenario =>
    scenario.boardSpec === null ? [] : [{ scenario, spec: scenario.boardSpec }],
  );
}

/**
 * Interactive **Catan - Marins** board generator. Every scenario it offers is
 * one **authored in the app** and read back from the database — the generator
 * ships with none of its own, so what you draw here is what you saved there.
 */
export function MarinsBoardGenerator() {
  const { scenarios, baseGameId, loading } = useScenarios(MARINS_KEY);
  const [picked, setPicked] = useState<ExtensionScenarioId | null>(null);
  const [seats, setSeats] = useState<number | null>(null);

  const drawable = drawableOf(scenarios);

  // Scenarios are authored on the game they extend, not here: this generator
  // only draws what it finds.
  const manageHref =
    baseGameId === null ? null : extensionScenariosHref(baseGameId);

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

  // A scenario deleted from another tab, or simply none picked yet, falls back
  // to the first of the list rather than to an empty screen.
  const current = drawable.find(d => d.scenario.id === picked) ?? drawable[0];

  const options: SegmentedOption<ExtensionScenarioId>[] = drawable.map(d => ({
    value: d.scenario.id,
    label: d.scenario.name,
    hint:
      d.scenario.targetScore === null
        ? undefined
        : `🎯 ${d.scenario.targetScore} points`,
  }));

  // The player counts this scenario has a map for. A count the previous
  // scenario served is kept when this one serves it too, dropped otherwise.
  const groups = marinsPlayerGroups(current.spec);
  const group = groups.find(g => g.includes(seats ?? -1)) ?? groups[0];
  const players = group?.[0] ?? 0;

  return (
    <div className="flex flex-col items-center gap-6">
      <SegmentedPicker
        label="Scénario"
        options={options}
        value={current.scenario.id}
        onChange={id => {
          setPicked(id);
          setSeats(null);
        }}
        action={
          manageHref === null ? null : (
            <Link
              href={manageHref}
              title="Gérer les scénarios"
              className={iconButtonClass}
            >
              <PencilIcon />
            </Link>
          )
        }
      />

      {groups.length > 1 ? (
        <SegmentedPicker
          label="Nombre de joueurs"
          options={groups.map(g => ({
            value: g[0],
            label: playerGroupLabel(g),
          }))}
          value={players}
          onChange={setSeats}
        />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {group === undefined ? "Aucun plateau" : playerGroupLabel(group)}
          {current.scenario.targetScore === null
            ? null
            : ` · 🎯 ${current.scenario.targetScore} points`}
        </p>
      )}

      <MarinsScenarioBoard
        key={current.scenario.id}
        spec={current.spec}
        players={players}
      />
    </div>
  );
}
