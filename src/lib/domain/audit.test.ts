import { describe, expect, it } from "vitest";

import type { AuditEntry } from "./audit";
import {
  auditActionLabel,
  auditChanges,
  auditEntryTitle,
  auditFieldLabel,
  auditResourceLabel,
  auditResourceNames,
  filterAuditEntries,
  formatAuditValue,
} from "./audit";
import type { UserId } from "./ids";

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurredAt: "2026-09-23T10:00:00.000Z",
    tableName: "boardgames",
    recordId: "abc",
    recordLabel: "Cascadia",
    action: "update",
    actorId: "user-1" as UserId,
    actorEmail: "moi@example.com",
    actorRoles: ["Administrateur"],
    simulated: false,
    channel: "app",
    txId: "42",
    oldValue: { name: "Cascadia", is_active: true },
    newValue: { name: "Cascadia 2", is_active: true },
    changedKeys: ["name"],
    ...overrides,
  };
}

describe("auditResourceLabel", () => {
  it("names a known table in the reader's words", () => {
    expect(auditResourceLabel("boardgames")).toBe("Jeu");
    expect(auditResourceLabel("user_roles")).toBe("Rôle d'un compte");
  });

  it("falls back to the raw name, so a new table never disappears", () => {
    expect(auditResourceLabel("brand_new_table")).toBe("brand_new_table");
  });
});

describe("auditResourceNames", () => {
  it("lists every known table, sorted by its French name", () => {
    const names = auditResourceNames();

    expect(names).toContain("games");
    expect(names.map(auditResourceLabel)).toEqual(
      [...names.map(auditResourceLabel)].sort((a, b) =>
        a.localeCompare(b, "fr"),
      ),
    );
  });
});

describe("auditActionLabel", () => {
  it("translates the three actions", () => {
    expect(auditActionLabel("insert")).toBe("Ajout");
    expect(auditActionLabel("update")).toBe("Modification");
    expect(auditActionLabel("delete")).toBe("Suppression");
  });
});

describe("auditFieldLabel", () => {
  it("names the columns worth naming and leaves the others alone", () => {
    expect(auditFieldLabel("is_winner")).toBe("vainqueur");
    expect(auditFieldLabel("score_breakdown")).toBe("score_breakdown");
  });
});

describe("auditChanges", () => {
  it("lists only what moved on an update", () => {
    expect(auditChanges(entry())).toEqual([
      {
        column: "name",
        label: "nom",
        before: "Cascadia",
        after: "Cascadia 2",
      },
    ]);
  });

  it("reads an insert as nothing becoming something", () => {
    const changes = auditChanges(
      entry({
        action: "insert",
        oldValue: null,
        newValue: { name: "Odin" },
        changedKeys: [],
      }),
    );

    expect(changes).toEqual([
      { column: "name", label: "nom", before: null, after: "Odin" },
    ]);
  });

  it("lists a whole row in a stable order rather than the one it was stored in", () => {
    // The columns come back in whatever order the row was written, which is the
    // database's business and not a reading order. A new-row line can be long,
    // so the same row must always read the same way.
    const changes = auditChanges(
      entry({
        action: "insert",
        oldValue: null,
        newValue: { status: "ongoing", name: "Odin", is_active: true },
        changedKeys: [],
      }),
    );

    expect(changes.map(change => change.column)).toEqual([
      "is_active",
      "name",
      "status",
    ]);
  });

  it("reads a delete the other way round", () => {
    const changes = auditChanges(
      entry({
        action: "delete",
        oldValue: { name: "Odin" },
        newValue: null,
        changedKeys: [],
      }),
    );

    expect(changes).toEqual([
      { column: "name", label: "nom", before: "Odin", after: null },
    ]);
  });

  it("has nothing to list when both sides are missing", () => {
    const changes = auditChanges(
      entry({
        action: "delete",
        oldValue: null,
        newValue: null,
        changedKeys: [],
      }),
    );

    expect(changes).toEqual([]);
  });
});

describe("formatAuditValue", () => {
  it("shows an absent value as a dash", () => {
    expect(formatAuditValue(null)).toBe("—");
    expect(formatAuditValue(undefined)).toBe("—");
  });

  it("says a boolean in words", () => {
    expect(formatAuditValue(true)).toBe("oui");
    expect(formatAuditValue(false)).toBe("non");
  });

  it("leaves a string or a number as it is", () => {
    expect(formatAuditValue("Cascadia")).toBe("Cascadia");
    expect(formatAuditValue(42)).toBe("42");
  });

  it("shows a structure whole rather than summarised", () => {
    expect(formatAuditValue({ total: "high" })).toBe('{"total":"high"}');
    expect(formatAuditValue([1, 2])).toBe("[1,2]");
  });
});

describe("auditEntryTitle", () => {
  it("names the resource and the row", () => {
    expect(auditEntryTitle(entry())).toBe("Jeu · Cascadia");
  });

  it("falls back to the key when the row had no name", () => {
    expect(auditEntryTitle(entry({ recordLabel: null }))).toBe("Jeu · abc");
  });
});

describe("filterAuditEntries", () => {
  const entries = [
    entry({ id: 1, tableName: "boardgames", action: "update" }),
    entry({
      id: 2,
      tableName: "roles",
      action: "delete",
      actorId: "user-2" as UserId,
    }),
  ];

  it("keeps everything when nothing is asked", () => {
    expect(filterAuditEntries(entries, {})).toHaveLength(2);
  });

  it("narrows on the resource, the action and the author", () => {
    expect(filterAuditEntries(entries, { tableName: "roles" })).toHaveLength(1);
    expect(filterAuditEntries(entries, { action: "update" })).toHaveLength(1);
    expect(
      filterAuditEntries(entries, { actorId: "user-2" as UserId }),
    ).toHaveLength(1);
  });

  it("combines them, so two narrowings can leave nothing", () => {
    expect(
      filterAuditEntries(entries, { tableName: "roles", action: "update" }),
    ).toEqual([]);
  });
});
