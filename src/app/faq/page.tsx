import type { Metadata } from "next";

import { FaqManager } from "./_components/FaqManager";

export const metadata: Metadata = {
  title: "FAQ — Boardmate",
};

export default function FaqPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      {/* The heading lives inside the manager: the magnifying glass sits in it
          and searches every game's questions at once, not just the open one. */}
      <FaqManager />
    </main>
  );
}
