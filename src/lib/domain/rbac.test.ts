import { describe, expect, it } from "vitest";

import type { Permission, Role, RoleId } from "./index";
import {
  groupBySection,
  permissionDiff,
  roleDeleteBlocker,
  roleGrants,
  roleKeyFrom,
} from "./rbac";

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
    description: null,
    isAdmin: false,
    isSystem: false,
    permissionKeys: [],
    assignedCount: 0,
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

describe("roleKeyFrom", () => {
  it("files a name under a plain lowercase handle", () => {
    expect(roleKeyFrom("Gestionnaire de la ludothèque")).toBe(
      "gestionnaire-de-la-ludotheque",
    );
  });

  it("collapses punctuation and trims the dashes it leaves", () => {
    expect(roleKeyFrom("  Maître  du   jeu ! ")).toBe("maitre-du-jeu");
  });

  it("comes back empty when there is nothing to file it under", () => {
    // The screen refuses to save such a name; the key would be the empty string
    // for every one of them, and `roles.key` is unique.
    expect(roleKeyFrom("🎲 🎲")).toBe("");
  });
});

describe("roleDeleteBlocker", () => {
  it("lets an unassigned role go", () => {
    expect(roleDeleteBlocker(role())).toBeNull();
  });

  it("holds on to a role somebody wears, and counts them", () => {
    expect(roleDeleteBlocker(role({ assignedCount: 1 }))).toContain("1 compte");
    expect(roleDeleteBlocker(role({ assignedCount: 3 }))).toContain(
      "3 comptes",
    );
  });

  it("holds on to a role the application ships", () => {
    expect(roleDeleteBlocker(role({ isSystem: true }))).toContain(
      "fourni par l'application",
    );
  });
});

describe("permissionDiff", () => {
  const catalogue = [
    permission("games.read", "Parties", 50),
    permission("boardgames.read", "Jeux", 11),
    permission("boardgames.create", "Jeux", 10),
  ];

  it("names what is gained and what is lost, in catalogue order", () => {
    const diff = permissionDiff(
      ["games.read", "boardgames.read"],
      ["boardgames.create", "boardgames.read"],
      catalogue,
    );

    expect(diff.added).toEqual(["boardgames.create"]);
    expect(diff.removed).toEqual(["games.read"]);
  });

  it("reads a brand new role as pure gain", () => {
    const diff = permissionDiff(
      [],
      ["games.read", "boardgames.create"],
      catalogue,
    );

    expect(diff.added).toEqual(["boardgames.create", "games.read"]);
    expect(diff.removed).toEqual([]);
  });

  it("says nothing changed when nothing did", () => {
    const diff = permissionDiff(["games.read"], ["games.read"], catalogue);

    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
  });

  it("ignores a key the catalogue no longer carries", () => {
    // A permission dropped by a migration can still sit in `role_permissions`
    // for an instant; the recap must not claim a right nobody can name.
    const diff = permissionDiff(["retired.key"], [], catalogue);

    expect(diff.removed).toEqual([]);
  });
});
