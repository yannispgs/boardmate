/**
 * How many modals and drawers are open right now, as a store the whole app can
 * read. Overlays are scattered (a sheet inside the play block, a drawer
 * portalled onto the body), so a screen that needs to know one is up — the play
 * screen, which must not black itself out while somebody is reading the FAQ —
 * has no React tree to find it in. Counting rather than flagging, because two
 * can be up at once and the second closing must not clear the first.
 */

let count = 0;
const listeners = new Set<() => void>();

/**
 * Declares an overlay open and returns the release. Calling the release twice
 * is a no-op: React can run an effect cleanup more than once, and a double
 * decrement would leave the count below zero for good.
 */
export function registerOverlay(): () => void {
  count += 1;
  notify();

  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    count -= 1;
    notify();
  };
}

/** How many overlays are open. */
export function openOverlayCount(): number {
  return count;
}

/** Subscribes to open/close, returning the unsubscribe. */
export function subscribeOverlays(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}
