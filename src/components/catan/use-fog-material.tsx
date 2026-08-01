"use client";

import { useState } from "react";

import { hiddenMaterial } from "@/lib/catan/hidden-material";
import type { ScenarioBoardSpec } from "@/lib/catan/scenario-spec";
import { HiddenMaterial } from "./HiddenMaterial";

/**
 * Drives the fog's preparation list: render `fogButton` beside the board's own
 * buttons and `fogPanel` under them. Both are `null` when there is no pile to
 * take out of the box — a board that hides nothing, or a scenario that could
 * not be drawn at all, which is why the board may be given as `null`.
 *
 * Two pieces rather than one component because they belong in two different
 * places around a board — the same split `useSearch` makes.
 */
export function useFogMaterial(
  board: ScenarioBoardSpec | null,
  {
    buttonClass,
    panelClass,
  }: Readonly<{
    /** So the button sits at the size of the ones it stands beside. */
    buttonClass: string;
    /** How the list is framed, to match the block it is opened under. */
    panelClass: string;
  }>,
) {
  const [open, setOpen] = useState(false);
  const zones = board === null ? [] : hiddenMaterial(board);

  if (zones.length === 0) {
    return { fogButton: null, fogPanel: null };
  }

  const fogButton = (
    <button
      type="button"
      onClick={() => setOpen(v => !v)}
      className={buttonClass}
    >
      🌫️ {open ? "Masquer le matériel" : "Matériel à préparer"}
    </button>
  );

  return {
    fogButton,
    fogPanel: open ? (
      <HiddenMaterial zones={zones} className={panelClass} />
    ) : null,
  };
}
