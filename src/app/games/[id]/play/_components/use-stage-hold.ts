"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * How long the clock will wait to be told the table has seen the change, before
 * giving up and starting on its own.
 *
 * There has to be a ceiling. Waiting for the tap forever is the mirror of the
 * bug being fixed: nobody taps, the clock never starts, and the first player of
 * the stage records a turn of nothing. Thirty seconds is long enough for a
 * table looking at its cards to look up, and short enough that the error it can
 * still leave behind is bounded by half a minute instead of a whole turn.
 */
export const STAGE_HOLD_MS = 30_000;

export interface StageHold {
  /** True while the table has not acknowledged the new stage yet. */
  holding: boolean;
  /** Called when somebody taps the announcement — the stage is now theirs. */
  release: () => void;
}

/**
 * Holds the play screen on the stage that has just begun, until the table says
 * it has seen it or {@link STAGE_HOLD_MS} runs out.
 *
 * This is not decoration. A stage turning over is the one change on this screen
 * that happens **to** the table rather than because somebody asked for it: a
 * turn ends when a player taps, but a generation ends when the last player
 * passes, and the seconds that follow belong to nobody. Left running, they land
 * in the first player's turn — he is charged for an announcement he had not
 * even read yet.
 *
 * The caller freezes its clock on `holding` rather than pausing it: a pause
 * would be tallied on that same first player's turn as a pause the table never
 * took, which is the same arbitrary charge wearing a different name.
 *
 * The first render is never a change: a game reopened at generation 4 must not
 * hold anything — the table has been playing it for an hour.
 */
export function useStageHold(stage: number, enabled: boolean): StageHold {
  const previous = useRef(stage);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (previous.current === stage) {
      return;
    }

    previous.current = stage;

    if (!enabled) {
      return;
    }

    setHolding(true);

    const ceiling = setTimeout(() => {
      setHolding(false);
    }, STAGE_HOLD_MS);

    return () => {
      clearTimeout(ceiling);
    };
  }, [stage, enabled]);

  const release = useCallback(() => {
    setHolding(false);
  }, []);

  return { holding, release };
}
