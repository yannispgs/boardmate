/**
 * The stable identifier a hand-authored list item is given when it is created.
 *
 * Labels are typed, corrected and retyped; the key is what the recorded points
 * and the replayed tie-breaks were filed under, so it must survive every one of
 * those edits. Deriving it from the label would rename it along with the typo
 * it fixes, which is why nothing here reads the label at all.
 *
 * Pure: no vendor types, unit-tested.
 */

/** A fresh key for a new item — short enough to read in a JSONB dump. */
export function newEditorKey(): string {
  return crypto.randomUUID().slice(0, 8);
}
