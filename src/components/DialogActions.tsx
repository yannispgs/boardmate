/**
 * The two buttons a dialog closes on: « Annuler », and the one that does what
 * it was opened for — disabled while what is entered can't be recorded.
 */
export function DialogActions({
  confirmLabel = "Valider",
  disabled = false,
  onConfirm,
  onCancel,
}: Readonly<{
  confirmLabel?: string;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  return (
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
        disabled={disabled}
        onClick={onConfirm}
        className="rounded-lg bg-indigo-600 px-4 py-2 font-medium text-sm text-white transition hover:bg-indigo-500 disabled:opacity-60"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
