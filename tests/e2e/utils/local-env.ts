import { execSync } from "node:child_process";

export interface LocalStack {
  /** REST/Auth base URL of the local Supabase stack. */
  url: string;
  anonKey: string;
  /** Service-role key — used only to seed/clean e2e fixtures, never in the app. */
  serviceRoleKey: string;
  /** Inbucket (mail catcher) base URL, where login OTP emails land. */
  inbucketUrl: string;
}

let cached: LocalStack | null = null;

/**
 * Connection details for the LOCAL Supabase stack (`supabase start`) — never a
 * hosted project, mirroring the integration suite. Prefers explicit env vars
 * (set by CI) and otherwise falls back to `supabase status` so the e2e suite
 * "just works" locally after `supabase start`.
 */
export function localStack(): LocalStack {
  if (cached) {
    return cached;
  }

  const fromEnv = readFromEnv();
  if (fromEnv) {
    cached = fromEnv;
    return cached;
  }

  let raw: string;
  try {
    raw = execSync("supabase status -o env", { encoding: "utf8" });
  } catch {
    throw new Error(
      "Local Supabase is not running. Run `supabase start` before the e2e " +
        "suite (`yarn test:e2e`).",
    );
  }

  const get = (key: string) =>
    raw.match(new RegExp(`^${key}="?([^"\\n]+)"?`, "m"))?.[1];
  const parsed = {
    url: get("API_URL"),
    anonKey: get("ANON_KEY"),
    serviceRoleKey: get("SERVICE_ROLE_KEY"),
    inbucketUrl: get("INBUCKET_URL"),
  };
  if (
    !parsed.url ||
    !parsed.anonKey ||
    !parsed.serviceRoleKey ||
    !parsed.inbucketUrl
  ) {
    throw new Error(
      "Could not parse connection details from `supabase status -o env`.",
    );
  }

  cached = parsed as LocalStack;
  return cached;
}

function readFromEnv(): LocalStack | null {
  const url = process.env.SUPABASE_URL ?? process.env.API_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.ANON_KEY;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY;
  const inbucketUrl = process.env.INBUCKET_URL;

  if (url && anonKey && serviceRoleKey && inbucketUrl) {
    return { url, anonKey, serviceRoleKey, inbucketUrl };
  }

  return null;
}
