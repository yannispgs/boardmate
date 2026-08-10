"use client";

/**
 * One button of a segmented tab bar (the pill row used by the stats explorer
 * and the extensions browser). Wrap a row of them in
 * `<div className={tabBarClass}>`; the active one is raised, the others stay
 * muted.
 */
export function TabButton({
  active,
  onClick,
  children,
}: Readonly<{
  active: boolean;
  onClick: () => void;
  children: string;
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition ${
        active
          ? "bg-white text-indigo-700 shadow-sm dark:bg-zinc-700 dark:text-indigo-300"
          : "text-zinc-500 dark:text-zinc-400"
      }`}
    >
      {children}
    </button>
  );
}

/** The container of a `TabButton` row. */
export const tabBarClass =
  "flex gap-1 rounded-xl border border-black/10 bg-black/[0.03] p-1 dark:border-white/10 dark:bg-white/[0.03]";
