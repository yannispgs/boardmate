"use client";

import { type ReactNode, useMemo, useState } from "react";
import { DateWindow } from "@/components/DateWindow";
import { InfoTip } from "@/components/InfoTip";
import { MultiSelectField } from "@/components/MultiSelectField";
import { OptionPicker, type PickerOption } from "@/components/OptionPicker";
import { StatTile } from "@/components/StatTile";
import type {
  BoardgameId,
  DiceSpec,
  GameStatsRecord,
  PlayerId,
  ScoreSheetItem,
} from "@/lib/domain";
import { formatDuration } from "@/lib/game/format-time";
import {
  computeGlobalStats,
  coPlayerOptions,
  filterRecords,
  type GlobalStats,
} from "@/lib/game/global-stats";
import { winnerDirection } from "@/lib/game/scoring";
import { computeSeatStats, type SeatStat } from "@/lib/game/seat-stats";
import { useBoardgames } from "@/lib/hooks/use-boardgames";
import { CategoryCharts } from "./CategoryCharts";
import { GamePlayerTable } from "./GamePlayerTable";
import { ScoreDistribution } from "./ScoreDistribution";
import { SeatStats } from "./SeatStats";
import { StatsDiceDistribution } from "./StatsDiceDistribution";
import { TimeIndexInfo } from "./TimeIndexInfo";

/** Distinct boardgames present in the records, sorted by name. */
function gameOptions(records: GameStatsRecord[]): PickerOption<string>[] {
  const map = new Map<string, string>();
  for (const r of records) {
    map.set(r.boardgameId, r.boardgameName);
  }

  return [...map.entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * "Jeux" tab: pick a game, then see its aggregated stats over the selected
 * parties. The set of parties can be narrowed by present players and by an end
 * date window. Which figures show adapts to the game (e.g. score only when the
 * game keeps one). Dice distribution for dice games is coming with dice
 * tracking.
 */
export function GamesTab({
  records,
}: Readonly<{ records: GameStatsRecord[] }>) {
  const games = useMemo(() => gameOptions(records), [records]);
  const [selected, setSelected] = useState(games[0]?.value ?? "");
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [until, setUntil] = useState("");

  const active = games.some(g => g.value === selected)
    ? selected
    : (games[0]?.value ?? "");

  // Presence-filter options: players of the selected game, narrowed to those
  // who share a game with everyone already picked (so it never goes empty).
  const presenceOptions = useMemo(
    () =>
      coPlayerOptions(
        records.filter(r => r.boardgameId === active),
        presentIds,
      ),
    [records, active, presentIds],
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

  // Turn-order breakdown, for games that opt into it (Catan): win rate and
  // average placement for the first / intermediate / last player to play.
  const { boardgames } = useBoardgames();
  const boardgame = boardgames.find(b => b.id === active) ?? null;
  // Category games (Cascadia): the point-distribution charts.
  const categorySheet =
    boardgame?.scoring?.entry === "categories"
      ? (boardgame.scoring.sheet ?? null)
      : null;
  const categoryRecords = useMemo(
    () => filterRecords(records, filters),
    [records, filters],
  );
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
  // The picked players, to compare against the table on the category charts.
  const comparePlayers = useMemo(
    () =>
      presentIds.length === 0
        ? undefined
        : presentIds.map(id => ({
            id: id as PlayerId,
            name: presenceOptions.find(o => o.id === id)?.name ?? "?",
          })),
    [presentIds, presenceOptions],
  );

  return (
    <div className="flex flex-col gap-6">
      <OptionPicker
        variant="chips"
        options={games}
        value={active}
        onChange={setSelected}
      />

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
        <GameSections
          stats={stats}
          scored={scored}
          scores={scores}
          dice={dice}
          seatStats={seatStats}
          showSeatStats={boardgame?.trackSeatStats ?? false}
          categorySheet={categorySheet}
          categoryRecords={categoryRecords}
          comparePlayers={comparePlayers}
        />
      )}
    </div>
  );
}

/** A titled block of the tab. */
function Section({
  title,
  children,
}: Readonly<{ title: ReactNode; children: ReactNode }>) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="flex items-center gap-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

/** The overall figures of the selected game, over the parties in scope. */
function OverallTiles({
  stats,
  scored,
}: Readonly<{ stats: GlobalStats; scored: boolean }>) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <StatTile label="Parties" value={String(stats.gameCount)} accent />
      <StatTile
        label="Temps de jeu moy."
        value={formatDuration(stats.avgActiveS)}
      />
      <StatTile
        label="Tours moy."
        value={stats.avgRounds.toFixed(1)}
        info={
          <InfoTip label="Tours moyens">
            <p>
              Nombre moyen de <strong>tours de table</strong> par partie (un
              tour = tout le monde a joué une fois).
            </p>
            <p>À ne pas confondre avec « Tour moy. », qui est une durée.</p>
          </InfoTip>
        }
      />
      <StatTile
        label="Tour moy."
        value={formatDuration(stats.avgTurnS)}
        info={
          <InfoTip label="Tour moyen">
            <p>
              <strong>Durée moyenne d&apos;un seul tour</strong> de joueur.
            </p>
            <p>
              À ne pas confondre avec « Tours moy. », qui compte les tours de
              table.
            </p>
          </InfoTip>
        }
      />
      {scored ? (
        <StatTile
          label="Score moy."
          value={stats.avgScore === null ? "—" : stats.avgScore.toFixed(1)}
        />
      ) : null}
    </div>
  );
}

/** The player with the most wins on this game, when there is one. */
function ChampionBanner({
  champion,
}: Readonly<{ champion: GlobalStats["players"][number] | null }>) {
  if (!champion || champion.wins === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
      <span aria-hidden>🏆</span>
      <span>
        <span className="font-semibold">{champion.name}</span> domine ce jeu —{" "}
        {champion.wins} victoire{champion.wins > 1 ? "s" : ""} sur{" "}
        {champion.games}
      </span>
    </div>
  );
}

/** Everything shown once the filters leave at least one party. */
function GameSections({
  stats,
  scored,
  scores,
  dice,
  seatStats,
  showSeatStats,
  categorySheet,
  categoryRecords,
  comparePlayers,
}: Readonly<{
  stats: GlobalStats;
  scored: boolean;
  scores: number[];
  dice: { spec: DiceSpec | null; rolls: number[] };
  seatStats: SeatStat[];
  showSeatStats: boolean;
  categorySheet: ScoreSheetItem[] | null;
  categoryRecords: GameStatsRecord[];
  comparePlayers: Array<{ id: PlayerId; name: string }> | undefined;
}>) {
  const champion = stats.players.reduce<GlobalStats["players"][number] | null>(
    (best, p) => (p.wins > (best?.wins ?? 0) ? p : best),
    null,
  );

  return (
    <>
      <OverallTiles stats={stats} scored={scored} />
      <ChampionBanner champion={champion} />

      {scored && scores.length > 0 ? (
        <Section title="Répartition des scores">
          <ScoreDistribution scores={scores} />
        </Section>
      ) : null}

      {showSeatStats ? <SeatStats stats={seatStats} /> : null}

      {categorySheet ? (
        <Section title="Répartition des points">
          <CategoryCharts
            sheet={categorySheet}
            records={categoryRecords}
            comparePlayers={comparePlayers}
          />
        </Section>
      ) : null}

      {dice.spec && dice.rolls.length > 0 ? (
        <Section title="Distribution des lancers de dés">
          <StatsDiceDistribution rolls={dice.rolls} spec={dice.spec} />
        </Section>
      ) : null}

      <Section
        title={
          <>
            Statistiques des joueurs sur ce jeu
            <TimeIndexInfo />
          </>
        }
      >
        <GamePlayerTable players={stats.players} scored={scored} />
      </Section>
    </>
  );
}
