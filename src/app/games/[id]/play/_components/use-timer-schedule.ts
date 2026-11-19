"use client";

import { useEffect, useState } from "react";
import type { PopulatedGame, TurnSchedule } from "@/lib/domain";
import {
  readStoredSchedule,
  scheduleStorageKey,
} from "@/lib/game/turn-schedule";

export interface TimerSchedule {
  /** The settings the turns are timed on: this party's own, or its config's. */
  schedule: TurnSchedule;
  /** New settings for this party, or `null` to go back to the config's. */
  save: (schedule: TurnSchedule | null) => void;
}

/**
 * The timer's settings for the party being played. Set by hand, they hold for
 * this party only and on this phone only: kept in the phone's storage, so a
 * reload or a phone gone to sleep finds them again, and never written to the
 * party or its configuration — the statistics still read the party as it was
 * launched. Once the party is over they are forgotten.
 */
export function useTimerSchedule(game: PopulatedGame): TimerSchedule {
  const key = scheduleStorageKey(game.id);
  const [own, setOwn] = useState<TurnSchedule | null>(null);
  const over = game.status !== "ongoing";

  // Read after the first paint: storage is the browser's, and the server's
  // render has to match the first one here.
  useEffect(() => {
    setOwn(over ? null : readStoredSchedule(window.localStorage.getItem(key)));

    if (over) {
      window.localStorage.removeItem(key);
    }
  }, [key, over]);

  return {
    schedule: own ?? game.turnSchedule,
    save(schedule) {
      if (schedule === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(schedule));
      }

      setOwn(schedule);
    },
  };
}
