import type { ReactNode } from "react";

/**
 * The scrolling body of a list screen, and what it says while it has no list to
 * show. Only this part scrolls: the heading above and the action bar below stay
 * put.
 *
 * The caller decides what "empty" means — nothing recorded at all, or nothing
 * left once the filters have had their say — and hands over the sentence; a
 * `message` of `null` means the list itself is ready to be rendered.
 */
export function ListBody({
  loading,
  message,
  children,
}: Readonly<{
  loading: boolean;
  message: string | null;
  children: ReactNode;
}>) {
  const said = loading ? "Chargement…" : message;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto pb-4">
      {said === null ? (
        children
      ) : (
        <p className="text-sm text-zinc-500">{said}</p>
      )}
    </div>
  );
}
