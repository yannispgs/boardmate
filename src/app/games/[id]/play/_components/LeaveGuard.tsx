"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Asks before leaving the page while this phone is counting the points: a
 * stray tap on the tab bar would otherwise throw away a sheet half filled in,
 * and give the form back to the table as it went.
 *
 * Links inside the app get the app's own dialog, and so does the back button
 * (the browser's, Android's, the iPhone's swipe): a page may not hold it back,
 * so the guard lays a spare entry of this same page on top of the history for
 * it to spend, and asks. Once the form is given back, a press spends the spare
 * entry and carries on, as if it had never been there. Reloading or closing the tab gets the browser's own
 * dialog, which is the only one a page may show at that moment.
 */
export function LeaveGuard({
  active,
  onLeave,
}: Readonly<{
  active: boolean;
  /** Gives the form back before the page goes. */
  onLeave: () => Promise<void>;
}>) {
  const router = useRouter();
  const [target, setTarget] = useState<Exit | null>(null);
  // Read by the history listener, which lives as long as the screen does.
  const guarding = useRef(active);
  // The spare entry is on top of the history.
  const spare = useRef(false);
  // The player has chosen to go: whatever the history does next is theirs.
  const leaving = useRef(false);

  guarding.current = active;

  useEffect(() => {
    // No address: the same page, one step deeper, for the back button to spend.
    // Laid once and left there: the hold may flicker as the phones agree on
    // it, and the history must not follow every flicker.
    if (active && !spare.current) {
      window.history.pushState(SPARE, "");
      spare.current = true;
    }
  }, [active]);

  useEffect(() => {
    const onPopState = () => {
      if (leaving.current || !spare.current) {
        return;
      }

      if (guarding.current) {
        // Spent: laid again, and the player asked.
        window.history.pushState(SPARE, "");
        setTarget(BACK);
      } else {
        // The form given back meanwhile: the press goes on where it was going.
        spare.current = false;
        window.history.back();
      }
    };

    window.addEventListener("popstate", onPopState);

    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }

    // Capture, on the document: it runs before the app's own link handling,
    // which would otherwise navigate before anything could ask.
    const onClick = (event: MouseEvent) => {
      const href = leavingHref(event);

      if (href === null) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setTarget({ href });
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active]);

  if (!active || target === null) {
    return null;
  }

  return (
    <ConfirmDialog
      message="Tu es en train de compter les points. Quitter la page ?"
      warning="Les scores saisis seront perdus, et un autre joueur pourra reprendre le comptage."
      confirmLabel="Quitter"
      onConfirm={() => {
        leaving.current = true;
        setTarget(null);
        void onLeave().finally(() => {
          if (target === BACK) {
            // Back past the spare entry and this page's own.
            window.history.go(-2);
          } else {
            // The link takes the spare entry's place, so back from there
            // lands on this page, once.
            router.replace(target.href);
          }
        });
      }}
      onCancel={() => setTarget(null)}
    />
  );
}

/** The spare history entry, told apart from the app's own. */
const SPARE = { boardmateLeaveGuard: true };

const BACK = "back";

/** Where the player was going: back, or down a link. */
type Exit = typeof BACK | { href: string };

/**
 * Where a click would take the page, when it leaves it: a plain click on a
 * link to another address. A modified click opens a new tab and leaves this one
 * — and its form — where they are.
 */
function leavingHref(event: MouseEvent): string | null {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return null;
  }

  const link = (event.target as Element | null)?.closest?.("a[href]");

  if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") {
    return null;
  }

  const url = new URL(link.href, window.location.href);

  if (url.origin !== window.location.origin) {
    return null;
  }

  const here = window.location.pathname + window.location.search;
  const there = url.pathname + url.search;

  return there === here ? null : there + url.hash;
}
