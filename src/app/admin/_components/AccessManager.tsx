"use client";

import { useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import { ListState } from "@/components/ListState";
import { TabButton, tabBarClass } from "@/components/TabButton";
import { useAccess } from "@/lib/hooks/use-access";
import { PermissionCardList } from "./PermissionCardList";
import { RoleCardList } from "./RoleCardList";

type Tab = "permissions" | "roles";

/**
 * The read side of the access model: the permission catalogue on one tab, the
 * roles that bundle it on the other. Composing a role lands next; this screen
 * is what the owner reads before deciding what to compose.
 */
export function AccessManager() {
  const { permissions, roles, mine, loading, error } = useAccess();
  const [tab, setTab] = useState<Tab>("permissions");

  // The lists come back empty rather than failing when the account lacks the
  // right — RLS filters, it does not shout. Saying so beats an empty screen
  // that looks like a bug.
  const mayReadRoles = mine.includes("roles.read");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-10">
      <div className={tabBarClass}>
        <TabButton
          active={tab === "permissions"}
          onClick={() => setTab("permissions")}
        >
          Permissions
        </TabButton>
        <TabButton active={tab === "roles"} onClick={() => setTab("roles")}>
          Rôles
        </TabButton>
      </div>

      <ErrorText message={error} />

      {!loading && !mayReadRoles ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
          Ton compte n&apos;a pas la permission « Consulter les rôles » : la
          liste des rôles reste vide. Demande à un administrateur de te
          l&apos;attribuer.
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "permissions" ? (
          <ListState
            loading={loading}
            empty={permissions.length === 0}
            emptyLabel={<>Aucune permission.</>}
          >
            <PermissionCardList permissions={permissions} roles={roles} />
          </ListState>
        ) : (
          <ListState
            loading={loading}
            empty={roles.length === 0}
            emptyLabel={<>Aucun rôle visible.</>}
          >
            <RoleCardList roles={roles} permissions={permissions} />
          </ListState>
        )}
      </div>
    </div>
  );
}
