import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  BoardgameId,
  ExtensionId,
  FaqEntry,
  FaqEntryId,
  FaqEntryUpdate,
  FaqScope,
  NewFaqEntry,
} from "@/lib/domain";
import type { FaqRepository } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type FaqRow = Database["public"]["Tables"]["faq_entries"]["Row"];
type FaqWrite = Database["public"]["Tables"]["faq_entries"]["Update"];

/**
 * Reads the scope back out of the two nullable columns. A row with neither is
 * the Boardmate-level FAQ; the table's check constraint rules out both at once.
 */
function toScope(row: FaqRow): FaqScope {
  if (row.boardgame_id !== null) {
    return { kind: "boardgame", boardgameId: row.boardgame_id as BoardgameId };
  }

  if (row.extension_id !== null) {
    return { kind: "extension", extensionId: row.extension_id as ExtensionId };
  }

  return { kind: "app" };
}

/** The two columns a scope is stored in — always both, so an update is total. */
function scopeColumns(scope: FaqScope): {
  boardgame_id: string | null;
  extension_id: string | null;
} {
  return {
    boardgame_id: scope.kind === "boardgame" ? scope.boardgameId : null,
    extension_id: scope.kind === "extension" ? scope.extensionId : null,
  };
}

/** Maps a raw DB row to the domain `FaqEntry` (snake_case -> camelCase). */
export function toFaqEntry(row: FaqRow): FaqEntry {
  return {
    id: row.id as FaqEntryId,
    scope: toScope(row),
    question: row.question,
    answer: row.answer,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * Supabase-backed `FaqRepository`. The only place the Supabase SDK touches the
 * FAQ — swapping the backend means rewriting just this file.
 */
export function createFaqRepository(
  supabase: SupabaseClient<Database>,
): FaqRepository {
  const faq = () => supabase.from("faq_entries");

  return {
    async list() {
      const { data, error } = await faq()
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture de la FAQ: ${error.message}`);
      }

      return data.map(toFaqEntry);
    },

    async create(input: NewFaqEntry) {
      const { data, error } = await faq()
        .insert({
          ...scopeColumns(input.scope),
          question: input.question,
          answer: input.answer,
          sort_order: input.sortOrder ?? 0,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(`Ajout de la question: ${error.message}`);
      }

      return toFaqEntry(data);
    },

    async update(id: FaqEntryId, patch: FaqEntryUpdate) {
      const row: FaqWrite = {};
      if (patch.question !== undefined) {
        row.question = patch.question;
      }
      if (patch.answer !== undefined) {
        row.answer = patch.answer;
      }

      const { data, error } = await faq()
        .update(row)
        .eq("id", id)
        .select("*")
        .single();
      if (error) {
        throw new Error(`Mise à jour de la question: ${error.message}`);
      }

      return toFaqEntry(data);
    },

    async remove(id: FaqEntryId) {
      const { error } = await faq().delete().eq("id", id);
      /* c8 ignore next 3 -- defensive guard: a healthy delete doesn't error */
      if (error) {
        throw new Error(`Suppression de la question: ${error.message}`);
      }
    },

    async reorder(changes) {
      // One statement per entry: only the rows that moved are written, and a
      // reorder touches two of them in practice.
      await Promise.all(
        changes.map(async change => {
          const { error } = await faq()
            .update({ sort_order: change.sortOrder })
            .eq("id", change.id);
          /* c8 ignore next 3 -- defensive guard: a healthy update doesn't error */
          if (error) {
            throw new Error(`Réorganisation de la FAQ: ${error.message}`);
          }
        }),
      );
    },
  };
}
