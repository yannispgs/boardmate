"use client";

import { useSyncExternalStore } from "react";

import { openOverlayCount, subscribeOverlays } from "@/lib/ui/overlay-registry";

/**
 * Whether any modal or drawer is open, anywhere on the screen. Server render
 * says no: overlays only ever open from a click.
 */
export function useOverlaysOpen(): boolean {
  const count = useSyncExternalStore(
    subscribeOverlays,
    openOverlayCount,
    () => 0,
  );

  return count > 0;
}
