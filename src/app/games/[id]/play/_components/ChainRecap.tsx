"use client";

import { SummaryList, SummaryRow } from "@/components/SummaryList";
import type { FieldSpec, PlayerId, PopulatedGame } from "@/lib/domain";
import { chainedSeats } from "@/lib/game/chained-game";
import { configRecap } from "@/lib/game/config-recap";
import { tracksPlayerTurns } from "@/lib/game/turn-time";
import { FirstPlayerDraw } from "../../../_components/FirstPlayerDraw";

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
  leader,
  onDrawFirstPlayer,
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
  /** Who the table drew to start the next party, if it did. */
  leader: PlayerId | null;
  onDrawFirstPlayer: () => void;
}>) {
  const ordered = tracksPlayerTurns(game.boardgame);
  const seated = chainedSeats(game.players, leader);
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

      {ordered && seated.length >= 2 ? (
        <FirstPlayerDraw
          name={seated[0]?.player.name}
          onDraw={onDrawFirstPlayer}
        />
      ) : null}

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
