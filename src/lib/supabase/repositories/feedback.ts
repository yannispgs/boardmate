import type { SupabaseClient } from "@supabase/supabase-js";

import type { Feedback, FeedbackId, NewFeedback } from "@/lib/domain";
import type { FeedbackRepository } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type FeedbackRow = Database["public"]["Tables"]["feedback"]["Row"];

function toFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id as FeedbackId,
    message: row.message,
    createdAt: row.created_at,
  };
}

/**
 * Supabase-backed `FeedbackRepository`. The only place the Supabase SDK touches
 * the feedback box — swapping the backend means rewriting just this file.
 */
export function createFeedbackRepository(
  supabase: SupabaseClient<Database>,
): FeedbackRepository {
  const feedback = () => supabase.from("feedback");

  return {
    async list() {
      const { data, error } = await feedback()
        .select("*")
        .order("created_at", { ascending: false });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture des retours: ${error.message}`);
      }

      return data.map(toFeedback);
    },

    async create(input: NewFeedback) {
      const { data, error } = await feedback()
        .insert({ message: input.message })
        .select("*")
        .single();
      if (error) {
        throw new Error(`Envoi du retour: ${error.message}`);
      }

      return toFeedback(data);
    },
  };
}
