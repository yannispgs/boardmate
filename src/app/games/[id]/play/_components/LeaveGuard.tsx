"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/**
 * Asks before leaving the page while this phone is counting the points: a
 * stray tap on the tab bar would otherwise throw away a sheet half filled in,
 * and give the form back to the table as it went.
 *
 * Links inside the app get the app's own dialog; reloading or closing the tab
 * gets the browser's, which is the only one a page may show at that moment.
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
  const [target, setTarget] = useState<string | null>(null);

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
      setTarget(href);
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
        setTarget(null);
        void onLeave().finally(() => router.push(target));
      }}
      onCancel={() => setTarget(null)}
    />
  );
}

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
