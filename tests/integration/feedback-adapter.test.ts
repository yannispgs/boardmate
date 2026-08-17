import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createFeedbackRepository } from "@/lib/supabase/repositories/feedback";
import {
  authedClient,
  createTestUser,
  deleteTestUser,
  serviceClient,
  type TestUser,
} from "./client";

let user: TestUser;
const createdIds: string[] = [];

beforeAll(async () => {
  user = await createTestUser();
});

afterAll(async () => {
  const admin = serviceClient();
  if (createdIds.length > 0) {
    await admin.from("feedback").delete().in("id", createdIds);
  }
  if (user) {
    await deleteTestUser(user.id);
  }
});

function repo() {
  return createFeedbackRepository(authedClient(user.accessToken));
}

describe("feedback adapter", () => {
  it("creates an idea and lists ideas newest first", async () => {
    const first = await repo().create({ message: "Idée A" });
    const second = await repo().create({ message: "Idée B" });
    createdIds.push(first.id, second.id);

    expect(first.message).toBe("Idée A");
    expect(typeof first.createdAt).toBe("string");

    const listed = await repo().list();
    const mine = listed.filter(f => createdIds.includes(f.id));

    // Newest first: B (created last) comes before A.
    expect(mine.map(f => f.id)).toEqual([second.id, first.id]);
  });

  it("files an idea as untriaged, and reads back a stage set out of band", async () => {
    const created = await repo().create({ message: "Idée C" });
    createdIds.push(created.id);

    expect(created.status).toBe("new");

    // The stage is only ever written out of band (management API, during the
    // review); the service role stands in for it here.
    await serviceClient()
      .from("feedback")
      .update({ status: "development" })
      .eq("id", created.id);

    const listed = await repo().list();

    expect(listed.find(f => f.id === created.id)?.status).toBe("development");
  });

  it("rejects an empty message (DB check constraint)", async () => {
    await expect(repo().create({ message: "" })).rejects.toThrow();
  });
});
