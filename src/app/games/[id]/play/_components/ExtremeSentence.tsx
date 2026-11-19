import { Fragment } from "react";

import { commonStage, type SharedExtreme } from "@/lib/game/shared-extreme";

/** « 3 », « 3 et 5 », « 2, 3 et 5 ». */
function listed(items: readonly string[]): string {
  return items.length < 2
    ? items.join("")
    : `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`;
}

/** « donne 3 », « donnes 2 et 4 ». */
function ownStages(unit: string, stages: readonly number[]): string {
  const noun = stages.length > 1 ? `${unit}s` : unit;

  return `${noun} ${listed(stages.map(String))}`;
}

/** What goes before the `i`-th of `count` names: nothing, a comma, or « et ». */
function joint(i: number, count: number): string {
  if (i === 0) {
    return "";
  }

  return i === count - 1 ? " et " : ", ";
}

/**
 * Who took a party's extreme, and where: « Lulu et Édouard ont perdu 5 points
 * à la donne 4 » when they took it on the same manche, « Marine (donne 3) et
 * Lulu (donne 4) ont perdu 5 points » otherwise.
 */
export function ExtremeSentence({
  extreme,
  unit,
  verb,
  amount,
  tail,
}: Readonly<{
  extreme: SharedExtreme;
  /** What a manche is called, lower case (« donne »). */
  unit: string;
  /** The verb for one taker, then for several (« a perdu », « ont perdu »). */
  verb: readonly [string, string];
  /** What they took, said after the verb (« 5 points d'un coup »). */
  amount: string;
  /** What it was, said after the dash (« la plus grosse chute de la partie »). */
  tail: string;
}>) {
  const { who } = extreme;
  const stage = commonStage(who);

  return (
    <>
      {who.map((taker, i) => (
        <Fragment key={taker.name}>
          {joint(i, who.length)}
          <span className="font-semibold">{taker.name}</span>
          {stage === null ? ` (${ownStages(unit, taker.stages)})` : ""}
        </Fragment>
      ))}{" "}
      {verb[who.length > 1 ? 1 : 0]} {amount}
      {stage === null ? "" : ` à la ${unit} ${stage}`} — {tail}.
    </>
  );
}
