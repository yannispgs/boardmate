"use client";

import { useMemo, useState } from "react";

import {
  type GeneratorOptions,
  toBoardOptions,
} from "@/lib/catan/generator-options";
import { type SpecDraw, trySpecBoard } from "@/lib/catan/marins";
import type { ScenarioSpec } from "@/lib/catan/scenario-spec";

/** A drawn scenario, and the button that draws it again. */
export interface ScenarioDraw {
  /** The board, or the reason the scenario could not be drawn. */
  draw: SpecDraw;
  regenerate: () => void;
}

/**
 * One draw of a scenario, redrawn on demand. The first board of a scenario is
 * always the same one: an author comparing two scenarios, or a player deciding
 * which to play, is looking at an illustration, and an illustration that
 * changes under them tells them nothing. "Régénérer" is what asks the hazard
 * a fresh question.
 *
 * Changing a generator setting redraws on the **same** seed, so what moves on
 * the board is what that setting decides — which is the point of touching it.
 */
export function useScenarioDraw(
  spec: ScenarioSpec,
  players: number,
  options?: GeneratorOptions,
): ScenarioDraw {
  const [seed, setSeed] = useState(1);

  const draw = useMemo(
    () =>
      trySpecBoard(
        spec,
        players,
        seed,
        options === undefined ? undefined : toBoardOptions(options),
      ),
    [spec, players, seed, options],
  );

  return { draw, regenerate: () => setSeed(s => s + 1) };
}
