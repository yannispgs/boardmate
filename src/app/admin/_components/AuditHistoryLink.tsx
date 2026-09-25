"use client";

import Link from "next/link";

import { ChevronRightIcon, HistoryIcon } from "@/components/icons";

/**
 * The way into the modification history.
 *
 * A link and not a fourth tab: the history is a screen of its own, with its own
 * filters and its own paging, and four pills of equal width no longer fit
 * across a phone.
 *
 * Drawn only for an account that holds the key — the screen behind it answers
 * to the same permission, so offering it otherwise leads to a refusal notice.
 */
export function AuditHistoryLink({ shown }: Readonly<{ shown: boolean }>) {
  if (!shown) {
    return null;
  }

  return (
    <Link
      href="/admin/history"
      className="flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-medium transition hover:bg-black/5 dark:border-white/10 dark:bg-zinc-900 dark:hover:bg-white/5"
    >
      <HistoryIcon />
      <span className="flex-1">Historique des modifications</span>
      <ChevronRightIcon />
    </Link>
  );
}
