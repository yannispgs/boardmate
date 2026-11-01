import { scoreInputClass } from "@/components/ui";
import type { PlayerId, ScoreGrid } from "@/lib/domain";
import { zoneOffset, zoneSize } from "@/lib/game/score-grid";

/**
 * One player's cards, counted where they lie: a box per card, the zones side
 * by side, a wider gap between two zones than between two cards.
 */
export function ScoreGridCard({
  player,
  grid,
  labelOf,
  cells,
  disabled,
  onCell,
}: Readonly<{
  player: { id: PlayerId; name: string };
  grid: ScoreGrid;
  /** What a sheet line is called, for the boxes it is made of. */
  labelOf: (key: string) => string;
  cells: readonly string[];
  disabled: boolean;
  onCell: (index: number, text: string) => void;
}>) {
  // Each zone with the places of its boxes among the player's cells.
  const zones = grid.zones.map((zone, z) => {
    const start = zoneOffset(grid, z);

    return {
      zone,
      start,
      boxes: Array.from({ length: zoneSize(grid, z) }, (_v, i) => start + i),
    };
  });

  return (
    <li className="flex flex-col gap-1.5 rounded-lg border border-black/10 p-2 dark:border-white/10">
      <span className="truncate text-sm font-semibold">{player.name}</span>

      <div className="flex justify-center gap-3">
        {zones.map(({ zone, start, boxes }) => {
          const label = labelOf(zone.category);

          return (
            <div
              key={start}
              title={label}
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${zone.columns}, auto)`,
              }}
            >
              {boxes.map(index => (
                <input
                  key={index}
                  type="number"
                  inputMode="numeric"
                  value={cells[index] ?? ""}
                  onChange={e => onCell(index, e.target.value)}
                  disabled={disabled}
                  aria-label={`${label} ${index - start + 1} — ${player.name}`}
                  className={scoreInputClass}
                />
              ))}
            </div>
          );
        })}
      </div>
    </li>
  );
}
