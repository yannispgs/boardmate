import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type {
  BoardgameId,
  ExtensionId,
  FaqEntryId,
  FaqScope,
} from "@/lib/domain";
import { createFaqRepository } from "@/lib/supabase/repositories/faq";
import {
  anonClient,
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

const CATAN_ID = "78047bc0-5293-4787-be48-ba7339d48c2d" as BoardgameId;
const CATAN: FaqScope = { kind: "boardgame", boardgameId: CATAN_ID };
const APP: FaqScope = { kind: "app" };

let user: TestUser;
const written: FaqEntryId[] = [];

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  const admin = serviceClient();

  if (written.length > 0) {
    await admin.from("faq_entries").delete().in("id", written);
  }

  if (user) {
    await deleteTestUser(user.id);
  }
});

function repo() {
  return createFaqRepository(authedClient(user.accessToken));
}

async function ask(scope: FaqScope, question: string, sortOrder = 0) {
  const entry = await repo().create({
    scope,
    question,
    answer: "Réponse.",
    sortOrder,
  });

  written.push(entry.id);

  return entry;
}

describe("faq adapter", () => {
  it("writes a question on a game and reads its scope back", async () => {
    const entry = await ask(CATAN, "Test — le voleur bloque-t-il la route ?");

    expect(entry.scope).toEqual(CATAN);
    expect(entry.answer).toBe("Réponse.");
    expect(typeof entry.createdAt).toBe("string");

    const listed = await repo().list();

    expect(listed.find(e => e.id === entry.id)?.scope).toEqual(CATAN);
  });

  it("writes a question that belongs to no game at all", async () => {
    const entry = await ask(APP, "Test — comment ajouter une partie jouée ?");

    expect(entry.scope).toEqual(APP);
  });

  it("writes a question on an extension", async () => {
    const { data } = await serviceClient()
      .from("extensions")
      .select("id")
      .eq("key", "catan-marins")
      .single();
    const scope: FaqScope = {
      kind: "extension",
      extensionId: data?.id as ExtensionId,
    };

    const entry = await ask(scope, "Test — les pirates bloquent-ils un port ?");

    expect(entry.scope).toEqual(scope);
  });

  it("lists the whole FAQ in reading order", async () => {
    const second = await ask(CATAN, "Test — ordre B", 51);
    const first = await ask(CATAN, "Test — ordre A", 50);
    const listed = await repo().list();
    const mine = listed
      .filter(e => e.id === first.id || e.id === second.id)
      .map(e => e.id);

    expect(mine).toEqual([first.id, second.id]);
  });

  it("rewords a question and its answer", async () => {
    const entry = await ask(CATAN, "Test — à reformuler");

    const updated = await repo().update(entry.id, {
      question: "Test — reformulée",
      answer: "Nouvelle réponse.",
    });

    expect(updated.question).toBe("Test — reformulée");
    expect(updated.answer).toBe("Nouvelle réponse.");
    expect(updated.scope).toEqual(CATAN);
  });

  it("corrects the answer alone, leaving the question as it was", async () => {
    const entry = await ask(CATAN, "Test — réponse seule");

    const updated = await repo().update(entry.id, { answer: "Corrigée." });

    expect(updated.question).toBe("Test — réponse seule");
    expect(updated.answer).toBe("Corrigée.");
  });

  it("corrects the question alone, leaving the answer as it was", async () => {
    const entry = await ask(CATAN, "Test — question seule");

    const updated = await repo().update(entry.id, {
      question: "Test — question corrigée",
    });

    expect(updated.question).toBe("Test — question corrigée");
    expect(updated.answer).toBe("Réponse.");
  });

  it("moves nothing but the order when reordering", async () => {
    const a = await ask(CATAN, "Test — réordonner A", 60);
    const b = await ask(CATAN, "Test — réordonner B", 61);

    await repo().reorder([
      { id: b.id, sortOrder: 60 },
      { id: a.id, sortOrder: 61 },
    ]);

    const listed = await repo().list();
    const orders = new Map(listed.map(e => [e.id, e.sortOrder]));

    expect(orders.get(b.id)).toBe(60);
    expect(orders.get(a.id)).toBe(61);
  });

  it("deletes a question", async () => {
    const entry = await ask(CATAN, "Test — à supprimer");

    await repo().remove(entry.id);

    const listed = await repo().list();

    expect(listed.some(e => e.id === entry.id)).toBe(false);
  });

  it("goes with the game it documents when that game is deleted", async () => {
    const admin = serviceClient();
    const { data: game } = await admin
      .from("boardgames")
      .insert({ name: "Test — jeu éphémère" })
      .select("id")
      .single();
    const entry = await ask(
      { kind: "boardgame", boardgameId: game?.id as BoardgameId },
      "Test — cascade",
    );

    await admin
      .from("boardgames")
      .delete()
      .eq("id", game?.id as string);

    const listed = await repo().list();

    expect(listed.some(e => e.id === entry.id)).toBe(false);
  });

  it("refuses an empty question or an empty answer", async () => {
    await expect(
      repo().create({ scope: APP, question: "", answer: "Réponse." }),
    ).rejects.toThrow(/Ajout de la question/);

    await expect(
      repo().create({ scope: APP, question: "Question ?", answer: "" }),
    ).rejects.toThrow(/Ajout de la question/);
  });

  it("refuses a question hanging off a game and an extension at once", async () => {
    const { data: extension } = await serviceClient()
      .from("extensions")
      .select("id")
      .eq("key", "catan-marins")
      .single();

    const { error } = await authedClient(user.accessToken)
      .from("faq_entries")
      .insert({
        boardgame_id: CATAN_ID,
        extension_id: extension?.id as string,
        question: "Test — deux sujets",
        answer: "Réponse.",
      });

    expect(error).not.toBeNull();
  });

  it("surfaces an update nothing answers", async () => {
    const missing = repo().update(
      "00000000-0000-4000-8000-000000000000" as FaqEntryId,
      { question: "Fantôme ?" },
    );

    await expect(missing).rejects.toThrow(/Mise à jour de la question/);
  });

  it("denies an anonymous visitor every write", async () => {
    const entry = await ask(APP, "Test — anonyme");
    const anon = () => anonClient().from("faq_entries");

    const insert = await anon().insert({
      question: "Anon ?",
      answer: "Anon.",
    });

    expect(insert.error).not.toBeNull();

    // An update or a delete no policy allows isn't an error: RLS hides every
    // row from it, so it touches nothing and the question survives.
    await anon().update({ question: "Anon ?" }).eq("id", entry.id);
    await anon().delete().eq("id", entry.id);

    const { data } = await serviceClient()
      .from("faq_entries")
      .select("question")
      .eq("id", entry.id)
      .single();

    expect(data?.question).toBe("Test — anonyme");
  });

  it("shows an anonymous visitor nothing at all", async () => {
    await ask(APP, "Test — lecture anonyme");

    const { data } = await anonClient().from("faq_entries").select("id");

    expect(data).toEqual([]);
  });
});
