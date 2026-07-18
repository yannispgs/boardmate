"use client";

import { useMemo, useState } from "react";

import { StatTile } from "@/components/StatTile";
import type { BoardgameId, GameStatsRecord, PlayerId } from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import { computeGlobalStats, filterRecords } from "@/lib/game/global-stats";
import { winnerDirection } from "@/lib/game/scoring";
import { computeSeatStats } from "@/lib/game/seat-stats";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { DateWindow } from "./DateWindow";
import { GamePicker } from "./GamePicker";
import { GamePlayerTable } from "./GamePlayerTable";
import { MultiSelectField } from "./MultiSelectField";
import { ScoreDistribution } from "./ScoreDistribution";
import { SeatStats } from "./SeatStats";
import { StatsDiceDistribution } from "./StatsDiceDistribution";

/** Distinct boardgames present in the records, sorted by name. */
function gameOptions(records: GameStatsRecord[]) {
  const map = new Map<string, string>();
  for (const r of records) {
    map.set(r.boardgameId, r.boardgameName);
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct players who appear in the given records, sorted by name. */
function playerOptions(records: GameStatsRecord[]) {
  const map = new Map<string, string>();
  for (const r of records) {
    for (const p of r.players) {
      map.set(p.playerId, p.name);
    }
  }

  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * "Jeux" tab: pick a game, then see its aggregated stats over the selected
 * parties. The set of parties can be narrowed by present players and by an end
 * date window. Which figures show adapts to the game (e.g. score only when the
 * game keeps one). Dice distribution for dice games is coming with dice
 * tracking.
 */
export function GamesTab({ records }: { records: GameStatsRecord[] }) {
  const games = useMemo(() => gameOptions(records), [records]);
  const [selected, setSelected] = useState(games[0]?.id ?? "");
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");

  const active = games.some(g => g.id === selected)
    ? selected
    : (games[0]?.id ?? "");

  // Players who have played the selected game — the presence-filter options.
  const presenceOptions = useMemo(
    () => playerOptions(records.filter(r => r.boardgameId === active)),
    [records, active],
  );

  const filters = useMemo(
    () => ({
      boardgameIds: [active as BoardgameId],
      playerIds: presentIds as PlayerId[],
      from: from || undefined,
      until: until || undefined,
    }),
    [active, presentIds, from, until],
  );

  const stats = useMemo(
    () => computeGlobalStats(records, filters),
    [records, filters],
  );

  // Dice games: aggregate every roll across the parties in scope.
  const dice = useMemo(() => {
    const scope = filterRecords(records, filters);
    const spec = scope.find(g => g.dice)?.dice ?? null;

    return { spec, rolls: scope.flatMap(g => g.diceRolls) };
  }, [records, filters]);

  // The final scores recorded across the parties in scope (drives the
  // distribution chart).
  const scores = useMemo(
    () =>
      filterRecords(records, filters)
        .flatMap(g => g.players)
        .map(p => p.score)
        .filter((s): s is number => s !== null),
    [records, filters],
  );

  const scored = stats.avgScore !== null;
  const champion = stats.players.reduce<(typeof stats.players)[number] | null>(
    (best, p) => (p.wins > (best?.wins ?? 0) ? p : best),
    null,
  );

  // Turn-order breakdown, for games that opt into it (Catan): win rate and
  // average placement for the first / intermediate / last player to play.
  const { boardgames } = useBoardgames();
  const boardgame = boardgames.find(b => b.id === active) ?? null;
  const seatStats = useMemo(
    () =>
      computeSeatStats(
        filterRecords(records, filters),
        boardgame?.scoring
          ? winnerDirection(boardgame.scoring.winCondition)
          : "highest",
      ),
    [records, filters, boardgame],
  );

  return (
    <div className="flex flex-col gap-6">
      <GamePicker options={games} selected={active} onSelect={setSelected} />

      <div className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 dark:border-white/10">
        <MultiSelectField
          label="Avec les joueurs"
          options={presenceOptions}
          selected={presentIds}
          onChange={setPresentIds}
        />
        <DateWindow
          from={from}
          until={until}
          onFrom={setFrom}
          onUntil={setUntil}
        />
      </div>

      {stats.gameCount === 0 ? (
        <p className="text-sm text-zinc-500">
          Aucune partie ne correspond à ces filtres.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StatTile label="Parties" value={String(stats.gameCount)} accent />
            <StatTile
              label="Temps de jeu moy."
              value={formatDuration(stats.avgActiveS)}
            />
            <StatTile label="Tours moy." value={stats.avgRounds.toFixed(1)} />
            <StatTile
              label="Tour moy."
              value={formatDuration(stats.avgTurnS)}
            />
            {scored ? (
              <StatTile
                label="Score moy."
                value={
                  stats.avgScore === null ? "—" : stats.avgScore.toFixed(1)
                }
              />
            ) : null}
          </div>

          {champion && champion.wins > 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
              <span aria-hidden>🏆</span>
              <span>
                <span className="font-semibold">{champion.name}</span> domine ce
                jeu — {champion.wins} victoire{champion.wins > 1 ? "s" : ""} sur{" "}
                {champion.games}
              </span>
            </div>
          ) : null}

          {scored && scores.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Répartition des scores
              </h2>
              <ScoreDistribution scores={scores} />
            </div>
          ) : null}

          {boardgame?.trackSeatStats ? <SeatStats stats={seatStats} /> : null}

          {dice.spec && dice.rolls.length > 0 ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Distribution des lancers de dés
              </h2>
              <StatsDiceDistribution rolls={dice.rolls} spec={dice.spec} />
            </div>
          ) : null}

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Statistiques des joueurs sur ce jeu
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Part du temps : 100 = temps attendu ; en dessous = plus rapide,
              au-dessus = plus lent.
            </p>
            <GamePlayerTable players={stats.players} scored={scored} />
          </div>
        </>
      )}
    </div>
  );
}
