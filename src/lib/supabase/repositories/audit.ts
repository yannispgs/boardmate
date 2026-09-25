import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AuditAction,
  AuditChannel,
  AuditEntry,
  UserId,
} from "@/lib/domain";
import type { AuditRepository } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type AuditRow = Database["public"]["Tables"]["audit_log"]["Row"];

/** How many entries one page holds. */
const PAGE_SIZE = 100;

/**
 * A stored row as an object, or nothing. The column is `jsonb` and the trigger
 * only ever writes a row into it, so anything else means somebody wrote there
 * by hand — which the history should show as absent rather than crash on.
 */
function toRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    occurredAt: row.occurred_at,
    tableName: row.table_name,
    recordId: row.record_id,
    recordLabel: row.record_label,
    // Both are constrained by a check constraint, so the columns can't hold
    // anything else.
    action: row.action as AuditAction,
    channel: row.channel as AuditChannel,
    actorId: row.actor_id as UserId | null,
    actorEmail: row.actor_email,
    actorRoles: row.actor_roles,
    simulated: row.simulated,
    // Kept as text: a transaction id is a `bigint` and is only ever compared
    // for equality, so rounding it into a JavaScript number would buy nothing
    // and could lose it.
    txId: String(row.tx_id),
    oldValue: toRecord(row.old_value),
    newValue: toRecord(row.new_value),
    changedKeys: row.changed_keys ?? [],
  };
}

/**
 * Supabase-backed `AuditRepository`. Reads only — the table has no insert,
 * update or delete policy for anybody, and the triggers write it from inside
 * the database.
 *
 * An account without `audit.read` gets an empty list rather than an error: RLS
 * filters, it does not shout. The screen is what says so, in words.
 */
export function createAuditRepository(
  supabase: SupabaseClient<Database>,
): AuditRepository {
  return {
    async list(options) {
      let query = supabase
        .from("audit_log")
        .select("*")
        .order("id", { ascending: false })
        .limit(options?.limit ?? PAGE_SIZE);

      // Paged on the id and not on an offset: the table is append-only, so a
      // cursor can never skip or repeat a line the way an offset does when
      // something lands between two pages.
      if (options?.before !== undefined) {
        query = query.lt("id", options.before);
      }

      const { data, error } = await query;
      /* c8 ignore next 3 -- defensive guard: a healthy select doesn't error */
      if (error) {
        throw new Error(`Lecture de l'historique: ${error.message}`);
      }

      return data.map(toEntry);
    },
  };
}
