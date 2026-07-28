"use client";

import { type PointerEvent, useRef, useState } from "react";

import { Modal } from "@/components/Modal";
import type { ExtensionScenario, ExtensionScenarioId } from "@/lib/domain";
import { stepIndex, swipeStep } from "@/lib/ui/carousel";
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
  const from = useRef<{ x: number; y: number } | null>(null);

  const current = scenarios[index];

  function step(delta: number) {
    setIndex(at => stepIndex(at, delta, scenarios.length));
  }

  function startDrag(event: PointerEvent) {
    from.current = { x: event.clientX, y: event.clientY };
  }

  function endDrag(event: PointerEvent) {
    const start = from.current;

    from.current = null;

    if (start === null) {
      return;
    }

    const delta = swipeStep(event.clientX - start.x, event.clientY - start.y);

    if (delta !== 0) {
      step(delta);
    }
  }

  return (
    <Modal
      onClose={onClose}
      label="Plateaux des scénarios"
      className="flex max-h-[90lvh] w-full max-w-md flex-col rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between border-b border-black/10 p-4 dark:border-white/10">
        <h2 className="text-base font-semibold">
          Plateaux
          {scenarios.length > 1 ? (
            <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
              {index + 1} / {scenarios.length}
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-sm text-zinc-500 transition hover:bg-black/5 dark:hover:bg-white/10"
        >
          Fermer
        </button>
      </div>

      <div
        onPointerDown={startDrag}
        onPointerUp={endDrag}
        className="flex-1 overflow-y-auto p-4"
      >
        {/* Keyed so flipping to another scenario draws its own first board
            rather than inheriting the seed of the one before it. */}
        <ScenarioSlide
          key={current.id}
          scenario={current}
          players={players}
          selected={current.id === selectedId}
          onChoose={() => {
            onChoose(current.id);
            onClose();
          }}
        />
      </div>

      {scenarios.length > 1 ? (
        <div className="flex items-center justify-between border-t border-black/10 p-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => step(-1)}
            className="rounded-lg px-3 py-1.5 text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            ‹
          </button>

          <div className="flex items-center gap-2">
            {scenarios.map((scenario, at) => (
              <button
                key={scenario.id}
                type="button"
                title={scenario.name}
                onClick={() => setIndex(at)}
                className={`h-2 w-2 rounded-full transition ${
                  at === index
                    ? "bg-indigo-600"
                    : "bg-black/20 dark:bg-white/25"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            className="rounded-lg px-3 py-1.5 text-lg transition hover:bg-black/5 dark:hover:bg-white/10"
          >
            ›
          </button>
        </div>
      ) : null}
    </Modal>
  );
}
