import { StatTile } from "@/components/StatTile";
import type { Boardgame, GameStatsRecord, PlayerId } from "@/lib/domain";
import type { GameBreakdown, PlayerAggregate } from "@/lib/game/global-stats";
import { turnPhaseStats } from "@/lib/game/phase-stats";
import { winnerDirection } from "@/lib/game/scoring";
import { tracksPlayerTime } from "@/lib/game/turn-time";
import {
  type WorstScoreGroup,
  worstScoresByPlayerCount,
} from "@/lib/game/worst-scores";
import { computeZeroFinishes } from "@/lib/game/zero-finishes";
import { CategoryCharts } from "./CategoryCharts";
import { TimeIndexInfo } from "./TimeIndexInfo";
import { TurnPhaseCardList } from "./TurnPhaseCardList";
import { WorstScoreCardList } from "./WorstScoreCardList";

/** One player's record on one game whose points are a shared pile. */
interface SharedPileBreakdown {
  id: string;
  name: string;
  /** Their heaviest totals, filed under the size of the table. */
  worst: WorstScoreGroup[];
  /** How often they walked away with nothing; null when they never played it. */
  zeroes: string | null;
}

/** How often this player finished a party at nothing, spelled out. */
function zeroesLine(stat: Readonly<{ zeroes: number; games: number }>): string {
  const zeroes = `${stat.zeroes} partie${stat.zeroes > 1 ? "s" : ""} à 0`;
  const games = `${stat.games} jouée${stat.games > 1 ? "s" : ""}`;
  const rate = Math.round((stat.zeroes / stat.games) * 100);

  return `${zeroes} sur ${games} — ${rate} %`;
}

/**
 * What a game paying one shared pile (Papayoo) has to say about one player: the
 * totals they would rather forget — read against the number of players, since
 * the table shares the same points — and how often they got away clean.
 */
function sharedPileBreakdown(
  boardgame: Boardgame,
  records: GameStatsRecord[],
  playerId: PlayerId,
): SharedPileBreakdown {
  const played = records.filter(
    r =>
      r.boardgameId === boardgame.id &&
      r.players.some(p => p.playerId === playerId),
  );
  const stat = computeZeroFinishes(played).find(z => z.playerId === playerId);

  return {
    id: boardgame.id,
    name: boardgame.name,
    worst: worstScoresByPlayerCount(
      played,
      /* c8 ignore next 3 -- a game with a totalSum is a scored game by nature */
      boardgame.scoring
        ? winnerDirection(boardgame.scoring.winCondition)
        : "highest",
      { playerId },
    ),
    zeroes: stat === undefined ? null : zeroesLine(stat),
  };
}

/** The time index as a rounded number, or "—" when there's no time data. */
function fmtIndex(index: number | null): string {
  return index === null ? "—" : String(Math.round(index));
}

/** One boardgame line in the player's per-game breakdown. */
function GameRow({
  game,
  timed,
}: Readonly<{
  game: GameBreakdown;
  /** Whether this game attributes the time it records to a single player. */
  timed: boolean;
}>) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900">
      <div className="flex items-center gap-3">
        <span className="flex-1 font-medium">{game.boardgameName}</span>
        <span className="text-sm font-semibold tabular-nums text-indigo-600 dark:text-indigo-400">
          {Math.round(game.winRate)}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${game.winRate}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
        <span>
          {game.games} partie{game.games > 1 ? "s" : ""}
        </span>
        <span>
          {game.wins} victoire{game.wins > 1 ? "s" : ""}
        </span>
        <span>
          Score moy. {game.avgScore === null ? "—" : game.avgScore.toFixed(1)}
        </span>
        {timed ? <span>Part du temps {fmtIndex(game.timeIndex)}</span> : null}
      </div>
    </li>
  );
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

  // Games paying one shared pile (Papayoo), played by this player: their own
  // hall of shame, the same one the « Jeux » tab shows for the whole table.
  const sharedPileGames = boardgames
    .filter(b => b.scoring?.totalSum != null)
    .map(b => sharedPileBreakdown(b, records, player.playerId))
    .filter(b => b.worst.length > 0);

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
        <ul className="flex flex-col gap-2">
          {player.byGame.map(game => (
            <GameRow
              key={game.boardgameId}
              game={game}
              timed={timedGames.has(game.boardgameId)}
            />
          ))}
        </ul>
      </div>

      {turnPhases.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Rythme dans la phase des tours
          </h3>
          <TurnPhaseCardList stats={turnPhases} />
        </div>
      ) : null}

      {sharedPileGames.map(game => (
        <div key={game.id} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Pires scores — {game.name}
          </h3>
          {game.zeroes === null ? null : (
            <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {game.zeroes}
            </p>
          )}
          <WorstScoreCardList groups={game.worst} />
        </div>
      ))}

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
