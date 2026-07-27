"use client";

import { sectionHeadingClass } from "@/components/ui";

/** One titled block of the editor's side panel, with an optional word of help. */
export function PanelBlock({
  title,
  hint,
  children,
}: Readonly<{
  title: string;
  hint?: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="flex flex-col gap-2">
      <h4 className={sectionHeadingClass}>{title}</h4>
      {hint === undefined ? null : (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
      )}
      {children}
    </section>
  );
}
