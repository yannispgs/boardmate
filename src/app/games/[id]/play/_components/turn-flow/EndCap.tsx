import { MID } from "./geometry";

/**
 * The finish flag that closes the ribbon of a fixed-length game — placed just
 * after the last player so the turn order visibly stops instead of rolling into
 * another round.
 */
export function EndCap({ left }: Readonly<{ left: number }>) {
  return (
    <div className="absolute top-0" style={{ left }}>
      <span
        role="img"
        aria-label="Fin de la partie"
        className="-translate-y-1/2 absolute whitespace-nowrap text-2xl leading-none"
        style={{ top: MID }}
      >
        🏁
      </span>
    </div>
  );
}
