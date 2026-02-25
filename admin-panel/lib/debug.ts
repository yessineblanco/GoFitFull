/**
 * Debug utilities for checking configuration
 * ONLY USE IN DEVELOPMENT!
 */

export function checkEnvVars() {
  const checks = {
    SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  console.log("Environment variables check:", checks);

  if (!checks.SUPABASE_URL) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!checks.SUPABASE_ANON_KEY) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
  }
  if (!checks.SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return checks;
}

export async function testSupabaseConnection() {
  try {
    const { createAdminClient } = await import("./supabase/admin");
    const adminClient = createAdminClient();

    // Test basic query
    const { data, error } = await adminClient
      .from("user_profiles")
      .select("count")
      .limit(1);

    if (error) {
      console.error("❌ Supabase connection test failed:", error);
      return false;
    }

    console.log("✅ Supabase connection successful");
    return true;
  } catch (error) {
    console.error("❌ Supabase connection test error:", error);
    return false;
  }
}
