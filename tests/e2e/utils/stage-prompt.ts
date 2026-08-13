import type { Locator } from "@playwright/test";

/**
 * One player's points box in the end-of-manche prompt, and the two arrows
 * either side of it. The box carries the player's name, so both are reached by
 * it rather than through the row they sit on.
 */
export function stagePoints(prompt: Locator, name: string): Locator {
  return prompt.getByRole("textbox", { name, exact: true });
}

/** The − / + either side of one player's box. */
export function stageArrow(
  prompt: Locator,
  name: string,
  direction: "moins" | "plus",
): Locator {
  return prompt.getByRole("button", { name: `${name} : un de ${direction}` });
}
