/**
 * Multi-Provider Authentication Configuration
 * Supports Supabase and Stack Auth
 */

import { supabase } from './supabaseClient';
import { stackAuthClient } from './stackAuthClient';

export type AuthProvider = 'supabase' | 'stack-auth';

interface AuthProviderConfig {
  provider: AuthProvider;
  enabled: boolean;
}

// Configure which auth provider to use
// You can switch between providers by changing this configuration
export const authConfig: AuthProviderConfig = {
  // Change this to 'stack-auth' to use Stack Auth instead of Supabase
  provider: (import.meta.env.VITE_AUTH_PROVIDER as AuthProvider) || 'supabase',
  enabled: true,
};

/**
 * Unified Auth Client
 * Provides a consistent interface regardless of the auth provider
 */
export const authClient = {
  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string) {
    if (authConfig.provider === 'stack-auth') {
      return await stackAuthClient.signInWithPassword(email, password);
    }
    return await supabase.auth.signInWithPassword({ email, password });
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, options?: { data?: any }) {
    if (authConfig.provider === 'stack-auth') {
      return await stackAuthClient.signUp(email, password, options);
    }
    return await supabase.auth.signUp({
      email,
      password,
      options,
    });
  },

  /**
   * Sign out
   */
  async signOut() {
    if (authConfig.provider === 'stack-auth') {
      return await stackAuthClient.signOut();
    }
    return await supabase.auth.signOut();
  },

  /**
   * Get current session
   */
  async getSession() {
    if (authConfig.provider === 'stack-auth') {
      return await stackAuthClient.getSession();
    }
    return await supabase.auth.getSession();
  },

  /**
   * Get current user
   */
  async getUser() {
    if (authConfig.provider === 'stack-auth') {
      return await stackAuthClient.getUser();
    }
    return await supabase.auth.getUser();
  },

  /**
   * Refresh session
   */
  async refreshSession() {
    if (authConfig.provider === 'stack-auth') {
      return await stackAuthClient.refreshSession();
    }
    return await supabase.auth.refreshSession();
  },

  /**
   * Update user
   */
  async updateUser(attributes: any) {
    if (authConfig.provider === 'stack-auth') {
      // Stack Auth doesn't have a direct update user method in our client
      // You would need to implement this based on Stack Auth's API
      return { data: null, error: { message: 'Update user not implemented for Stack Auth' } };
    }
    return await supabase.auth.updateUser(attributes);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (authConfig.provider === 'stack-auth') {
      return stackAuthClient.isAuthenticated();
    }
    // For Supabase, we'll need to check the session
    return true; // This will be checked in the auth context
  },

  /**
   * Get the current auth provider name
   */
  getProviderName(): string {
    return authConfig.provider;
  },
};

export default authClient;

