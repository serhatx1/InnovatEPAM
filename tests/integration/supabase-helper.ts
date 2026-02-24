/**
 * Supabase integration test helper.
 *
 * Provides:
 * - adminClient: service-role client that bypasses RLS (for setup/teardown)
 * - createTestUser: registers a user via Supabase Auth and returns an authenticated client
 * - cleanupTestUser: removes a test user and all their data
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing Supabase env vars. Ensure .env.local has NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY"
  );
}

/** Service-role client — bypasses RLS. Use only for test setup/teardown. */
export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Create a regular anon client (no auth session). */
export function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Test user info returned by createTestUser. */
export interface TestUser {
  id: string;
  email: string;
  client: SupabaseClient;
}

/**
 * Register a test user via Supabase Auth, then return an authenticated client.
 * Uses service-role to confirm the user immediately (no email verification).
 */
export async function createTestUser(
  email: string,
  password = "TestPass123!"
): Promise<TestUser> {
  // Create user via admin API (auto-confirmed)
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);

  const userId = data.user.id;

  // Sign in as that user to get an authenticated client
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError)
    throw new Error(`Failed to sign in test user: ${signInError.message}`);

  return { id: userId, email, client: userClient };
}

/**
 * Promote a test user to admin role.
 * Uses service-role client to bypass RLS on user_profile.
 */
export async function promoteToAdmin(userId: string): Promise<void> {
  const { error } = await adminClient
    .from("user_profile")
    .update({ role: "admin" })
    .eq("id", userId);

  if (error) throw new Error(`Failed to promote user: ${error.message}`);
}

/**
 * Clean up a test user: delete their ideas, profile, and auth account.
 * Call in afterAll / afterEach to avoid test pollution.
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  // 1. Delete ideas (cascade won't work across RLS bypass)
  await adminClient.from("idea").delete().eq("user_id", userId);

  // 2. Delete storage objects for this user
  const { data: files } = await adminClient.storage
    .from("idea-attachments")
    .list(userId);
  if (files && files.length > 0) {
    const paths = files.map((f) => `${userId}/${f.name}`);
    await adminClient.storage.from("idea-attachments").remove(paths);
  }

  // 3. Delete auth user (cascades to user_profile via FK)
  await adminClient.auth.admin.deleteUser(userId);
}

/**
 * Generate a unique email for each test run to prevent collisions.
 */
export function testEmail(prefix = "test"): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${rand}@test.innovatepam.local`;
}
