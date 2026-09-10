import type { PlayerId, RoundGoal } from "@/lib/domain";

/**
 * The Wingspan table the stage suites are written against.
 *
 * `stage.ts` lays a calendar out and `finished-goals.ts` reads the sheet that
 * calendar produced, so the two suites need the same board in front of them:
 * the same four manches, the same two players, the same goal catalogue. Kept in
 * one place so a change to the fixture cannot leave the two halves testing
 * different games — and so the catalogue below is authored once.
 */

/** Wingspan's base calendar: turns per manche, from the longest down. */
export const WINGSPAN = [8, 7, 6, 5];

export const A = "a" as PlayerId;
export const B = "b" as PlayerId;

/**
 * Four goal tiles covering what the calendar has to cope with: one that takes a
 * parameter, two plain ones, and one that scores nothing and hands its turn
 * back to the manche instead.
 */
export const CATALOGUE: RoundGoal[] = [
  {
    key: "eggsInHabitat",
    label: "Œufs dans {habitat}",
    params: [
      {
        key: "habitat",
        label: "Écosystème",
        options: [
          { value: "forest", label: "Forêt" },
          { value: "sea", label: "Mer" },
        ],
      },
    ],
  },
  { key: "totalBirds", label: "Oiseaux au total", params: [] },
  { key: "cheapBirds", label: "Oiseaux à faible coût", params: [] },
  {
    key: "noGoal",
    label: "Pas d'objectif",
    params: [],
    scores: false,
    extraTurn: 1,
  },
];

/** One tile laid on the calendar, with the parameters it was chosen with. */
export function pick(goalKey: string, goalParams: Record<string, string> = {}) {
  return { goalKey, goalParams };
}
