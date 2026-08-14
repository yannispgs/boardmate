import type { Metadata } from "next";

import { ScreenHeader } from "@/components/ScreenHeader";
import { AccessManager } from "./_components/AccessManager";

export const metadata: Metadata = {
  title: "Administration — Boardmate",
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      <ScreenHeader
        title="Administration"
        description="Les permissions que l'application sait faire respecter, et les rôles qui les distribuent."
      />

      <AccessManager />
    </main>
  );
}
