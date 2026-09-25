"use client";

import { useState } from "react";

import { EyeIcon } from "@/components/icons";
import { formatSecondsLeft } from "@/lib/domain";
import { useRoleSimulation } from "@/lib/hooks/use-role-simulation";

/**
 * Says, on every screen, that what is being read is not the whole application.
 *
 * It lives in the root layout rather than on the page that starts a simulation,
 * because starting one is the last thing done on that page: the point is to walk
 * away and look at the rest. Without a permanent banner the only sign left would
 * be missing buttons, which is exactly what a half-broken deployment looks like.
 *
 * The way out is carried here for the same reason. A simulated « Joueur » can no
 * longer open the administration screen, so a « Quitter » button that only
 * existed there would be a door locked from the inside.
 */
export function SimulationBanner() {
  const { simulation, secondsLeft, extend, stop } = useRoleSimulation();
  const [busy, setBusy] = useState(false);

  if (simulation === null) {
    return null;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);

    try {
      await action();
    } finally {
      // `stop` leaves the page, so this only ever runs after a refusal
      // — and after one, the buttons have to come back.
      setBusy(false);
    }
  }

  return (
    <div className="sticky top-0 z-40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-500/40 bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <EyeIcon className="h-4 w-4 shrink-0" />

      <span className="min-w-0">
        Vue simulée :{" "}
        <strong className="font-semibold">
          {simulation.roleLabels.join(", ")}
        </strong>
      </span>

      {/* `tabular-nums` so the line does not twitch left and right once a
          second as the digits change width. */}
      <span className="tabular-nums text-amber-700 dark:text-amber-300">
        {formatSecondsLeft(secondsLeft)}
      </span>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(extend)}
          className="rounded-lg border border-amber-600/40 px-3 py-1 font-medium transition hover:bg-amber-500/20 disabled:opacity-40"
        >
          Prolonger
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(stop)}
          className="rounded-lg bg-amber-600 px-3 py-1 font-medium text-white transition hover:bg-amber-500 disabled:opacity-40"
        >
          Quitter
        </button>
      </div>
    </div>
  );
}
