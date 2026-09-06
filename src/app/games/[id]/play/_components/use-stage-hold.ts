"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface StageHold {
  /** True while the table has not acknowledged the new stage yet. */
  holding: boolean;
  /** Called when somebody taps the announcement — the stage is now theirs. */
  release: () => void;
}

/**
 * Holds the play screen on the stage that has just begun, until the table says
 * it has seen it or the ceiling runs out.
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
 *
 * `holdMs` is the ceiling, not the expectation: the hold ends on the tap. There
 * has to be one, because waiting forever is the mirror of the bug being fixed —
 * nobody taps, the clock never starts, and the first player of the stage records
 * a turn of nothing. It comes from the game's configuration (see
 * `stageHoldSeconds`), floored and capped there rather than trusted.
 */
export function useStageHold(
  stage: number,
  enabled: boolean,
  holdMs: number,
): StageHold {
  const previous = useRef(stage);
  const [holding, setHolding] = useState(false);
  // Read when a stage turns over, never depended on: a settings change that
  // landed mid-hold would otherwise re-run the effect, whose first guard sends
  // it straight back out — cancelling the ceiling it had just armed and holding
  // the clock for ever.
  const settings = useRef({ enabled, holdMs });
  settings.current = { enabled, holdMs };

  useEffect(() => {
    if (previous.current === stage) {
      return;
    }

    previous.current = stage;

    if (!settings.current.enabled) {
      return;
    }

    setHolding(true);

    const ceiling = setTimeout(() => {
      setHolding(false);
    }, settings.current.holdMs);

    return () => {
      clearTimeout(ceiling);
    };
  }, [stage]);

  const release = useCallback(() => {
    setHolding(false);
  }, []);

  return { holding, release };
}
