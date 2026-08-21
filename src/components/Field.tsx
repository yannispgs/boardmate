"use client";

import { type ReactNode, useId } from "react";

import { InfoTip } from "./InfoTip";

/**
 * One form field: its caption, an info tip explaining what the field does — and
 * what each value means, when it only accepts a fixed few — and the control
 * itself, built from the `id` that ties it to the caption.
 *
 * Spelled out under the field, those explanations pushed the rest of the form
 * off a phone screen; behind the "i" they are one tap away and cost no height.
 *
 * The control is tied to the caption by `id` rather than wrapped in the
 * `label`, because a `label` labels the **first labelable element it contains**
 * — and a `button` is one. With the tip's button sitting beside the caption, a
 * wrapping label would name the button and leave the field itself nameless.
 */
export function Field({
  label,
  tip,
  tipLabel,
  className = "flex flex-col gap-1 text-xs text-zinc-500",
  children,
}: Readonly<{
  label: ReactNode;
  tip: ReactNode;
  tipLabel: string;
  /** Overrides the field's own layout; the caption row keeps its own. */
  className?: string;
  children: (id: string) => ReactNode;
}>) {
  const id = useId();

  return (
    <div className={className}>
      <span className="flex items-center gap-1">
        <label htmlFor={id}>{label}</label>
        <InfoTip label={tipLabel}>{tip}</InfoTip>
      </span>
      {children(id)}
    </div>
  );
}
