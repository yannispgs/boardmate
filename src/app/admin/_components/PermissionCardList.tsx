"use client";

import { sectionHeadingClass } from "@/components/ui";
import {
  groupBySection,
  type Permission,
  type Role,
  roleGrants,
} from "@/lib/domain";
import { PermissionCard } from "./PermissionCard";

/**
 * The catalogue, under the section headings the owner chose. The order is the
 * migration's `sort_order`, so the screen and the SQL file always tell the same
 * story.
 */
export function PermissionCardList({
  permissions,
  roles,
}: Readonly<{ permissions: Permission[]; roles: Role[] }>) {
  return (
    <div className="flex flex-col gap-6">
      {groupBySection(permissions).map(section => (
        <section key={section.name} className="flex flex-col">
          <h2
            className={`sticky top-0 z-10 bg-[var(--background)] pt-1 pb-2 ${sectionHeadingClass}`}
          >
            {section.name} · {section.permissions.length}
          </h2>

          <ul className="flex flex-col gap-2">
            {section.permissions.map(permission => (
              <PermissionCard
                key={permission.key}
                permission={permission}
                grantedBy={roles
                  .filter(role => roleGrants(role, permission.key))
                  .map(role => role.label)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
