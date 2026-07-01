import { BOT, CH, FONT, MID, P, SVG_H, type TagItem, TOP } from "./geometry";

/** The tag outline: vertical top/bottom edges + a chevron notch/point per side. */
function tagPath(w: number, hasLeft: boolean, hasRight: boolean): string {
  const my0 = MID - CH;
  const my1 = MID + CH;
  let d = `M 0 ${TOP} L ${w} ${TOP} `;
  d += hasRight ? `L ${w} ${my0} L ${w + P} ${MID} L ${w} ${my1} ` : "";
  d += `L ${w} ${BOT} L 0 ${BOT} `;
  d += hasLeft ? `L 0 ${my1} L ${P} ${MID} L 0 ${my0} ` : "";

  return `${d}Z`;
}

/**
 * One player's pastille — a chevron-notched tag. The current player is filled
 * with the indigo→violet gradient (defined once in `TurnFlow`); the rest are
 * neutral. A round's first tag drops its left chevron, its last the right one,
 * so each round reads as a bounded segment.
 */
export function Tag({ item }: { item: TagItem }) {
  const hasLeft = !item.firstOfRound;
  const hasRight = !item.lastOfRound;
  const width = (hasRight ? item.w + P : item.w) + 1;

  return (
    <div
      data-current={item.isCurrent || undefined}
      className="absolute top-0 transition-opacity duration-500"
      style={{ left: item.left, opacity: item.faded ? 0 : 1 }}
    >
      <svg width={width} height={SVG_H} viewBox={`0 0 ${width} ${SVG_H}`}>
        <title>
          {item.isCurrent ? `${item.name} — joueur courant` : item.name}
        </title>
        <path
          d={tagPath(item.w, hasLeft, hasRight)}
          strokeLinejoin="round"
          className={
            item.isCurrent
              ? "fill-[url(#tf-grad)]"
              : "fill-zinc-200 dark:fill-zinc-800"
          }
        />
        <text
          x={item.w / 2}
          y={MID + FONT * 0.35}
          textAnchor="middle"
          className={`text-[16px] ${
            item.isCurrent
              ? "fill-white font-semibold"
              : "fill-zinc-700 font-medium dark:fill-zinc-300"
          }`}
        >
          {item.name}
        </text>
      </svg>
    </div>
  );
}
