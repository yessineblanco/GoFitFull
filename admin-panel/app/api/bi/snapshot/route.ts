import { NextRequest, NextResponse } from "next/server";

import { getAdminUserIdFromRequest } from "@/lib/audit";
import {
  buildAdvancedBISnapshotNotification,
} from "@/lib/bi-snapshot";
import { parseBISnapshotInput } from "@/lib/bi-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);

    if (!adminUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const input = parseBISnapshotInput(await request.json());

    if (!input.ok) {
      return NextResponse.json(
        { error: input.error },
        { status: 400 }
      );
    }

    const notification = await buildAdvancedBISnapshotNotification(input.value);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("admin_notifications")
      .insert({
        admin_user_id: adminUserId,
        type: "info",
        title: notification.title,
        message: notification.message,
        href: notification.href,
      })
      .select("id, title, message, href, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(
      {
        data,
        message: "BI snapshot sent to your notifications.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating BI snapshot notification:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to send BI snapshot notification.",
      },
      { status: 500 }
    );
  }
}
