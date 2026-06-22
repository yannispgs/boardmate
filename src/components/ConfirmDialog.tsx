"use client";

/**
 * In-app confirmation modal. Replaces `window.confirm`, which browsers suppress
 * after repeated use (causing silent no-op bugs). Drive it from a `confirm`
 * state shaped like `ConfirmRequest`.
 */

export interface ConfirmRequest {
  message: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-900">
        <p className="whitespace-pre-line text-sm">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
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
      </div>
    </div>
  );
}
