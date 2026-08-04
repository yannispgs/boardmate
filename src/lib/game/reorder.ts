/**
 * Moving one item of a hand-authored list up or down. Used by the scoresheet
 * editor, where the order of the fields is the order they are asked for at the
 * end of a game — so it has to be changeable without deleting and retyping the
 * ones below. Pure: no vendor types, unit-tested.
 */

/** Which way a `↑` / `↓` control moves the item it sits on. */
export type MoveDirection = "up" | "down";

/**
 * `items` with the one at `index` swapped with its neighbour in `direction`.
 * Returns the list untouched (same reference) when the move would fall off
 * either end, or when `index` names nothing — so a caller can hand the result
 * straight to `onChange` without checking first.
 */
export function moveItem<T>(
  items: T[],
  index: number,
  direction: MoveDirection,
): T[] {
  const target = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || index >= items.length) {
    return items;
  }

  if (target < 0 || target >= items.length) {
    return items;
  }

  const moved = [...items];
  [moved[index], moved[target]] = [moved[target], moved[index]];

  return moved;
}
