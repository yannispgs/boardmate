import type { Metadata } from "next";

import { tabFromParam } from "@/lib/game/games-tab";

import { GamesList } from "./_components/GamesList";

export const metadata: Metadata = {
  title: "Parties — Boardmate",
};

/**
 * `?vue=terminees` opens the screen straight on the history — where « Tout
 * voir » on the home page leads, and where coming back from a finished game
 * lands.
 */
export default async function GamesPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ vue?: string | string[] }>;
}>) {
  const { vue } = await searchParams;

  return (
    <main className="mx-auto flex h-screen-nav w-full max-w-2xl flex-col px-6">
      {/* The heading lives inside the list: the funnel sits in it and drives
          the same filter the list below is narrowed by. */}
      <GamesList initialTab={tabFromParam(vue)} />
    </main>
  );
}
