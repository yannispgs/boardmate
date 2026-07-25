"use client";

import { type SpecIssue, specIssueText } from "@/lib/catan/scenario-spec";

/**
 * What still keeps a scenario from being drawn, in the author's words. Empty
 * means the generator can take it — which is exactly when saving is allowed.
 */
export function SpecIssueList({
  issues,
  boardLabels,
}: {
  issues: SpecIssue[];
  /** How each board is named, so an issue says which map it is about. */
  boardLabels: string[];
}) {
  if (issues.length === 0) {
    return (
      <p className="text-sm text-emerald-600 dark:text-emerald-400">
        ✓ Le scénario est complet, il peut être tiré.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5 text-sm text-red-600 dark:text-red-400">
      {issues.map((issue, index) => (
        <li
          // biome-ignore lint/suspicious/noArrayIndexKey: the list is rebuilt whole on every change, and two issues can read exactly alike
          key={index}
          className="flex gap-2"
        >
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
