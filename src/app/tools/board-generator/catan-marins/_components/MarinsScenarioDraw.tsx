"use client";

import Link from "next/link";
import { useState } from "react";

import { MarinsScenarioBoard } from "@/components/catan/MarinsScenarioBoard";
import { PencilIcon } from "@/components/icons";
import { OptionPicker, type PickerOption } from "@/components/OptionPicker";
import { iconButtonClass } from "@/components/ui";
import { marinsPlayerGroups, playerGroupLabel } from "@/lib/catan/marins";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import type { ExtensionScenario, ExtensionScenarioId } from "@/lib/domain";

/** A scenario that has a map, so the generator can actually draw it. */
export interface Drawable {
  scenario: ExtensionScenario;
  spec: ScenarioSpec;
}

/**
 * The scenarios offered for the drawing, and the map of the one picked.
 *
 * What is offered is already narrowed to the seat count asked for upstream, so
 * this only has to remember which of them is being looked at — and it forgets it
 * when the count changes, since the screen is remounted on it.
 */
export function MarinsScenarioDraw({
  drawable,
  seats,
  manageHref,
}: Readonly<{
  drawable: Drawable[];
  /** The count the list was filtered on, or `null` for no count in particular. */
  seats: number | null;
  manageHref: string | null;
}>) {
  const [picked, setPicked] = useState<ExtensionScenarioId | null>(null);
  const [group, setGroup] = useState<number | null>(seats);

  // A scenario deleted from another tab, or simply none picked yet, falls back
  // to the first of the list rather than to an empty screen.
  const current = drawable.find(d => d.scenario.id === picked) ?? drawable[0];

  if (current === undefined) {
    return null;
  }

  const options: PickerOption<ExtensionScenarioId>[] = drawable.map(d => ({
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
  const served = groups.find(g => g.includes(group ?? -1)) ?? groups[0];
  const players = served?.[0] ?? 0;

  return (
    <>
      <OptionPicker
        variant="segmented"
        label="Scénario"
        options={options}
        value={current.scenario.id}
        onChange={id => {
          setPicked(id);
          setGroup(seats);
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
        <OptionPicker
          variant="segmented"
          label="Nombre de joueurs"
          options={groups.map(g => ({
            value: g[0],
            label: playerGroupLabel(g),
          }))}
          value={players}
          onChange={setGroup}
        />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {served === undefined ? "Aucun plateau" : playerGroupLabel(served)}
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
    </>
  );
}
