import { HomeTile, type HomeTileItem } from "./HomeTile";

/**
 * Shortcuts two by two. A new one opens a new row rather than squeezing the
 * others or running off the side of the screen.
 */
export function HomeTileList({
  tiles,
}: Readonly<{ tiles: readonly HomeTileItem[] }>) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {tiles.map(tile => (
        <HomeTile key={tile.href} tile={tile} />
      ))}
    </div>
  );
}
