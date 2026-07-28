import { isRedNumber } from "@/lib/catan/board";
import type { HiddenZoneMaterial } from "@/lib/catan/hidden-material";
import { SPEC_TERRAIN_NAME, SPEC_TERRAIN_ORDER } from "./terrain-labels";
import { terrainSwatch } from "./terrain-swatch";

/**
 * The tokens as distinct entries: a bag holding two 5s is two tokens to take
 * out of the box, so each occurrence is numbered rather than merged.
 */
function occurrences(tokens: number[]): { key: string; token: number }[] {
  const seen = new Map<number, number>();

  return tokens.map(token => {
    const nth = (seen.get(token) ?? 0) + 1;

    seen.set(token, nth);

    return { key: `${token}#${nth}`, token };
  });
}

/**
 * One pile to take out of the box before playing: the tiles of a face-down
 * zone and the tokens that go with them. The zone is only named when the map
 * holds more than one — a single fog bank needs no label.
 */
export function HiddenZoneCard({
  zone,
  named,
}: Readonly<{ zone: HiddenZoneMaterial; named: boolean }>) {
  const tiles = SPEC_TERRAIN_ORDER.filter(
    terrain => (zone.terrainCounts[terrain] ?? 0) > 0,
  );

  return (
    <li className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">
        {named ? `${zone.name} · ` : null}
        {zone.tiles} tuile{zone.tiles > 1 ? "s" : ""}
      </h3>

      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
        {tiles.map(terrain => (
          <li key={terrain} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3.5 w-3.5 shrink-0 rounded-sm border border-black/10"
              style={{ background: terrainSwatch(terrain) }}
            />
            <span>
              {SPEC_TERRAIN_NAME[terrain]}{" "}
              <strong className="tabular-nums">
                ×{zone.terrainCounts[terrain]}
              </strong>
            </span>
          </li>
        ))}
      </ul>

      {zone.tokens.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {occurrences(zone.tokens).map(entry => (
            <li
              key={entry.key}
              className={`flex h-7 w-7 items-center justify-center rounded-full bg-[#faf7ef] text-sm font-bold tabular-nums ring-1 ring-black/10 ${
                isRedNumber(entry.token) ? "text-red-700" : "text-zinc-800"
              }`}
            >
              {entry.token}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Aucun jeton : cette zone ne cache que de la mer ou du désert.
        </p>
      )}
    </li>
  );
}
