"use client";

import { useEffect, useState } from "react";

/**
 * How long the clock has to stay paused before the screen goes dark. The turn
 * timer already holds that a pause under five seconds isn't a pause at all
 * (someone mistapped, or stopped the clock to reach for a button) — the veil
 * follows the same rule rather than blinking on and off around a quick tap.
 */
const DIM_DELAY_MS = 5000;

export interface UseDimVeil {
  /** Whether the screen is currently veiled. */
  dimmed: boolean;
  /** Lifts the veil until the next pause. */
  lift: () => void;
}

/**
 * Blacks the screen out a few seconds into a pause, and lifts it as soon as the
 * clock runs again. iOS gives no web API for the backlight, so the veil is the
 * only lever we have — on an OLED phone a black pixel is an unlit pixel, so it
 * genuinely dims the screen instead of merely looking dark.
 *
 * Lifting it by hand is sticky: the effect doesn't re-run while the pause lasts,
 * so the veil won't creep back over somebody who just pushed it away. The next
 * pause arms it again.
 */
export function useDimVeil(paused: boolean): UseDimVeil {
  const [dimmed, setDimmed] = useState(false);

  useEffect(() => {
    if (!paused) {
      setDimmed(false);

      return;
    }

    const id = setTimeout(() => setDimmed(true), DIM_DELAY_MS);

    return () => clearTimeout(id);
  }, [paused]);

  return { dimmed, lift: () => setDimmed(false) };
}
