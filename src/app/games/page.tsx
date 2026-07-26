import type { Metadata } from "next";

import { GamesList } from "./_components/GamesList";

export const metadata: Metadata = {
  title: "Parties — Boardmate",
};

export default function GamesPage() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-2xl flex-col px-6">
      {/* The heading lives inside the list: the funnel sits in it and drives
          the same filter the list below is narrowed by. */}
      <GamesList />
    </main>
  );
}
