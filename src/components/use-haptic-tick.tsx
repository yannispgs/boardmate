"use client";

import { type ReactNode, useRef } from "react";

/**
 * A light tick under the thumb — the one an iPhone's own wheels give as each
 * value goes by.
 *
 * The web has no haptics on iOS: Safari never shipped `navigator.vibrate`. What
 * it does have, since iOS 18, is the native switch, which ticks when it is
 * toggled — so a hidden one is toggled. Elsewhere `navigator.vibrate` does the
 * job. Neither is guaranteed (Safari may only tick right after a touch), and a
 * phone with neither simply stays silent: the tick is a nicety, never a signal
 * anything depends on.
 */
export function useHapticTick(): { tick: () => void; node: ReactNode } {
  const label = useRef<HTMLLabelElement>(null);

  function tick() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(8);

      return;
    }

    label.current?.click();
  }

  // `switch` is Safari's own attribute, unknown to React's typings.
  const switchProps = { switch: "" } as Record<string, string>;

  return {
    tick,
    node: (
      <label ref={label} aria-hidden className="sr-only">
        <input type="checkbox" tabIndex={-1} {...switchProps} />
      </label>
    ),
  };
}
