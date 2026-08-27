import { StatTile } from "@/components/StatTile";
import type { Boardgame, GameStatsRecord, PlayerId } from "@/lib/domain";
import type { PlayerAggregate } from "@/lib/game/global-stats";
import { turnPhaseStats } from "@/lib/game/phase-stats";
import { winnerDirection } from "@/lib/game/scoring";
import { tracksPlayerTime } from "@/lib/game/turn-time";
import { tracksWorstScores, worstScoreSlices } from "@/lib/game/worst-scores";
import { computeZeroFinishes } from "@/lib/game/zero-finishes";
import { CategoryCharts } from "./CategoryCharts";
import { PlayerGameRowList } from "./PlayerGameRowList";
import { TimeIndexInfo } from "./TimeIndexInfo";
import { TurnPhaseCardList } from "./TurnPhaseCardList";
import {
  type WorstScoreGameView,
  WorstScoreSection,
} from "./WorstScoreSection";

/** How often this player finished a party at nothing, spelled out. */
function zeroesLine(stat: Readonly<{ zeroes: number; games: number }>): string {
  const zeroes = `${stat.zeroes} partie${stat.zeroes > 1 ? "s" : ""} à 0`;
  const games = `${stat.games} jouée${stat.games > 1 ? "s" : ""}`;
  const rate = Math.round((stat.zeroes / stat.games) * 100);

  return `${zeroes} sur ${games} — ${rate} %`;
}

/**
 * How often this player got away with nothing over the given parties, or null
 * where the figure says nothing.
 *
 * Only on a game paying one fixed pile (Papayoo): there, walking away at zero
 * means the whole table took the points instead, which is worth bragging about.
 * On any other game a zero is simply « I scored nothing » — a line that would
 * read « 0 partie à 0 » forever.
 */
function zeroesFor(
  boardgame: Boardgame,
  records: readonly GameStatsRecord[],
  playerId: PlayerId,
): string | null {
  if (boardgame.scoring?.totalSum == null) {
    return null;
  }

  const stat = computeZeroFinishes(records).find(z => z.playerId === playerId);

  return stat === undefined ? null : zeroesLine(stat);
}

/**
 * What a game won by scoring little (Papayoo, Odin) has to say about one
 * player: the totals they would rather forget, cut by the size of the table
 * wherever the seat count moves the total, and how often they got away clean.
 *
 * Returns null when this player has no scored party on that game — a game they
 * never played has no place in the menu.
 */
function worstScoreView(
  boardgame: Boardgame,
  records: readonly GameStatsRecord[],
  playerId: PlayerId,
): WorstScoreGameView | null {
  const played = records.filter(
    r =>
      r.boardgameId === boardgame.id &&
      r.players.some(p => p.playerId === playerId),
  );
  /* c8 ignore next 3 -- a game listed here is scored, by tracksWorstScores */
  const direction = boardgame.scoring
    ? winnerDirection(boardgame.scoring.winCondition)
    : "lowest";
  const slices = worstScoreSlices(played, direction, {
    playerId,
    byPlayerCount: boardgame.scoring?.playerCountSensitive === true,
  }).map(slice => ({
    ...slice,
    note: zeroesFor(
      boardgame,
      slice.playerCount === null
        ? played
        : played.filter(r => r.players.length === slice.playerCount),
      playerId,
    ),
  }));

  return slices.length === 0
    ? null
    : { id: boardgame.id, name: boardgame.name, slices };
}

/** The time index as a rounded number, or "—" when there's no time data. */
function fmtIndex(index: number | null): string {
  return index === null ? "—" : String(Math.round(index));
}

/**
 * A single player's detailed stats: headline figures, their best / worst game,
 * and a full per-game breakdown. Reached by tapping a player in the ranking.
 */
export function PlayerDetail({
  player,
  records,
  boardgames,
  onBack,
}: Readonly<{
  player: PlayerAggregate;
  records: GameStatsRecord[];
  boardgames: Boardgame[];
  onBack: () => void;
}>) {
  // Category games (Cascadia) the player has played → their point-distribution
  // chart, built from this player's records for that game.
  const categoryCharts = boardgames
    .filter(b => b.scoring?.entry === "categories" && b.scoring.sheet)
    .map(b => ({
      id: b.id,
      name: b.name,
      sheet: b.scoring?.sheet ?? [],
      games: records.filter(
        r =>
          r.boardgameId === b.id &&
          r.players.some(p => p.playerId === player.playerId),
      ),
    }))
    .filter(c => c.games.length > 0);

  // Games that never attribute a turn to a player (Splito, Odin): their line
  // drops « Part du temps » rather than showing a dash nobody can read.
  const timedGames = new Set(
    boardgames.filter(tracksPlayerTime).map(b => b.id),
  );

  // Games won by scoring little (Papayoo, Odin) this player has scored on:
  // their own hall of shame, the same one the « Jeux » tab shows for the whole
  // table. One section for all of them — the game is picked in its menu.
  const worstScoreGames = boardgames
    .filter(tracksWorstScores)
    .map(b => worstScoreView(b, records, player.playerId))
    .filter((view): view is WorstScoreGameView => view !== null);

  // Games played in phases (Terraforming Mars): the only one of their phases a
  // player owns a time in is the one where turns are taken — the rest belongs
  // to the whole table and lives in the « Jeux » tab.
  const turnPhases = turnPhaseStats(records, boardgames, player.playerId);

  return (
    <div className="flex flex-col gap-6">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        ← Classement
      </button>

      <h2 className="text-2xl font-semibold tracking-tight">{player.name}</h2>

      {/* Score / turn means are game-specific → shown per game below, not here. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Taux de victoire"
          value={`${Math.round(player.winRate)}%`}
          accent
        />
        <StatTile label="Parties" value={String(player.games)} />
        <StatTile label="Victoires" value={String(player.wins)} />
        <StatTile
          label="Part du temps"
          value={fmtIndex(player.timeIndex)}
          info={<TimeIndexInfo />}
        />
      </div>

      {player.bestGame && player.worstGame ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-3 text-sm">
            <span aria-hidden>💪</span>
            <span>
              Meilleur sur{" "}
              <span className="font-semibold">
                {player.bestGame.boardgameName}
              </span>{" "}
              ({Math.round(player.bestGame.winRate)}%)
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-sm">
            <span aria-hidden>😬</span>
            <span>
              Moins bon sur{" "}
              <span className="font-semibold">
                {player.worstGame.boardgameName}
              </span>{" "}
              ({Math.round(player.worstGame.winRate)}%)
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Par jeu — du plus joué au moins joué
        </h3>
        <PlayerGameRowList games={player.byGame} timedGames={timedGames} />
      </div>

      {turnPhases.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Rythme dans la phase des tours
          </h3>
          <TurnPhaseCardList stats={turnPhases} />
        </div>
      ) : null}

      {worstScoreGames.length > 0 ? (
        <WorstScoreSection
          key={player.playerId}
          games={worstScoreGames}
          nameGame
        />
      ) : null}

      {categoryCharts.map(c => (
        <div key={c.id} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Répartition des points — {c.name}
          </h3>
          <CategoryCharts
            sheet={c.sheet}
            records={c.games}
            playerId={player.playerId}
          />
        </div>
      ))}
    </div>
  );
}
