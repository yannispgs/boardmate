import { localStack } from "./local-env";

/**
 * The local Supabase stack catches outgoing email in **Mailpit** (the
 * connection URL is still exposed as `INBUCKET_URL` for historical reasons).
 * These helpers read the login OTP straight out of the catcher, so the e2e
 * login flow exercises the real email round-trip without a real inbox.
 */

interface MailpitSummary {
  ID: string;
  Created: string;
}

interface MailpitSearch {
  messages: MailpitSummary[];
}

interface MailpitMessage {
  Text: string;
  HTML: string;
}

const POLL_INTERVAL_MS = 250;
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * Polls Mailpit until a login email addressed to `email` arrives, then returns
 * the 6–10 digit OTP it contains ("Alternatively, enter the code: 123456").
 */
export async function waitForLoginCode(
  email: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<string> {
  const { inbucketUrl } = localStack();
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const id = await latestMessageId(inbucketUrl, email);
    if (id) {
      const code = await extractCode(inbucketUrl, id);
      if (code) {
        return code;
      }
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(`No login code for ${email} within ${timeoutMs}ms`);
}

async function latestMessageId(
  base: string,
  email: string,
): Promise<string | null> {
  const query = encodeURIComponent(`to:${email}`);
  const res = await fetch(`${base}/api/v1/search?query=${query}`);
  if (!res.ok) {
    return null;
  }

  const body = (await res.json()) as MailpitSearch;
  const sorted = [...body.messages].sort((a, b) =>
    b.Created.localeCompare(a.Created),
  );

  return sorted[0]?.ID ?? null;
}

async function extractCode(base: string, id: string): Promise<string | null> {
  const res = await fetch(`${base}/api/v1/message/${id}`);
  if (!res.ok) {
    return null;
  }

  const message = (await res.json()) as MailpitMessage;
  const source = `${message.Text}\n${message.HTML}`;
  const match = /enter the code:\s*(\d{6,10})/i.exec(source);

  return match?.[1] ?? null;
}

/**
 * Whether the catcher holds anything at all for `email`. Only worth asserting
 * once something *else* has been received in the meantime — an absence read too
 * early only says the mail has not arrived yet.
 */
export async function hasMailFor(email: string): Promise<boolean> {
  const { inbucketUrl } = localStack();

  return (await latestMessageId(inbucketUrl, email)) !== null;
}

/** Empties the mail catcher so a previous run's codes can't be mistaken. */
export async function clearMailbox(): Promise<void> {
  const { inbucketUrl } = localStack();
  await fetch(`${inbucketUrl}/api/v1/messages`, { method: "DELETE" });
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
