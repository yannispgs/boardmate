"use client";

import { SummaryList, SummaryRow } from "@/components/SummaryList";
import type { FieldSpec, PopulatedGame } from "@/lib/domain";
import { configRecap } from "@/lib/game/config-recap";
import { tracksPlayerTurns } from "@/lib/game/turn-time";

/**
 * Everything the next deal inherits from the one that just ended, laid out to be
 * read inside the confirmation that deals it.
 *
 * ⚠️ This list has one job: to be **true to {@link chainedGame}**. Every row is
 * something that module actually carries over — the game, the configuration and
 * its attributes, the players in their seats, the active extensions, the
 * evening. Nothing is listed because it would be reassuring to see, and anything
 * that stops being carried has to stop being printed here in the same commit.
 *
 * The seats are the reason a recap earns its place at all: chaining asks nothing
 * and changes nothing, so the one thing a table cannot check by looking at the
 * screen it is on is what the *next* party will be set up with.
 */
export function ChainRecap({
  game,
  fields,
  loading,
}: Readonly<{
  game: PopulatedGame;
  fields: readonly FieldSpec[];
  /**
   * Whether the attributes are still being fetched. Said out loud rather than
   * rendered as an empty list: « no attributes » and « not known yet » look the
   * same on screen and mean opposite things, and this recap is read to be
   * trusted.
   */
  loading: boolean;
}>) {
  const ordered = tracksPlayerTurns(game.boardgame);
  // Read off the seat order rather than the array's, which is the order the
  // query happened to return — the same sort `chainedGame` seats them by.
  const seated = [...game.players].sort((a, b) => {
    return a.seatOrder - b.seatOrder;
  });
  const names = ordered
    ? seated.map((p, i) => {
        return `${i + 1}. ${p.player.name}`;
      })
    : seated.map(p => {
        return p.player.name;
      });
  const attributes = configRecap(fields, game.configValues);

  return (
    <div className="flex flex-col gap-3 text-left">
      <SummaryList>
        <SummaryRow label="Jeu">{game.boardgame.name}</SummaryRow>
        <SummaryRow label="Configuration">
          {game.config ? game.config.name : "Configuration par défaut"}
        </SummaryRow>
        <SummaryRow label={ordered ? "Joueurs et ordre" : "Joueurs"}>
          {names.join(ordered ? " · " : ", ")}
        </SummaryRow>

        {game.extensions.length > 0 ? (
          <SummaryRow label="Extensions">
            {game.extensions
              .map(e => {
                return e.name;
              })
              .join(", ")}
          </SummaryRow>
        ) : null}

        <SummaryRow label="Soirée">
          La même, la partie s&apos;y ajoute
        </SummaryRow>
      </SummaryList>

      {loading ? (
        <SummaryList>
          <SummaryRow label="Attributs">Chargement…</SummaryRow>
        </SummaryList>
      ) : null}

      {!loading && attributes.length > 0 ? (
        <SummaryList>
          {attributes.map(line => {
            return (
              <SummaryRow key={line.key} label={line.label}>
                {line.value}
              </SummaryRow>
            );
          })}
        </SummaryList>
      ) : null}
    </div>
  );
}
