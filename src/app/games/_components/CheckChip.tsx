import type { ReactNode } from "react";

/**
 * A box ticked on one player's line at the end of a manche — « Phase 4
 * réalisée » on Phase 10, « Jeton Sécurité » on Luz. A whole button rather than
 * a bare checkbox, so a thumb finds it round a table.
 */
export function CheckChip({
  checked,
  disabled,
  onChange,
  children,
}: Readonly<{
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition ${
        checked
          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-black/10 text-zinc-600 hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
      }`}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
          checked
            ? "border-emerald-500 bg-emerald-500 text-white"
            : "border-zinc-400"
        }`}
      >
        {checked ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3 w-3"
            aria-hidden="true"
          >
            <path d="M4 12.5 9.5 18 20 6" />
          </svg>
        ) : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
