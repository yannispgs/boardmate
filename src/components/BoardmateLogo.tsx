import {
  LOGO_CORNER,
  LOGO_GRID,
  LOGO_INK,
  LOGO_PIP_RADIUS,
  LOGO_PIPS,
} from "@/lib/pwa/assets";

/**
 * The application's dice, drawn inline rather than fetched from `/icon.svg`:
 * the one screen that needs it is the one shown while the application is still
 * coming up, and a second request is exactly what it cannot afford.
 */
export function BoardmateLogo({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox={`0 0 ${LOGO_GRID} ${LOGO_GRID}`}
      className={className}
      role="img"
      aria-label="Boardmate"
    >
      <rect
        width={LOGO_GRID}
        height={LOGO_GRID}
        rx={LOGO_CORNER}
        fill={LOGO_INK}
      />

      <g fill="#ffffff">
        {LOGO_PIPS.map(pip => (
          <circle
            key={`${pip.cx}-${pip.cy}`}
            cx={pip.cx}
            cy={pip.cy}
            r={LOGO_PIP_RADIUS}
          />
        ))}
      </g>
    </svg>
  );
}
