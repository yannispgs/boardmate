"use client";

import { sectionHeadingClass } from "@/components/ui";
import { groupBySection, type Permission } from "@/lib/domain";
import { PermissionCard, type PermissionToggle } from "./PermissionCard";

/**
 * The catalogue, under the section headings the owner chose. The order is the
 * migration's `sort_order`, so the screen and the SQL file always tell the same
 * story.
 *
 * Pass `toggleFor` to turn it into the grid a role is composed from: same
 * sections, same order, one box per line.
 */
export function PermissionCardList({
  permissions,
  headingBackground = "bg-[var(--background)]",
  toggleFor,
}: Readonly<{
  permissions: Permission[];
  /**
   * What the sticky headings sit on. The page's own background by default;
   * a modal's card is a different colour, and a heading that keeps the page's
   * would scroll as a floating band of the wrong shade.
   */
  headingBackground?: string;
  toggleFor?: (permission: Permission) => PermissionToggle;
}>) {
  return (
    <div className="flex flex-col gap-5">
      {groupBySection(permissions).map(section => (
        <section key={section.name} className="flex flex-col">
          <h2
            className={`sticky top-0 z-10 pt-1 pb-2 ${headingBackground} ${sectionHeadingClass}`}
          >
            {section.name} · {section.permissions.length}
          </h2>

          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-zinc-900">
            {section.permissions.map(permission => (
              <PermissionCard
                key={permission.key}
                permission={permission}
                toggle={toggleFor?.(permission)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
