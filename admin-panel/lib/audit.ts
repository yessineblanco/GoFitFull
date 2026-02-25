/**
 * Audit logging utilities for tracking admin actions
 */

interface AuditLogData {
  adminUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Get admin user ID from request (for API routes)
 */
export async function getAdminUserIdFromRequest(request?: Request): Promise<string | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const supabase = await createClient();
    
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user?.id || null;
  } catch (error) {
    // Don't fail if we can't get user ID for audit logging
    console.error("Failed to get admin user ID:", error);
    return null;
  }
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    await adminClient.from("admin_audit_logs").insert({
      admin_user_id: data.adminUserId,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId || null,
      details: data.details || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
    });

    // Also create a notification for certain important actions
    if (shouldCreateNotification(data.action)) {
      await createNotificationFromAudit(data);
    }
  } catch (error) {
    // Don't fail the main operation if audit logging fails
    console.error("Failed to create audit log:", error);
  }
}

/**
 * Check if an action should create a notification
 */
function shouldCreateNotification(action: string): boolean {
  const notificationActions = [
    AuditActions.CREATE_EXERCISE,
    AuditActions.CREATE_WORKOUT,
    AuditActions.DELETE_USER,
    AuditActions.BULK_DELETE_EXERCISES,
    AuditActions.BULK_DELETE_WORKOUTS,
  ];
  return notificationActions.includes(action as any);
}

/**
 * Create a notification from an audit log entry
 */
async function createNotificationFromAudit(data: AuditLogData): Promise<void> {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();

    const notification = getNotificationFromAction(data.action, data);

    await adminClient.from("admin_notifications").insert({
      admin_user_id: data.adminUserId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      href: notification.href || null,
    });
  } catch (error) {
    // Don't fail if notification creation fails
    console.error("Failed to create notification:", error);
  }
}

/**
 * Generate notification details from audit action
 */
function getNotificationFromAction(
  action: string,
  data: AuditLogData
): { type: string; title: string; message: string; href?: string } {
  const resourceName = data.details?.name || data.resourceType;
  
  switch (action) {
    case AuditActions.CREATE_EXERCISE:
      return {
        type: "success",
        title: "Exercise Created",
        message: `Exercise "${resourceName}" has been created successfully`,
        href: "/exercises",
      };
    case AuditActions.CREATE_WORKOUT:
      return {
        type: "success",
        title: "Workout Created",
        message: `Workout "${resourceName}" has been created successfully`,
        href: "/workouts",
      };
    case AuditActions.DELETE_USER:
      return {
        type: "warning",
        title: "User Deleted",
        message: `User has been deleted from the platform`,
        href: "/users",
      };
    case AuditActions.BULK_DELETE_EXERCISES:
      return {
        type: "info",
        title: "Bulk Delete",
        message: `${data.details?.count || 0} exercises have been deleted`,
        href: "/exercises",
      };
    case AuditActions.BULK_DELETE_WORKOUTS:
      return {
        type: "info",
        title: "Bulk Delete",
        message: `${data.details?.count || 0} workouts have been deleted`,
        href: "/workouts",
      };
    default:
      return {
        type: "info",
        title: "Action Performed",
        message: `Action ${action} was performed on ${data.resourceType}`,
      };
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIP(request?: Request): string | null {
  if (!request) return null;

  // Check various headers for IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfConnectingIP = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return null;
}

/**
 * Get user agent from request headers
 */
export function getUserAgent(request?: Request): string | null {
  if (!request) return null;
  return request.headers.get("user-agent");
}

/**
 * Common audit actions
 */
export const AuditActions = {
  // Exercise actions
  CREATE_EXERCISE: "CREATE_EXERCISE",
  UPDATE_EXERCISE: "UPDATE_EXERCISE",
  DELETE_EXERCISE: "DELETE_EXERCISE",
  BULK_DELETE_EXERCISES: "BULK_DELETE_EXERCISES",
  
  // Workout actions
  CREATE_WORKOUT: "CREATE_WORKOUT",
  UPDATE_WORKOUT: "UPDATE_WORKOUT",
  DELETE_WORKOUT: "DELETE_WORKOUT",
  DUPLICATE_WORKOUT: "DUPLICATE_WORKOUT",
  BULK_DELETE_WORKOUTS: "BULK_DELETE_WORKOUTS",
  
  // User actions
  TOGGLE_ADMIN: "TOGGLE_ADMIN",
  DELETE_USER: "DELETE_USER",
  
  // Settings actions
  UPDATE_SETTINGS: "UPDATE_SETTINGS",
  CLEAR_CACHE: "CLEAR_CACHE",
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];
