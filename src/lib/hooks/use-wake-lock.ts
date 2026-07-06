"use client";

import { useEffect } from "react";

/**
 * Holds a screen wake lock while `active`, so the phone doesn't auto-lock during
 * a running turn (and lets it sleep again once paused / between screens, to save
 * battery). The browser drops the lock whenever the page is hidden, so we
 * re-acquire it when the page comes back to the foreground. No-op where the Wake
 * Lock API is unavailable (best-effort). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (
      !active ||
      typeof navigator === "undefined" ||
      !("wakeLock" in navigator)
    ) {
      return;
    }

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Denied (e.g. low battery) or unsupported — nothing we can do.
      }
    };

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === "visible") {
        acquire();
      }
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release();
    };
  }, [active]);
}
