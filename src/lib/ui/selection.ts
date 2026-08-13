/**
 * Multi-select lists, as every checkbox row in the app builds them: tapping an
 * entry adds it, tapping it again takes it back out.
 *
 * Pure: no vendor types, unit-tested.
 */

/**
 * The selection with `id` taken out if it was there, appended if it wasn't.
 * Appended rather than inserted: several lists here are read in the order they
 * were picked (the players' seats, the winners of a shared victory).
 */
export function toggled<T>(list: readonly T[], id: T): T[] {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}
