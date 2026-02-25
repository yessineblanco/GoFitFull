import { createClient } from "@supabase/supabase-js";

/**
 * Admin client for Supabase
 * Uses service role key to bypass Row Level Security
 * 
 * ⚠️ SECURITY WARNING:
 * - Only use this in secure server-side contexts
 * - Never expose to the client
 * - Use for admin operations only
 * - Always verify admin status before using
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Check your .env.local file."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Check if a user is an admin
 * @param userId - The user ID to check
 * @returns true if user is admin, false otherwise
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("user_profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_admin === true;
}

/**
 * Get current user from session
 * @returns User object or null
 */
export async function getCurrentUser() {
  const { createClient: createServerClient } = await import("./server");
  const supabase = await createServerClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

/**
 * Verify admin access for the current user
 * Throws error if not admin
 */
export async function verifyAdminAccess(): Promise<void> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const isAdmin = await isUserAdmin(user.id);

  if (!isAdmin) {
    throw new Error("Not authorized. Admin access required.");
  }
}
