import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HelpIcon } from "@/components/icons";
import { iconLabelButtonClass } from "@/components/ui";
import type { BoardgameId } from "@/lib/domain";
import { createBoardgameRepository } from "@/lib/supabase/repositories/boardgames";
import { createClient } from "@/lib/supabase/server";
import {
  BoardgameBackLink,
  GamesBackLink,
} from "./_components/BoardgameBackLink";
import { BoardgameTabs } from "./_components/BoardgameTabs";

/**
 * One game's own page. Its facets — configuration, extensions, records — used
 * to be six side doors on a row of the games list, which on a phone left no
 * room for the game's own name. They are tabs of a single place now, so the
 * list only has to say which game you mean.
 *
 * The FAQ is not one of them: it is read, not administered, so it stays where
 * it lives and is reached from the corner of the header.
 */
export default async function BoardgameLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}>) {
  const { id } = await params;

  // Named server-side, from the repository adapter: the header says which game
  // these tabs belong to before anything else has loaded.
  const supabase = await createClient();
  const boardgame = await createBoardgameRepository(supabase)
    .get(id as BoardgameId)
    .catch(() => null);

  if (boardgame === null) {
    notFound();
  }

  return (
    // Wider than the other screens: the scenario editor lives under the
    // extensions tab and needs the room for its map. The header keeps its own
    // column so the tabs stay above what they open.
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex max-w-2xl flex-col gap-3">
        {/* The origin travels in the query string, which a layout is never
            given — so the link that reads it is a client one, and the plain way
            back stands in until it has. */}
        <Suspense fallback={<GamesBackLink />}>
          <BoardgameBackLink />
        </Suspense>

        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-3xl font-semibold tracking-tight">
            {boardgame.name}
          </h1>
          {/* A question mark and the word, not the ⓘ: that one is the mark of
              a note about the page, so it was read as a tooltip rather than as
              the door to the game's questions. Same icon as the FAQ panel
              opened in a game. */}
          <Link href={`/faq?jeu=${id}`} className={iconLabelButtonClass}>
            <HelpIcon />
            FAQ
          </Link>
        </div>

        <BoardgameTabs boardgameId={id} />
      </header>

      {children}
    </main>
  );
}
