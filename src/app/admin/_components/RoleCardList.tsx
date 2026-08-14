"use client";

import type { Permission, Role } from "@/lib/domain";
import { RoleCard } from "./RoleCard";

/** Every role, administrators first — they are the ones you check on. */
export function RoleCardList({
  roles,
  permissions,
  onEdit,
  onDelete,
}: Readonly<{
  roles: Role[];
  permissions: Permission[];
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {roles.map(role => (
        <RoleCard
          key={role.id}
          role={role}
          permissions={permissions}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
