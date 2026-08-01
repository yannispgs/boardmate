"use client";

/** How many islands a zone's land may be asked to form. */
const MIN_ISLANDS = 1;
const MAX_ISLANDS = 12;

/** Reads a field back as a count of islands, whatever was typed into it. */
function islandCount(value: number): number {
  return Math.min(
    MAX_ISLANDS,
    Math.max(MIN_ISLANDS, Math.round(value) || MIN_ISLANDS),
  );
}

const fieldClass =
  "w-16 rounded-lg border border-black/10 px-2 py-1 text-sm dark:border-white/15";

/**
 * How many islands a zone's land is gathered into — a range, drawn afresh on
 * every board. Both ends the same holds the count still, which is how one keeps
 * a zone's shape while the rest of the map keeps changing.
 *
 * Either field may cross the other: raising the minimum pushes the maximum up,
 * lowering the maximum pulls the minimum down. Typing 3 into either therefore
 * lands on "3 to 3" rather than on a range that reads backwards.
 */
export function IslandRange({
  value,
  onChange,
  name,
}: Readonly<{
  value: readonly [number, number];
  onChange: (range: [number, number]) => void;
  /** The zone the fields are about, for a screen showing several of them. */
  name?: string;
}>) {
  const [min, max] = value;
  const about = name === undefined ? "" : ` dans « ${name} »`;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">de</span>
      <input
        type="number"
        min={MIN_ISLANDS}
        max={MAX_ISLANDS}
        value={min}
        onChange={e => {
          const from = islandCount(Number(e.target.value));

          onChange([from, Math.max(from, max)]);
        }}
        aria-label={`Nombre d'îles minimum${about}`}
        className={fieldClass}
      />
      <span className="text-zinc-500 dark:text-zinc-400">à</span>
      <input
        type="number"
        min={MIN_ISLANDS}
        max={MAX_ISLANDS}
        value={max}
        onChange={e => {
          const to = islandCount(Number(e.target.value));

          onChange([Math.min(min, to), to]);
        }}
        aria-label={`Nombre d'îles maximum${about}`}
        className={fieldClass}
      />
      <span className="text-zinc-500 dark:text-zinc-400">îles</span>
    </div>
  );
}
