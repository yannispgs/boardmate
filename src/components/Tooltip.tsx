import type { ReactNode } from "react";

/**
 * A small hover tooltip: wraps an inline trigger and shows `label` in a dark
 * rounded bubble above it on hover. `label` is a ReactNode, so it can be plain
 * text or rich content (e.g. a list with one item emphasised). Pure CSS.
 */
export function Tooltip({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="group relative inline-flex cursor-help">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-pre rounded-md bg-zinc-900 px-2 py-1 text-left text-xs font-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-zinc-700"
      >
        {label}
      </span>
    </span>
  );
}
