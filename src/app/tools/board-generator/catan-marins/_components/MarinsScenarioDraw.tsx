"use client";

import Link from "next/link";
import { useState } from "react";

import { MarinsScenarioBoard } from "@/components/catan/MarinsScenarioBoard";
import { PencilIcon } from "@/components/icons";
import { OptionPicker } from "@/components/OptionPicker";
import { iconButtonClass, sectionHeadingClass } from "@/components/ui";
import { marinsPlayerGroups } from "@/lib/catan/marins";
import { type Drawable, playerCountsLabel } from "@/lib/catan/scenario-listing";
import type { ExtensionScenarioId } from "@/lib/domain";
import { stepIndex } from "@/lib/ui/carousel";
import { ScenarioPickerSheet } from "./ScenarioPickerSheet";

/**
 * The scenario being looked at, and the way to another one: tap the name to see
 * them all at once, or walk the list from the map itself. A row of names was
 * enough for three scenarios and unreadable at fifteen — and a name is not what
 * one chooses a map on anyway.
 */
function ScenarioBar({
  scenario,
  at,
  total,
  manageHref,
  onOpen,
}: Readonly<{
  scenario: Drawable["scenario"];
  /** 1-based position in the list, for « 2 / 7 ». */
  at: number;
  total: number;
  manageHref: string | null;
  onOpen: () => void;
}>) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-1.5">
      <div className="flex items-center gap-2">
        <span className={sectionHeadingClass}>Scénario</span>

        {manageHref === null ? null : (
          <Link
            href={manageHref}
            title="Gérer les scénarios"
            className={iconButtonClass}
          >
            <PencilIcon />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={onOpen}
        aria-label={`Scénario : ${scenario.name}. Choisir un autre scénario`}
        className="flex w-full items-center gap-3 rounded-lg border border-black/10 px-4 py-2.5 text-left transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{scenario.name}</span>
          {scenario.targetScore === null ? null : (
            <span className="text-xs text-zinc-500">
              🎯 {scenario.targetScore} points
            </span>
          )}
        </span>

        {total > 1 ? (
          <span className="shrink-0 rounded-full bg-indigo-600/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-600 dark:bg-indigo-400/15 dark:text-indigo-300">
            {at} / {total}
          </span>
        ) : null}

        <span aria-hidden className="shrink-0 text-zinc-400">
          ▾
        </span>
      </button>
    </div>
  );
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
  const [listing, setListing] = useState(false);

  // A scenario deleted from another tab, or simply none picked yet, falls back
  // to the first of the list rather than to an empty screen.
  const found = drawable.findIndex(d => d.scenario.id === picked);
  const at = found === -1 ? 0 : found;
  const current = drawable[at];

  if (current === undefined) {
    return null;
  }

  /** Shows a scenario, back on the seat count the list was filtered on. */
  function show(id: ExtensionScenarioId) {
    setPicked(id);
    setGroup(seats);
  }

  /** Walks the list, wrapping round both ends. */
  function step(delta: number) {
    show(drawable[stepIndex(at, delta, drawable.length)].scenario.id);
  }

  // The player counts this scenario has a map for. A count the previous
  // scenario served is kept when this one serves it too, dropped otherwise.
  const groups = marinsPlayerGroups(current.spec);
  const served = groups.find(g => g.includes(group ?? -1)) ?? groups[0];
  const players = served?.[0] ?? 0;

  return (
    <>
      <ScenarioBar
        scenario={current.scenario}
        at={at + 1}
        total={drawable.length}
        manageHref={manageHref}
        onOpen={() => setListing(true)}
      />

      {groups.length > 1 ? (
        <OptionPicker
          variant="segmented"
          label="Nombre de joueurs"
          options={groups.map(g => ({
            value: g[0],
            label: playerCountsLabel(g),
          }))}
          value={players}
          onChange={setGroup}
        />
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {playerCountsLabel(served ?? [])}
        </p>
      )}

      {/* Keyed so flipping to another scenario draws its own first board rather
          than inheriting the seed and the settings of the one before it. */}
      <MarinsScenarioBoard
        key={current.scenario.id}
        spec={current.spec}
        players={players}
        browse={{ count: drawable.length, onStep: step, itemLabel: "Scénario" }}
      />

      {listing ? (
        <ScenarioPickerSheet
          drawable={drawable}
          currentId={current.scenario.id}
          seats={seats}
          onPick={show}
          onClose={() => setListing(false)}
        />
      ) : null}
    </>
  );
}
