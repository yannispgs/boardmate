"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import { Drawer } from "@/components/Drawer";
import { ExtensionBadgeList } from "@/components/games/ExtensionBadgeList";
import type { PopulatedGame } from "@/lib/domain";
import { playedExtensions } from "@/lib/game/extensions";
import type { RecapScope } from "@/lib/game/player-recap";
import { hasComparablePast } from "@/lib/game/player-recap";
import { worldRecordOf } from "@/lib/game/score-records";
import { formatNames } from "@/lib/game/tie-break";
import { hasPlayStats } from "@/lib/game/turn-time";
import { usePlayerRecaps } from "@/lib/hooks/use-player-recaps";
import { useRecordsOfGame } from "@/lib/hooks/use-score-records";
import { useSpeedRecord } from "@/lib/hooks/use-speed-record";

import { ChainPartyButton } from "./ChainPartyButton";
import { EndRecapTabs } from "./EndRecapTabs";
import { EndScorePanel } from "./EndScorePanel";
import { GameStats } from "./GameStats";
import { PlayerRecapSection } from "./PlayerRecapSection";
import { ScoreRecordBanner } from "./ScoreRecordBanner";
import { SessionFacts } from "./SessionFacts";
import { SpeedRecordBanner } from "./SpeedRecordBanner";
import { useSessionGames } from "./use-session-games";

/**
 * Who won, under the "Partie terminée !" heading: the whole table on a
 * cooperative game, otherwise the winner — or several names when no tie-break
 * rule separated them (a shared victory).
 */
/** The banner emoji: a trophy when someone won, joy or defeat in co-op. */
function outcomeEmoji(coop: boolean, coopWon: boolean): string {
  if (!coop) {
    return "🏆";
  }

  return coopWon ? "🎉" : "😔";
}

function Outcome({
  coop,
  coopWon,
  names,
  score,
  shared,
}: Readonly<{
  coop: boolean;
  coopWon: boolean;
  names: string;
  score: number | null;
  shared: boolean;
}>) {
  if (coop) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        <span className="font-semibold">
          {coopWon ? "Victoire commune 🎉" : "Défaite 😔"}
        </span>
      </p>
    );
  }

  if (names === "") {
    return null;
  }

  return (
    <p className="text-zinc-500 dark:text-zinc-400">
      Bravo <span className="font-semibold">{names}</span> 🎉
      {shared ? (
        <span className="block text-sm font-semibold">
          Victoire partagée 🤝
        </span>
      ) : null}
      {score !== null ? (
        <span className="block text-sm">avec {score} points</span>
      ) : null}
    </p>
  );
}

/**
 * The finished-game screen: a winner banner filling the view, then the two
 * readings of the evening below ({@link EndRecapTabs}). A button scrolls them
 * into view so the reward (who won) stays front and centre while the numbers
 * are one tap away. A right-edge handle slides in the final score (with the
 * per-category detail for category games), keeping the recap at the bottom and
 * the score on the side.
 */
export function EndedGame({
  game,
  onReload,
}: Readonly<{
  game: PopulatedGame;
  onReload: () => void;
}>) {
  const statsRef = useRef<HTMLDivElement>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  // Usually one, several on a shared victory (an ex æquo no rule separated).
  const winners = game.players.filter(p => p.isWinner);
  const winnerNames = formatNames(winners.map(w => w.player.name));
  const winnerScore = winners[0]?.score ?? null;
  const shared = winners.length > 1;
  // The game's record, if this party still holds it — announced here as well as
  // worn on the score sheet, so it isn't only found by opening the sheet.
  const records = useRecordsOfGame(game);
  const record = worldRecordOf(records);
  // The other mark a party can leave: having reached the target in fewer laps
  // than anyone else on the same course. Only a race towards a score has one.
  const speed = useSpeedRecord(game);
  // The evening this party just closed — a sitting of one for most parties,
  // which is exactly when the facts below say nothing.
  const sitting = useSessionGames(game.sessionId, game.id);

  // Cooperative games have no individual winner: the whole table wins or loses
  // together (every player `isWinner`, or none).
  const coop = game.boardgame.kind === "cooperative";
  const coopWon = game.players.some(p => p.isWinner);

  // The score slide-over only makes sense once someone actually has a score.
  const hasScore = game.players.some(p => p.score !== null);

  // A party that recorded neither turn nor manche (Papayoo) has no panel below
  // — but its players still have a history, so the link down is worth showing
  // as soon as either of the two sections has something to say.
  const [scope, setScope] = useState<RecapScope>("all");
  const { recaps, byTable, loading } = usePlayerRecaps(game, scope);
  const comparable = !loading && hasComparablePast(recaps);
  const stats = hasPlayStats(game.boardgame) || comparable;

  // Some games are played one short party after another: the next one is dealt
  // from here rather than back through the creation funnel. A setting of the
  // game, so any of them can be played that way without touching the code.
  const chainable = game.boardgame.chainable;

  const seeStats = () => {
    statsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex flex-col">
      {/* The classic end screen fills one screenful before the stats. Sized to
          the LARGEST viewport (`lvh`, address bar hidden) minus the page header
          + padding (~6rem): hiding the bar can then never reveal the stats
          underneath. The winner owns the centre; the buttons sit lower. */}
      <div className="flex min-h-[calc(100lvh-6rem)] flex-col items-center text-center">
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span aria-hidden className="text-6xl">
            {outcomeEmoji(coop, coopWon)}
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">Partie terminée !</h2>

            {/* Nothing on this screen named the game being finished, so the
                extension had nothing to hang off either. */}
            <div className="flex flex-col items-center">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">
                {game.boardgame.name}
              </span>
              <ExtensionBadgeList
                extensions={playedExtensions(game.extensions)}
                baseName={game.boardgame.name}
              />
            </div>

            <Outcome
              coop={coop}
              coopWon={coopWon}
              names={winnerNames}
              score={winnerScore}
              shared={shared}
            />

            <ScoreRecordBanner record={record} score={winnerScore} />
            <SpeedRecordBanner record={speed} />

            {/* Told here, in the first screenful, rather than down with the
                statistics: it is the story of the evening that just ended, and
                on a game like Papayoo there is no panel below to scroll to. */}
            <SessionFacts game={game} games={sitting} />
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 pb-28">
          {stats ? (
            <button
              type="button"
              onClick={seeStats}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-black/5 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/5"
            >
              Voir les statistiques ↓
            </button>
          ) : null}

          {/* 🔑 On a table dealing party after party, dealing the next one is
              what happens nearly every time and packing up is the exception —
              so it is the filled button, and leaving is the outlined one. */}
          {chainable ? <ChainPartyButton game={game} /> : null}

          <Link
            href="/games"
            className={
              chainable
                ? "rounded-lg border border-indigo-500 px-4 py-2 font-medium text-indigo-600 transition hover:bg-indigo-500/10 dark:text-indigo-400"
                : "rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-500"
            }
          >
            Retour aux parties
          </Link>
        </div>
      </div>

      {/* Two readings of the same evening, behind two tabs: what the table did,
          then what each player did against his own past. Siblings, never one
          inside the other — a game that records neither turn nor manche has no
          party panel and still has a history to show. */}
      <div ref={statsRef} className="scroll-mt-6">
        <EndRecapTabs
          party={
            hasPlayStats(game.boardgame) ? (
              // Same gutter, for the same reason as the rows below — the handle
              // covers whatever is halfway down the screen, and this panel is
              // charts and tiles that all run to the right edge. Applied here
              // rather than inside the panel: what is pinned to the screen is a
              // fact this component knows and the statistics do not, and the
              // one wrapper covers the three variants the panel dispatches to.
              <div
                data-testid="party-panel"
                className={hasScore ? "pe-10" : ""}
              >
                <GameStats game={game} />
              </div>
            ) : null
          }
          players={
            comparable ? (
              <PlayerRecapSection
                recaps={recaps}
                byTable={byTable}
                scope={scope}
                onScope={setScope}
                // The score handle below is pinned to the right edge and stays
                // there while this block scrolls, so whichever line happens to
                // be halfway down the screen is drawn under it — and the end of
                // a player's line is exactly where the figure and « sa
                // meilleure » live. The rows stop short of it rather than run
                // beneath.
                rightGutter={hasScore}
              />
            ) : null
          }
        />
      </div>

      {hasScore ? (
        <>
          <button
            type="button"
            onClick={() => setScoreOpen(true)}
            aria-label="Voir le score final"
            className="fixed right-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl bg-indigo-600 px-2 py-3 text-white shadow-lg transition hover:bg-indigo-500"
          >
            <span aria-hidden className="text-lg">
              🏆
            </span>
            <span className="text-xs font-medium [writing-mode:vertical-rl]">
              Score
            </span>
          </button>

          <Drawer
            open={scoreOpen}
            onClose={() => setScoreOpen(false)}
            label="Score final"
          >
            <EndScorePanel
              game={game}
              onClose={() => setScoreOpen(false)}
              onReload={onReload}
            />
          </Drawer>
        </>
      ) : null}
    </div>
  );
}
