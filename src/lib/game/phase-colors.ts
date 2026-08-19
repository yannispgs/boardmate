/**
 * One stable colour per phase, cycled if a game ever declares more than there
 * are colours.
 *
 * Deliberately **not** the player palette: a phase and a player are two
 * different things to look at, and reusing the same six colours would have the
 * stacked bars of « Temps par phase » read like the score curves right above
 * them. The blue leads because the table's stopwatch is blue on the play
 * screen — the colour the phase wore while it was being timed.
 */
export const PHASE_COLORS = ["#3b82f6", "#14b8a6", "#a855f7", "#f97316"];

/**
 * The colour of a phase, taken from its position in the boardgame's declared
 * order so a phase keeps the same colour from the recap to the stats page. A
 * phase absent from the list falls back to the first colour rather than leaving
 * a bar uncoloured.
 */
export function phaseColorOf(
  phases: readonly { key: string }[],
  phaseKey: string,
): string {
  const index = phases.findIndex(phase => phase.key === phaseKey);

  return PHASE_COLORS[Math.max(index, 0) % PHASE_COLORS.length];
}
