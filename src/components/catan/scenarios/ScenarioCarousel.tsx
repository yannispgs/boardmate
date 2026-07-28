"use client";

import { useState } from "react";

import { Modal } from "@/components/Modal";
import { SwipeDeck } from "@/components/SwipeDeck";
import { modalCardClass } from "@/components/ui";
import type { ExtensionScenario, ExtensionScenarioId } from "@/lib/domain";
import { stepIndex } from "@/lib/ui/carousel";
import { ScenarioSlide } from "./ScenarioSlide";

/**
 * The scenarios of an extension, one board at a time, over the launch form:
 * choosing between « Les quatre îles » and « L'archipel » by name alone tells
 * you nothing, and the maps are what the decision is actually about. Picking one
 * here ticks it in the form and closes — the form itself is left untouched.
 *
 * Opened only on an extension that has scenarios: there is always a slide.
 */
export function ScenarioCarousel({
  scenarios,
  players,
  selectedId,
  onChoose,
  onClose,
}: Readonly<{
  scenarios: ExtensionScenario[];
  players: number;
  selectedId: ExtensionScenarioId | null;
  onChoose: (id: ExtensionScenarioId) => void;
  onClose: () => void;
}>) {
  // Open on the scenario already chosen: that is the one being reconsidered.
  const [index, setIndex] = useState(() => {
    const at = scenarios.findIndex(s => s.id === selectedId);

    return at === -1 ? 0 : at;
  });
  const current = scenarios[index];

  function step(delta: number) {
    setIndex(at => stepIndex(at, delta, scenarios.length));
  }

  function choose() {
    onChoose(current.id);
    onClose();
  }

  return (
    <Modal
      onClose={onClose}
      label="Plateaux des scénarios"
      className={`${modalCardClass} max-w-md`}
    >
      <div className="relative z-10 flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10">
        <h2 className="text-base font-semibold">Plateaux</h2>

        {scenarios.length > 1 ? (
          <span className="rounded-full bg-indigo-600/10 px-3 py-1 font-semibold text-indigo-600 text-sm tabular-nums dark:bg-indigo-400/15 dark:text-indigo-300">
            {index + 1} / {scenarios.length}
          </span>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          Fermer
        </button>
      </div>

      {/* `overflow-hidden` keeps whatever the slide unfolds — the fog's material
          list, a long board — inside this row: the arrows make the row a
          positioned box, which would otherwise paint over the footer under it
          however tall the slide grew. `overscroll-contain` stops a board
          scrolled to its end from carrying on into the page behind. */}
      <SwipeDeck
        nav={{ count: scenarios.length, onStep: step, itemLabel: "Plateau" }}
        className="flex min-h-0 flex-1 overflow-hidden"
        contentClassName="flex-1 overflow-y-auto overscroll-contain px-11 py-4"
      >
        {/* Keyed so flipping to another scenario draws its own first board
            rather than inheriting the seed of the one before it. */}
        <ScenarioSlide key={current.id} scenario={current} players={players} />
      </SwipeDeck>

      <div className="relative z-10 border-t border-black/10 p-3 dark:border-white/10">
        <button
          type="button"
          onClick={choose}
          className={`w-full rounded-lg px-4 py-2.5 font-medium transition ${
            current.id === selectedId
              ? "border border-indigo-500/40 text-indigo-600 dark:text-indigo-400"
              : "bg-indigo-600 text-white hover:bg-indigo-500"
          }`}
        >
          {current.id === selectedId
            ? "✓ Scénario choisi"
            : "Choisir ce scénario"}
        </button>
      </div>
    </Modal>
  );
}
