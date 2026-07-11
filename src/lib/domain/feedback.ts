import type { FeedbackId } from "./ids";

/** One improvement idea dropped in the "Retours" box. */
export interface Feedback {
  id: FeedbackId;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
}

export interface NewFeedback {
  message: string;
}
