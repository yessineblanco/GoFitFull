/** Normalize storage / relative URLs for Expo Image. */
export function resolvePublicAvatarUrl(url: string | null | undefined): string | null {
  if (url == null || !String(url).trim()) return null;
  const u = String(url).trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
  if (!base) return u;
  return u.startsWith('/') ? `${base}${u}` : `${base}/${u}`;
}
