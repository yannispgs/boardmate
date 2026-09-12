"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { chipClass } from "@/components/ui";
import type { Role, RoleId } from "@/lib/domain";
import { SIMULATION_MINUTES, simulatableRoles } from "@/lib/domain";
import { useRoleSimulation } from "@/lib/hooks/use-role-simulation";

/**
 * « Voir l'application comme… » — the way into a narrowed view, on the tab where
 * the roles are composed, because the question it answers (« qu'est-ce qu'un
 * Joueur voit vraiment ? ») is the one asked while ticking boxes.
 *
 * Only the way **in** lives here. The way out is in the banner, on every screen:
 * a simulation usually takes this very page away.
 *
 * Several roles can be ticked at once, because an account wears several: the
 * simulated set is their union, exactly as a real assignment would be.
 */
export function RoleSimulationPanel({ roles }: Readonly<{ roles: Role[] }>) {
  const { simulation, start } = useRoleSimulation();
  const [picked, setPicked] = useState<RoleId[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offerable = simulatableRoles(roles);

  if (offerable.length === 0) {
    return null;
  }

  function toggle(roleId: RoleId) {
    setPicked(current =>
      current.includes(roleId)
        ? current.filter(id => id !== roleId)
        : [...current, roleId],
    );
  }

  async function launch() {
    setError(null);
    setStarting(true);

    try {
      await start(picked);
    } catch (cause) {
      // The database writes these refusals as sentences (« Un rôle
      // administrateur ne se simule pas »), so they are shown as they come.
      setError(
        cause instanceof Error ? cause.message : "Simulation impossible.",
      );
      setStarting(false);
    }
  }

  return (
    <section
      data-testid="role-simulation"
      className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-medium">Voir l&apos;application comme…</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          L&apos;application se restreint aux permissions du ou des rôles
          choisis, pendant {SIMULATION_MINUTES} minutes. Tu restes connecté à
          ton compte, et une vue simulée ne peut que retirer des droits, jamais
          en donner.
        </p>
      </div>

      {/* Plain buttons in a row, deliberately not a `<ul>`: the roles are
          listed again as cards right underneath, and a second set of list
          items carrying the same names makes every « le rôle X » locator on
          this tab ambiguous. */}
      <div className="flex flex-wrap gap-2">
        {offerable.map(role => (
          <button
            key={role.id}
            type="button"
            onClick={() => toggle(role.id)}
            className={chipClass(picked.includes(role.id))}
          >
            {role.label}
          </button>
        ))}
      </div>

      <ErrorText message={error} />

      <button
        type="button"
        onClick={launch}
        disabled={picked.length === 0 || starting}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-40"
      >
        {simulation === null ? "Lancer la vue simulée" : "Changer de vue"}
      </button>
    </section>
  );
}
