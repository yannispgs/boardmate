import type { ReactNode } from "react";

/**
 * The three states every loaded list goes through — loading, empty, then the
 * list itself. Each manager screen used to spell the same two grey one-liners
 * out by hand before its content.
 *
 * `children` is built even while loading, so it must tolerate empty data (it
 * always does here: these are `map`s over the array being loaded).
 */
export function ListState({
  loading,
  empty,
  emptyLabel,
  children,
}: Readonly<{
  loading: boolean;
  empty: boolean;
  emptyLabel: ReactNode;
  children: ReactNode;
}>) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Chargement…</p>;
  }

  if (empty) {
    return <p className="text-sm text-zinc-500">{emptyLabel}</p>;
  }

  return children;
}
