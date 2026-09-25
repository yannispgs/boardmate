import type { Metadata } from "next";

import { ScreenHeader } from "@/components/ScreenHeader";
import { AccessManager } from "./_components/AccessManager";
import { accessTabFromParam } from "./_components/access-tab";

export const metadata: Metadata = {
  title: "Administration — Boardmate",
};

/**
 * `?onglet=<tab>` opens the screen straight on that tab — how a simulated view
 * hands back to the Rôles tab it was started from. The tab stays subject to the
 * account's rights: without `roles.read` it falls back to the catalogue.
 */
export default async function AdminPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ onglet?: string }>;
}>) {
  const { onglet } = await searchParams;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <ScreenHeader
        title="Administration"
        description="Les permissions que l'application sait faire respecter, et les rôles qui les distribuent."
      />

      <AccessManager initialTab={accessTabFromParam(onglet)} />
    </main>
  );
}
