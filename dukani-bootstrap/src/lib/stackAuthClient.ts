/**
 * Stack Auth Client
 * REST API-based authentication client for Stack Auth
 * Compatible with React 18
 */

interface StackAuthConfig {
  projectId: string;
  apiUrl: string;
  jwksUrl: string;
}

interface StackAuthUser {
  id: string;
  email: string;
  displayName?: string;
  profileImageUrl?: string;
  signedUpAt: string;
  hasPassword: boolean;
  oauthProviders: string[];
  [key: string]: any;
}

interface StackAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: StackAuthUser;
}

class StackAuthClient {
  private config: StackAuthConfig;
  private session: StackAuthSession | null = null;
  private sessionKey = 'stack_auth_session';

  constructor(config: StackAuthConfig) {
    this.config = config;
    this.loadSession();
  }

  /**
   * Load session from localStorage
   */
  private loadSession() {
    try {
      const sessionStr = localStorage.getItem(this.sessionKey);
      if (sessionStr) {
        const session = JSON.parse(sessionStr);
        // Check if session is expired
        if (session.expiresAt > Date.now()) {
          this.session = session;
        } else {
          this.clearSession();
        }
      }
    } catch (error) {
      console.error('Failed to load Stack Auth session:', error);
      this.clearSession();
    }
  }

  /**
   * Save session to localStorage
   */
  private saveSession(session: StackAuthSession) {
    this.session = session;
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  /**
   * Clear session from localStorage
   */
  private clearSession() {
    this.session = null;
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string): Promise<{
    data: { user: StackAuthUser; session: StackAuthSession } | null;
    error: { message: string } | null;
  }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/projects/${this.config.projectId}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          data: null,
          error: { message: error.message || 'Authentication failed' },
        };
      }

      const data = await response.json();
      
      // Create session object
      const session: StackAuthSession = {
        accessToken: data.accessToken || data.access_token,
        refreshToken: data.refreshToken || data.refresh_token,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
        user: data.user,
      };

      this.saveSession(session);

      return {
        data: { user: data.user, session },
        error: null,
      };
    } catch (error: any) {
      console.error('Stack Auth sign in error:', error);
      return {
        data: null,
        error: { message: error.message || 'Network error' },
      };
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, options?: { data?: any }): Promise<{
    data: { user: StackAuthUser } | null;
    error: { message: string } | null;
  }> {
    try {
      const response = await fetch(`${this.config.apiUrl}/projects/${this.config.projectId}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          metadata: options?.data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          data: null,
          error: { message: error.message || 'Sign up failed' },
        };
      }

      const data = await response.json();

      return {
        data: { user: data.user },
        error: null,
      };
    } catch (error: any) {
      console.error('Stack Auth sign up error:', error);
      return {
        data: null,
        error: { message: error.message || 'Network error' },
      };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<{ error: null }> {
    try {
      if (this.session) {
        await fetch(`${this.config.apiUrl}/projects/${this.config.projectId}/auth/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.session.accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Stack Auth sign out error:', error);
    } finally {
      this.clearSession();
    }
    return { error: null };
  }

  /**
   * Get current session
   */
  async getSession(): Promise<{
    data: { session: StackAuthSession | null };
    error: null;
  }> {
    return {
      data: { session: this.session },
      error: null,
    };
  }

  /**
   * Get current user
   */
  async getUser(): Promise<{
    data: { user: StackAuthUser | null };
    error: null;
  }> {
    return {
      data: { user: this.session?.user || null },
      error: null,
    };
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<{
    data: { session: StackAuthSession } | null;
    error: { message: string } | null;
  }> {
    if (!this.session?.refreshToken) {
      return {
        data: null,
        error: { message: 'No refresh token available' },
      };
    }

    try {
      const response = await fetch(`${this.config.apiUrl}/projects/${this.config.projectId}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.session.refreshToken,
        }),
      });

      if (!response.ok) {
        this.clearSession();
        return {
          data: null,
          error: { message: 'Session refresh failed' },
        };
      }

      const data = await response.json();

      const session: StackAuthSession = {
        accessToken: data.accessToken || data.access_token,
        refreshToken: data.refreshToken || data.refresh_token || this.session.refreshToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
        user: data.user || this.session.user,
      };

      this.saveSession(session);

      return {
        data: { session },
        error: null,
      };
    } catch (error: any) {
      console.error('Stack Auth refresh error:', error);
      this.clearSession();
      return {
        data: null,
        error: { message: error.message || 'Network error' },
      };
    }
  }

  /**
   * Verify JWT token using JWKS
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      // In a real implementation, you would:
      // 1. Fetch the JWKS from the jwksUrl
      // 2. Parse the JWT header to get the kid
      // 3. Find the matching key from JWKS
      // 4. Verify the signature
      // For now, we'll do a simple API call to verify
      const response = await fetch(`${this.config.apiUrl}/projects/${this.config.projectId}/auth/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.session !== null && this.session.expiresAt > Date.now();
  }
}

// Initialize Stack Auth client
const stackAuthConfig: StackAuthConfig = {
  projectId: import.meta.env.VITE_STACK_AUTH_PROJECT_ID || '',
  apiUrl: import.meta.env.VITE_STACK_AUTH_API_URL || 'https://api.stack-auth.com/api/v1',
  jwksUrl: import.meta.env.VITE_STACK_AUTH_JWKS_URL || '',
};

export const stackAuthClient = new StackAuthClient(stackAuthConfig);
export type { StackAuthUser, StackAuthSession, StackAuthConfig };

