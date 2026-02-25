import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client for Supabase
 * Used in Client Components for authentication and client-side operations
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
