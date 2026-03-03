import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { authService } from '@/services/auth';
import { supabase } from '@/config/supabase';
import type { User } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { checkRateLimit, recordAttempt, clearRateLimit, formatTimeRemaining } from '@/utils/rateLimiter';
import { SESSION_CONFIG } from '@/constants';
import { logger } from '@/utils/logger';

// Helper function to convert Supabase User to our User type
const mapSupabaseUser = (supabaseUser: SupabaseUser | null): User | null => {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    created_at: supabaseUser.created_at,
    user_metadata: supabaseUser.user_metadata || {},
  };
};

import { STORAGE_KEYS } from '@/constants';

const REMEMBER_ME_KEY = STORAGE_KEYS.REMEMBER_ME;
const REMEMBERED_EMAIL_KEY = STORAGE_KEYS.REMEMBERED_EMAIL;

// Session timeout configuration
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
let inactivityTimer: NodeJS.Timeout | null = null;
let appStateSubscription: { remove: () => void } | null = null;

interface AuthStore {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  isResettingPassword: boolean;
  rememberMe: boolean;
  rememberedEmail: string | null;
  authSubscription: { subscription: { unsubscribe: () => void } } | null;
  lastActivity: number | null;
  userType: 'client' | 'coach';

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setIsResettingPassword: (isResetting: boolean) => void;
  setRememberMe: (remember: boolean, email?: string) => Promise<void>;
  loadRememberedEmail: () => Promise<void>;
  updateActivity: () => void;
  checkAndRefreshSession: () => Promise<void>;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, userType?: 'client' | 'coach') => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'facebook' | 'apple') => Promise<void>;
  getUserType: () => 'client' | 'coach';
  fetchUserType: (userId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

/**
 * Setup inactivity timer
 */
const setupInactivityTimer = (signOut: () => Promise<void>) => {
  // Clear existing timer
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
  }

  // Set new timer
  inactivityTimer = setTimeout(async () => {
    logger.info('Session timeout: User inactive for 30 minutes, signing out');
    await signOut();
  }, INACTIVITY_TIMEOUT_MS);
};

/**
 * Setup app state listener for activity tracking
 */
const setupAppStateListener = (updateActivity: () => void) => {
  // Remove existing listener
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  // Add new listener
  const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // App came to foreground, update activity
      updateActivity();
    }
  });

  appStateSubscription = subscription;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  initialized: false,
  isResettingPassword: false,
  rememberMe: false,
  rememberedEmail: null,
  authSubscription: null,
  lastActivity: null,
  userType: 'client',

  setUser: (user) => {
    set({ user });
    get().updateActivity();
  },
  setSession: (session) => {
    set({ 
      session, 
      user: session?.user ? mapSupabaseUser(session.user) : null 
    });
    get().updateActivity();
  },
  setLoading: (loading) => set({ loading }),
  setIsResettingPassword: (isResetting) => set({ isResettingPassword: isResetting }),

  updateActivity: () => {
    const now = Date.now();
    set({ lastActivity: now });
    // Reset inactivity timer
    setupInactivityTimer(get().signOut);
  },

  checkAndRefreshSession: async () => {
    const state = get();
    const session = state.session;

    if (!session) {
      return;
    }

    // Check if session expires soon
    const expiresAt = session.expires_at ? session.expires_at * 1000 : null;
    if (!expiresAt) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshThreshold = SESSION_CONFIG.REFRESH_THRESHOLD_MS;

    // If session expires in less than threshold, refresh it
    if (timeUntilExpiry < refreshThreshold) {
      try {
        logger.info('Refreshing session token (expires soon)');
        // Use Supabase's refreshSession method
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          throw error;
        }

        if (data?.session) {
          set({ 
            session: data.session, 
            user: mapSupabaseUser(data.session.user || null),
          });
          get().updateActivity();
        }
      } catch (error) {
        logger.error('Failed to refresh session', error);
        // If refresh fails, sign out
        await get().signOut();
      }
    }
  },

  setRememberMe: async (remember: boolean, email?: string) => {
    set({ rememberMe: remember });
    try {
      if (remember && email) {
        await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
        await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
        set({ rememberedEmail: email });
      } else {
        await AsyncStorage.removeItem(REMEMBER_ME_KEY);
        await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
        set({ rememberedEmail: null });
      }
    } catch (error) {
      console.warn('Failed to save remember me preference:', error);
    }
  },

  loadRememberedEmail: async () => {
    try {
      const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
      const email = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (rememberMe === 'true' && email) {
        set({ rememberMe: true, rememberedEmail: email });
      }
    } catch (error) {
      console.warn('Failed to load remembered email:', error);
    }
  },

  initialize: async () => {
    try {
      const session = await authService.getSession();
      const now = Date.now();
      set({ 
        session, 
        user: mapSupabaseUser(session?.user || null),
        loading: false,
        initialized: true,
        lastActivity: session ? now : null,
      });

      // Setup activity tracking if session exists
      if (session) {
        setupInactivityTimer(get().signOut);
        setupAppStateListener(get().updateActivity);
        
        // Fetch user_type from DB (source of truth)
        if (session.user?.id) {
          await get().fetchUserType(session.user.id);
        }
        
        // Check and refresh session if needed
        await get().checkAndRefreshSession();
        
        // Set up periodic session check (every 5 minutes)
        setInterval(() => {
          get().checkAndRefreshSession();
        }, 5 * 60 * 1000);
      }

      // Listen for auth state changes and store subscription for cleanup
      const subscription = authService.onAuthStateChange((session) => {
        // Check if we're in password reset mode before updating session
        const state = useAuthStore.getState();
        if (!state.isResettingPassword) {
          set({ 
            session, 
            user: mapSupabaseUser(session?.user || null),
            lastActivity: session ? Date.now() : null,
          });
          
          // Setup activity tracking if session exists
          if (session) {
            setupInactivityTimer(get().signOut);
            setupAppStateListener(get().updateActivity);
            if (session.user?.id) {
              get().fetchUserType(session.user.id);
            }
          } else {
            set({ userType: 'client' });
            // Clear timers if no session
            if (inactivityTimer) {
              clearTimeout(inactivityTimer);
              inactivityTimer = null;
            }
            if (appStateSubscription) {
              appStateSubscription.remove();
              appStateSubscription = null;
            }
          }
        }
      });
      
      // Store subscription reference for cleanup
      if (subscription) {
        set({ authSubscription: subscription });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn('Auth initialization error (Supabase may not be configured)', errorMessage);
      // Set to initialized even if there's an error, so the app can still load
      set({ loading: false, initialized: true, session: null, user: null, lastActivity: null });
    }
  },

  signIn: async (email: string, password: string, rememberMe: boolean = false) => {
    set({ loading: true });
    try {
      // Check rate limit
      const rateLimitCheck = await checkRateLimit('login');
      if (rateLimitCheck.isLimited) {
        const timeRemaining = rateLimitCheck.timeRemainingMs 
          ? formatTimeRemaining(rateLimitCheck.timeRemainingMs)
          : 'a few minutes';
        throw new Error(`Too many login attempts. Please try again in ${timeRemaining}.`);
      }

      // Record attempt before making the request
      await recordAttempt('login');

      const data = await authService.signIn(email, password);
      
      // Clear rate limit on successful login
      await clearRateLimit('login');
      
      const now = Date.now();
      set({ 
        session: data.session, 
        user: mapSupabaseUser(data.user || null),
        loading: false,
        lastActivity: now,
      });
      
      // Setup activity tracking
      if (data.session) {
        setupInactivityTimer(get().signOut);
        setupAppStateListener(get().updateActivity);
      }
      
      // Fetch user_type from DB (source of truth)
      if (data.user?.id) {
        await get().fetchUserType(data.user.id);
      }
      
      // Handle remember me
      if (rememberMe) {
        await get().setRememberMe(true, email);
      }
    } catch (error: unknown) {
      set({ loading: false });
      // Re-throw with rate limit message if it's a rate limit error
      if (error instanceof Error && error.message?.includes('Too many login attempts')) {
        throw error;
      }
      // For other errors, check if it's a rate limit from Supabase
      // (Supabase might also have rate limiting, but we handle it client-side too)
      throw error;
    }
  },

  getUserType: () => {
    return get().userType;
  },

  fetchUserType: async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_type')
        .eq('id', userId)
        .single();

      if (!error && data?.user_type) {
        set({ userType: data.user_type as 'client' | 'coach' });
      } else {
        const metaType = get().user?.user_metadata?.user_type;
        set({ userType: (metaType as 'client' | 'coach') || 'client' });
      }
    } catch {
      const metaType = get().user?.user_metadata?.user_type;
      set({ userType: (metaType as 'client' | 'coach') || 'client' });
    }
  },

  signUp: async (email: string, password: string, userType: 'client' | 'coach' = 'client') => {
    set({ loading: true });
    try {
      // Check rate limit
      const rateLimitCheck = await checkRateLimit('signup');
      if (rateLimitCheck.isLimited) {
        const timeRemaining = rateLimitCheck.timeRemainingMs 
          ? formatTimeRemaining(rateLimitCheck.timeRemainingMs)
          : 'a few minutes';
        throw new Error(`Too many signup attempts. Please try again in ${timeRemaining}.`);
      }

      // Record attempt before making the request
      await recordAttempt('signup');

      const data = await authService.signUp(email, password, userType);
      
      // Clear rate limit on successful signup
      await clearRateLimit('signup');
      
      const now = Date.now();
      set({ 
        session: data.session, 
        user: mapSupabaseUser(data.user || null),
        loading: false,
        lastActivity: data.session ? now : null,
      });
      
      // Setup activity tracking if session exists
      if (data.session) {
        setupInactivityTimer(get().signOut);
        setupAppStateListener(get().updateActivity);
      }
    } catch (error: unknown) {
      set({ loading: false });
      // Re-throw with rate limit message if it's a rate limit error
      if (error instanceof Error && error.message?.includes('Too many signup attempts')) {
        throw error;
      }
      throw error;
    }
  },

  signInWithOAuth: async (provider: 'google' | 'facebook' | 'apple') => {
    set({ loading: true });
    try {
      await authService.signInWithOAuth(provider);
      // OAuth flow will complete via deep link, auth state change will handle session update
      // Don't set loading to false here as the flow is async
    } catch (error: unknown) {
      set({ loading: false });
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to sign in with ${provider}: ${errorMessage}`);
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      // Cleanup auth subscription before signing out
      const state = get();
      if (state.authSubscription?.subscription) {
        state.authSubscription.subscription.unsubscribe();
        set({ authSubscription: null });
      }
      
      // Clear inactivity timer
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
      
      // Remove app state listener
      if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
      }
      
      await authService.signOut();
      set({ 
        session: null, 
        user: null,
        loading: false,
        lastActivity: null,
        userType: 'client',
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  refreshUser: async () => {
    try {
      const user = await authService.getUser();
      if (user) {
        const mappedUser = mapSupabaseUser(user);
        set({ user: mappedUser });
        // Also update session user to keep them in sync
        const currentSession = get().session;
        if (currentSession) {
          set({ session: { ...currentSession, user } });
        }
      }
    } catch (error) {
      logger.error('Error refreshing user:', error);
    }
  },
}));

