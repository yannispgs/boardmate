import { describe, expect, it } from "vitest";

import type { Permission, Role, RoleId } from "./index";
import { groupBySection, roleGrants } from "./rbac";

function permission(
  key: string,
  section: string,
  sortOrder: number,
): Permission {
  return {
    key,
    section,
    action: "read",
    label: key,
    billable: false,
    sortOrder,
  };
}

function role(overrides: Partial<Role> = {}): Role {
  return {
    id: "role-1" as RoleId,
    key: "reader",
    label: "Lecteur",
    isAdmin: false,
    isSystem: false,
    permissionKeys: [],
    ...overrides,
  };
}

describe("groupBySection", () => {
  it("groups by section, in sort order", () => {
    const sections = groupBySection([
      permission("games.read", "Parties", 50),
      permission("boardgames.read", "Jeux", 11),
      permission("boardgames.create", "Jeux", 10),
    ]);

    expect(sections.map(s => s.name)).toEqual(["Jeux", "Parties"]);
    expect(sections[0].permissions.map(p => p.key)).toEqual([
      "boardgames.create",
      "boardgames.read",
    ]);
  });

  it("opens a new section when the same name comes back later", () => {
    // Sections are read off consecutive runs, so a catalogue whose sort order
    // interleaves them says so rather than quietly merging the halves.
    const sections = groupBySection([
      permission("a", "Jeux", 10),
      permission("b", "Parties", 20),
      permission("c", "Jeux", 30),
    ]);

    expect(sections.map(s => s.name)).toEqual(["Jeux", "Parties", "Jeux"]);
  });

  it("returns nothing for an empty catalogue", () => {
    expect(groupBySection([])).toEqual([]);
  });

  it("leaves the input untouched", () => {
    const catalogue = [
      permission("b", "Jeux", 20),
      permission("a", "Jeux", 10),
    ];
    groupBySection(catalogue);

    expect(catalogue.map(p => p.key)).toEqual(["b", "a"]);
  });
});

describe("roleGrants", () => {
  it("grants what the role lists", () => {
    const reader = role({ permissionKeys: ["faq.read"] });

    expect(roleGrants(reader, "faq.read")).toBe(true);
    expect(roleGrants(reader, "faq.update")).toBe(false);
  });

  it("grants everything to an administrator role, listed or not", () => {
    const admin = role({ isAdmin: true, permissionKeys: [] });

    expect(roleGrants(admin, "anything.at.all")).toBe(true);
  });
});
