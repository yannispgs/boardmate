import type { PlayedExtension } from "@/lib/domain";
import { extensionShortName } from "@/lib/game/extensions";

/**
 * One extension a game was played with, and the scenario it was played on. It
 * sits under the boardgame's name, which is why the extension drops that name
 * when it carries it — « Catan · Catan - Marins » says nothing twice over.
 */
export function ExtensionBadge({
  extension,
  baseName,
}: Readonly<{
  extension: PlayedExtension;
  /** The base game's name, dropped from the extension's when it prefixes it. */
  baseName: string;
}>) {
  return (
    <li className="flex min-w-0 items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-700 dark:text-indigo-300">
      <span className="font-medium">
        {extensionShortName(extension.name, baseName)}
      </span>

      {extension.scenarioName === null ? null : (
        <span className="truncate opacity-80">· {extension.scenarioName}</span>
      )}
    </li>
  );
}
