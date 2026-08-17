import type { FeedbackId } from "./ids";

/**
 * Where a retour stands. There is no "shipped" stage: a retour is deleted once
 * its PR reaches production, so the box only ever holds what is still owed —
 * and the refusals, kept on purpose so the same idea isn't filed twice.
 *
 * Set out of band (management API, during the review); the app displays it and
 * never writes it, which is why `feedback` still has no update policy.
 */
export type FeedbackStatus =
  | "new"
  | "accepted"
  | "refused"
  | "development"
  | "approval";

/** One improvement idea dropped in the "Retours" box. */
export interface Feedback {
  id: FeedbackId;
  message: string;
  status: FeedbackStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface NewFeedback {
  message: string;
}
