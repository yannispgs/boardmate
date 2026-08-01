import type { PlayedExtension } from "@/lib/domain";
import { ExtensionBadge } from "./ExtensionBadge";

/**
 * What a game was played with, beside the game itself. A played game used to
 * read « Catan » whether it was the base game or « Les quatre îles » in Marins,
 * which is precisely the distinction the extensions were recorded for.
 *
 * Nothing is shown at all for a game played without any — most of them.
 */
export function ExtensionBadgeList({
  extensions,
  baseName,
}: Readonly<{
  extensions: PlayedExtension[];
  baseName: string;
}>) {
  if (extensions.length === 0) {
    return null;
  }

  return (
    <ul className="mt-1 flex flex-wrap gap-1">
      {extensions.map(e => (
        <ExtensionBadge key={e.name} extension={e} baseName={baseName} />
      ))}
    </ul>
  );
}
