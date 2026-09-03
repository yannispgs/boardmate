"use client";

/**
 * A switch between two named readings: both names are written, greyed, and the
 * one in force is the one in bold.
 *
 * It is not a checkbox with different paint, and it is not a checkbox with one
 * label either. A tick box says « something is being filtered » and leaves the
 * reader to work out what the unticked state was; here both states are on
 * screen, so what the figures below are counted on can be read without
 * touching anything.
 *
 * Each name is its own target as well as the track. Clicking « Toutes les
 * parties » always means « montre-moi toutes les parties » — where clicking a
 * name that also merely flips the switch would mean the opposite half of the
 * time, which is the trap of writing both ends and keeping one control.
 */
export function Toggle({
  off,
  on,
  checked,
  onChange,
  className,
}: Readonly<{
  /** The reading in force when the switch is off — the honest default. */
  off: string;
  /** The reading it switches to, and the switch's own name. */
  on: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Placement only — the switch reads the same everywhere. */
  className?: string;
}>) {
  return (
    <div
      className={`flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 ${
        className ?? ""
      }`}
    >
      <Side label={off} active={!checked} onClick={() => onChange(false)} />

      <button
        type="button"
        // Not for compliance: `switch` is what makes this findable in the e2e
        // suite, and `aria-checked` is what lets a test read its state. The
        // name is the reading it turns on, since that is what the state means.
        role="switch"
        aria-checked={checked}
        aria-label={on}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-indigo-500" : "bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span
          // The knob is the one thing on this screen that moves on a state
          // change, so it slides rather than jumps — 150 ms, the length of a
          // switch being flicked.
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>

      <Side label={on} active={checked} onClick={() => onChange(true)} />
    </div>
  );
}

/** One of the two names, bold while it is the one being counted on. */
function Side({
  label,
  active,
  onClick,
}: Readonly<{ label: string; active: boolean; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left ${active ? "font-semibold" : ""}`}
    >
      {label}
    </button>
  );
}
