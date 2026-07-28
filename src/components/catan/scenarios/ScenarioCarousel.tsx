"use client";

import { type PointerEvent, useRef, useState } from "react";

import { Modal } from "@/components/Modal";
import type { ExtensionScenario, ExtensionScenarioId } from "@/lib/domain";
import { stepIndex, swipeStep } from "@/lib/ui/carousel";
import { ScenarioSlide } from "./ScenarioSlide";

/**
 * One of the two arrows leading to the next board. They are pinned to the sides
 * of the slide rather than laid under it, so they hold the same spot whatever
 * the board being read is doing — swiped across, or scrolled past its frame.
 * Only the arrow itself takes a tap: the column around it lets a swipe through
 * to the slide underneath.
 */
function StepArrow({
  side,
  onClick,
}: Readonly<{ side: "previous" | "next"; onClick: () => void }>) {
  const label = side === "previous" ? "Plateau précédent" : "Plateau suivant";

  return (
    <div
      className={`pointer-events-none absolute inset-y-0 flex w-11 items-center justify-center ${
        side === "previous" ? "left-0" : "right-0"
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        title={label}
        className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-lg shadow ring-1 ring-black/10 backdrop-blur transition hover:bg-white dark:bg-zinc-800/85 dark:ring-white/15 dark:hover:bg-zinc-800"
      >
        {side === "previous" ? "‹" : "›"}
      </button>
    </div>
  );
}

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

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    // The finger keeps reporting to this element even once it has slid off it,
    // so a swipe that ends over the arrows — or past the card — still counts.
    event.currentTarget.setPointerCapture(event.pointerId);
    from.current = { x: event.clientX, y: event.clientY };
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
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

  /**
   * The browser has taken the gesture over — a vertical scroll of the board,
   * which `touch-pan-y` still leaves it — so no swipe is read out of it.
   */
  function cancelDrag() {
    from.current = null;
  }

  function choose() {
    onChoose(current.id);
    onClose();
  }

  return (
    <Modal
      onClose={onClose}
      label="Plateaux des scénarios"
      className="flex max-h-[90lvh] w-full max-w-md flex-col rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex items-center justify-between gap-3 border-b border-black/10 p-4 dark:border-white/10">
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

      <div className="relative min-h-0 flex-1">
        {/* `touch-pan-y` keeps the sideways drag for the carousel and leaves the
            up-and-down one to the board; `overscroll-contain` stops a board
            scrolled to its end from carrying on into the page behind. */}
        <div
          onPointerDown={startDrag}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
          className="h-full touch-pan-y overflow-y-auto overscroll-contain px-11 py-4"
        >
          {/* Keyed so flipping to another scenario draws its own first board
              rather than inheriting the seed of the one before it. */}
          <ScenarioSlide
            key={current.id}
            scenario={current}
            players={players}
          />
        </div>

        {scenarios.length > 1 ? (
          <>
            <StepArrow side="previous" onClick={() => step(-1)} />
            <StepArrow side="next" onClick={() => step(1)} />
          </>
        ) : null}
      </div>

      <div className="border-t border-black/10 p-3 dark:border-white/10">
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
