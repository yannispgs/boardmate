"use client";

import { ErrorText } from "@/components/ErrorText";
import type { GameId } from "@/lib/domain";
import { EndedGame } from "./EndedGame";
import { PlayingGame } from "./PlayingGame";
import { usePlayGame } from "./use-play-game";

/**
 * The play screen: loads the game, then hands it over to whichever screen it
 * calls for — the game being played, or the recap of a finished one.
 */
export function PlayScreen({ gameId }: Readonly<{ gameId: GameId }>) {
  const play = usePlayGame(gameId);

  if (play.loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

  if (play.game === null) {
    return play.error === null ? (
      <p className="text-sm text-zinc-500">Partie introuvable.</p>
    ) : (
      <ErrorText message={play.error} />
    );
  }

  if (play.game.status === "ended") {
    return (
      <>
        {/* A party recorded from another phone while this one was still
            counting lands here mid-sentence: the recap is the right screen to
            show, but on its own it looks as though the button did nothing. */}
        <ErrorText message={play.error} />
        <EndedGame game={play.game} onReload={play.reload} />
      </>
    );
  }

  return <PlayingGame game={play.game} play={play} />;
}
