"use client";

import { useEffect, useRef, useState } from "react";

/** A change still landing: what is arriving, and what it is replacing. */
export interface ChangeBeat<T> {
  /** True for `durationMs` after the value changed, false the rest of the time. */
  beating: boolean;
  /** The value being replaced, for as long as the beat lasts — else `null`. */
  outgoing: T | null;
}

/**
 * The beat a change is allowed to take.
 *
 * Three things on the play screen need to know a change is still landing: the
 * fade that shows it, the button that caused it, and — for a swap that has to
 * cross-fade rather than blink — the value on its way out. « Phase terminée → »
 * is disabled while the write is in flight, but the fade runs *after* the reload
 * comes back, and a second tap in that window would close the next phase before
 * anybody had seen it open.
 *
 * The first render is never a change: a game reopened at generation 4 must not
 * announce one. `undefined` is therefore not a value it can be handed — the
 * initial one is remembered as-is, whatever it is.
 */
export function useChangeBeat<T>(
  value: T,
  durationMs: number,
): Readonly<ChangeBeat<T>> {
  const previous = useRef(value);
  const [beat, setBeat] = useState<ChangeBeat<T>>({
    beating: false,
    outgoing: null,
  });

  useEffect(() => {
    if (previous.current === value) {
      return;
    }

    const left = previous.current;

    previous.current = value;
    setBeat({ beating: true, outgoing: left });

    const timer = setTimeout(() => {
      setBeat({ beating: false, outgoing: null });
    }, durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, durationMs]);

  return beat;
}
