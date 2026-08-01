"use client";

import { ScenariosManager } from "@/components/catan/scenarios/ScenariosManager";
import { sectionHeadingClass } from "@/components/ui";
import type { Extension } from "@/lib/domain";
import { extensionEffects } from "@/lib/game/extensions";
import { editableScenarioKey } from "@/lib/game/scenario-editor";
import { ScenarioCardList } from "./ScenarioCardList";

/**
 * The scenarios of one extension: the ones the app can author are managed right
 * here — created, edited, deleted — and the others are reference data the
 * rulebook owns, so they are only shown.
 */
function Scenarios({ extension }: Readonly<{ extension: Extension }>) {
  const editableKey = editableScenarioKey(extension.key);

  if (editableKey !== null) {
    return (
      <ScenariosManager extension={extension} extensionKey={editableKey} />
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <h3 className={sectionHeadingClass}>
        Scénarios · {extension.scenarios.length}
      </h3>
      <ScenarioCardList scenarios={extension.scenarios} />
    </section>
  );
}

/** One extension: what it changes, then its scenarios. */
export function ExtensionPanel({ extension }: { extension: Extension }) {
  const effects = extensionEffects(extension);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {extension.name}
        </h2>
        {effects.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {effects.map(effect => (
              <li
                key={effect}
                className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-700 dark:text-indigo-300"
              >
                {effect}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Cette extension ne change rien au suivi de la partie : elle est
            simplement enregistrée avec elle.
          </p>
        )}
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Coche-la au lancement d&apos;une partie pour l&apos;activer.
        </p>
      </section>

      {extension.hasScenarios ? <Scenarios extension={extension} /> : null}
    </div>
  );
}
