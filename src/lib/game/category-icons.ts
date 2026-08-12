import type { CategoryDef, ScoreSheetItem } from "@/lib/domain";

import { sheetCategories } from "./scoring";

/**
 * The pictograms the app ships, shipped as SVGs rather than uploaded images: no
 * public bucket to secure, they stay crisp on any screen, they follow the
 * light/dark theme through `currentColor`, and a sheet can never point at a file
 * somebody deleted.
 *
 * One catalogue serves everything a boardgame labels with a drawing — the scored
 * lines of a final sheet, and the milestones of a game that hands them out —
 * because the same shapes come up in both (a game scoring « Cités » is a game
 * whose milestones talk about cities).
 *
 * `name` is what the picker calls the drawing, so the author knows what he is
 * choosing; it is *not* what the score sheet shows — a line always reads under
 * its own label (see {@link sheetIconLegend}).
 */
export const CATEGORY_ICONS = [
  { id: "tree", name: "Arbre" },
  { id: "leaf", name: "Feuille" },
  { id: "cave", name: "Grotte" },
  { id: "mountain", name: "Montagne" },
  { id: "water", name: "Rivière" },
  { id: "cards-stacked", name: "Cartes au-dessus / dessous" },
  { id: "cards-side", name: "Cartes sur le côté" },
  { id: "bird", name: "Oiseau" },
  { id: "egg", name: "Œuf" },
  { id: "feather", name: "Plume" },
  { id: "fish", name: "Poisson" },
  { id: "wheat", name: "Graine" },
  { id: "star", name: "Étoile" },
  { id: "coin", name: "Jeton" },
  { id: "city", name: "Cité" },
  { id: "factory", name: "Construction" },
  { id: "terraforming", name: "Terraformation" },
  { id: "habitat-forest", name: "Écosystème forêt" },
  { id: "habitat-grassland", name: "Écosystème prairie" },
  { id: "habitat-sea", name: "Écosystème mer" },
  { id: "nest-platform", name: "Nid plateforme" },
  { id: "nest-bowl", name: "Nid coupe" },
  { id: "nest-cavity", name: "Nid cavité" },
  { id: "nest-ground", name: "Nid au sol" },
  { id: "food-invertebrate", name: "Invertébrés" },
  { id: "food-fruit-seed", name: "Fruits et graines" },
  { id: "food-rodent-fish", name: "Rongeurs et poissons" },
] as const;

/** One of the drawings the app ships. */
export type CategoryIconId = (typeof CATEGORY_ICONS)[number]["id"];

/**
 * Whether a stored value names a drawing the app actually ships. A sheet lives
 * in JSONB, so it can hold anything a hand-edited row or an older version left
 * behind; an unknown icon is no icon at all, and the line falls back to its
 * text label rather than rendering a hole.
 */
export function isCategoryIconId(value: unknown): value is CategoryIconId {
  return CATEGORY_ICONS.some(icon => icon.id === value);
}

/** The drawing to show for a line, or `null` when it reads as text. */
export function categoryIconOf(category: CategoryDef): CategoryIconId | null {
  return isCategoryIconId(category.icon) ? category.icon : null;
}

/** A drawing on the sheet, and the words it stands for. */
export interface IconLegendEntry {
  /** The scored line's key — unique, where two lines may share an icon. */
  key: string;
  icon: CategoryIconId;
  label: string;
}

/**
 * What every pictogram on a sheet means, in the order the sheet lays them out.
 *
 * A drawing replaces its line's text, which is the point — the printed pad uses
 * pictograms and two written-out labels can be near-indistinguishable at a
 * glance. But an icon on its own is mute to anyone who doesn't know the game,
 * and on a phone there is no hover to explain it, so the sheet carries this
 * legend and spells them all out.
 */
export function sheetIconLegend(sheet: ScoreSheetItem[]): IconLegendEntry[] {
  const entries: IconLegendEntry[] = [];

  for (const category of sheetCategories(sheet)) {
    const icon = categoryIconOf(category);

    if (icon !== null) {
      entries.push({ key: category.key, icon, label: category.label });
    }
  }

  return entries;
}
