"use client";

import Link from "next/link";
import { PlusIcon } from "@/components/icons";
import { iconButtonClass, sectionHeadingClass } from "@/components/ui";
import type { Extension } from "@/lib/domain";
import { extensionEffects } from "@/lib/game/extensions";
import { scenarioEditorHref } from "@/lib/game/scenario-editor";
import { ScenarioCardList } from "./ScenarioCardList";

/** One extension: what it changes, then its scenarios. */
export function ExtensionPanel({ extension }: { extension: Extension }) {
  const effects = extensionEffects(extension);
  const editorHref = scenarioEditorHref(extension.key);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
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

      {extension.hasScenarios ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className={sectionHeadingClass}>
              Scénarios · {extension.scenarios.length}
            </h3>
            {editorHref === null ? null : (
              <Link
                href={editorHref}
                title="Créer un scénario"
                className={iconButtonClass}
              >
                <PlusIcon />
              </Link>
            )}
          </div>
          <ScenarioCardList scenarios={extension.scenarios} />
        </section>
      ) : null}
    </div>
  );
}
