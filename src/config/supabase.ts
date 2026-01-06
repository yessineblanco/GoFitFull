import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { getSecureItem, saveSecureItem, deleteSecureItem } from '@/utils/secureStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Warn if environment variables are missing
const isConfigured = !!(supabaseUrl && supabaseAnonKey && 
  (supabaseUrl.startsWith('http://') || supabaseUrl.startsWith('https://')));

if (!isConfigured) {
  logger.warn(
    '⚠️ Supabase environment variables not found or invalid. Please create a .env file with your Supabase credentials.\n' +
    'See .env.example for reference. Authentication features will not work until configured.'
  );
}

// Secure storage adapter using expo-secure-store with chunking support
// This encrypts tokens at rest and is more secure than AsyncStorage
// SecureStore uses the device's keychain (iOS) or Keystore (Android)
// 
// Note: SecureStore has a 2048 byte limit per key. For larger data (like Supabase sessions),
// we automatically split the data across multiple keys and reassemble it transparently.
const SecureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await getSecureItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await saveSecureItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await deleteSecureItem(key);
  },
};

// Only create Supabase client if we have valid credentials
let supabase: SupabaseClient<any>;

try {
  if (isConfigured) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: SecureStorageAdapter, // Use secure storage for tokens
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  } else {
    // Use a valid Supabase URL format that passes validation
    // Format: https://[project-ref].supabase.co
    supabase = createClient(
      'https://abcdefghijklmnopqrstuvwx.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder',
      {
        auth: {
          storage: SecureStorageAdapter,
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );
  }
} catch (error: any) {
  // If client creation fails, create a minimal client that will fail gracefully
  logger.error('Supabase client creation error', error);
  // Create a client with a valid URL format to prevent crashes
  supabase = createClient(
    'https://placeholder.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder',
    {
      auth: {
        storage: SecureStorageAdapter,
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  ) as any;
}

export { supabase };

// Export a flag to check if Supabase is properly configured
export const isSupabaseConfigured = isConfigured;

