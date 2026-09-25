import type { UserId } from "./ids";

/** What was done to the row. The three SQL commands, and no fourth. */
export type AuditAction = "insert" | "update" | "delete";

/**
 * Where the write came in from. `out-of-session` means nobody was signed in —
 * a migration, or a hand-run query through the management API. It is not
 * suspicious by itself; it is the first thing to look at when something is.
 */
export type AuditChannel = "app" | "out-of-session";

/** One line of the modification history. Nothing here is ever rewritten. */
export interface AuditEntry {
  id: number;
  /** ISO 8601 timestamp. */
  occurredAt: string;
  /** The table the row lives in — the raw name, translated for display. */
  tableName: string;
  /** Its primary key, composite ones joined by `/`. */
  recordId: string;
  /** What it was called at the time; `null` when the row had no name to give. */
  recordLabel: string | null;
  action: AuditAction;
  actorId: UserId | null;
  actorEmail: string | null;
  /** The role labels held at that instant, frozen. */
  actorRoles: string[];
  /** A simulated role was narrowing those rights. */
  simulated: boolean;
  channel: AuditChannel;
  /** Groups the writes of one transaction, so one act reads as one act. */
  txId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  /** The columns that moved; empty on an insert or a delete. */
  changedKeys: string[];
}

/**
 * The tables in the reader's words. Keyed on the raw table name because that is
 * what the database writes down — the history has to stay readable years after
 * a screen has been renamed, so the mapping lives here rather than in the row.
 */
const RESOURCE_LABELS: Readonly<Record<string, string>> = {
  boardgames: "Jeu",
  config_templates: "Gabarit de configuration",
  configs: "Configuration",
  extension_scenarios: "Scénario",
  extensions: "Extension",
  faq_entries: "Question de la FAQ",
  feedback: "Retour",
  game_extensions: "Extension d'une partie",
  game_players: "Joueur d'une partie",
  game_stage_scores: "Score de manche",
  game_stages: "Manche",
  games: "Partie",
  permission_simulations: "Simulation de rôle",
  permissions: "Permission",
  players: "Joueur",
  role_permissions: "Permission d'un rôle",
  roles: "Rôle",
  score_events: "Point marqué",
  user_roles: "Rôle d'un compte",
};

/**
 * What to call the table on screen. An unknown one answers with its own name
 * rather than a blank: a table added tomorrow and forgotten here must still
 * show up in the history, under an ugly name, instead of disappearing from it.
 */
export function auditResourceLabel(tableName: string): string {
  return RESOURCE_LABELS[tableName] ?? tableName;
}

/** Every table the history knows a name for, sorted for a filter list. */
export function auditResourceNames(): string[] {
  return Object.keys(RESOURCE_LABELS).sort((a, b) =>
    auditResourceLabel(a).localeCompare(auditResourceLabel(b), "fr"),
  );
}

const ACTION_LABELS: Readonly<Record<AuditAction, string>> = {
  insert: "Ajout",
  update: "Modification",
  delete: "Suppression",
};

export function auditActionLabel(action: AuditAction): string {
  return ACTION_LABELS[action];
}

/**
 * The columns worth naming, in French. Deliberately keyed on the column alone
 * and deliberately partial: a column nobody reads keeps its raw name, which is
 * honest, where a guessed translation would be a second thing to verify.
 */
const FIELD_LABELS: Readonly<Record<string, string>> = {
  description: "description",
  ended_at: "fin",
  expires_at: "expiration",
  is_active: "actif",
  is_admin: "administrateur",
  is_official: "officiel",
  is_winner: "vainqueur",
  key: "clé",
  label: "libellé",
  message: "message",
  name: "nom",
  permission_key: "permission",
  question: "question",
  role_ids: "rôles simulés",
  scoring: "barème",
  seat_order: "place à table",
  score: "score",
  started_at: "début",
  status: "statut",
  target_score: "score à atteindre",
  tie_break: "départage",
};

export function auditFieldLabel(column: string): string {
  return FIELD_LABELS[column] ?? column;
}

/** One column that moved, with what it held on either side. */
export interface AuditChange {
  column: string;
  label: string;
  before: unknown;
  after: unknown;
}

/**
 * What actually changed, ready to list. An insert reads as « rien → la valeur »
 * and a delete the other way round, so the three actions render through one
 * component instead of three.
 *
 * The keys come from the row itself for an insert or a delete — the database
 * only fills `changedKeys` for an update, where « ce qui a bougé » is a
 * different question from « ce qu'il y a dedans ».
 */
export function auditChanges(entry: AuditEntry): AuditChange[] {
  const columns =
    entry.action === "update"
      ? entry.changedKeys
      : Object.keys(entry.newValue ?? entry.oldValue ?? {}).sort((a, b) =>
          a.localeCompare(b),
        );

  return columns.map(column => ({
    column,
    label: auditFieldLabel(column),
    before: entry.oldValue?.[column] ?? null,
    after: entry.newValue?.[column] ?? null,
  }));
}

/**
 * A stored value as one line of text. Objects and arrays are shown as their
 * JSON: a scoring spec or a drawn board has no short reading, and an admin
 * looking for what somebody changed would rather see the whole thing than a
 * summary that hides the one field he is after.
 */
export function formatAuditValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "oui" : "non";
  }

  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return JSON.stringify(value);
}

/**
 * How an entry reads in one line, for the list: the resource, then the name the
 * row went by. A row that had no name falls back to its key — there is always
 * something to point at.
 *
 * A simulation reads as a sentence instead — « Simulation de Joueur + Gestionnaire »
 * — so the line says in the same words as the banner which view was opened.
 * With no name left (every role it looked through deleted since), it falls
 * back to the ordinary reading.
 */
export function auditEntryTitle(entry: AuditEntry): string {
  if (entry.tableName === "permission_simulations" && entry.recordLabel) {
    return `Simulation de ${entry.recordLabel}`;
  }

  return `${auditResourceLabel(entry.tableName)} · ${entry.recordLabel ?? entry.recordId}`;
}

/** What the history is narrowed to. Every field left out means « tout ». */
export interface AuditFilter {
  tableName?: string;
  action?: AuditAction;
  actorId?: UserId;
}

/**
 * Applies the filter. Done here rather than in the query because the screen
 * re-narrows a page already fetched, and because a pure function is the only
 * version of this that can be tested without a database.
 */
export function filterAuditEntries(
  entries: AuditEntry[],
  filter: AuditFilter,
): AuditEntry[] {
  return entries.filter(
    entry =>
      (filter.tableName === undefined ||
        entry.tableName === filter.tableName) &&
      (filter.action === undefined || entry.action === filter.action) &&
      (filter.actorId === undefined || entry.actorId === filter.actorId),
  );
}
