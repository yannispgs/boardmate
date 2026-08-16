"use client";

import type { Account, Role, RoleId } from "@/lib/domain";
import { AccountCard } from "./AccountCard";

/** Every account that can sign in, in the order the database sorted them. */
export function AccountCardList({
  accounts,
  roles,
  onAssign,
  onUnassign,
}: Readonly<{
  accounts: Account[];
  roles: Role[];
  onAssign?: (account: Account, roleId: RoleId) => void;
  onUnassign?: (account: Account, role: Role) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {accounts.map(account => (
        <AccountCard
          key={account.userId}
          account={account}
          roles={roles}
          onAssign={onAssign}
          onUnassign={onUnassign}
        />
      ))}
    </ul>
  );
}
