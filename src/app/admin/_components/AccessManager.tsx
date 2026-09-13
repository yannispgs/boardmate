"use client";

import { useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import { ListState } from "@/components/ListState";
import { useConfirm } from "@/components/use-confirm";
import type { Role } from "@/lib/domain";
import { useAccess } from "@/lib/hooks/use-access";
import type { AccessTab } from "./AccessTabs";
import { AccessTabs } from "./AccessTabs";
import { AccountsPanel } from "./AccountsPanel";
import { PermissionCardList } from "./PermissionCardList";
import { RoleEditor } from "./RoleEditor";
import { RolesPanel } from "./RolesPanel";

/** The role being written: an existing one, or `"new"` for one being created. */
type Editing = Role | "new";

/**
 * The access model, read from three angles: the permission catalogue, the roles
 * that bundle it, and the accounts that wear them — and, for whoever holds the
 * rights to it, composing a role and handing it over right there.
 */
export function AccessManager() {
  const {
    permissions,
    roles,
    accounts,
    mine,
    loading,
    error,
    createRole,
    saveRole,
    removeRole,
    assignRole,
    unassignRole,
  } = useAccess();
  const [tab, setTab] = useState<AccessTab>("permissions");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState(false);
  // Two error slots, because they are read in two places: what the editor did
  // wrong belongs under the editor, what a tap on the list did wrong above it.
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { requestConfirm, confirmDialog } = useConfirm();

  // The lists come back empty rather than failing when the account lacks the
  // right — RLS filters, it does not shout. Saying so beats an empty screen
  // that looks like a bug.
  const mayReadRoles = mine.includes("roles.read");
  // Drawn only once the answer is known, and only when it is yes: offering two
  // tabs that lead to lists RLS returns empty is worse than not offering them.
  // While the permissions are still loading they stay up, so the ordinary case
  // — an account that does hold the right — never sees the bar move.
  const mayReadRestrictedTabs = loading || mayReadRoles;
  // The two tabs are not drawn at all, so nothing can be looking at them. This
  // keeps that true rather than trusting it: whatever `tab` holds, without the
  // right the only readable angle is the catalogue.
  const shown: AccessTab = mayReadRestrictedTabs ? tab : "permissions";
  // The buttons follow the permissions the account actually holds, so a control
  // is never offered for a write the database is about to refuse.
  const mayCreate = mine.includes("roles.create");
  const mayUpdate = mine.includes("roles.update");
  const mayDelete = mine.includes("roles.delete");
  const mayAssign = mine.includes("roles.assign");

  const edited = editing === "new" ? null : editing;
  const takenKeys = roles
    .filter(role => role.id !== edited?.id)
    .map(role => role.key);

  function open(next: Editing) {
    setFormError(null);
    setActionError(null);
    setEditing(next);
  }

  async function save(
    label: string,
    description: string | null,
    permissionKeys: string[],
  ) {
    setFormError(null);
    setSaving(true);

    try {
      if (edited === null) {
        await createRole(label, description, permissionKeys);
      } else {
        await saveRole(edited, label, description, permissionKeys);
      }

      setEditing(null);
    } catch {
      setFormError("Enregistrement impossible. Réessaie.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(role: Role) {
    setActionError(null);

    try {
      await removeRole(role);
    } catch {
      setActionError("Suppression impossible. Réessaie.");
    }
  }

  function confirmDelete(role: Role) {
    requestConfirm({
      message: `Supprimer le rôle « ${role.label} » ?`,
      confirmLabel: "Supprimer",
      onConfirm: () => remove(role),
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 pb-10">
      {mayReadRestrictedTabs ? (
        <AccessTabs shown={shown} onSelect={setTab} />
      ) : null}

      <ErrorText message={error ?? actionError} />

      {/* The guard behind the hidden tabs rather than a notice on the way in:
          the home screen already withholds the tile, so the only way to read
          this sentence is to have typed the address — or to be looking through
          a simulated role that took the right away. */}
      {!loading && !mayReadRoles ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
          Ton compte n&apos;a pas la permission « Consulter les rôles » : les
          onglets « Rôles » et « Comptes » ne te sont pas proposés. Demande à un
          administrateur de te l&apos;attribuer.
        </p>
      ) : null}

      {shown === "roles" && mayCreate ? (
        <button
          type="button"
          onClick={() => open("new")}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Nouveau rôle
        </button>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {shown === "permissions" ? (
          <ListState
            loading={loading}
            empty={permissions.length === 0}
            emptyLabel={<>Aucune permission.</>}
          >
            <PermissionCardList permissions={permissions} />
          </ListState>
        ) : null}

        {shown === "roles" ? (
          <RolesPanel
            roles={roles}
            permissions={permissions}
            loading={loading}
            maySimulate={mayReadRoles}
            onEdit={mayUpdate ? open : undefined}
            onDelete={mayDelete ? confirmDelete : undefined}
          />
        ) : null}

        {shown === "accounts" ? (
          <AccountsPanel
            accounts={accounts}
            roles={roles}
            loading={loading}
            mayAssign={mayAssign}
            onAssign={assignRole}
            onUnassign={unassignRole}
          />
        ) : null}
      </div>

      {editing === null ? null : (
        <RoleEditor
          role={edited}
          permissions={permissions}
          takenKeys={takenKeys}
          saving={saving}
          error={formError}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDialog}
    </div>
  );
}
