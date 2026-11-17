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

/**
 * The selection with the entry `from` taken out and set down at `to`, the
 * others closing up behind it and making room ahead of it — a seat dragged
 * along the table. Ids not in the list leave it as it was.
 */
export function moved<T>(list: readonly T[], from: T, to: T): T[] {
  const start = list.indexOf(from);
  const end = list.indexOf(to);

  if (start === -1 || end === -1) {
    return [...list];
  }

  const next = list.filter(x => x !== from);

  next.splice(end, 0, from);

  return next;
}
