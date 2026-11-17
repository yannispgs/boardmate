"use client";

/**
 * How many players are picked against how many the game is played with, and a
 * word when the table has outgrown it.
 */
export function PlayerCountNote({
  count,
  minPlayers,
  maxPlayers,
  tooMany,
}: Readonly<{
  count: number;
  minPlayers: number | null;
  maxPlayers: number | null;
  tooMany: boolean;
}>) {
  return (
    <>
      <p className="text-xs text-zinc-500">
        {count} sélectionné{count > 1 ? "s" : ""}
        {minPlayers != null || maxPlayers != null
          ? ` · recommandé ${minPlayers ?? "?"}–${maxPlayers ?? "?"}`
          : ""}
      </p>
      {tooMany ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Ce jeu se joue à {maxPlayers} joueurs max.
        </p>
      ) : null}
    </>
  );
}
