/**
 * Where a scenario comes from: the printed rulebook, or the scenario editor.
 * The two behave differently — an official scenario can be drawn and corrected
 * but never deleted — so the list says which is which rather than leaving the
 * missing bin button to be puzzled over.
 */
export function ScenarioOriginBadge({
  isOfficial,
}: Readonly<{ isOfficial: boolean }>) {
  const tone = isOfficial
    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400";

  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}
      title={
        isOfficial
          ? "Scénario du livret officiel"
          : "Scénario créé dans l'application"
      }
    >
      {isOfficial ? "Officiel" : "Créé dans l'app"}
    </span>
  );
}
