import type { Metadata } from "next";

import { PlayersManager } from "./_components/PlayersManager";

export const metadata: Metadata = {
  title: "Joueurs — Boardmate",
};

export default function PlayersPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      {/* The heading lives inside the manager: the magnifying glass sits in it
          and drives the same search the list below is narrowed by. */}
      <PlayersManager />
    </main>
  );
}
