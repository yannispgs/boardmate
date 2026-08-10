import { execSync } from "node:child_process";

export interface LocalSupabaseEnv {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

let cached: LocalSupabaseEnv | null = null;

/**
 * Connection details for the LOCAL Supabase stack (`supabase start`) — never a
 * hosted project. Prefers explicit env vars (set by CI); otherwise falls back
 * to `supabase status` so the suite "just works" locally after `supabase start`.
 */
export function localSupabaseEnv(): LocalSupabaseEnv {
  if (cached) {
    return cached;
  }

  const url = process.env.SUPABASE_URL ?? process.env.API_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
  if (url && anonKey && serviceRoleKey) {
    cached = { url, anonKey, serviceRoleKey };
    return cached;
  }

  let raw: string;
  try {
    raw = execSync("supabase status -o env", { encoding: "utf8" });
  } catch {
    throw new Error(
      "Local Supabase is not running. Run `supabase start` before the " +
        "integration suite (`yarn test:integration`).",
    );
  }
  const get = (key: string) =>
    new RegExp(String.raw`^${key}="?([^"\n]+)"?`, "m").exec(raw)?.[1];
  const parsed = {
    url: get("API_URL"),
    anonKey: get("ANON_KEY"),
    serviceRoleKey: get("SERVICE_ROLE_KEY"),
  };
  if (!parsed.url || !parsed.anonKey || !parsed.serviceRoleKey) {
    throw new Error(
      "Could not parse connection details from `supabase status -o env`.",
    );
  }
  cached = parsed as LocalSupabaseEnv;
  return cached;
}
