import { serviceClient } from "./client";

/**
 * Pre-flight check: fail the whole run fast (with a clear message) if the local
 * Supabase stack isn't reachable, instead of every test failing obscurely.
 */
export default async function setup(): Promise<void> {
  const { error } = await serviceClient().from("players").select("id").limit(1);
  if (error) {
    throw new Error(
      `Cannot reach local Supabase (${error.message}). ` +
        "Run `supabase start` before the integration suite.",
    );
  }
}
