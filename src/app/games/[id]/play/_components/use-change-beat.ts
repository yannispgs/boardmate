"use client";

import { useEffect, useRef, useState } from "react";

/**
 * True for `durationMs` after `value` changes, false the rest of the time — the
 * beat a change is allowed to take.
 *
 * Two things on the play screen need to know a change is still landing: the
 * announcement that shows it, and the button that caused it. « Phase terminée →
 * » is disabled while the write is in flight, but the clocks only start crossing
 * once the reload has answered, and a second tap in that window would close the
 * next phase before anybody had seen it open.
 *
 * The first render is never a change: a game reopened at generation 4 must not
 * announce one. `undefined` is therefore not a value it can be handed — the
 * initial one is remembered as-is, whatever it is.
 */
export function useChangeBeat(value: unknown, durationMs: number): boolean {
  const previous = useRef(value);
  const [beating, setBeating] = useState(false);

  useEffect(() => {
    if (previous.current === value) {
      return;
    }

    previous.current = value;
    setBeating(true);

    const timer = setTimeout(() => {
      setBeating(false);
    }, durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, durationMs]);

  return beating;
}
