"use client";

import { useState } from "react";

import { TabButton, tabBarClass } from "@/components/TabButton";
import type { Extension } from "@/lib/domain";
import { ExtensionPanel } from "./ExtensionPanel";

/**
 * The extensions of a base game, one tab per extension (the tab bar is hidden
 * when there's only one).
 */
export function ExtensionsBrowser({
  extensions,
}: Readonly<{ extensions: Extension[] }>) {
  const [activeId, setActiveId] = useState(extensions[0]?.id ?? null);

  if (extensions.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Aucune extension pour ce jeu pour l&apos;instant.
      </p>
    );
  }

  const active = extensions.find(e => e.id === activeId) ?? extensions[0];

  return (
    <div className="flex flex-col gap-6">
      {extensions.length > 1 ? (
        <div className={tabBarClass}>
          {extensions.map(e => (
            <TabButton
              key={e.id}
              active={e.id === active.id}
              onClick={() => setActiveId(e.id)}
            >
              {e.name}
            </TabButton>
          ))}
        </div>
      ) : null}

      {/* Keyed: switching tab starts the next extension on its own list, never
          on the editor the previous one was left in. */}
      <ExtensionPanel key={active.id} extension={active} />
    </div>
  );
}
