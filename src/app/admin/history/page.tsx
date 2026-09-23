import type { Metadata } from "next";

import { ScreenHeader } from "@/components/ScreenHeader";
import { getMyPermissions } from "@/lib/auth/permissions";
import { AuditHistory } from "./_components/AuditHistory";

export const metadata: Metadata = {
  title: "Historique — Boardmate",
};

export default async function AdminHistoryPage() {
  const permissions = await getMyPermissions();
  const mayRead = permissions.includes("audit.read");

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <ScreenHeader
        title="Historique"
        description="Qui a modifié quoi, quand, et ce que la ligne disait avant."
        backHref="/admin"
        backLabel="← Administration"
      />

      {/* Said in words rather than shown as an empty list. RLS returns no rows
          without the permission, so the screen would otherwise claim the
          application has never been modified — which is a lie, and the worst
          possible one to tell on this particular screen. */}
      {mayRead ? (
        <AuditHistory />
      ) : (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-800 dark:text-amber-200">
          Ton compte n&apos;a pas la permission « Consulter l&apos;historique
          des modifications ». Demande à un administrateur de te
          l&apos;attribuer.
        </p>
      )}
    </main>
  );
}
