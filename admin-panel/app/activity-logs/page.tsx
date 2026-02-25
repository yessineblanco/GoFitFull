import { createAdminClient } from "@/lib/supabase/admin";
import ActivityLogsTable from "@/components/activity-logs/ActivityLogsTable";

// Force dynamic rendering (no static generation)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getActivityLogs() {
  try {
    const adminClient = createAdminClient();

    // Fetch audit logs
    const { data: logs, error } = await adminClient
      .from("admin_audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching activity logs:", error);
      return [];
    }

    if (!logs || logs.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(logs.map((log: any) => log.admin_user_id))];

    // Fetch user data from auth.users using admin API
    const usersMap = new Map();
    for (const userId of userIds) {
      try {
        const { data: { user }, error: userError } = await adminClient.auth.admin.getUserById(userId);
        if (!userError && user) {
          usersMap.set(userId, {
            email: user.email || "Unknown",
            displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Unknown",
          });
        }
      } catch (e) {
        // Ignore errors for individual users
      }
    }

    // Format the data
    return logs.map((log: any) => {
      const user = usersMap.get(log.admin_user_id) || { email: "Unknown", displayName: "Unknown" };
      return {
        id: log.id,
        adminUserId: log.admin_user_id,
        adminEmail: user.email,
        adminName: user.displayName,
        action: log.action,
        resourceType: log.resource_type,
        resourceId: log.resource_id,
        details: log.details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at,
      };
    });
  } catch (error: any) {
    console.error("Error fetching activity logs:", error);
    return [];
  }
}

export default async function ActivityLogsPage() {
  const logs = await getActivityLogs();

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6 lg:p-8 pt-6 page-transition">
      <div className="flex items-center justify-between fade-in">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Track all admin actions and changes
          </p>
        </div>
      </div>

      <ActivityLogsTable logs={logs} />
    </div>
  );
}
