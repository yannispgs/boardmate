const KEY = "boardmate.device";

/**
 * This phone's name for the duration of a tab: who holds a party's score form
 * is a phone, not an account, since two phones signed in on the same account
 * are still two people with a pen.
 *
 * Kept in the tab's session storage so that reloading the page is still the
 * same phone — the hold it took is still its own — while another tab, or
 * another phone, is somebody else.
 */
export function deviceId(): string {
  if (typeof sessionStorage === "undefined") {
    return crypto.randomUUID();
  }

  const known = sessionStorage.getItem(KEY);

  if (known) {
    return known;
  }

  const fresh = crypto.randomUUID();
  sessionStorage.setItem(KEY, fresh);

  return fresh;
}
