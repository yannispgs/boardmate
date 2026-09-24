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
  stop: () => Promise<void>;
}

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
 * Starting goes further and lands on the home screen instead of repainting
 * where it stands. A simulation is always started from the administration
 * screen, and most roles have no business reading that screen at all: staying
 * there would open the narrowed view on the one page the simulated role is
 * least likely to be allowed. Home is the screen every role may read, and it
 * is also where the narrowing first shows — the tiles it may not open are
 * gone. Stopping stays put on purpose: the rights come *back*, so whatever is
 * on screen can only widen, and being returned to where one was reading is
 * less disorienting than being sent home twice.
 *
 * The countdown reloads too when it reaches zero: past its expiry the database
 * ignores the row and hands the rights back, so a screen left open would sit
 * there drawn narrow while the account is already itself again. It reloads in
 * place for the same reason stopping does.
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
        window.location.reload();
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
    window.location.reload();
  }, [repo]);

  return { simulation, secondsLeft, loading, start, extend, stop };
}
