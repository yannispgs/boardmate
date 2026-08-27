import type { GameBreakdown } from "@/lib/game/global-stats";

/**
 * « Meilleur sur X » or « Moins bon sur Y » — one game a player clearly beats,
 * or clearly falls short of, the odds of the tables he played it at.
 *
 * The expected rate is printed next to the real one because without it the
 * sentence cannot be read: 33 % is a fine record at a table of five and a poor
 * one at a table of two, and only the pair says which of the two it was.
 */
export function PlayerExtremeBadge({
  game,
  kind,
}: Readonly<{
  game: GameBreakdown;
  /** Which of the two claims this is — it picks the wording and the colour. */
  kind: "best" | "worst";
}>) {
  const best = kind === "best";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${
        best
          ? "border-emerald-500/30 bg-emerald-500/[0.06]"
          : "border-red-500/20 bg-red-500/[0.05]"
      }`}
    >
      <span aria-hidden>{best ? "💪" : "😬"}</span>
      <span>
        {best ? "Meilleur sur " : "Moins bon sur "}
        <span className="font-semibold">{game.boardgameName}</span> (
        <span className="tabular-nums">{Math.round(game.winRate)}%</span> pour{" "}
        <span className="tabular-nums">{Math.round(game.expectedRate)}%</span>{" "}
        attendus)
      </span>
    </div>
  );
}
