/**
 * Authoring a boardgame's secondary rules — the ones that separate players tied
 * on the final score.
 *
 * These used to be typed straight into migrations, on the grounds that a
 * rulebook is not a preference. The games the table actually adds are entered
 * in the app though, so a rule that can only be written in SQL is a rule those
 * games never get: they end on a shared victory the rulebook does not grant.
 * What follows is the tidying the editor needs to turn half-typed rows into a
 * spec worth saving.
 *
 * Pure: no vendor types, unit-tested.
 */

import type { TieBreakRule } from "@/lib/domain";

import { newEditorKey } from "./editor-key";

/** An empty rule, ready to be filled in. Ranks on a value the table gives. */
export function newTieBreakRule(): TieBreakRule {
  return {
    key: newEditorKey(),
    label: "",
    direction: "highest",
    source: "ask",
  };
}

/**
 * The rules as they deserve to be saved: labels and hints trimmed, unnamed
 * rules dropped, and the fields a source makes meaningless left out.
 *
 * A `currentTurn` rule asks the table for nothing — the app already knows whose
 * turn it was — so it carries no hint, and the player holding the turn is the
 * one it favours. Order is kept: it *is* the order the rules are applied in.
 */
export function cleanTieBreakRules(
  rules: readonly TieBreakRule[],
): TieBreakRule[] {
  const clean: TieBreakRule[] = [];

  for (const rule of rules) {
    const label = rule.label.trim();

    if (label === "") {
      continue;
    }

    if (rule.source === "currentTurn") {
      clean.push({
        key: rule.key,
        label,
        direction: "highest",
        source: "currentTurn",
      });

      continue;
    }

    const help = rule.help?.trim() ?? "";

    clean.push({
      key: rule.key,
      label,
      direction: rule.direction ?? "highest",
      source: "ask",
      ...(help === "" ? {} : { help }),
    });
  }

  return clean;
}
