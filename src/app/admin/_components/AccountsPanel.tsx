"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { ListState } from "@/components/ListState";
import { useConfirm } from "@/components/use-confirm";
import type { Account, Role, RoleId, UserId } from "@/lib/domain";
import { AccountCardList } from "./AccountCardList";

/**
 * The « Comptes » tab: who can sign in, what each of them wears, and — for
 * whoever may hand a role out — the means to change that.
 *
 * It keeps its own confirmation and its own error line rather than borrowing
 * the manager's: taking rights back from somebody is the one move on this
 * screen that touches a person, and it reads better answered where it is made.
 */
export function AccountsPanel({
  accounts,
  roles,
  loading,
  mayAssign,
  onAssign,
  onUnassign,
}: Readonly<{
  accounts: Account[];
  roles: Role[];
  loading: boolean;
  /** `roles.assign`. Without it the whole tab is read-only. */
  mayAssign: boolean;
  onAssign: (userId: UserId, roleId: RoleId) => Promise<void>;
  onUnassign: (userId: UserId, roleId: RoleId) => Promise<void>;
}>) {
  const [error, setError] = useState<string | null>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  async function hand(account: Account, roleId: RoleId) {
    setError(null);

    try {
      await onAssign(account.userId, roleId);
    } catch {
      setError("Attribution impossible. Réessaie.");
    }
  }

  async function takeBack(account: Account, role: Role) {
    setError(null);

    try {
      await onUnassign(account.userId, role.id);
    } catch {
      setError("Retrait impossible. Réessaie.");
    }
  }

  // Confirmed, unlike handing one over: this is the rights somebody was using
  // a minute ago, and a mistap should not be what takes them away.
  function confirmUnassign(account: Account, role: Role) {
    requestConfirm({
      message: `Retirer le rôle « ${role.label} » à ${account.email} ?`,
      confirmLabel: "Retirer",
      onConfirm: () => takeBack(account, role),
    });
  }

  return (
    <>
      <ErrorText message={error} />

      <ListState
        loading={loading}
        empty={accounts.length === 0}
        emptyLabel={<>Aucun compte visible.</>}
      >
        <AccountCardList
          accounts={accounts}
          roles={roles}
          onAssign={mayAssign ? hand : undefined}
          onUnassign={mayAssign ? confirmUnassign : undefined}
        />
      </ListState>

      {confirmDialog}
    </>
  );
}
