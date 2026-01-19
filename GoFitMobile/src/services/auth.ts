import { supabase } from '@/config/supabase';
import type { Session } from '@supabase/supabase-js';

/**
 * Authentication service for user authentication operations
 * 
 * Provides methods for signing in, signing up, password reset, and session management.
 * All methods use Supabase Auth directly (not the API client) as authentication
 * operations have their own timeout and retry mechanisms.
 */
export const authService = {
  /**
   * Sign in a user with email and password
   * 
   * @param email - User's email address
   * @param password - User's password
   * @returns Promise that resolves with authentication data (session and user)
   * @throws {Error} If authentication fails (invalid credentials, network error, etc.)
   * 
   * @example
   * ```typescript
   * try {
   *   const { session, user } = await authService.signIn('user@example.com', 'password123');
   *   console.log('Signed in:', user.email);
   * } catch (error) {
   *   console.error('Sign in failed:', error.message);
   * }
   * ```
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Sign up a new user with email and password
   * 
   * Creates a new user account. The user may need to verify their email
   * depending on Supabase configuration.
   * 
   * @param email - User's email address
   * @param password - User's password (must meet Supabase password requirements)
   * @returns Promise that resolves with authentication data (session and user)
   * @throws {Error} If signup fails (email already exists, weak password, network error, etc.)
   * 
   * @example
   * ```typescript
   * try {
   *   const { session, user } = await authService.signUp('user@example.com', 'SecurePass123!');
   *   console.log('Account created:', user.email);
   * } catch (error) {
   *   console.error('Signup failed:', error.message);
   * }
   * ```
   */
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   * 
   * Ends the current session and clears authentication state.
   * 
   * @returns Promise that resolves when sign out is complete
   * @throws {Error} If sign out fails (network error, etc.)
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.signOut();
   *   console.log('Signed out successfully');
   * } catch (error) {
   *   console.error('Sign out failed:', error.message);
   * }
   * ```
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Request a password reset for a user
   * 
   * Sends an OTP (One-Time Password) code to the user's email for password reset.
   * The email template in Supabase should be configured to show {{ .Token }} instead of {{ .ConfirmationURL }}.
   * 
   * @param email - User's email address
   * @returns Promise that resolves when the reset email is sent
   * @throws {Error} If the request fails (email not found, network error, etc.)
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.forgotPassword('user@example.com');
   *   console.log('Password reset email sent');
   * } catch (error) {
   *   console.error('Failed to send reset email:', error.message);
   * }
   * ```
   */
  async forgotPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'gofit://reset-password', // Required but not used when using OTP
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Verify an OTP (One-Time Password) token for password reset
   * 
   * Verifies the OTP code sent to the user's email. This puts the user in a recovery state
   * (not signed in), which is required before updating the password.
   * 
   * @param email - User's email address
   * @param token - The OTP token received via email
   * @returns Promise that resolves with authentication data (user in recovery state)
   * @throws {Error} If verification fails (invalid token, expired token, network error, etc.)
   * 
   * @example
   * ```typescript
   * try {
   *   const { user } = await authService.verifyOtp('user@example.com', '12345678');
   *   console.log('OTP verified, user in recovery state');
   * } catch (error) {
   *   console.error('OTP verification failed:', error.message);
   * }
   * ```
   */
  async verifyOtp(email: string, token: string) {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery', // Use 'recovery' type for password reset
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Update the current user's password
   * 
   * Updates the password for the currently authenticated user. The user must be
   * in a recovery state (after verifyOtp) or signed in.
   * 
   * @param newPassword - The new password (must meet Supabase password requirements)
   * @returns Promise that resolves with updated user data
   * @throws {Error} If update fails (weak password, not in recovery state, network error, etc.)
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.updatePassword('NewSecurePass123!');
   *   console.log('Password updated successfully');
   * } catch (error) {
   *   console.error('Password update failed:', error.message);
   * }
   * ```
   */
  async updatePassword(newPassword: string) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Get the current user session
   * 
   * Retrieves the current authentication session from Supabase.
   * Returns null if no session exists.
   * 
   * @returns Promise that resolves with the current session or null
   * @throws {Error} If the request fails (network error, etc.)
   * 
   * @example
   * ```typescript
   * const session = await authService.getSession();
   * if (session) {
   *   console.log('User is signed in:', session.user.email);
   * } else {
   *   console.log('No active session');
   * }
   * ```
   */
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  /**
   * Get the current authenticated user
   * 
   * Retrieves the current user from Supabase. This method verifies the session
   * with the server, so it's more reliable than accessing session.user directly.
   * 
   * @returns Promise that resolves with the current user or null
   * @throws {Error} If the request fails (network error, invalid session, etc.)
   * 
   * @example
   * ```typescript
   * const user = await authService.getUser();
   * if (user) {
   *   console.log('Current user:', user.email);
   * }
   * ```
   */
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  /**
   * Update user metadata
   * 
   * Updates the current user's metadata (e.g., display_name).
   * 
   * @param metadata - Partial metadata object to update
   * @returns Promise that resolves with updated user data
   * @throws {Error} If update fails
   * 
   * @example
   * ```typescript
   * await authService.updateUserMetadata({ display_name: 'John Doe' });
   * ```
   */
  async updateUserMetadata(metadata: Record<string, any>) {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Update user email
   * 
   * Updates the user's email address. Supabase will send a confirmation email
   * to the new address. The email change will be pending until confirmed.
   * 
   * @param newEmail - The new email address
   * @returns Promise that resolves with updated user data
   * @throws {Error} If update fails
   * 
   * @example
   * ```typescript
   * await authService.updateEmail('newemail@example.com');
   * ```
   */
  async updateEmail(newEmail: string) {
    const { data, error } = await supabase.auth.updateUser({
      email: newEmail,
    });
    
    if (error) throw error;
    return data;
  },

  /**
   * Subscribe to authentication state changes
   * 
   * Sets up a listener that is called whenever the authentication state changes
   * (user signs in, signs out, session expires, etc.).
   * 
   * **Important:** Always unsubscribe when done to prevent memory leaks.
   * 
   * @param callback - Function called when auth state changes, receives the new session (or null)
   * @returns Object containing the subscription, which has an `unsubscribe()` method
   * 
   * @example
   * ```typescript
   * const { subscription } = authService.onAuthStateChange((session) => {
   *   if (session) {
   *     console.log('User signed in:', session.user.email);
   *   } else {
   *     console.log('User signed out');
   *   }
   * });
   * 
   * // Later, when done:
   * subscription.unsubscribe();
   * ```
   */
  /**
   * Delete user account
   * 
   * Permanently deletes the current user's account and all associated data.
   * This action cannot be undone.
   * 
   * @returns Promise that resolves when account is deleted
   * @throws {Error} If deletion fails
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.deleteAccount();
   *   console.log('Account deleted successfully');
   * } catch (error) {
   *   console.error('Failed to delete account:', error.message);
   * }
   * ```
   */
  async deleteAccount() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      throw new Error('No user logged in');
    }

    // Try to call a database function for account deletion
    // This requires a database function to be created in Supabase
    const { error: rpcError } = await supabase.rpc('delete_user_account');
    
    if (rpcError) {
      // If RPC is not available, sign out and throw error
      // The user will need to contact support or the function needs to be created
      await supabase.auth.signOut();
      throw new Error('Account deletion is not available. Please contact support or ensure the database function is set up.');
    }
    
    // Sign out after successful deletion
    await supabase.auth.signOut();
  },

  /**
   * Sign in with OAuth provider (Google, Facebook, Apple)
   * 
   * Initiates OAuth flow for the specified provider. The user will be redirected
   * to the provider's login page, then back to the app via deep link.
   * 
   * @param provider - OAuth provider ('google', 'facebook', or 'apple')
   * @param redirectTo - Deep link URL to redirect back to app (default: 'gofit://auth/callback')
   * @returns Promise that resolves when OAuth flow is initiated
   * @throws {Error} If OAuth initiation fails
   * 
   * @example
   * ```typescript
   * try {
   *   await authService.signInWithOAuth('google');
   *   // User will be redirected to Google login, then back to app
   * } catch (error) {
   *   console.error('OAuth sign in failed:', error.message);
   * }
   * ```
   */
  async signInWithOAuth(provider: 'google' | 'facebook' | 'apple', redirectTo?: string) {
    const defaultRedirectTo = redirectTo || 'gofit://auth/callback';
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: defaultRedirectTo,
        skipBrowserRedirect: false, // Let Supabase handle the browser redirect
      },
    });
    
    if (error) throw error;
    return data;
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return { subscription }; // Return subscription object for cleanup
  },
};

