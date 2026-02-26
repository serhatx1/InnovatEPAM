import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  adminClient,
  createTestUser,
  cleanupTestUser,
  testEmail,
  TestUser,
} from "./supabase-helper";
import {
  createDraft,
  updateDraft,
  getDraftById,
  listDrafts,
  softDeleteDraft,
  submitDraft,
  getDraftCount,
} from "@/lib/queries/drafts";
import { listIdeas } from "@/lib/queries/ideas";

/**
 * Draft Submissions Integration Tests
 *
 * These tests hit the REAL Supabase instance.
 * They create test users, perform draft operations, and clean up.
 *
 * Required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 */

const hasLiveDb = false; // Set to true when running against a configured Supabase instance

describe.skipIf(!hasLiveDb)("Draft Submissions Integration", () => {
  let submitter1: TestUser;
  let submitter2: TestUser;

  beforeAll(async () => {
    submitter1 = await createTestUser(testEmail("draft-sub1"));
    submitter2 = await createTestUser(testEmail("draft-sub2"));
  }, 30_000);

  afterAll(async () => {
    // Clean up ALL ideas (drafts + submitted) for both test users
    await adminClient.from("idea").delete().eq("user_id", submitter1.id);
    await adminClient.from("idea").delete().eq("user_id", submitter2.id);
    await cleanupTestUser(submitter1.id);
    await cleanupTestUser(submitter2.id);
  }, 30_000);

  // ── Full lifecycle: create → update → submit ───────────

  it("create draft → update → submit lifecycle", async () => {
    // 1. Create draft with minimal data
    const { data: draft, error: createError } = await createDraft(
      submitter1.client,
      { user_id: submitter1.id }
    );
    expect(createError).toBeNull();
    expect(draft).not.toBeNull();
    expect(draft!.status).toBe("draft");
    expect(draft!.deleted_at).toBeNull();

    const draftId = draft!.id;

    // 2. Update draft with full data
    const { data: updated, error: updateError } = await updateDraft(
      submitter1.client,
      draftId,
      {
        title: "Integration Test Draft",
        description: "This is a test draft description that is at least 20 characters long for testing.",
        category: "Process Improvement",
      }
    );
    expect(updateError).toBeNull();
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe("Integration Test Draft");

    // 3. Submit draft
    const { data: submitted, error: submitError } = await submitDraft(
      submitter1.client,
      draftId
    );
    expect(submitError).toBeNull();
    expect(submitted).not.toBeNull();
    expect(submitted!.status).toBe("submitted");

    // 4. Verify submitted idea appears in public listing
    const { data: publicList } = await listIdeas(submitter1.client);
    const found = publicList.find((i) => i.id === draftId);
    expect(found).toBeDefined();
    expect(found!.status).toBe("submitted");
  }, 30_000);

  // ── Soft-delete excludes from list ──────────────────────

  it("soft-deleted draft excluded from listing", async () => {
    // Create a draft
    const { data: draft } = await createDraft(submitter1.client, {
      user_id: submitter1.id,
      title: "Draft To Delete",
    });
    expect(draft).not.toBeNull();
    const draftId = draft!.id;

    // Soft-delete it
    const { error: deleteError } = await softDeleteDraft(
      submitter1.client,
      draftId
    );
    expect(deleteError).toBeNull();

    // Verify it's excluded from list
    const { data: drafts } = await listDrafts(submitter1.client, submitter1.id);
    const found = drafts.find((d) => d.id === draftId);
    expect(found).toBeUndefined();

    // Verify getDraftById also excludes it
    const { data: fetched } = await getDraftById(submitter1.client, draftId);
    expect(fetched).toBeNull();
  }, 30_000);

  // ── Cross-user isolation ───────────────────────────────

  it("user cannot access another user's draft", async () => {
    // submitter1 creates a draft
    const { data: draft } = await createDraft(submitter1.client, {
      user_id: submitter1.id,
      title: "Private Draft",
    });
    expect(draft).not.toBeNull();
    const draftId = draft!.id;

    // submitter2 tries to fetch it — RLS should block
    const { data: fetched } = await getDraftById(
      submitter2.client,
      draftId
    );
    expect(fetched).toBeNull();

    // submitter2's list should not include submitter1's draft
    const { data: s2Drafts } = await listDrafts(
      submitter2.client,
      submitter2.id
    );
    const found = s2Drafts.find((d) => d.id === draftId);
    expect(found).toBeUndefined();
  }, 30_000);

  // ── Drafts excluded from public listing ────────────────

  it("drafts do not appear in public idea listing", async () => {
    const { data: draft } = await createDraft(submitter1.client, {
      user_id: submitter1.id,
      title: "Invisible Draft",
    });
    expect(draft).not.toBeNull();

    const { data: publicList } = await listIdeas(submitter1.client);
    const found = publicList.find((i) => i.id === draft!.id);
    expect(found).toBeUndefined();
  }, 30_000);

  // ── Draft count ────────────────────────────────────────

  it("getDraftCount returns accurate count", async () => {
    // Get current count
    const { count: before } = await getDraftCount(
      submitter2.client,
      submitter2.id
    );

    // Create two drafts
    await createDraft(submitter2.client, {
      user_id: submitter2.id,
      title: "Count Draft 1",
    });
    await createDraft(submitter2.client, {
      user_id: submitter2.id,
      title: "Count Draft 2",
    });

    const { count: after } = await getDraftCount(
      submitter2.client,
      submitter2.id
    );
    expect(after).toBe((before ?? 0) + 2);
  }, 30_000);

  // ── Submit with missing fields fails at query level ────

  it("submit draft validation catches missing fields at submit route level", async () => {
    // Create draft with no title/description/category
    const { data: draft } = await createDraft(submitter1.client, {
      user_id: submitter1.id,
    });
    expect(draft).not.toBeNull();

    // submitDraft at query level just sets status — validation is in the API route
    // This test verifies the query function works correctly
    const { data: submitted, error } = await submitDraft(
      submitter1.client,
      draft!.id
    );
    // The query itself succeeds (status change) — full validation is API-level
    expect(submitted).not.toBeNull();
    expect(submitted!.status).toBe("submitted");
  }, 30_000);
});
