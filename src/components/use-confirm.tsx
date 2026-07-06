"use client";

import { useState } from "react";

import { ConfirmDialog, type ConfirmRequest } from "@/components/ConfirmDialog";

/**
 * Drives the in-app ConfirmDialog. Call `requestConfirm({ message, confirmLabel,
 * onConfirm })` to ask, and render `confirmDialog` once in the component.
 * Centralises the open/close + run-on-confirm wiring every manager repeated.
 */
export function useConfirm() {
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const confirmDialog = confirm ? (
    <ConfirmDialog
      message={confirm.message}
      confirmLabel={confirm.confirmLabel}
      onCancel={() => setConfirm(null)}
      onConfirm={() => {
        const run = confirm.onConfirm;
        setConfirm(null);
        run();
      }}
    />
  ) : null;

  return { requestConfirm: setConfirm, confirmDialog };
}
