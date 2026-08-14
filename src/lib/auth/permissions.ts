import { createClient } from "@/lib/supabase/server";

/**
 * The permissions of the signed-in account, read on the server so a Server
 * Component can decide what to put on screen at all.
 *
 * This is comfort, not the gate: the RLS policies decide what the account may
 * actually touch, and they run whether or not this list was consulted. Hiding a
 * link is a courtesy to the reader, never a defence.
 */
export async function getMyPermissions(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_permissions");

  if (error) {
    return [];
  }

  return data;
}
