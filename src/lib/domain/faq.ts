import type { BoardgameId, ExtensionId, FaqEntryId } from "./ids";

/**
 * What a question is about. Three scopes, one shape, so a search can run over
 * all of them at once:
 * - `app`: Boardmate itself (« comment ajouter une partie déjà jouée ? ») ;
 * - `boardgame`: the rules of a game ;
 * - `extension`: the rules an extension adds — read in a played game only when
 *   that extension is active on it.
 */
export type FaqScope =
  | { kind: "app" }
  | { kind: "boardgame"; boardgameId: BoardgameId }
  | { kind: "extension"; extensionId: ExtensionId };

/** One question and its answer, at one scope. */
export interface FaqEntry {
  id: FaqEntryId;
  scope: FaqScope;
  question: string;
  /**
   * The answer, **plain text**. It is authored by one user and read by the
   * others, so it is never rendered as HTML or Markdown (stored XSS, OWASP
   * A03) — line breaks are kept with `whitespace-pre-wrap`, nothing more.
   */
  answer: string;
  /** Reading order inside the scope, lowest first. */
  sortOrder: number;
  createdAt: string;
}

export interface NewFaqEntry {
  scope: FaqScope;
  question: string;
  answer: string;
  sortOrder?: number;
}

/**
 * What editing a question may change: its wording, not where it sits. The scope
 * is fixed at creation (delete and re-add to move a question to another game),
 * and the reading order has its own path — `reorder`, which has to renumber
 * several entries at once to mean anything.
 */
export type FaqEntryUpdate = Partial<Pick<FaqEntry, "question" | "answer">>;
