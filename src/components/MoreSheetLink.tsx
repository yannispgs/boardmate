import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRightIcon } from "./icons";

/** One section behind « Plus », as a full-width row. */
export function MoreSheetLink({
  href,
  label,
  icon,
  onNavigate,
}: Readonly<{
  href: string;
  label: string;
  icon: ReactNode;
  onNavigate: () => void;
}>) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex min-h-13 items-center gap-3 border-black/5 border-b px-4 text-[15px] font-medium transition last:border-b-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <ChevronRightIcon className="h-4 w-4 text-zinc-400" />
    </Link>
  );
}
