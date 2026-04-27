import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

const BUCKET = 'progress-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 30;

export type ProgressPhotoCategory = 'front' | 'side' | 'back' | 'other';

export type ProgressPhotoRow = {
  id: string;
  user_id: string;
  storage_path: string;
  photo_date: string;
  category: ProgressPhotoCategory;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgressPhoto = ProgressPhotoRow & {
  signed_url: string | null;
};

function createPhotoPath(userId: string) {
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `${userId}/${Date.now()}_${randomPart}.jpg`;
}

async function uriToArrayBuffer(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function createSignedUrl(storagePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error) {
    logger.warn('Failed to create progress photo signed URL', error);
    return null;
  }

  return data?.signedUrl ?? null;
}

async function withSignedUrls(rows: ProgressPhotoRow[]): Promise<ProgressPhoto[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      signed_url: await createSignedUrl(row.storage_path),
    }))
  );
}

export async function listProgressPhotos(userId: string): Promise<ProgressPhoto[]> {
  const { data, error } = await supabase
    .from('progress_photos')
    .select('id,user_id,storage_path,photo_date,category,note,created_at,updated_at')
    .eq('user_id', userId)
    .order('photo_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    logger.error('Failed to load progress photos', error);
    throw error;
  }

  return withSignedUrls((data || []) as ProgressPhotoRow[]);
}

export async function addProgressPhoto(
  userId: string,
  localUri: string,
  category: ProgressPhotoCategory,
  photoDate: string,
  note?: string
): Promise<ProgressPhoto> {
  const processed = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
  );

  const storagePath = createPhotoPath(userId);
  const bytes = await uriToArrayBuffer(processed.uri);

  const uploadResult = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (uploadResult.error) {
    logger.error('Failed to upload progress photo', uploadResult.error);
    throw uploadResult.error;
  }

  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      user_id: userId,
      storage_path: storagePath,
      photo_date: photoDate,
      category,
      note: note?.trim() ? note.trim() : null,
    })
    .select('id,user_id,storage_path,photo_date,category,note,created_at,updated_at')
    .single();

  if (error) {
    logger.error('Failed to insert progress photo row', error);
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }

  const row = data as ProgressPhotoRow;
  return {
    ...row,
    signed_url: await createSignedUrl(row.storage_path),
  };
}

export async function deleteProgressPhoto(photo: Pick<ProgressPhotoRow, 'id' | 'storage_path'>): Promise<void> {
  const { error } = await supabase
    .from('progress_photos')
    .delete()
    .eq('id', photo.id);

  if (error) {
    logger.error('Failed to delete progress photo row', error);
    throw error;
  }

  const storageResult = await supabase.storage.from(BUCKET).remove([photo.storage_path]);
  if (storageResult.error) {
    logger.warn('Progress photo row deleted, but storage removal failed', storageResult.error);
  }
}
