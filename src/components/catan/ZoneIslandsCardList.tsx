"use client";

import type { ScenarioSpec } from "@/lib/catan/scenario-spec";
import { ZoneIslandsCard } from "./ZoneIslandsCard";

/** A zone of the drawn board whose land is gathered into islands. */
interface Islander {
  index: number;
  name: string;
  islands: readonly [number, number];
}

/**
 * The zones of the board being drawn that gather their land into islands, each
 * free to be asked for a different number of them. Only the author decides
 * *whether* a zone forms islands — that is the map's nature, and the scenario's
 * to state; how many of them the next draw makes is what one settles while
 * looking at the board.
 *
 * Nothing is shown for a board where no zone groups its land: there is nothing
 * to answer then.
 */
export function ZoneIslandsCardList({
  spec,
  board,
  onChange,
}: Readonly<{
  spec: ScenarioSpec;
  /** Index of the board being drawn, i.e. the one for the player count shown. */
  board: number;
  onChange: (zone: number, islands: [number, number]) => void;
}>) {
  const islanders: Islander[] = (spec.boards[board]?.zones ?? []).flatMap(
    (zone, index) =>
      zone.islands === undefined
        ? []
        : [{ index, name: zone.name, islands: zone.islands }],
  );

  if (islanders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Structure des zones</span>

      <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
        {islanders.map(islander => (
          <ZoneIslandsCard
            key={islander.index}
            name={islander.name}
            islands={islander.islands}
            onChange={range => onChange(islander.index, range)}
          />
        ))}
      </div>

      <span className="text-[11px] text-zinc-400">
        Les deux bornes égales figent le découpage d&apos;un tirage à
        l&apos;autre. Le scénario n&apos;est pas modifié : ces valeurs ne valent
        que pour la visite en cours.
      </span>
    </div>
  );
}
