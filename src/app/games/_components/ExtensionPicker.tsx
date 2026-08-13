"use client";

import { useState } from "react";

import { ScenarioCarousel } from "@/components/catan/scenarios/ScenarioCarousel";
import type { Extension, ExtensionId, ExtensionScenarioId } from "@/lib/domain";

/**
 * The extensions played with, and — for the ones organised in scenarios — which
 * scenario. A scenario is a name and a score to reach in the form; « Voir les
 * plateaux » shows the maps behind those names, which is what one is really
 * choosing between. It only appears once a scenario has a map to show.
 */
export function ExtensionPicker({
  extensions,
  selected,
  scenarioByExtension,
  players,
  onToggle,
  onPickScenario,
}: Readonly<{
  extensions: Extension[];
  selected: ExtensionId[];
  scenarioByExtension: Record<ExtensionId, ExtensionScenarioId>;
  players: number;
  onToggle: (id: ExtensionId) => void;
  onPickScenario: (extension: ExtensionId, id: ExtensionScenarioId) => void;
}>) {
  const [previewing, setPreviewing] = useState<ExtensionId | null>(null);

  const preview = extensions.find(e => e.id === previewing) ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10">
      <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Extensions
      </h3>

      {extensions.map(e => (
        <div key={e.id} className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(e.id)}
              onChange={() => onToggle(e.id)}
              className="h-4 w-4 shrink-0 accent-indigo-600"
            />
            <span>{e.name}</span>
          </label>

          {selected.includes(e.id) && e.hasScenarios ? (
            <div className="flex flex-col gap-1 pl-6">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Scénario
                </span>
                {e.scenarios.some(s => s.boardSpec !== null) ? (
                  <button
                    type="button"
                    onClick={() => setPreviewing(e.id)}
                    className="rounded-lg border border-black/10 px-2.5 py-1 text-xs font-medium transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                  >
                    🗺️ Voir les plateaux
                  </button>
                ) : null}
              </div>

              {e.scenarios.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={`scenario-${e.id}`}
                    checked={scenarioByExtension[e.id] === s.id}
                    onChange={() => onPickScenario(e.id, s.id)}
                    className="h-4 w-4 shrink-0 accent-indigo-600"
                  />
                  <span>{s.name}</span>
                  {s.targetScore !== null ? (
                    <span className="text-zinc-400">· 🎯 {s.targetScore}</span>
                  ) : null}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ))}

      {preview !== null ? (
        <ScenarioCarousel
          scenarios={preview.scenarios}
          players={players}
          selectedId={scenarioByExtension[preview.id] ?? null}
          onChoose={id => onPickScenario(preview.id, id)}
          onClose={() => setPreviewing(null)}
        />
      ) : null}
    </div>
  );
}
