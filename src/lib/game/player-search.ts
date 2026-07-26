/**
 * Finding a player by name in a list that has grown past scrolling. Matching is
 * a plain "contains", not a prefix: half the time what you remember of a name
 * is its middle.
 */

/**
 * The form two names are compared in: no case, no accents. Typing `amelie`
 * has to find « Amélie » — nobody reaches for the accent keys to search, and a
 * search that answers nothing to a correctly-spelt-but-unaccented name reads as
 * broken.
 */
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Whether `name` holds `query` anywhere. An empty query matches everything. */
export function matchesSearch(name: string, query: string): boolean {
  const needle = normalizeSearch(query.trim());

  if (needle === "") {
    return true;
  }

  return normalizeSearch(name).includes(needle);
}

/** The named things whose name holds the query, in the order they came in. */
export function searchByName<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  return items.filter(item => matchesSearch(item.name, query));
}
