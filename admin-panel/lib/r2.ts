/**
 * Cloudflare R2 storage client (S3-compatible API)
 * Used for uploading exercise images and videos from the admin panel.
 */

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME;
const publicUrl = process.env.R2_PUBLIC_URL;

function getClient(): S3Client {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing R2 credentials. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY in .env.local"
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Upload a file to R2 and return its public URL.
 * @param key - Object key (e.g. exercises/videos/abc-123.mp4)
 * @param body - File buffer
 * @param contentType - MIME type (e.g. video/mp4, image/jpeg)
 * @returns Full public URL for the object
 */
export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!bucketName || !publicUrl) {
    throw new Error(
      "Missing R2 config. Set R2_BUCKET_NAME and R2_PUBLIC_URL in .env.local"
    );
  }
  const client = getClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  const base = publicUrl.replace(/\/$/, "");
  return `${base}/${key}`;
}
