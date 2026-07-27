"use client";

import { type SpecIssue, specIssueText } from "@/lib/catan/scenario-spec";

/**
 * One key per issue, leaning on what it says rather than on where it sits: the
 * board it is about, its wording, and how many issues before it read exactly
 * alike — two boards can raise the very same complaint, word for word.
 */
function keyed(issues: SpecIssue[]): { key: string; issue: SpecIssue }[] {
  const seen = new Map<string, number>();

  return issues.map(issue => {
    const said = `${"board" in issue ? issue.board : "-"}:${specIssueText(issue)}`;
    const before = seen.get(said) ?? 0;

    seen.set(said, before + 1);

    return { key: `${said}#${before}`, issue };
  });
}

/**
 * What still keeps a scenario from being saved, in the author's words. Empty
 * means the map is drawn to its edges and the generator can take it.
 */
export function SpecIssueList({
  issues,
  boardLabels,
}: Readonly<{
  issues: SpecIssue[];
  /** How each board is named, so an issue says which map it is about. */
  boardLabels: string[];
}>) {
  if (issues.length === 0) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        ✓ Le scénario est complet, il peut être tiré.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 text-sm text-red-600 dark:text-red-400">
      {keyed(issues).map(({ key, issue }) => (
        <li key={key} className="flex gap-2">
          <span aria-hidden>•</span>
          <span>
            {"board" in issue && boardLabels.length > 1 ? (
              <span className="text-zinc-500 dark:text-zinc-400">
                {boardLabels[issue.board]} —{" "}
              </span>
            ) : null}
            {specIssueText(issue)}
          </span>
        </li>
      ))}
    </ul>
  );
}
