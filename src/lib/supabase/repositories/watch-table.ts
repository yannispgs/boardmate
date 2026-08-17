import type { SupabaseClient } from "@supabase/supabase-js";

import type { Unsubscribe } from "@/lib/repositories/types";
import type { Database } from "@/lib/supabase/database.types";

type TableName = keyof Database["public"]["Tables"];

/**
 * How many channels have been opened so far, so each one gets a topic of its
 * own. Realtime refuses a second `postgres_changes` listener on an already
 * joined channel, and the SDK hands back the *same* channel for the same topic
 * — so two screens watching the same table would throw. A screen showing a
 * finished game does exactly that: it follows the game and reads the record
 * books, both off `games`.
 */
let opened = 0;

/**
 * Follows every change on a table and calls back on each one, until the
 * returned function is called. One channel per caller, never shared.
 */
/* c8 ignore start -- Realtime channel glue, exercised via e2e/manual */
export function watchTable(
  supabase: SupabaseClient<Database>,
  table: TableName,
  onChange: () => void,
): Unsubscribe {
  opened += 1;
  const channel = supabase
    .channel(`public:${table}#${opened}`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => {
      onChange();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
/* c8 ignore stop */
