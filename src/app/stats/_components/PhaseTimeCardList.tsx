import type { PhaseSpec } from "@/lib/domain";
import { phaseColorOf } from "@/lib/game/phase-colors";
import type { PhaseTotal } from "@/lib/game/phase-stats";
import { PhaseTimeCard } from "./PhaseTimeCard";

/** The phases of the selected game, in the order the rulebook plays them. */
export function PhaseTimeCardList({
  totals,
  phases,
  stageLabel,
}: Readonly<{
  totals: readonly PhaseTotal[];
  phases: readonly PhaseSpec[];
  stageLabel: string;
}>) {
  return (
    <ul className="flex flex-col gap-2">
      {totals.map(total => (
        <PhaseTimeCard
          key={total.key}
          total={total}
          color={phaseColorOf(phases, total.key)}
          stageLabel={stageLabel}
        />
      ))}
    </ul>
  );
}
