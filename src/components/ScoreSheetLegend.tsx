"use client";

import type { ScoreSheetItem } from "@/lib/domain";
import { sheetIconLegend } from "@/lib/game/category-icons";

import { CategoryIcon } from "./CategoryIcon";
import { InfoTip } from "./InfoTip";

/**
 * What the pictograms on a score sheet stand for, behind the ⓘ at the head of
 * the category column. A drawing replaces its line's text — which is the point,
 * the printed pad does the same — but it is mute to anyone who doesn't know the
 * game, and a phone has no hover to fall back on, so the words live one tap
 * away. Renders nothing when the sheet uses no icon at all.
 */
export function ScoreSheetLegend({
  sheet,
}: Readonly<{
  sheet: ScoreSheetItem[];
}>) {
  const legend = sheetIconLegend(sheet);

  if (legend.length === 0) {
    return null;
  }

  return (
    <InfoTip label="Légende des symboles">
      {legend.map(entry => (
        <p key={entry.key} className="flex items-center gap-2">
          <CategoryIcon
            id={entry.icon}
            title={entry.label}
            className="h-4 w-4 shrink-0"
          />
          <span className="min-w-0">{entry.label}</span>
        </p>
      ))}
    </InfoTip>
  );
}
