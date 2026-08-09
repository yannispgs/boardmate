/**
 * Reading and organising the FAQ. The whole FAQ is small enough to be loaded
 * once and worked on in memory, which is what makes searching across all three
 * scopes at once a one-liner rather than three queries.
 */

import type {
  BoardgameId,
  ExtensionId,
  FaqEntry,
  FaqScope,
} from "@/lib/domain";
import { normalizeSearch } from "@/lib/game/player-search";

/**
 * A scope as one comparable string — `app`, `boardgame:<id>`, `extension:<id>`.
 * Used to group and to key; never stored (the columns are the storage).
 */
export function scopeKey(scope: FaqScope): string {
  if (scope.kind === "boardgame") {
    return `boardgame:${scope.boardgameId}`;
  }

  if (scope.kind === "extension") {
    return `extension:${scope.extensionId}`;
  }

  return "app";
}

/** Whether two scopes are the same one. */
export function sameScope(a: FaqScope, b: FaqScope): boolean {
  return scopeKey(a) === scopeKey(b);
}

/** The entries of one scope, in reading order. */
export function entriesInScope(
  entries: FaqEntry[],
  scope: FaqScope,
): FaqEntry[] {
  return entries
    .filter(e => sameScope(e.scope, scope))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * The entries whose question **or** answer holds the query, accent- and
 * case-insensitively — the answer counts because half the time what is
 * remembered is a word of the rule, not how the question was phrased. An empty
 * query matches everything, so the caller can pass it straight through.
 */
export function searchFaq(entries: FaqEntry[], query: string): FaqEntry[] {
  const needle = normalizeSearch(query.trim());

  if (needle === "") {
    return entries;
  }

  return entries.filter(e =>
    normalizeSearch(`${e.question} ${e.answer}`).includes(needle),
  );
}

/**
 * Search results split back into the sections they came from, each in reading
 * order. Scopes appear in the order their first match does, so what matched
 * best-known first stays at the top instead of being reshuffled by an order the
 * reader never chose.
 */
export function groupByScope(
  entries: FaqEntry[],
): Array<{ scope: FaqScope; entries: FaqEntry[] }> {
  const groups = new Map<string, { scope: FaqScope; entries: FaqEntry[] }>();

  for (const entry of entries) {
    const key = scopeKey(entry.scope);
    const group = groups.get(key);

    if (group) {
      group.entries.push(entry);
    } else {
      groups.set(key, { scope: entry.scope, entries: [entry] });
    }
  }

  return [...groups.values()].map(group => ({
    scope: group.scope,
    entries: [...group.entries].sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

/** Anything a scope can be named after — a boardgame or an extension. */
interface Named {
  id: BoardgameId | ExtensionId;
  name: string;
}

/**
 * What a section of the FAQ is called on screen. The app-level scope is named
 * after the app itself; the others borrow the name of what they document, and
 * fall back on a neutral word rather than an id if it has since been deleted.
 */
export function scopeLabel(
  scope: FaqScope,
  boardgames: Named[],
  extensions: Named[],
): string {
  if (scope.kind === "boardgame") {
    return boardgames.find(b => b.id === scope.boardgameId)?.name ?? "Jeu";
  }

  if (scope.kind === "extension") {
    return (
      extensions.find(e => e.id === scope.extensionId)?.name ?? "Extension"
    );
  }

  return "Boardmate";
}

/**
 * The sections a played game reads: its own questions first, then those of each
 * extension **on the table**. An extension documents rules that only exist when
 * it is in play, so the caller passes the game's extensions and only those.
 *
 * Sections with nothing in them are dropped: mid-game, a heading with no
 * question under it is one more thing to scroll past.
 */
export function gameFaqSections(
  entries: FaqEntry[],
  boardgameId: BoardgameId,
  extensionIds: ExtensionId[],
): Array<{ scope: FaqScope; entries: FaqEntry[] }> {
  const scopes: FaqScope[] = [
    { kind: "boardgame", boardgameId },
    ...extensionIds.map(extensionId => ({
      kind: "extension" as const,
      extensionId,
    })),
  ];

  return scopes
    .map(scope => ({ scope, entries: entriesInScope(entries, scope) }))
    .filter(section => section.entries.length > 0);
}

/** What the database hands out as an id, and the only shape trusted as one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The section a link asked to open — `/faq?jeu=<id>` from a game — or the
 * Boardmate one by default. The value comes from the URL, where anyone can type
 * anything, so it is only read as an id when it has the shape of one; anything
 * else opens the app's own section rather than a game that cannot exist.
 */
export function scopeFromParam(value: string | undefined): FaqScope {
  if (value !== undefined && UUID.test(value)) {
    // The brand is asserted here rather than in an adapter: this *is* the
    // boundary the id enters through, and it has just been checked.
    return { kind: "boardgame", boardgameId: value as BoardgameId };
  }

  return { kind: "app" };
}

/**
 * What stands in for the list when it has nothing to show: nothing written
 * anywhere, a search nobody answers, or a section still to be filled. Shared by
 * the FAQ screen and the panel opened in a game, which are empty for the same
 * reasons and should say so in the same words.
 */
export function faqEmptyMessage(
  written: number,
  found: number,
  query: string,
  label: string,
): string | null {
  if (found > 0) {
    return null;
  }

  if (written === 0) {
    return "Aucune question pour l'instant.";
  }

  if (query.trim() !== "") {
    return `Aucune question ne correspond à « ${query} ».`;
  }

  return `Aucune question pour « ${label} » pour l'instant.`;
}

/** Where a new question lands: at the end of its scope. */
export function nextSortOrder(entries: FaqEntry[], scope: FaqScope): number {
  const orders = entriesInScope(entries, scope).map(e => e.sortOrder);

  return orders.length === 0 ? 0 : Math.max(...orders) + 1;
}

/** One entry's new place in the reading order, as it must be persisted. */
export interface FaqOrderChange {
  id: FaqEntry["id"];
  sortOrder: number;
}

/**
 * Moves one entry up or down inside its scope and returns **every** entry whose
 * order changed. Renumbering the whole scope from 0 rather than swapping two
 * values keeps the sequence gap-free, so a list authored before this existed
 * (all zeroes) sorts as it is shown from the first move on.
 *
 * An entry already at the end it is being pushed towards changes nothing.
 */
export function moveEntry(
  entries: FaqEntry[],
  id: FaqEntry["id"],
  direction: "up" | "down",
): FaqOrderChange[] {
  const entry = entries.find(e => e.id === id);

  if (!entry) {
    return [];
  }

  const ordered = entriesInScope(entries, entry.scope);
  const from = ordered.findIndex(e => e.id === id);
  const to = direction === "up" ? from - 1 : from + 1;

  if (to < 0 || to >= ordered.length) {
    return [];
  }

  const moved = [...ordered];
  const [taken] = moved.splice(from, 1);
  moved.splice(to, 0, taken);

  const changes: FaqOrderChange[] = [];

  for (const [index, e] of moved.entries()) {
    if (e.sortOrder !== index) {
      changes.push({ id: e.id, sortOrder: index });
    }
  }

  return changes;
}
