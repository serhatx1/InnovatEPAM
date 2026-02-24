import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  cleanupTestUser,
  promoteToAdmin,
  testEmail,
  TestUser,
} from "./supabase-helper";
import { listIdeas, getIdeaById, createIdea, updateIdeaStatus, ideaExists } from "@/lib/queries/ideas";
import { getUserRole } from "@/lib/queries/profiles";
import { IDEA_CATEGORIES } from "@/lib/constants";

/**
 * Supabase Integration Tests
 *
 * These tests hit the REAL Supabase instance.
 * They create test users, perform operations, and clean up after themselves.
 *
 * Required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

describe("Supabase Integration: Auth & Profiles", () => {
  let submitter: TestUser;
  let admin: TestUser;

  beforeAll(async () => {
    submitter = await createTestUser(testEmail("submitter"));
    admin = await createTestUser(testEmail("admin"));
    await promoteToAdmin(admin.id);
  }, 30_000);

  afterAll(async () => {
    await cleanupTestUser(submitter.id);
    await cleanupTestUser(admin.id);
  }, 30_000);

  it("auto-creates a user_profile on signup with submitter role", async () => {
    const role = await getUserRole(submitter.client, submitter.id);
    expect(role).toBe("submitter");
  });

  it("returns admin role after promotion", async () => {
    const role = await getUserRole(admin.client, admin.id);
    expect(role).toBe("admin");
  });

  it("submitter can read own profile", async () => {
    const { data } = await submitter.client
      .from("user_profile")
      .select("*")
      .eq("id", submitter.id)
      .single();

    expect(data).not.toBeNull();
    expect(data!.email).toBe(submitter.email);
    expect(data!.role).toBe("submitter");
  });

  it("admin can read other users' profiles", async () => {
    const { data } = await admin.client
      .from("user_profile")
      .select("*")
      .eq("id", submitter.id)
      .single();

    expect(data).not.toBeNull();
    expect(data!.email).toBe(submitter.email);
  });
});

describe("Supabase Integration: Ideas CRUD", () => {
  let submitter: TestUser;
  let admin: TestUser;
  let createdIdeaId: string;

  beforeAll(async () => {
    submitter = await createTestUser(testEmail("idea-sub"));
    admin = await createTestUser(testEmail("idea-admin"));
    await promoteToAdmin(admin.id);
  }, 30_000);

  afterAll(async () => {
    await cleanupTestUser(submitter.id);
    await cleanupTestUser(admin.id);
  }, 30_000);

  it("submitter can create an idea", async () => {
    const { data, error } = await createIdea(submitter.client, {
      user_id: submitter.id,
      title: "Integration Test Idea",
      description: "This idea was created by an integration test to verify Supabase connectivity.",
      category: IDEA_CATEGORIES[0],
      attachment_url: null,
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Integration Test Idea");
    expect(data!.status).toBe("submitted");
    expect(data!.user_id).toBe(submitter.id);

    createdIdeaId = data!.id;
  });

  it("submitter can list their own ideas", async () => {
    const { data, error } = await listIdeas(submitter.client, { userId: submitter.id });

    expect(error).toBeNull();
    expect(data.length).toBeGreaterThanOrEqual(1);
    expect(data.some((i) => i.id === createdIdeaId)).toBe(true);
  });

  it("all authenticated users can read all ideas (FR-17)", async () => {
    const { data, error } = await listIdeas(admin.client);

    expect(error).toBeNull();
    expect(data.some((i) => i.id === createdIdeaId)).toBe(true);
  });

  it("getIdeaById returns the correct idea", async () => {
    const { data, error } = await getIdeaById(submitter.client, createdIdeaId);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBe(createdIdeaId);
    expect(data!.description).toContain("integration test");
  });

  it("ideaExists returns true for existing idea", async () => {
    const exists = await ideaExists(submitter.client, createdIdeaId);
    expect(exists).toBe(true);
  });

  it("ideaExists returns false for non-existent idea", async () => {
    const exists = await ideaExists(submitter.client, "00000000-0000-0000-0000-000000000000");
    expect(exists).toBe(false);
  });

  it("ideas are ordered newest first", async () => {
    // Create a second idea
    const { data: second } = await createIdea(submitter.client, {
      user_id: submitter.id,
      title: "Second Integration Idea",
      description: "Created after the first idea to verify ordering in the listing.",
      category: IDEA_CATEGORIES[1],
      attachment_url: null,
    });

    const { data: list } = await listIdeas(submitter.client, { userId: submitter.id });

    expect(list.length).toBeGreaterThanOrEqual(2);
    // Newest should be first
    const firstDate = new Date(list[0].created_at).getTime();
    const secondDate = new Date(list[1].created_at).getTime();
    expect(firstDate).toBeGreaterThanOrEqual(secondDate);

    // Cleanup the second idea
    if (second) {
      await adminClient.from("idea").delete().eq("id", second.id);
    }
  });
});

describe("Supabase Integration: Admin Status Updates", () => {
  let submitter: TestUser;
  let admin: TestUser;
  let ideaId: string;

  beforeAll(async () => {
    submitter = await createTestUser(testEmail("status-sub"));
    admin = await createTestUser(testEmail("status-admin"));
    await promoteToAdmin(admin.id);

    // Create an idea to work with
    const { data } = await createIdea(submitter.client, {
      user_id: submitter.id,
      title: "Status Test Idea",
      description: "This idea will go through status transitions in integration tests.",
      category: IDEA_CATEGORIES[2],
      attachment_url: null,
    });
    ideaId = data!.id;
  }, 30_000);

  afterAll(async () => {
    await cleanupTestUser(submitter.id);
    await cleanupTestUser(admin.id);
  }, 30_000);

  it("admin can transition idea from submitted to under_review", async () => {
    const { data, error } = await updateIdeaStatus(admin.client, ideaId, {
      status: "under_review",
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.status).toBe("under_review");
  });

  it("admin can accept an idea under review", async () => {
    const { data, error } = await updateIdeaStatus(admin.client, ideaId, {
      status: "accepted",
      evaluator_comment: "Great idea, approved!",
    });

    expect(error).toBeNull();
    expect(data!.status).toBe("accepted");
    expect(data!.evaluator_comment).toBe("Great idea, approved!");
  });

  it("submitter can see admin comments on their idea", async () => {
    const { data } = await getIdeaById(submitter.client, ideaId);

    expect(data).not.toBeNull();
    expect(data!.evaluator_comment).toBe("Great idea, approved!");
    expect(data!.status).toBe("accepted");
  });

  it("submitter cannot update idea status (RLS blocks)", async () => {
    // Create a fresh idea for this test
    const { data: freshIdea } = await createIdea(submitter.client, {
      user_id: submitter.id,
      title: "Submitter Update Test",
      description: "This idea tests that submitters cannot change status directly.",
      category: IDEA_CATEGORIES[0],
      attachment_url: null,
    });

    const { data, error } = await updateIdeaStatus(submitter.client, freshIdea!.id, {
      status: "accepted",
    });

    // RLS should block this — either error or data is null
    expect(data).toBeNull();

    // Cleanup
    await adminClient.from("idea").delete().eq("id", freshIdea!.id);
  });
});

describe("Supabase Integration: Reject with Comment", () => {
  let submitter: TestUser;
  let admin: TestUser;
  let ideaId: string;

  beforeAll(async () => {
    submitter = await createTestUser(testEmail("reject-sub"));
    admin = await createTestUser(testEmail("reject-admin"));
    await promoteToAdmin(admin.id);

    const { data } = await createIdea(submitter.client, {
      user_id: submitter.id,
      title: "Rejection Test Idea",
      description: "This idea will be rejected to test comment requirements.",
      category: IDEA_CATEGORIES[3],
      attachment_url: null,
    });
    ideaId = data!.id;
  }, 30_000);

  afterAll(async () => {
    await cleanupTestUser(submitter.id);
    await cleanupTestUser(admin.id);
  }, 30_000);

  it("admin can reject an idea with a comment", async () => {
    const { data, error } = await updateIdeaStatus(admin.client, ideaId, {
      status: "rejected",
      evaluator_comment: "Does not align with current priorities. Resubmit next quarter.",
    });

    expect(error).toBeNull();
    expect(data!.status).toBe("rejected");
    expect(data!.evaluator_comment).toContain("Does not align");
  });

  it("rejected idea is visible to the submitter with comment", async () => {
    const { data } = await getIdeaById(submitter.client, ideaId);

    expect(data).not.toBeNull();
    expect(data!.status).toBe("rejected");
    expect(data!.evaluator_comment).toContain("Does not align");
  });
});

describe("Supabase Integration: RLS Policies", () => {
  let userA: TestUser;
  let userB: TestUser;
  let userAIdeaId: string;

  beforeAll(async () => {
    userA = await createTestUser(testEmail("rls-a"));
    userB = await createTestUser(testEmail("rls-b"));

    const { data } = await createIdea(userA.client, {
      user_id: userA.id,
      title: "User A Private Idea",
      description: "Testing that other authenticated users can still read this idea.",
      category: IDEA_CATEGORIES[4],
      attachment_url: null,
    });
    userAIdeaId = data!.id;
  }, 30_000);

  afterAll(async () => {
    await cleanupTestUser(userA.id);
    await cleanupTestUser(userB.id);
  }, 30_000);

  it("user B can see user A's idea (FR-17: all ideas visible)", async () => {
    const { data } = await getIdeaById(userB.client, userAIdeaId);

    expect(data).not.toBeNull();
    expect(data!.title).toBe("User A Private Idea");
  });

  it("user B can list all ideas including user A's", async () => {
    const { data } = await listIdeas(userB.client);

    expect(data.some((i) => i.id === userAIdeaId)).toBe(true);
  });

  it("user B cannot insert idea as user A (RLS blocks)", async () => {
    const { data, error } = await createIdea(userB.client, {
      user_id: userA.id, // Trying to impersonate user A
      title: "Spoofed Idea",
      description: "This should fail because user B cannot create ideas as user A.",
      category: IDEA_CATEGORIES[0],
      attachment_url: null,
    });

    // RLS should block: user_id must match auth.uid()
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("user B cannot update user A's idea status (RLS blocks)", async () => {
    const { data } = await updateIdeaStatus(userB.client, userAIdeaId, {
      status: "accepted",
    });

    // Non-admin cannot update
    expect(data).toBeNull();
  });
});

describe("Supabase Integration: Storage", () => {
  let submitter: TestUser;

  beforeAll(async () => {
    submitter = await createTestUser(testEmail("storage"));
  }, 30_000);

  afterAll(async () => {
    // Clean up uploaded test files
    const { data: files } = await adminClient.storage
      .from("idea-attachments")
      .list(submitter.id);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${submitter.id}/${f.name}`);
      await adminClient.storage.from("idea-attachments").remove(paths);
    }
    await cleanupTestUser(submitter.id);
  }, 30_000);

  it("authenticated user can upload a file to their folder", async () => {
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF header
    const filePath = `${submitter.id}/test-upload.pdf`;

    const { error } = await submitter.client.storage
      .from("idea-attachments")
      .upload(filePath, content, {
        contentType: "application/pdf",
        upsert: false,
      });

    expect(error).toBeNull();
  });

  it("authenticated user can create a signed URL for their file", async () => {
    const filePath = `${submitter.id}/test-upload.pdf`;

    const { data, error } = await submitter.client.storage
      .from("idea-attachments")
      .createSignedUrl(filePath, 60);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.signedUrl).toContain("idea-attachments");
  });

  it("can list files in user's storage folder", async () => {
    const { data, error } = await submitter.client.storage
      .from("idea-attachments")
      .list(submitter.id);

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
    expect(data!.some((f) => f.name.includes("test-upload"))).toBe(true);
  });
});
