import Link from "next/link";
import type { ReactNode } from "react";

const TAB_CLASS =
  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition";

function tone(active: boolean): string {
  return active
    ? "font-semibold text-indigo-600 dark:text-indigo-400"
    : "font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200";
}

/** One slot of the tab bar: a section, or the button that opens « Plus ». */
export function BottomNavTab({
  label,
  icon,
  active,
  href,
  onClick,
}: Readonly<{
  label: string;
  icon: ReactNode;
  active: boolean;
  /** Where the tab goes; without it the tab is a button calling `onClick`. */
  href?: string;
  onClick?: () => void;
}>) {
  if (href === undefined) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${TAB_CLASS} ${tone(active)}`}
      >
        {icon}
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${TAB_CLASS} ${tone(active)}`}
    >
      {icon}
      {label}
    </Link>
  );
}
