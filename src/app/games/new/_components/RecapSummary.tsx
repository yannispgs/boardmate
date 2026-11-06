"use client";

import { SummaryList, SummaryRow } from "@/components/SummaryList";
import type { Config, Player } from "@/lib/domain";
import { FirstPlayerDraw } from "../../_components/FirstPlayerDraw";

/**
 * What the funnel already knows about the game being started — the game, the
 * configuration, who plays and in which order — plus the wheel that shuffles
 * that order. Read-only: everything here is changed by going back a step.
 *
 * The order and its wheel only show on a game that hands the turn round. The
 * seats are still recorded on the others — they order the score sheet — but
 * naming a first player there would name somebody the game never moves off.
 */
export function RecapSummary({
  boardgameName,
  config,
  players,
  ordered,
  onDrawFirstPlayer,
}: Readonly<{
  boardgameName: string;
  config: Config | null;
  players: Player[];
  /**
   * Whether the game hands the turn from one player to the next. When it does
   * not, there is no order to number and no first player to draw.
   */
  ordered: boolean;
  onDrawFirstPlayer: () => void;
}>) {
  const seated = ordered
    ? players.map((p, i) => `${i + 1}. ${p.name}`).join(" · ")
    : players.map(p => p.name).join(", ");

  return (
    <>
      <SummaryList>
        <SummaryRow label="Jeu">{boardgameName}</SummaryRow>
        <SummaryRow label="Configuration">
          {config ? config.name : "Configuration par défaut"}
        </SummaryRow>
        <SummaryRow label="Joueurs">{seated}</SummaryRow>
      </SummaryList>

      {ordered && players.length >= 2 ? (
        <FirstPlayerDraw name={players[0]?.name} onDraw={onDrawFirstPlayer} />
      ) : null}
    </>
  );
}
