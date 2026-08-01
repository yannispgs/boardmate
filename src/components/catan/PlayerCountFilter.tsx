"use client";

import { OptionPicker } from "@/components/OptionPicker";
import type { PlayerFilter } from "@/lib/catan/scenario-listing";

/**
 * Narrows a list of scenarios to those playable at a given seat count. A Marins
 * scenario is drawn for an exact number of players, and the one being looked for
 * is almost always "what we can play tonight" — so the count comes first and the
 * scenarios that cannot seat it are simply not offered.
 *
 * Nothing is shown when every scenario seats the same counts: a filter with one
 * outcome is a button that does nothing.
 */
export function PlayerCountFilter({
  counts,
  value,
  onChange,
}: Readonly<{
  counts: number[];
  value: PlayerFilter;
  onChange: (value: PlayerFilter) => void;
}>) {
  if (counts.length < 2) {
    return null;
  }

  return (
    <OptionPicker<PlayerFilter>
      variant="segmented"
      label="Filtrer par joueurs"
      options={[
        { value: "all", label: "Tous" },
        ...counts.map(count => ({ value: count, label: `${count}` })),
      ]}
      value={value}
      onChange={onChange}
    />
  );
}
