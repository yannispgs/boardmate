"use client";

import type { FaqEntry, FaqScope } from "@/lib/domain";
import { scopeKey } from "@/lib/game/faq";
import { FaqSection } from "./FaqSection";

/**
 * The FAQ of a game in progress, section by section: the game first, then each
 * extension being played with.
 */
export function FaqSectionList({
  sections,
  label,
}: Readonly<{
  sections: Array<{ scope: FaqScope; entries: FaqEntry[] }>;
  /** What a section is called — the game's name, or the extension's. */
  label: (scope: FaqScope) => string;
}>) {
  return (
    <>
      {sections.map(section => (
        <FaqSection
          key={scopeKey(section.scope)}
          title={label(section.scope)}
          entries={section.entries}
        />
      ))}
    </>
  );
}
