import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  anonClient,
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

// The other half of OWASP A01. `rls.test.ts` proves an anonymous visitor is
// refused; this file proves a *signed-in* one is too, until somebody hands him
// a role. That is the whole point of the RBAC socle: authentication stopped
// being authorisation.

let nobody: TestUser;
let admin: TestUser;
let adminRoleId: string;

beforeAll(async () => {
  [nobody, admin] = await Promise.all([
    createTestUser({ admin: false }),
    createTestUser(),
  ]);

  const { data } = await serviceClient()
    .from("roles")
    .select("id")
    .eq("key", "admin")
    .single();
  adminRoleId = data?.id as string;
});

afterAll(async () => {
  await Promise.all(
    [nobody, admin].filter(Boolean).map(user => deleteTestUser(user.id)),
  );
});

/**
 * An account holding exactly the listed permissions and nothing else, through a
 * throwaway role. Returns a `dispose` so each test drops what it created — the
 * grid is global state, and a leftover role would answer for the next test.
 */
async function userWith(keys: string[]) {
  const service = serviceClient();
  const user = await createTestUser({ admin: false });
  const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const { data: role } = await service
    .from("roles")
    .insert({ key: `spec-${suffix}`, label: `Rôle ${suffix}` })
    .select("*")
    .single();
  const roleId = role?.id as string;

  await service
    .from("role_permissions")
    .insert(keys.map(key => ({ role_id: roleId, permission_key: key })));
  await service
    .from("user_roles")
    .insert({ user_id: user.id, role_id: roleId });

  return {
    db: authedClient(user.accessToken),
    async dispose() {
      await deleteTestUser(user.id);
      await service.from("roles").delete().eq("id", roleId);
    },
  };
}

describe("RBAC — a signed-in account with no role holds nothing", () => {
  it("reads no boardgame, though the catalogue is seeded", async () => {
    const db = authedClient(nobody.accessToken);

    const seeded = await serviceClient().from("boardgames").select("id");
    expect(seeded.data?.length).toBeGreaterThan(0);

    const read = await db.from("boardgames").select("*");
    expect(read.error).toBeNull(); // RLS filters, it does not shout
    expect(read.data).toEqual([]);
  });

  it("is refused when creating a player", async () => {
    const { error } = await authedClient(nobody.accessToken)
      .from("players")
      .insert({ name: `Nobody-${Date.now().toString(36)}` })
      .select("*");

    expect(error?.code).toBe("42501");
  });

  it("changes nothing when updating a boardgame", async () => {
    const admin = serviceClient();
    const { data: seeded } = await admin
      .from("boardgames")
      .insert({ name: `RBAC-${Date.now()}` })
      .select("*")
      .single();
    const id = seeded?.id as string;

    try {
      // A refused UPDATE is silent: zero rows touched, no error at all.
      const update = await authedClient(nobody.accessToken)
        .from("boardgames")
        .update({ name: "Renamed by nobody" })
        .eq("id", id)
        .select("*");
      expect(update.error).toBeNull();
      expect(update.data).toEqual([]);

      const still = await admin
        .from("boardgames")
        .select("name")
        .eq("id", id)
        .single();
      expect(still.data?.name).toBe(seeded?.name);
    } finally {
      await admin.from("boardgames").delete().eq("id", id);
    }
  });

  it("sees the permission catalogue but no role", async () => {
    const db = authedClient(nobody.accessToken);

    const permissions = await db.from("permissions").select("key");
    expect(permissions.data?.length).toBeGreaterThan(0);

    const roles = await db.from("roles").select("key");
    expect(roles.data).toEqual([]);
  });

  it("reports an empty permission list", async () => {
    const { data, error } = await authedClient(nobody.accessToken).rpc(
      "my_permissions",
    );

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});

describe("RBAC — an administrator holds everything", () => {
  it("reports every permission of the catalogue", async () => {
    const catalogue = await serviceClient().from("permissions").select("key");
    const { data } = await authedClient(admin.accessToken).rpc(
      "my_permissions",
    );

    expect(data?.length).toBe(catalogue.data?.length);
  });

  it("holds a permission no role_permissions row grants", async () => {
    // `is_admin` *is* the grant — the seeded role deliberately carries no link
    // rows, so a permission added by a later migration is covered for free.
    const links = await serviceClient()
      .from("role_permissions")
      .select("permission_key")
      .eq("role_id", adminRoleId);
    expect(links.data).toEqual([]);

    const { data } = await authedClient(admin.accessToken).rpc(
      "has_permission",
      { p_key: "boardgames.delete" },
    );
    expect(data).toBe(true);
  });
});

describe("RBAC — the administrator door only closes from the database", () => {
  it("refuses to delete an administrator assignment", async () => {
    const victim = await createTestUser();

    try {
      const del = await authedClient(admin.accessToken)
        .from("user_roles")
        .delete()
        .eq("user_id", victim.id)
        .select("*");
      expect(del.error).toBeNull(); // silent, as every RLS refusal is
      expect(del.data).toEqual([]);

      const still = await serviceClient()
        .from("user_roles")
        .select("user_id")
        .eq("user_id", victim.id);
      expect(still.data?.length).toBe(1);
    } finally {
      await deleteTestUser(victim.id);
    }
  });

  it("refuses to turn the administrator flag off", async () => {
    const { error } = await authedClient(admin.accessToken)
      .from("roles")
      .update({ is_admin: false })
      .eq("id", adminRoleId)
      .select("*");

    expect(error?.code).toBe("42501");
  });

  it("refuses to create a role that is administrator", async () => {
    const { error } = await authedClient(admin.accessToken)
      .from("roles")
      .insert({ key: `evil-${Date.now()}`, label: "Evil", is_admin: true })
      .select("*");

    expect(error?.code).toBe("42501");
  });

  it("refuses to delete the seeded role", async () => {
    const del = await authedClient(admin.accessToken)
      .from("roles")
      .delete()
      .eq("id", adminRoleId)
      .select("*");

    expect(del.error?.code).toBe("23514"); // check_violation, raised by trigger
  });
});

// The five keys the catalogue deliberately splits finer than CRUD. Each pair is
// only worth its extra line if holding one really does refuse the other.
describe("RBAC — keys finer than CRUD", () => {
  it("separates renaming a player from taking him out of the selection", async () => {
    const service = serviceClient();
    const { data: player } = await service
      .from("players")
      .insert({ name: `Split-${Date.now().toString(36)}` })
      .select("*")
      .single();
    const id = player?.id as string;

    const editor = await userWith(["players.read", "players.update"]);
    const remover = await userWith(["players.read", "players.disable"]);

    try {
      const renamed = await editor.db
        .from("players")
        .update({ name: `Renamed-${Date.now().toString(36)}` })
        .eq("id", id)
        .select("*");
      expect(renamed.data?.length).toBe(1);

      const hidden = await editor.db
        .from("players")
        .update({ is_active: false })
        .eq("id", id)
        .select("*");
      expect(hidden.error?.code).toBe("42501");

      const disabled = await remover.db
        .from("players")
        .update({ is_active: false })
        .eq("id", id)
        .select("*");
      expect(disabled.data?.length).toBe(1);

      const misnamed = await remover.db
        .from("players")
        .update({ name: `Nope-${Date.now().toString(36)}` })
        .eq("id", id)
        .select("*");
      expect(misnamed.error?.code).toBe("42501");
    } finally {
      await Promise.all([editor.dispose(), remover.dispose()]);
      await service.from("players").delete().eq("id", id);
    }
  });

  // Owner's rule (2026-08-14): every resource that can be deactivated carries
  // the pair, and the two halves are handed out separately — the hand trusted to
  // tidy up is not automatically the hand that decides who comes back.
  it.each([
    "players",
    "boardgames",
  ] as const)("separates taking a %s row out of the selection from putting it back", async family => {
    const service = serviceClient();
    const { data: row } = await service
      .from(family)
      .insert({ name: `Toggle-${Date.now().toString(36)}` })
      .select("*")
      .single();
    const id = row?.id as string;

    const disabler = await userWith([`${family}.read`, `${family}.disable`]);
    const enabler = await userWith([`${family}.read`, `${family}.enable`]);

    try {
      const overreach = await enabler.db
        .from(family)
        .update({ is_active: false })
        .eq("id", id)
        .select("*");
      expect(overreach.error?.code).toBe("42501");

      const removed = await disabler.db
        .from(family)
        .update({ is_active: false })
        .eq("id", id)
        .select("*");
      expect(removed.data?.length).toBe(1);

      const undone = await disabler.db
        .from(family)
        .update({ is_active: true })
        .eq("id", id)
        .select("*");
      expect(undone.error?.code).toBe("42501");

      const restored = await enabler.db
        .from(family)
        .update({ is_active: true })
        .eq("id", id)
        .select("*");
      expect(restored.data?.length).toBe(1);
    } finally {
      await Promise.all([disabler.dispose(), enabler.dispose()]);
      await service.from(family).delete().eq("id", id);
    }
  });

  it("lets `games.create` write the whole party it just opened", async () => {
    // Owner's rule (2026-08-14): needing `games.updateLive` to finish creating
    // reads like a bug. The setup rows therefore answer to `games.create` too —
    // and the gameplay rows deliberately do not.
    const service = serviceClient();
    const { data: boardgame } = await service
      .from("boardgames")
      .insert({ name: `Funnel-${Date.now()}` })
      .select("*")
      .single();
    const boardgameId = boardgame?.id as string;
    const { data: subject } = await service
      .from("players")
      .insert({ name: `Funnel-${Date.now().toString(36)}` })
      .select("*")
      .single();
    const playerId = subject?.id as string;

    const opener = await userWith(["games.read", "games.create"]);

    try {
      // The very first game of this boardgame: creating it flips `has_games`,
      // which must not be mistaken for editing the fiche.
      const { data: game, error } = await opener.db
        .from("games")
        .insert({ boardgame_id: boardgameId })
        .select("*")
        .single();
      expect(error).toBeNull();

      const gameId = game?.id as string;

      const seated = await opener.db
        .from("game_players")
        .insert({ game_id: gameId, player_id: playerId, seat_order: 0 })
        .select("*");
      expect(seated.error).toBeNull();

      // …but the evening is not his to play.
      const played = await opener.db
        .from("game_turns")
        .insert({
          game_id: gameId,
          round: 1,
          turn_no: 1,
          duration_s: 30,
        })
        .select("*");
      expect(played.error?.code).toBe("42501");
    } finally {
      await opener.dispose();
      await service.from("games").delete().eq("boardgame_id", boardgameId);
      await service.from("players").delete().eq("id", playerId);
      await service.from("boardgames").delete().eq("id", boardgameId);
    }
  });

  it("separates the game being played from the game already filed", async () => {
    const service = serviceClient();
    const { data: boardgame } = await service
      .from("boardgames")
      .insert({ name: `Split-${Date.now()}` })
      .select("*")
      .single();
    const boardgameId = boardgame?.id as string;
    const { data: created } = await service
      .from("games")
      .insert([
        { boardgame_id: boardgameId, status: "ongoing" },
        {
          boardgame_id: boardgameId,
          status: "ended",
          ended_at: new Date().toISOString(),
        },
      ])
      .select("*");
    const live = created?.find(game => game.status === "ongoing")?.id as string;
    const done = created?.find(game => game.status === "ended")?.id as string;

    const player = await userWith(["games.read", "games.updateLive"]);
    const archivist = await userWith(["games.read", "games.updateDone"]);

    try {
      const played = await player.db
        .from("games")
        .update({ round: 2 })
        .eq("id", live)
        .select("*");
      expect(played.data?.length).toBe(1);

      const rewritten = await player.db
        .from("games")
        .update({ round: 9 })
        .eq("id", done)
        .select("*");
      expect(rewritten.data).toEqual([]);

      const corrected = await archivist.db
        .from("games")
        .update({ round: 3 })
        .eq("id", done)
        .select("*");
      expect(corrected.data?.length).toBe(1);

      const meddled = await archivist.db
        .from("games")
        .update({ round: 9 })
        .eq("id", live)
        .select("*");
      expect(meddled.data).toEqual([]);
    } finally {
      await Promise.all([player.dispose(), archivist.dispose()]);
      await service.from("games").delete().eq("boardgame_id", boardgameId);
      await service.from("boardgames").delete().eq("id", boardgameId);
    }
  });

  it("carries the parent's status down to the rows hanging off it", async () => {
    const service = serviceClient();
    const { data: boardgame } = await service
      .from("boardgames")
      .insert({ name: `Child-${Date.now()}` })
      .select("*")
      .single();
    const boardgameId = boardgame?.id as string;
    const { data: created } = await service
      .from("games")
      .insert([
        { boardgame_id: boardgameId, status: "ongoing" },
        {
          boardgame_id: boardgameId,
          status: "ended",
          ended_at: new Date().toISOString(),
        },
      ])
      .select("*");
    const live = created?.find(game => game.status === "ongoing")?.id as string;
    const done = created?.find(game => game.status === "ended")?.id as string;

    const player = await userWith(["games.read", "games.updateLive"]);

    try {
      const turn = { round: 1, turn_no: 1, duration_s: 30 };

      const onLive = await player.db
        .from("game_turns")
        .insert({ game_id: live, ...turn })
        .select("*");
      expect(onLive.error).toBeNull();

      const onDone = await player.db
        .from("game_turns")
        .insert({ game_id: done, ...turn })
        .select("*");
      expect(onDone.error?.code).toBe("42501");
    } finally {
      await player.dispose();
      await service.from("games").delete().eq("boardgame_id", boardgameId);
      await service.from("boardgames").delete().eq("id", boardgameId);
    }
  });

  it("separates a game's fiche from its barème, column by column", async () => {
    const service = serviceClient();
    const { data: boardgame } = await service
      .from("boardgames")
      .insert({ name: `Fiche-${Date.now()}` })
      .select("*")
      .single();
    const id = boardgame?.id as string;

    const editor = await userWith(["boardgames.read", "boardgames.update"]);
    const scorer = await userWith([
      "boardgames.read",
      "boardgames.updateScoring",
    ]);

    try {
      const renamed = await editor.db
        .from("boardgames")
        .update({ name: `Fiche-renamed-${Date.now()}` })
        .eq("id", id)
        .select("*");
      expect(renamed.data?.length).toBe(1);

      // Same row, same UPDATE — only the column tells them apart, which is why
      // this one is refused by a trigger and not by the policy.
      const rescored = await editor.db
        .from("boardgames")
        .update({ scoring: { mode: "final" } })
        .eq("id", id)
        .select("*");
      expect(rescored.error?.code).toBe("42501");

      const scored = await scorer.db
        .from("boardgames")
        .update({ scoring: { mode: "final" } })
        .eq("id", id)
        .select("*");
      expect(scored.data?.length).toBe(1);

      const misnamed = await scorer.db
        .from("boardgames")
        .update({ name: `Nope-${Date.now()}` })
        .eq("id", id)
        .select("*");
      expect(misnamed.error?.code).toBe("42501");
    } finally {
      await Promise.all([editor.dispose(), scorer.dispose()]);
      await service.from("boardgames").delete().eq("id", id);
    }
  });

  it("separates composing a role from handing it out", async () => {
    const service = serviceClient();
    const composer = await userWith(["roles.read", "roles.update"]);
    const granter = await userWith(["roles.read", "roles.assign"]);
    const subject = await createTestUser({ admin: false });
    const { data: role } = await service
      .from("roles")
      .insert({ key: `handout-${Date.now()}`, label: "À distribuer" })
      .select("*")
      .single();
    const roleId = role?.id as string;

    try {
      const composed = await composer.db
        .from("role_permissions")
        .insert({ role_id: roleId, permission_key: "faq.read" })
        .select("*");
      expect(composed.error).toBeNull();

      const handedOut = await composer.db
        .from("user_roles")
        .insert({ user_id: subject.id, role_id: roleId })
        .select("*");
      expect(handedOut.error?.code).toBe("42501");

      const granted = await granter.db
        .from("user_roles")
        .insert({ user_id: subject.id, role_id: roleId })
        .select("*");
      expect(granted.error).toBeNull();

      // …and the admin door stays shut in this direction too, or `roles.assign`
      // would be a one-step promotion to administrator.
      const promoted = await granter.db
        .from("user_roles")
        .insert({ user_id: subject.id, role_id: adminRoleId })
        .select("*");
      expect(promoted.error?.code).toBe("42501");
    } finally {
      await Promise.all([composer.dispose(), granter.dispose()]);
      await deleteTestUser(subject.id);
      await service.from("roles").delete().eq("id", roleId);
    }
  });
});

// `accounts()` is the one function in the schema that reaches into `auth`, so
// it is the one worth pressing on: it runs past RLS by construction, and the
// table next to the one it reads holds password hashes and recovery tokens.
describe("RBAC — naming the accounts a role can be handed to", () => {
  it("answers an account with no role with an empty list, not an error", async () => {
    const { data, error } = await authedClient(nobody.accessToken).rpc(
      "accounts",
    );

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("is out of reach of an anonymous visitor", async () => {
    const { error } = await anonClient().rpc("accounts");

    expect(error).not.toBeNull();
  });

  it("hands `roles.read` the identities, and strictly nothing else", async () => {
    const reader = await userWith(["roles.read"]);

    try {
      const { data, error } = await reader.db.rpc("accounts");

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);

      const listed = data?.find(row => row.user_id === admin.id);

      expect(listed?.email).toBe(admin.email);
      // Four columns, named one by one: `select *` on `auth.users` would have
      // handed over `encrypted_password` and every recovery token beside it.
      expect(Object.keys(listed ?? {}).sort()).toEqual([
        "created_at",
        "email",
        "last_sign_in_at",
        "user_id",
      ]);
    } finally {
      await reader.dispose();
    }
  });

  it("leaves out an account that has been deleted", async () => {
    const gone = await createTestUser({ admin: false });

    try {
      // Soft delete: the row survives in `auth.users` with `deleted_at` set,
      // and it is nobody to hand a role to.
      await serviceClient().auth.admin.deleteUser(gone.id, true);

      const { data } = await authedClient(admin.accessToken).rpc("accounts");

      expect(data?.some(row => row.user_id === gone.id)).toBe(false);
    } finally {
      await deleteTestUser(gone.id);
    }
  });
});

describe("RBAC — a composed role grants exactly what it lists", () => {
  it("opens reading and nothing else", async () => {
    const service = serviceClient();
    const reader = await createTestUser({ admin: false });
    const { data: role } = await service
      .from("roles")
      .insert({ key: `reader-${Date.now()}`, label: "Lecteur" })
      .select("*")
      .single();
    const roleId = role?.id as string;

    try {
      await service
        .from("role_permissions")
        .insert({ role_id: roleId, permission_key: "boardgames.read" });
      await service
        .from("user_roles")
        .insert({ user_id: reader.id, role_id: roleId });

      const db = authedClient(reader.accessToken);

      const read = await db.from("boardgames").select("id");
      expect(read.data?.length).toBeGreaterThan(0);

      const created = await db
        .from("boardgames")
        .insert({ name: `Nope-${Date.now()}` })
        .select("*");
      expect(created.error?.code).toBe("42501");

      const { data: mine } = await db.rpc("my_permissions");
      expect(mine).toEqual(["boardgames.read"]);
    } finally {
      await deleteTestUser(reader.id);
      await service.from("roles").delete().eq("id", roleId);
    }
  });

  it("refuses a billable permission on a role that is not administrator", async () => {
    const service = serviceClient();
    const { data: role } = await service
      .from("roles")
      .insert({ key: `billing-${Date.now()}`, label: "Payant" })
      .select("*")
      .single();
    const roleId = role?.id as string;
    const key = "boardgames.delete";

    try {
      await service
        .from("permissions")
        .update({ billable: true })
        .eq("key", key);

      const { error } = await service
        .from("role_permissions")
        .insert({ role_id: roleId, permission_key: key })
        .select("*");
      expect(error?.code).toBe("23514");
    } finally {
      await service
        .from("permissions")
        .update({ billable: false })
        .eq("key", key);
      await service.from("roles").delete().eq("id", roleId);
    }
  });
});
