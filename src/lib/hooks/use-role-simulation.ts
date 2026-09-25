"use client";

import { useCallback, useEffect, useState } from "react";

import type { RoleId, RoleSimulation } from "@/lib/domain";
import { simulationSecondsLeft } from "@/lib/domain";
import { getAccessRepository } from "@/lib/repositories";

interface UseRoleSimulation {
  simulation: RoleSimulation | null;
  /** Whole seconds before the view lapses; `0` when nothing is simulated. */
  secondsLeft: number;
  loading: boolean;
  /** Lands on the home screen: the launcher itself may be off-limits now. */
  start: (roleIds: RoleId[]) => Promise<void>;
  /** Pushes the expiry back without repainting: nothing on screen changes. */
  extend: () => Promise<void>;
  /** Returns to the Rôles tab the simulation was started from. */
  stop: () => Promise<void>;
}

/** Where a simulation is started from, and so where ending one returns. */
const LAUNCHER = "/admin?onglet=roles";

/**
 * The narrowed view the account is currently looking through, and the ways in
 * and out of it.
 *
 * Starting or stopping one loads a document rather than refreshing state. That
 * is deliberate: a simulation changes what *every* policy answers, so half the
 * screens already rendered are now wrong — a permission list fetched a moment
 * ago, a game list RLS would no longer return, a Server Component rendered
 * against the wider set. Repainting from scratch is the only way the interface
 * and the database are certain to agree, and this is a rare, deliberate action
 * where a blink costs nothing. Extending is the exception: it moves the expiry
 * and nothing else, so it stays where it is.
 *
 * Neither lands where it stands. Starting goes to the home screen: a
 * simulation is always started from the administration screen, and most roles
 * have no business reading that screen at all, so staying there would open the
 * narrowed view on the one page the simulated role is least likely to be
 * allowed. Home is the screen every role may read, and it is also where the
 * narrowing first shows — the tiles it may not open are gone.
 *
 * Stopping goes back to the Rôles tab it was started from: the round trip
 * closes where it opened, next to the panel that launches the next one — a
 * simulation is rarely looked at alone, it is compared with another.
 *
 * The countdown stops it too when it reaches zero, and returns to the same
 * tab: past its expiry the database ignores the row and hands the rights back,
 * so a screen left open would sit there drawn narrow while the account is
 * already itself again — and a lapse is an end like « Quitter », not a
 * different one.
 */
export function useRoleSimulation(): UseRoleSimulation {
  const repo = getAccessRepository();
  const [simulation, setSimulation] = useState<RoleSimulation | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);

  const read = useCallback(async () => {
    const current = await repo.currentRoleSimulation();

    setSimulation(current);
    // Seeded here rather than left to the first tick, so the banner never
    // paints « 0:00 » for a frame on its way in.
    setSecondsLeft(
      current === null ? 0 : simulationSecondsLeft(current, Date.now()),
    );
  }, [repo]);

  useEffect(() => {
    let cancelled = false;

    read()
      .catch(() => {
        // An account that cannot reach the function is simply not simulating.
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [read]);

  useEffect(() => {
    if (simulation === null) {
      return;
    }

    function tick() {
      /* c8 ignore next 3 -- the guard above already returned on null */
      if (simulation === null) {
        return;
      }

      const left = simulationSecondsLeft(simulation, Date.now());

      setSecondsLeft(left);

      if (left === 0) {
        window.location.assign(LAUNCHER);
      }
    }

    const timer = window.setInterval(tick, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [simulation]);

  const start = useCallback(
    async (roleIds: RoleId[]) => {
      await repo.startRoleSimulation(roleIds);
      window.location.assign("/");
    },
    [repo],
  );

  const extend = useCallback(async () => {
    if (simulation === null) {
      return;
    }

    await repo.startRoleSimulation(simulation.roleIds);
    await read();
  }, [repo, read, simulation]);

  const stop = useCallback(async () => {
    await repo.stopRoleSimulation();
    window.location.assign(LAUNCHER);
  }, [repo]);

  return { simulation, secondsLeft, loading, start, extend, stop };
}
