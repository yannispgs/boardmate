import type { ReactNode } from "react";

import type { CategoryIconId } from "@/lib/game/category-icons";

/**
 * The drawings a scored line wears instead of its label, and a milestone wears
 * beside its name. Same shape as the app's other icons (24×24, `currentColor`,
 * stroked) so they sit at the size of the text they stand next to and follow the
 * theme on their own.
 *
 * Keyed by a `Record` on purpose: adding an id to `CATEGORY_ICONS` without
 * drawing it here stops the build instead of shipping a blank line.
 */
const PATHS: Record<CategoryIconId, ReactNode> = {
  tree: (
    <>
      <path d="M12 3 5 13h4l-3 5h12l-3-5h4z" />
      <path d="M12 18v3" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-8 5-14 16-15 1 10-4 16-11 16-2 0-5-.4-5-1Z" />
      <path d="M5 19c4-4 8-6 13-7" />
    </>
  ),
  cave: (
    <>
      <path d="M3 21V13a9 9 0 0 1 18 0v8" />
      <path d="M9 21v-4a3 3 0 0 1 6 0v4" />
    </>
  ),
  mountain: (
    <>
      <path d="m2 20 7-13 4 7 2-3 7 9z" />
      <path d="m6.5 13 2.5-1.5L11 13" />
    </>
  ),
  water: (
    <>
      <path d="M3 7c3-2 6 2 9 0s6-2 9 0" />
      <path d="M3 13c3-2 6 2 9 0s6-2 9 0" />
      <path d="M3 19c3-2 6 2 9 0s6-2 9 0" />
    </>
  ),
  "cards-stacked": (
    <>
      <rect x="7" y="9" width="10" height="6" rx="1" />
      <path d="M7 5h10" />
      <path d="M7 19h10" />
    </>
  ),
  "cards-side": (
    <>
      <rect x="9" y="7" width="6" height="10" rx="1" />
      <path d="M5 7v10" />
      <path d="M19 7v10" />
    </>
  ),
  bird: (
    <>
      <path d="M16 7h.01" />
      <path d="M3 12a8 8 0 0 1 8-8 5 5 0 0 1 5 5v1l4 2-4 1v2a5 5 0 0 1-5 5H8l-2 3v-4a6 6 0 0 1-3-5Z" />
    </>
  ),
  egg: <path d="M12 3c3.5 0 6 5 6 9a6 6 0 0 1-12 0c0-4 2.5-9 6-9Z" />,
  feather: (
    <>
      <path d="M20 4c0 8-5 13-11 13H5c0-8 5-13 11-13h4Z" />
      <path d="M17 7 4 20" />
    </>
  ),
  fish: (
    <>
      <path d="M3 12c3-5 8-6 12-4 2 1 4 3 6 4-2 1-4 3-6 4-4 2-9 1-12-4Z" />
      <path d="M7 12h.01" />
    </>
  ),
  wheat: (
    <>
      <path d="M12 21V9" />
      <path d="M12 9c0-3-2-5-4-5 0 3 1 5 4 5Z" />
      <path d="M12 9c0-3 2-5 4-5 0 3-1 5-4 5Z" />
      <path d="M12 15c0-3-2-5-4-5 0 3 1 5 4 5Z" />
      <path d="M12 15c0-3 2-5 4-5 0 3-1 5-4 5Z" />
    </>
  ),
  star: (
    <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6L3.3 9.4l6-.9z" />
  ),
  coin: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
    </>
  ),
  city: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21V9h5v12" />
      <path d="M13 21V4h5v17" />
      <path d="M8.5 12h.01" />
      <path d="M15.5 8h.01" />
    </>
  ),
  factory: (
    <>
      <path d="M3 21h18" />
      <path d="M6 21v-9l5 3v-3l5 3v-3l4 2v7" />
      <path d="M6 12V5h3v7" />
    </>
  ),
  terraforming: (
    <>
      <circle cx="10" cy="14" r="6.5" />
      <path d="M3.5 14h13" />
      <path d="M19.5 11V4" />
      <path d="m17 6.5 2.5-2.5 2.5 2.5" />
    </>
  ),
  // The three habitats: a canopy, a tuft of grass, a wave. Told apart by their
  // silhouette alone, since they are read side by side on one row of chips.
  "habitat-forest": (
    <>
      <path d="M12 4 6 13h3.5L6 19h12l-3.5-6H18z" />
      <path d="M12 19v2" />
    </>
  ),
  "habitat-grassland": (
    <>
      <path d="M4 20c0-5 2-8 4-9" />
      <path d="M12 20V7" />
      <path d="M20 20c0-5-2-8-4-9" />
      <path d="M3 20h18" />
    </>
  ),
  "habitat-sea": (
    <>
      <path d="M3 9c3-2.5 6 2.5 9 0s6-2.5 9 0" />
      <path d="M3 15c3-2.5 6 2.5 9 0s6-2.5 9 0" />
    </>
  ),
  // The four nest types: flat, cupped, hollowed out, laid on the ground.
  "nest-platform": (
    <>
      <path d="M3 12h18" />
      <path d="M6 12v6" />
      <path d="M18 12v6" />
      <path d="M9 12V8" />
      <path d="M15 12V8" />
    </>
  ),
  "nest-bowl": (
    <>
      <path d="M4 10a8 8 0 0 0 16 0" />
      <path d="M3 10h18" />
    </>
  ),
  "nest-cavity": (
    <>
      <path d="M4 20V11a8 8 0 0 1 16 0v9" />
      <circle cx="12" cy="12" r="3.5" />
    </>
  ),
  "nest-ground": (
    <>
      <path d="M3 18h18" />
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M10 14.5h.01" />
      <path d="M14 14.5h.01" />
    </>
  ),
  // The three food groups Oceania's goals ask about, drawn as one member each:
  // a worm, a berry on its stem, a fish.
  "food-invertebrate": (
    <>
      <path d="M4 16c0-3 3-3 3-6s3-3 5-3 5 1 5 4-2 5-5 5-8 1-8 0Z" />
      <path d="M15 9h.01" />
    </>
  ),
  "food-fruit-seed": (
    <>
      <circle cx="12" cy="15" r="5.5" />
      <path d="M12 9.5V5" />
      <path d="M12 7c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4Z" />
    </>
  ),
  "food-rodent-fish": (
    <>
      <path d="M3 12c3-4.5 8-5.5 12-3.5 2 1 3.5 2.5 5 3.5-1.5 1-3 2.5-5 3.5-4 2-9 1-12-3.5Z" />
      <path d="M7 12h.01" />
      <path d="M20 8.5v7" />
    </>
  ),
};

/**
 * One category pictogram. `title` is what it stands for, so the drawing is
 * never a bare shape in the accessibility tree or to a pointer resting on it —
 * though the sheet's legend, not this, is what a reader is meant to consult.
 */
export function CategoryIcon({
  id,
  title,
  className = "h-5 w-5",
}: Readonly<{
  id: CategoryIconId;
  title: string;
  className?: string;
}>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {PATHS[id]}
    </svg>
  );
}
