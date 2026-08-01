"use client";

import type { Drawable } from "@/lib/catan/scenario-listing";
import type { ExtensionScenarioId } from "@/lib/domain";
import { DrawableScenarioCard } from "./DrawableScenarioCard";

/** The scenarios the generator can draw, in the order they are played in. */
export function DrawableScenarioCardList({
  drawable,
  currentId,
  onPick,
}: Readonly<{
  drawable: Drawable[];
  currentId: ExtensionScenarioId;
  onPick: (id: ExtensionScenarioId) => void;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {drawable.map(item => (
        <DrawableScenarioCard
          key={item.scenario.id}
          drawable={item}
          current={item.scenario.id === currentId}
          onPick={() => onPick(item.scenario.id)}
        />
      ))}
    </ul>
  );
}
