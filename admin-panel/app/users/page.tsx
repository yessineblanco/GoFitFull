import { createAdminClient } from "@/lib/supabase/admin";
import { checkEnvVars } from "@/lib/debug";
import UserSearchFilter from "@/components/users/UserSearchFilter";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getUsers() {
  try {
    // Check environment variables
    checkEnvVars();
    
    const adminClient = createAdminClient();

    // First, get auth users
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return [];
    }

    if (!authData?.users || authData.users.length === 0) {
      console.log("No auth users found");
      return [];
    }

    console.log(`Found ${authData.users.length} auth users`);

    // Try to get profiles for is_admin status only
    // Note: display_name is stored in auth.users.user_metadata, not user_profiles
    const { data: profiles, error: profileError } = await adminClient
      .from("user_profiles")
      .select("id, is_admin, created_at")
      .order("created_at", { ascending: false });

    if (profileError) {
      console.error("Error fetching profiles (will show auth users only):", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });
      
      // Return auth users without profile data
      return authData.users.map((user) => ({
        id: user.id,
        email: user.email || "N/A",
        display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || "No name",
        is_admin: false,
        created_at: user.created_at,
      }));
    }

    console.log(`Found ${profiles?.length || 0} profiles`);

    // Merge profile and auth data
    // display_name comes from user_metadata (same as mobile app)
    const mergedUsers = authData.users.map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email || "N/A",
        display_name: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || "No name",
        is_admin: profile?.is_admin || false,
        created_at: profile?.created_at || authUser.created_at,
      };
    });

    return mergedUsers;
  } catch (error: any) {
    console.error("Unexpected error in getUsers:", {
      message: error?.message,
      stack: error?.stack,
    });
    return [];
  }
}

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">User Management</h2>
      </div>

      <UserSearchFilter users={users} />
    </div>
  );
}
