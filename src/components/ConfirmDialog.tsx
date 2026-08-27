"use client";

import { Modal } from "@/components/Modal";
import { modalCardClass } from "@/components/ui";

/**
 * In-app confirmation modal. Replaces `window.confirm`, which browsers suppress
 * after repeated use (causing silent no-op bugs). Drive it from a `confirm`
 * state shaped like `ConfirmRequest`.
 */

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  /**
   * A consequence the reader would not have guessed from the message, shown in
   * amber under it. For what the confirmation *costs* beyond the obvious —
   * something that will be closed, lost or made unreachable by pressing. Not a
   * second sentence of explanation: colouring the ordinary would leave nothing
   * to colour when it matters.
   */
  warning?: string;
  /**
   * What the confirmation is worth reading alongside — a preparation list, a
   * recap of what is about to be created. Scrolls on its own, so a long one
   * never pushes the buttons off the screen.
   */
  details?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  message,
  confirmLabel,
  warning,
  details,
  onConfirm,
  onCancel,
}: Readonly<{
  message: string;
  confirmLabel: string;
  warning?: string;
  details?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
    <Modal onClose={onCancel} className={`${modalCardClass} max-w-sm p-5`}>
      <p className="whitespace-pre-line text-sm">{message}</p>

      {warning === undefined ? null : (
        <p className="mt-3 whitespace-pre-line text-sm font-medium text-amber-600 dark:text-amber-400">
          {warning}
        </p>
      )}

      {details ? (
        <div className="-mx-1 mt-4 min-h-0 flex-1 overflow-y-auto px-1">
          {details}
        </div>
      ) : null}

      <div className="mt-5 flex shrink-0 justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
