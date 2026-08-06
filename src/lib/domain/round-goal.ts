/**
 * One value a goal family can take — the habitat of « Œufs dans X », the nest
 * type of « Nids X avec des œufs ».
 */
export interface RoundGoalOption {
  value: string;
  /** French label shown on the picker ("Mer"). */
  label: string;
  /**
   * Name of the pictogram drawn next to the label, echoing the symbol printed
   * on the tile. Absent when the value is shown as text only.
   */
  icon?: string;
}

/** A goal family's variable part, offered as a short row of choices. */
export interface RoundGoalParam {
  key: string;
  /** What the choice is about ("Écosystème"), shown above the options. */
  label: string;
  options: RoundGoalOption[];
}

/**
 * One end-of-stage goal tile a game of Wingspan can be set up with, authored per
 * boardgame (and per extension, which adds its own tiles to the same catalogue).
 * Goals are **picked**, never typed, so statistics can group on {@link key}.
 *
 * `label` carries a `{paramKey}` placeholder per parameter: it reads as a
 * hole-punched title in the goal list (« Œufs dans X », see
 * {@link goalTemplateLabel}) and is filled in once the value is chosen (« Œufs
 * dans Mer », see {@link formatGoalLabel}). A one-off goal simply has no
 * placeholder and an empty `params`.
 */
export interface RoundGoal {
  key: string;
  label: string;
  params: RoundGoalParam[];
  /**
   * Whether the tile is worth points at all. Defaults to `true`; only Oceania's
   * « Pas d'objectif » sets it to `false`.
   */
  scores?: boolean;
  /**
   * Turns this tile adds to every **following** stage, because its action cube
   * is never spent on the goal board and returns to stock (Oceania's « Pas
   * d'objectif »). Defaults to `0`.
   */
  extraTurn?: number;
}

/** The chosen value of each parameter of a goal, by parameter key. */
export type RoundGoalParams = Record<string, string>;
