"use client";

import { sectionHeadingClass } from "@/components/ui";
import { groupBySection, type Permission } from "@/lib/domain";
import { PermissionCard } from "./PermissionCard";

/**
 * The catalogue, under the section headings the owner chose. The order is the
 * migration's `sort_order`, so the screen and the SQL file always tell the same
 * story.
 */
export function PermissionCardList({
  permissions,
}: Readonly<{ permissions: Permission[] }>) {
  return (
    <div className="flex flex-col gap-5">
      {groupBySection(permissions).map(section => (
        <section key={section.name} className="flex flex-col">
          <h2
            className={`sticky top-0 z-10 bg-[var(--background)] pt-1 pb-2 ${sectionHeadingClass}`}
          >
            {section.name} · {section.permissions.length}
          </h2>

          <ul className="divide-y divide-black/5 rounded-xl border border-black/10 bg-white dark:divide-white/5 dark:border-white/10 dark:bg-zinc-900">
            {section.permissions.map(permission => (
              <PermissionCard key={permission.key} permission={permission} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
