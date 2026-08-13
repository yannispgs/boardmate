"use client";

import type { Permission, Role } from "@/lib/domain";
import { RoleCard } from "./RoleCard";

/** Every role, administrators first — they are the ones you check on. */
export function RoleCardList({
  roles,
  permissions,
}: Readonly<{ roles: Role[]; permissions: Permission[] }>) {
  return (
    <ul className="flex flex-col gap-2">
      {roles.map(role => (
        <RoleCard key={role.id} role={role} permissions={permissions} />
      ))}
    </ul>
  );
}
