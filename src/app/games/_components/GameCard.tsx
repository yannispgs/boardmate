"use client";

import Link from "next/link";

import { ExtensionBadgeList } from "@/components/games/ExtensionBadgeList";
import { TrashIcon } from "@/components/icons";
import { Tooltip } from "@/components/Tooltip";
import type { GameListItem, PlayerId } from "@/lib/domain";
import type { GameProgress } from "@/lib/game/game-progress";
import { progressSummary } from "@/lib/game/game-progress";
import { formatNames } from "@/lib/game/tie-break";

/** Full start timestamp (date + HH:mm:ss), shown when hovering the date. */
function fullStart(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * The participant list in play order, used as the player-count tooltip. The
 * player whose turn it is is emphasised so hovering the count highlights them.
 */
function PlayOrder({
  players,
  currentPlayerId,
}: Readonly<{
  players: GameListItem["players"];
  currentPlayerId: PlayerId | null;
}>) {
  if (players.length === 0) {
    return <span>Aucun joueur</span>;
  }

  return (
    <ol className="flex flex-col gap-0.5">
      {players.map((p, i) => {
        const isCurrent = p.id === currentPlayerId;

        return (
          <li
            key={p.id}
            className={isCurrent ? "font-semibold text-white" : "text-zinc-300"}
          >
            {i + 1}. {p.name}
            {isCurrent ? " ←" : ""}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The same play order as the tooltip, but rendered inline as small chips —
 * shown only on touch devices (`@media (hover: none)`), where the hover tooltip
 * never fires, so the participants stay reachable without a mouse.
 */
/**
 * The card's one-line status: how the finished game ended, or whose turn it is
 * in a running one. A game that hasn't started has nothing to say.
 */
function StatusLine({
  ended,
  outcome,
  progress,
  currentPlayerName,
}: Readonly<{
  ended: boolean;
  outcome: string;
  progress: GameProgress;
  currentPlayerName: string | null;
}>) {
  if (ended) {
    return (
      <span className="mt-0.5 text-xs font-medium text-amber-600 dark:text-amber-500">
        {outcome === "" ? null : `${outcome} · `}
        {progressSummary(progress)}
      </span>
    );
  }

  if (currentPlayerName === null) {
    return null;
  }

  return (
    <span className="mt-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
      Au tour de {currentPlayerName}
    </span>
  );
}

function InlinePlayOrder({
  players,
  currentPlayerId,
}: Readonly<{
  players: GameListItem["players"];
  currentPlayerId: PlayerId | null;
}>) {
  if (players.length === 0) {
    return null;
  }

  return (
    <ul className="mt-1.5 hidden flex-wrap gap-1 [@media(hover:none)]:flex">
      {players.map((p, i) => {
        const isCurrent = p.id === currentPlayerId;

        return (
          <li
            key={p.id}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${
              isCurrent
                ? "border-indigo-400 font-semibold text-indigo-600 dark:text-indigo-400"
                : "border-black/10 text-zinc-500 dark:border-white/10"
            }`}
          >
            {i + 1}. {p.name}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * One game in the list: the boardgame logo, name, start date and player count,
 * linking to the play screen. The date reveals the full timestamp on hover, and
 * the player count reveals the participants in play order. An **ongoing** game
 * surfaces how far along it is and whose turn it is; a **finished** game instead
 * shows the winner and how long it lasted (no "current" player). Both are
 * counted in the unit the box uses — laps for most, generations for Terraforming
 * Mars (see `gameProgress`). On touch devices, where hover doesn't exist, the
 * play order is shown inline.
 */
export function GameCard({
  game,
  boardgameName,
  logoUrl,
  progress,
  ended = false,
  coop = false,
  onAbandon,
}: Readonly<{
  game: GameListItem;
  boardgameName: string;
  logoUrl: string | null;
  /** How far along, in the boardgame's own unit — resolved by the list. */
  progress: GameProgress;
  ended?: boolean;
  /** Cooperative game: a finished one shows a shared victory/defeat, no winner. */
  coop?: boolean;
  /** When set (ongoing games only), shows an "abandon" (delete) button. */
  onAbandon?: () => void;
}>) {
  const count = game.players.length;
  const currentPlayer = game.players.find(p => p.id === game.currentPlayerId);
  // Usually one, several on a shared victory (an ex æquo no rule separated).
  const winners = game.players.filter(p => p.isWinner);
  const winnerLabel = formatNames(winners.map(w => w.name));
  const winnerScore = winners[0]?.score ?? null;
  // Cooperative games win or lose as a group (some player `isWinner`, or none).
  const coopWon = game.players.some(p => p.isWinner);
  // How a finished game opens its line: the table's shared result on a
  // cooperative game, else the winner(s) and their score.
  const scoreLabel = winnerScore === null ? "" : ` (${winnerScore} pts)`;
  const winnerOutcome =
    winners.length === 0 ? "" : `🏆 ${winnerLabel}${scoreLabel}`;
  const coopOutcome = coopWon ? "🎉 Victoire" : "😔 Défaite";
  const outcome = coop ? coopOutcome : winnerOutcome;
  // A finished game has no "current" player to emphasise.
  const highlightId = ended ? null : game.currentPlayerId;

  return (
    <li className="flex items-stretch gap-2">
      <Link
        href={`/games/${game.id}/play`}
        className={`flex flex-1 items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-4 py-3 transition hover:border-indigo-400 dark:border-white/10 dark:bg-zinc-900 ${
          ended ? "opacity-60" : ""
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {logoUrl ? (
            // biome-ignore lint/performance/noImgElement: arbitrary Storage URLs, no next/image loader configured yet
            <img
              src={logoUrl}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 text-lg dark:bg-white/5"
            >
              🎲
            </span>
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{boardgameName}</span>
            <ExtensionBadgeList
              extensions={game.extensions}
              baseName={boardgameName}
            />
            <span className="mt-0.5 text-xs text-zinc-500">
              {ended ? null : (
                <>
                  {progress.label} {progress.count} ·{" "}
                </>
              )}
              <Tooltip label={fullStart(game.startedAt)}>
                {new Date(game.startedAt).toLocaleDateString("fr-FR")}
              </Tooltip>{" "}
              ·{" "}
              <Tooltip
                label={
                  <PlayOrder
                    players={game.players}
                    currentPlayerId={highlightId}
                  />
                }
              >
                {count} {count > 1 ? "joueurs" : "joueur"}
              </Tooltip>
            </span>
            <StatusLine
              ended={ended}
              outcome={outcome}
              progress={progress}
              currentPlayerName={currentPlayer?.name ?? null}
            />
            <InlinePlayOrder
              players={game.players}
              currentPlayerId={highlightId}
            />
          </div>
        </div>
        {ended ? (
          <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
            Terminée
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
            Reprendre
          </span>
        )}
      </Link>
      {onAbandon ? (
        <button
          type="button"
          onClick={onAbandon}
          aria-label={`Abandonner la partie de ${boardgameName}`}
          title="Abandonner la partie"
          className="flex shrink-0 items-center rounded-xl border border-black/10 px-3 text-zinc-400 transition hover:border-red-400 hover:text-red-500 dark:border-white/10"
        >
          <TrashIcon />
        </button>
      ) : null}
    </li>
  );
}
