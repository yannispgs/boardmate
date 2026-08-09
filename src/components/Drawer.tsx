"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * A panel that slides in from the right over a dimmed backdrop, dismissed by a
 * backdrop click or Escape. It stays mounted (translated off-screen when
 * closed) so both opening and closing animate; when closed the whole overlay is
 * click-through so it never traps the page underneath. `label` names the dialog.
 */
export function Drawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label?: string;
  children: ReactNode;
}) {
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
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`absolute right-0 top-0 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white shadow-xl transition-transform duration-300 dark:bg-zinc-900 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
