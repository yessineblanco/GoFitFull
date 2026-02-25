import { NextRequest, NextResponse } from "next/server";
import { getAdminUserIdFromRequest } from "@/lib/audit";
import { isUserAdmin } from "@/lib/supabase/admin";
import { uploadToR2 } from "@/lib/r2";
import { randomUUID } from "crypto";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminUserIdFromRequest(request);
    if (!adminUserId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const isAdmin = await isUserAdmin(adminUserId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Not authorized. Admin access required." },
        { status: 401 }
      );
    }

    const hasR2 =
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_URL;
    if (!hasR2) {
      return NextResponse.json(
        {
          error:
            "Storage not configured. Use the Image URL and Video URL fields, or set up Cloudflare R2 (see ENV_SETUP.md).",
        },
        { status: 503 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const type = (formData.get("type") as string) || "image";

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file" },
        { status: 400 }
      );
    }

    const isImage = type === "image";
    const isVideo = type === "video";
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Invalid type. Use 'image' or 'video'" },
        { status: 400 }
      );
    }

    const allowedTypes = isImage ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES;
    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error: `Invalid file type. Allowed: ${allowedTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Max size: ${maxMB} MB` },
        { status: 400 }
      );
    }

    const ext = EXT_BY_MIME[file.type] || "bin";
    const key = `exercises/${type}s/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const url = await uploadToR2(key, buffer, file.type);
    return NextResponse.json({ url }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
