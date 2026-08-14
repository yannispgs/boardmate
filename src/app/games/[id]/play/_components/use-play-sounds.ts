"use client";

import { useEffect } from "react";
import { BEEP_URL, loadSound, RING_URL, unlockAudio } from "./play-audio";

// iOS in particular needs a touchend/click (not just pointerdown) before it
// lets any sound out, so we listen broadly.
const UNLOCK_EVENTS = [
  "touchend",
  "pointerup",
  "mousedown",
  "keydown",
] as const;

/**
 * Gets the countdown's sounds ready: unlocks audio on the first interaction
 * with the play screen (mobile browsers only let an AudioContext start from a
 * user gesture) and decodes the beep/ring up front, before they are needed.
 */
export function usePlaySounds() {
  useEffect(() => {
    const handle = () => unlockAudio();
    // Coming back from a locked screen is not a gesture, but a context already
    // unlocked once stays resumable — and waiting for the next tap would mean
    // silence for the rest of a turn nobody is touching.
    const handleReturn = () => {
      if (document.visibilityState === "visible") {
        unlockAudio();
      }
    };

    for (const event of UNLOCK_EVENTS) {
      window.addEventListener(event, handle);
    }
    document.addEventListener("visibilitychange", handleReturn);

    return () => {
      for (const event of UNLOCK_EVENTS) {
        window.removeEventListener(event, handle);
      }
      document.removeEventListener("visibilitychange", handleReturn);
    };
  }, []);

  useEffect(() => {
    loadSound(BEEP_URL);
    loadSound(RING_URL);
  }, []);
}
