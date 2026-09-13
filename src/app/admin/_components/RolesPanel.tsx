"use client";

import { ListState } from "@/components/ListState";
import type { Permission, Role } from "@/lib/domain";
import { RoleCardList } from "./RoleCardList";
import { RoleSimulationPanel } from "./RoleSimulationPanel";

/**
 * The « Rôles » tab: what each role bundles, and the way into looking through
 * one.
 *
 * A sibling of `AccountsPanel` rather than markup left inline, so the manager
 * arbitrates between three angles instead of also drawing one of them.
 *
 * An omitted handler draws no button: the account holds no permission for that
 * write, and offering it would only earn a refusal from the database.
 */
export function RolesPanel({
  roles,
  permissions,
  loading,
  maySimulate,
  onEdit,
  onDelete,
}: Readonly<{
  roles: Role[];
  permissions: Permission[];
  loading: boolean;
  /** `roles.read`. Without it there is no list to look through a role at. */
  maySimulate: boolean;
  onEdit?: (role: Role) => void;
  onDelete?: (role: Role) => void;
}>) {
  return (
    <div className="flex flex-col gap-4">
      {/* Above the list on purpose: it is the answer to the question the grid
          raises — « et concrètement, il voit quoi ? ». */}
      {maySimulate ? <RoleSimulationPanel roles={roles} /> : null}

      <ListState
        loading={loading}
        empty={roles.length === 0}
        emptyLabel={<>Aucun rôle visible.</>}
      >
        <RoleCardList
          roles={roles}
          permissions={permissions}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </ListState>
    </div>
  );
}
