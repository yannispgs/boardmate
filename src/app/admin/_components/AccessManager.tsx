"use client";

import { useState } from "react";
import { ErrorText } from "@/components/ErrorText";
import { ListState } from "@/components/ListState";
import { TabButton, tabBarClass } from "@/components/TabButton";
import { useConfirm } from "@/components/use-confirm";
import type { Role } from "@/lib/domain";
import { useAccess } from "@/lib/hooks/use-access";
import { PermissionCardList } from "./PermissionCardList";
import { RoleCardList } from "./RoleCardList";
import { RoleEditor } from "./RoleEditor";

type Tab = "permissions" | "roles";

/** The role being written: an existing one, or `"new"` for one being created. */
type Editing = Role | "new";

/**
 * The access model: the permission catalogue on one tab, the roles that bundle
 * it on the other — and, for whoever holds the rights to it, composing those
 * roles right there.
 */
export function AccessManager() {
  const {
    permissions,
    roles,
    mine,
    loading,
    error,
    createRole,
    saveRole,
    removeRole,
  } = useAccess();
  const [tab, setTab] = useState<Tab>("permissions");
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
  // The buttons follow the permissions the account actually holds, so a control
  // is never offered for a write the database is about to refuse.
  const mayCreate = mine.includes("roles.create");
  const mayUpdate = mine.includes("roles.update");
  const mayDelete = mine.includes("roles.delete");

  const edited = editing === "new" ? null : editing;
  const takenKeys = roles
    .filter(role => role.id !== edited?.id)
    .map(role => role.key);

  function open(next: Editing) {
    setFormError(null);
    setActionError(null);
    setEditing(next);
  }

  async function save(label: string, permissionKeys: string[]) {
    setFormError(null);
    setSaving(true);

    try {
      if (edited === null) {
        await createRole(label, permissionKeys);
      } else {
        await saveRole(edited, label, permissionKeys);
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

      <ErrorText message={error ?? actionError} />

      {!loading && !mayReadRoles ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
          Ton compte n&apos;a pas la permission « Consulter les rôles » : la
          liste des rôles reste vide. Demande à un administrateur de te
          l&apos;attribuer.
        </p>
      ) : null}

      {tab === "roles" && mayCreate ? (
        <button
          type="button"
          onClick={() => open("new")}
          className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Nouveau rôle
        </button>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "permissions" ? (
          <ListState
            loading={loading}
            empty={permissions.length === 0}
            emptyLabel={<>Aucune permission.</>}
          >
            <PermissionCardList permissions={permissions} />
          </ListState>
        ) : (
          <ListState
            loading={loading}
            empty={roles.length === 0}
            emptyLabel={<>Aucun rôle visible.</>}
          >
            <RoleCardList
              roles={roles}
              permissions={permissions}
              onEdit={mayUpdate ? open : undefined}
              onDelete={mayDelete ? confirmDelete : undefined}
            />
          </ListState>
        )}
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
