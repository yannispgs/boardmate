import { expect, type Locator } from "@playwright/test";

/**
 * Picks `points` on the points wheel shown inside `scope`, the way a thumb
 * would — a value every 40 pixels, the wheel's first at the top — then
 * validates it.
 */
export async function pickOnWheel(
  scope: Locator,
  points: number,
): Promise<void> {
  const wanted = String(points);

  await scope.getByRole("listbox", { name: "Points" }).evaluate((el, value) => {
    const options = [...el.querySelectorAll('[role="option"]')];
    const index = options.findIndex(o => o.textContent === value);

    el.scrollTop = index * 40;
  }, wanted);
  await expect(
    scope.getByRole("option", { name: wanted, exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await scope.getByRole("button", { name: "Valider" }).click();
}
