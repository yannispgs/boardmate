/**
 * The score a scenario is played to, as it appears at the end of a row. It is
 * fixed by the rules rather than chosen, so it reads as a quiet marker beside
 * the name — and a scenario without one shows nothing at all.
 */
export function ScenarioTarget({
  targetScore,
}: Readonly<{ targetScore: number | null }>) {
  if (targetScore === null) {
    return null;
  }

  return (
    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-500">
      🎯 {targetScore}
    </span>
  );
}
