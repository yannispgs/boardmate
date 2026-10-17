"use client";

import Link from "next/link";

import { CheckIcon, HexIcon, PlusIcon, WheelIcon } from "@/components/icons";
import type { GameListItem } from "@/lib/domain";
import { ongoingSummaries, recentSummaries } from "@/lib/game/home-summary";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { useGames } from "@/lib/hooks/use-games";
import { useMyPermissions } from "@/lib/hooks/use-my-permissions";

import { HomeSection } from "./HomeSection";
import type { HomeTileItem } from "./HomeTile";
import { HomeTileList } from "./HomeTileList";
import { OngoingGameCardList } from "./OngoingGameCardList";
import { RecentGameCardList } from "./RecentGameCardList";

const TILE_ICON = "h-5 w-5";
const RECENT = 3;

const NEW_GAME: HomeTileItem = {
  href: "/games/new",
  label: "Nouvelle partie",
  icon: <PlusIcon className={TILE_ICON} />,
  tone: "play",
};
const FINISHED_GAME: HomeTileItem = {
  href: "/games/finished",
  label: "Partie terminée",
  icon: <CheckIcon className={TILE_ICON} />,
  tone: "play",
};
const TOOLS: readonly HomeTileItem[] = [
  {
    href: "/tools/wheel",
    label: "Roue de la chance",
    icon: <WheelIcon className={TILE_ICON} />,
    tone: "tool",
  },
  {
    href: "/tools/board-generator",
    label: "Générer un plateau",
    icon: <HexIcon className={TILE_ICON} />,
    tone: "tool",
  },
];

function shortDay(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

/**
 * The home page: the games still on the table first, then what to start, the
 * last games played, and the tools at the foot of the page — always there, in
 * the same place. The main sections are not repeated here: the tab bar holds
 * them on every screen.
 */
export function HomeDashboard() {
  const { games, endedGames, loading } = useGames();
  const { boardgames } = useBoardgames();
  const { can } = useMyPermissions();

  const boardgameOf = (game: GameListItem) =>
    boardgames.find(b => b.id === game.boardgameId);
  const ongoing = ongoingSummaries(games, boardgameOf);
  const recent = recentSummaries(endedGames, boardgameOf, RECENT, shortDay);
  const canCreate = can("games.create");

  // Nothing is said about the table before it has been read: an empty « Aucune
  // partie en cours » flashing up on every visit would be a lie half the time.
  const idle = !loading && ongoing.length === 0;
  const playTiles = [
    ...(canCreate && ongoing.length > 0 ? [NEW_GAME] : []),
    ...(canCreate ? [FINISHED_GAME] : []),
  ];

  return (
    <div className="flex flex-1 flex-col gap-6">
      {ongoing.length > 0 ? (
        <HomeSection title={`En cours · ${ongoing.length}`}>
          <OngoingGameCardList games={ongoing} />
        </HomeSection>
      ) : null}

      {idle ? (
        <section className="flex flex-col gap-3 rounded-2xl bg-indigo-600 p-4 text-white">
          <div className="flex flex-col gap-0.5">
            <span className="text-lg font-semibold">
              Aucune partie en cours
            </span>
            <span className="text-sm text-indigo-100">
              On lance la soirée ?
            </span>
          </div>
          {canCreate ? (
            <Link
              href="/games/new"
              className="flex h-12 items-center justify-center gap-1.5 rounded-xl bg-white font-semibold text-indigo-900 transition hover:bg-indigo-50"
            >
              <PlusIcon className="h-4 w-4" />
              Nouvelle partie
            </Link>
          ) : null}
        </section>
      ) : null}

      {playTiles.length > 0 ? (
        <HomeSection title="Jouer">
          <HomeTileList tiles={playTiles} />
        </HomeSection>
      ) : null}

      {recent.length > 0 ? (
        <HomeSection title="Dernières parties" seeAll="/games">
          <RecentGameCardList games={recent} />
        </HomeSection>
      ) : null}

      <HomeSection title="Outils" className="mt-auto">
        <HomeTileList tiles={TOOLS} />
      </HomeSection>
    </div>
  );
}
