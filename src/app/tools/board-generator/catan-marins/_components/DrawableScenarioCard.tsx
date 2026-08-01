"use client";

import { ScenarioTarget } from "@/components/catan/ScenarioTarget";
import { type Drawable, scenarioSummary } from "@/lib/catan/scenario-listing";

/**
 * One scenario to draw, in the list opened from the generator: its name, the
 * score it is played to, and what its maps hold — who they seat, their harbours,
 * their gold rivers, their fog. The one on screen is ticked, so the list opens
 * on where you already are.
 */
export function DrawableScenarioCard({
  drawable,
  current,
  onPick,
}: Readonly<{
  drawable: Drawable;
  current: boolean;
  onPick: () => void;
}>) {
  const { scenario, spec } = drawable;

  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        aria-pressed={current}
        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
          current
            ? "border-indigo-500 bg-indigo-500/10"
            : "border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-medium">{scenario.name}</span>
          <span className="truncate text-xs text-zinc-500">
            {scenarioSummary(spec)}
          </span>
        </span>

        <ScenarioTarget targetScore={scenario.targetScore} />

        {current ? (
          <span aria-hidden className="shrink-0 text-indigo-500">
            ✓
          </span>
        ) : null}
      </button>
    </li>
  );
}
