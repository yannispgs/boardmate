"use client";

import { useState } from "react";

import { ErrorText } from "@/components/ErrorText";
import { Modal } from "@/components/Modal";
import { ModalHeader } from "@/components/ModalHeader";
import { fieldClass, modalCardClass } from "@/components/ui";
import { useConfirm } from "@/components/use-confirm";
import {
  MAX_ROLE_DESCRIPTION,
  type Permission,
  permissionDiff,
  type Role,
  roleKeyFrom,
} from "@/lib/domain";
import { PermissionCardList } from "./PermissionCardList";
import { RoleChangeRecap } from "./RoleChangeRecap";

/** Long enough for a sentence-sized name, short enough to fit a card. */
const MAX_LABEL = 60;

/**
 * Composing a role: its name, and the boxes that decide what it hands out.
 * Nothing is written on a tick — « Enregistrer » first shows what changed, and
 * the confirmation is what saves.
 *
 * Mounted only while open, so the boxes always start from the role as it stands
 * rather than from whatever was ticked the last time it was opened.
 */
export function RoleEditor({
  role,
  permissions,
  takenKeys,
  saving,
  error,
  onSave,
  onClose,
}: Readonly<{
  /** The role being edited, or `null` when one is being created. */
  role: Role | null;
  permissions: Permission[];
  /** The keys the other roles already go by — the name has to be free. */
  takenKeys: string[];
  saving: boolean;
  error: string | null;
  onSave: (
    label: string,
    description: string | null,
    permissionKeys: string[],
  ) => void;
  onClose: () => void;
}>) {
  const [label, setLabel] = useState(role?.label ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [ticked, setTicked] = useState<string[]>(role?.permissionKeys ?? []);
  const { requestConfirm, confirmDialog } = useConfirm();

  const trimmed = label.trim();
  // An empty box means « no sentence », not « the empty sentence » — the column
  // is nullable and the card decides on `null`, not on the length.
  const explained = description.trim() === "" ? null : description.trim();
  const key = roleKeyFrom(trimmed);
  const before = role?.permissionKeys ?? [];
  const diff = permissionDiff(before, ticked, permissions);
  const renamed = trimmed !== (role?.label ?? "");
  const rewritten = explained !== (role?.description ?? null);
  const untouched =
    !renamed &&
    !rewritten &&
    diff.added.length === 0 &&
    diff.removed.length === 0;

  // Caught while typing rather than on the way back: at creation the key is
  // unique in the database and both cases end in the same opaque error, and a
  // rename onto a name already in use would pass — leaving two roles the grid
  // shows under the same word.
  let problem: string | null = null;

  if (trimmed !== "" && key === "") {
    problem = "Donne-lui un nom contenant des lettres ou des chiffres.";
  } else if (takenKeys.includes(key)) {
    problem = "Un rôle porte déjà ce nom.";
  }

  function toggle(permissionKey: string, checked: boolean) {
    setTicked(previous =>
      checked
        ? [...previous, permissionKey]
        : previous.filter(held => held !== permissionKey),
    );
  }

  function review() {
    requestConfirm({
      message:
        role === null
          ? `Créer le rôle « ${trimmed} » ?`
          : `Enregistrer les modifications du rôle « ${trimmed} » ?`,
      confirmLabel: "Enregistrer",
      details: (
        <RoleChangeRecap
          previousLabel={role?.label ?? null}
          label={trimmed}
          descriptionChanged={role !== null && rewritten}
          description={explained}
          diff={diff}
          permissions={permissions}
        />
      ),
      onConfirm: () => onSave(trimmed, explained, ticked),
    });
  }

  return (
    <>
      <Modal
        onClose={onClose}
        dismissable={false}
        label={role === null ? "Nouveau rôle" : "Modifier le rôle"}
        className={`${modalCardClass} max-w-lg`}
      >
        <ModalHeader
          title={role === null ? "Nouveau rôle" : "Modifier le rôle"}
          hint={
            role === null
              ? "Un nom, et ce qu'il donne le droit de faire."
              : role.key
          }
          onClose={onClose}
        />

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-[var(--background)] p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Nom du rôle</span>

            <input
              value={label}
              onChange={event => setLabel(event.target.value)}
              placeholder="Gestionnaire de la ludothèque"
              maxLength={MAX_LABEL}
              className={`${fieldClass} bg-white dark:bg-zinc-900`}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">Description</span>

              <span className="text-xs text-zinc-400 tabular-nums">
                {description.length} / {MAX_ROLE_DESCRIPTION}
              </span>
            </span>

            <textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="À quoi sert ce rôle, en une phrase."
              maxLength={MAX_ROLE_DESCRIPTION}
              rows={2}
              className={`${fieldClass} resize-none bg-white dark:bg-zinc-900`}
            />
          </label>

          {role?.isAdmin ? (
            <p className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3 text-sm text-indigo-800 dark:text-indigo-200">
              Rôle administrateur : il porte toutes les permissions, y compris
              celles ajoutées plus tard. Il n&apos;y a rien à cocher : seuls son
              nom et sa description se modifient ici.
            </p>
          ) : (
            <PermissionCardList
              permissions={permissions}
              headingBackground="bg-[var(--background)]"
              toggleFor={permission => ({
                checked: ticked.includes(permission.key),
                // The database refuses a billable permission on a role that is
                // not an administrator one; the box says so before the tap.
                locked: permission.billable,
                onChange: checked => toggle(permission.key, checked),
              })}
            />
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-black/10 p-4 dark:border-white/10">
          <ErrorText message={problem ?? error} />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/10 px-4 py-2 text-sm transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={review}
              disabled={
                saving || trimmed === "" || problem !== null || untouched
              }
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:opacity-60"
            >
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {confirmDialog}
    </>
  );
}
