"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Which edge a drawer lives on. The play screen reads them as a rule rather
 * than a decoration: **right is what every game has** (the score, the live
 * stats, the FAQ), **left is what only the game on the table has** (Terraforming
 * Mars' milestones). Three buttons had already stacked up on the right edge
 * before the rule was written down.
 */
export type DrawerSide = "left" | "right";

const SIDE = {
  right: { edge: "right-0", away: "translate-x-full" },
  left: { edge: "left-0", away: "-translate-x-full" },
} as const;

/**
 * A panel that slides in from one edge over a dimmed backdrop, dismissed by a
 * backdrop click or Escape. It stays mounted (translated off-screen when
 * closed) so both opening and closing animate; when closed the whole overlay is
 * click-through so it never traps the page underneath. `label` names the dialog.
 */
export function Drawer({
  open,
  onClose,
  label,
  side = "right",
  children,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  label?: string;
  /** Which edge it slides in from — see {@link DrawerSide}. */
  side?: DrawerSide;
  children: ReactNode;
}>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!mounted) {
    return null;
  }

  // A closed drawer stays in the DOM — that is what animates it back out, and
  // the backdrop has to stay mounted to fade away with it — but while it sits
  // there it must announce nothing at all: the play screen now carries two
  // drawers (the scores and the FAQ), so every name they hold, the screen holds
  // twice, closed or not. `inert` keeps the tab order out of an off-screen
  // panel, and hiding the whole overlay is what stops it being found by name.
  return createPortal(
    <div
      inert={!open}
      aria-hidden={!open || undefined}
      className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className={`absolute inset-0 cursor-default bg-black/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Same call as Modal: accessibility is out of scope, so this stays a div
          with the dialog role rather than a <dialog>. */}
      <div // NOSONAR
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute top-0 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-300 dark:bg-zinc-900 ${
          SIDE[side].edge
        } ${open ? "translate-x-0" : SIDE[side].away}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
