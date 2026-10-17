"use client";

import { signOut } from "@/lib/auth/actions";

import { Drawer } from "./Drawer";
import { HelpIcon, MessageIcon, ShieldIcon, UsersIcon } from "./icons";
import { MoreSheetLink } from "./MoreSheetLink";

const ICON = "h-5 w-5 text-zinc-600 dark:text-zinc-300";

/**
 * What « Plus » opens: the sections that are not worth a slot of their own in
 * the tab bar, then the account — who is signed in, the version, signing out.
 */
export function MoreSheet({
  open,
  onClose,
  email,
  canAdmin,
  version,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  email: string;
  /** Whether the administration screen is offered (`roles.read`). */
  canAdmin: boolean;
  version: string;
}>) {
  return (
    <Drawer open={open} onClose={onClose} label="Plus" side="bottom">
      <div className="flex flex-col gap-4 px-4 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <span className="h-1 w-10 self-center rounded-full bg-zinc-300 dark:bg-zinc-700" />

        <nav className="flex flex-col overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
          <MoreSheetLink
            href="/players"
            label="Joueurs"
            icon={<UsersIcon className={ICON} />}
            onNavigate={onClose}
          />
          <MoreSheetLink
            href="/faq"
            label="FAQ"
            icon={<HelpIcon className={ICON} />}
            onNavigate={onClose}
          />
          <MoreSheetLink
            href="/feedback"
            label="Retours"
            icon={<MessageIcon className={ICON} />}
            onNavigate={onClose}
          />
          {canAdmin ? (
            <MoreSheetLink
              href="/admin"
              label="Administration"
              icon={<ShieldIcon className={ICON} />}
              onNavigate={onClose}
            />
          ) : null}
        </nav>

        <div className="flex items-center gap-3 px-1">
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{email}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {version}
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-black/15 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-black/5 dark:border-white/15 dark:text-rose-400 dark:hover:bg-white/5"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </Drawer>
  );
}
