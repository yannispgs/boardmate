import type { Locator } from "@playwright/test";

/**
 * One player's points box in the end-of-manche prompt. The rows carry no label
 * of their own — the name next to the box is what identifies it — so they are
 * reached through the row they sit on.
 */
export function stagePoints(prompt: Locator, name: string): Locator {
  return prompt
    .getByRole("listitem")
    .filter({ hasText: name })
    .getByRole("spinbutton");
}
