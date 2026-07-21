import { StatTile } from "@/components/StatTile";
import type { Boardgame, GameStatsRecord } from "@/lib/domain";
import type { GameBreakdown, PlayerAggregate } from "@/lib/game/global-stats";
import { CategoryCharts } from "./CategoryCharts";
import { TimeIndexInfo } from "./TimeIndexInfo";

/** The time index as a rounded number, or "—" when there's no time data. */
function fmtIndex(index: number | null): string {
  return index === null ? "—" : String(Math.round(index));
}

/** One boardgame line in the player's per-game breakdown. */
function GameRow({ game }: { game: GameBreakdown }) {
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
        <span>Part du temps {fmtIndex(game.timeIndex)}</span>
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
}: {
  player: PlayerAggregate;
  records: GameStatsRecord[];
  boardgames: Boardgame[];
  onBack: () => void;
}) {
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
            <GameRow key={game.boardgameId} game={game} />
          ))}
        </ul>
      </div>

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
