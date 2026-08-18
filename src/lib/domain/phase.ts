/**
 * The phases a stage is played in, and what clock each one runs.
 *
 * A stage (Terraforming Mars' « Génération », L'Île des Chats' « Manche ») is
 * not one undifferentiated block of time: the table spends part of it all
 * playing at once and part of it going round one by one, and those two want
 * opposite clocks. Timing the whole stage with the per-player countdown that
 * fits the middle of it would put a turn timer on a phase nobody takes turns
 * in.
 *
 * Phases are therefore **data on the boardgame**, never code keyed on its name:
 * two games already need them and the third is only a migration away.
 */

/** How the table plays a phase. */
export type PhaseMode =
  /** Everybody at once — the phase has no turns and nobody is "up". */
  | "simultaneous"
  /** One player at a time, in seat order, as the rest of the app already does. */
  | "sequential";

/** What the phase is timed with. */
export type PhaseClock =
  /**
   * A table stopwatch counting up: the phase belongs to everyone, so the time
   * it takes is the table's, not any one player's.
   */
  | "stopwatch"
  /**
   * The per-player countdown the app already runs. Only these phases read the
   * game's turn-timer configuration — which is what makes « the timer settings
   * only concern the sequential phase » true without a line of code saying so.
   */
  | "turnTimer"
  /** Nothing is timed. */
  | "none";

/** Which way cards travel when a phase is drafted. */
export type DraftDirection = "left" | "right";

/**
 * A phase whose draw can be played as a draft, and how the cards then go round.
 *
 * The draft is a **variant**, so nothing here shows until the game's own
 * configuration turns it on — hence `configKey` rather than a hard-coded flag.
 * The direction alternates from one stage to the next, which is precisely the
 * thing a table stops agreeing on by the third generation.
 */
export interface PhaseDraft {
  /** The boolean config field that turns the draft on for this game. */
  configKey: string;
  /**
   * Which way the cards go on an **odd** stage (the first one). It alternates
   * from there, so this single value settles every stage after it.
   */
  oddStage: DraftDirection;
}

/** One phase of a stage. */
export interface PhaseSpec {
  /** Stable identifier, used to record and read the phase back. */
  key: string;
  /** What the rulebook calls it — shown as the phase's name. */
  label: string;
  mode: PhaseMode;
  clock: PhaseClock;
  /** Present only on a phase that can be drafted; see {@link PhaseDraft}. */
  draft?: PhaseDraft;
}
