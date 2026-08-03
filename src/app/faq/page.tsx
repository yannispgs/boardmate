import type { Metadata } from "next";

import { scopeFromParam } from "@/lib/game/faq";
import { FaqManager } from "./_components/FaqManager";

export const metadata: Metadata = {
  title: "FAQ — Boardmate",
};

/**
 * `?jeu=<id>` opens the screen straight on that game's questions — how the FAQ
 * is reached from a game in the library, rather than through the chips.
 */
export default async function FaqPage({
  searchParams,
}: {
  searchParams: Promise<{ jeu?: string }>;
}) {
  const { jeu } = await searchParams;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      {/* The heading lives inside the manager: the magnifying glass sits in it
          and searches every game's questions at once, not just the open one. */}
      <FaqManager initialScope={scopeFromParam(jeu)} />
    </main>
  );
}
