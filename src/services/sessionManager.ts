/**
 * Session Management Service
 * 
 * Handles session lifecycle, idle timeout, token refresh,
 * and concurrent session limiting.
 */

import { supabase } from '../lib/supabase';
import { auditAuth } from './auditTrailService';

export interface SessionConfig {
  idleTimeout: number; // in milliseconds
  refreshBeforeExpiry: number; // in milliseconds
  maxConcurrentSessions: number;
  rememberMeDuration: number; // in milliseconds
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo: string;
  ipAddress?: string;
  lastActivity: string;
  expiresAt: string;
  isActive: boolean;
}

// Default configuration
const DEFAULT_CONFIG: SessionConfig = {
  idleTimeout: 15 * 60 * 1000, // 15 minutes
  refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes before expiry
  maxConcurrentSessions: 3,
  rememberMeDuration: 30 * 24 * 60 * 60 * 1000 // 30 days
};

class SessionManager {
  private static instance: SessionManager;
  private config: SessionConfig = DEFAULT_CONFIG;
  private activityTimer: NodeJS.Timeout | null = null;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastActivityTime: number = Date.now();
  private isActive: boolean = false;
  private sessionId: string | null = null;

  private constructor() {
    this.setupActivityListeners();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Initialize session management
   */
  async initialize(config?: Partial<SessionConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }

    this.isActive = true;
    this.lastActivityTime = Date.now();
    this.sessionId = this.generateSessionId();

    // Start monitoring
    this.startIdleMonitoring();
    this.startTokenRefreshMonitoring();

    // Register session in database
    await this.registerSession();

    console.log('✅ [Session] Session management initialized');
  }

  /**
   * Setup activity listeners
   */
  private setupActivityListeners(): void {
    if (typeof window === 'undefined') return;

    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      this.updateActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('📴 [Session] Page hidden');
      } else {
        console.log('👁️ [Session] Page visible');
        this.updateActivity();
      }
    });

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      this.deactivateSession();
    });
  }

  /**
   * Update last activity timestamp
   */
  private updateActivity(): void {
    if (!this.isActive) return;

    this.lastActivityTime = Date.now();

    // Update session in database (throttled)
    this.throttledUpdateSession();
  }

  /**
   * Throttled session update (max once per minute)
   */
  private lastUpdateTime: number = 0;
  private throttledUpdateSession = (): void => {
    const now = Date.now();
    if (now - this.lastUpdateTime > 60000) { // 1 minute
      this.lastUpdateTime = now;
      this.updateSessionInDB();
    }
  };

  /**
   * Start idle timeout monitoring
   */
  private startIdleMonitoring(): void {
    this.stopIdleMonitoring();

    this.activityTimer = setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTime;

      if (idleTime >= this.config.idleTimeout) {
        console.log('⏱️ [Session] Idle timeout reached');
        this.handleIdleTimeout();
      } else if (idleTime >= this.config.idleTimeout - 60000) { // 1 minute warning
        const remainingSeconds = Math.floor((this.config.idleTimeout - idleTime) / 1000);
        console.log(`⚠️ [Session] Idle timeout in ${remainingSeconds} seconds`);
        this.showIdleWarning(remainingSeconds);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Stop idle monitoring
   */
  private stopIdleMonitoring(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  /**
   * Start token refresh monitoring
   */
  private startTokenRefreshMonitoring(): void {
    this.stopTokenRefreshMonitoring();

    this.refreshTimer = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        this.stopTokenRefreshMonitoring();
        return;
      }

      // Check if token needs refresh
      const tokenExpiry = this.getTokenExpiry(token);
      if (tokenExpiry) {
        const timeUntilExpiry = tokenExpiry - Date.now();
        
        if (timeUntilExpiry <= this.config.refreshBeforeExpiry && timeUntilExpiry > 0) {
          console.log('🔄 [Session] Refreshing token');
          await this.refreshToken();
        } else if (timeUntilExpiry <= 0) {
          console.log('🔴 [Session] Token expired');
          this.handleTokenExpiry();
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Stop token refresh monitoring
   */
  private stopTokenRefreshMonitoring(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Handle idle timeout
   */
  private handleIdleTimeout(): void {
    this.isActive = false;
    this.stopIdleMonitoring();
    this.stopTokenRefreshMonitoring();

    // Log audit event
    const userId = localStorage.getItem('userId') || '';
    const userName = localStorage.getItem('userName') || '';
    auditAuth.logout(userId, userName);

    // Clear session
    this.clearSession();

    // Show modal and redirect
    this.showIdleTimeoutModal();
  }

  /**
   * Handle token expiry
   */
  private handleTokenExpiry(): void {
    this.isActive = false;
    this.stopIdleMonitoring();
    this.stopTokenRefreshMonitoring();

    // Clear session
    this.clearSession();

    // Redirect to login
    window.location.href = '/login?reason=expired';
  }

  /**
   * Show idle warning
   */
  private showIdleWarning(seconds: number): void {
    // Dispatch custom event that UI can listen to
    window.dispatchEvent(new CustomEvent('session:idle-warning', {
      detail: { seconds }
    }));
  }

  /**
   * Show idle timeout modal
   */
  private showIdleTimeoutModal(): void {
    // Dispatch custom event that UI can listen to
    window.dispatchEvent(new CustomEvent('session:timeout'));
    
    // Redirect after a short delay
    setTimeout(() => {
      window.location.href = '/login?reason=idle';
    }, 3000);
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<void> {
    try {
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ [Session] Token refresh failed:', error);
        this.handleTokenExpiry();
        return;
      }

      if (data.session) {
        localStorage.setItem('token', data.session.access_token);
        console.log('✅ [Session] Token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ [Session] Token refresh error:', error);
      this.handleTokenExpiry();
    }
  }

  /**
   * Get token expiry time
   */
  private getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000; // Convert to milliseconds
    } catch {
      return null;
    }
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Register session in database
   */
  private async registerSession(): Promise<void> {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const deviceInfo = this.getDeviceInfo();
      const expiresAt = new Date(Date.now() + this.config.idleTimeout).toISOString();

      await supabase.from('user_sessions').insert({
        session_id: this.sessionId,
        user_id: userId,
        device_info: deviceInfo,
        last_activity: new Date().toISOString(),
        expires_at: expiresAt,
        is_active: true
      });

      // Enforce concurrent session limit
      await this.enforceSessionLimit(userId);
    } catch (error) {
      console.error('❌ [Session] Failed to register session:', error);
    }
  }

  /**
   * Update session in database
   */
  private async updateSessionInDB(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({
          last_activity: new Date().toISOString(),
          expires_at: new Date(Date.now() + this.config.idleTimeout).toISOString()
        })
        .eq('session_id', this.sessionId);
    } catch (error) {
      console.error('❌ [Session] Failed to update session:', error);
    }
  }

  /**
   * Deactivate session
   */
  private async deactivateSession(): Promise<void> {
    if (!this.sessionId) return;

    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_id', this.sessionId);
    } catch (error) {
      console.error('❌ [Session] Failed to deactivate session:', error);
    }
  }

  /**
   * Enforce concurrent session limit
   */
  private async enforceSessionLimit(userId: string): Promise<void> {
    try {
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (!sessions || sessions.length <= this.config.maxConcurrentSessions) {
        return;
      }

      // Deactivate oldest sessions
      const sessionsToDeactivate = sessions.slice(this.config.maxConcurrentSessions);
      const sessionIds = sessionsToDeactivate.map(s => s.session_id);

      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .in('session_id', sessionIds);

      console.log(`🔒 [Session] Deactivated ${sessionIds.length} old sessions`);
    } catch (error) {
      console.error('❌ [Session] Failed to enforce session limit:', error);
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    const browser = this.getBrowserName(ua);
    const os = this.getOSName(ua);
    
    return `${browser} on ${os}`;
  }

  /**
   * Get browser name from user agent
   */
  private getBrowserName(ua: string): string {
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  }

  /**
   * Get OS name from user agent
   */
  private getOSName(ua: string): string {
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iOS')) return 'iOS';
    return 'Unknown OS';
  }

  /**
   * Clear session data
   */
  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    this.sessionId = null;
  }

  /**
   * Extend session (user clicked "Stay logged in")
   */
  async extendSession(): Promise<void> {
    this.lastActivityTime = Date.now();
    await this.updateSessionInDB();
    console.log('✅ [Session] Session extended');
  }

  /**
   * Manually logout
   */
  async logout(): Promise<void> {
    this.isActive = false;
    this.stopIdleMonitoring();
    this.stopTokenRefreshMonitoring();

    await this.deactivateSession();

    const userId = localStorage.getItem('userId') || '';
    const userName = localStorage.getItem('userName') || '';
    await auditAuth.logout(userId, userName);

    this.clearSession();
  }

  /**
   * Get active sessions for current user
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return [];

      const { data } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      return (data || []).map(session => ({
        sessionId: session.session_id,
        userId: session.user_id,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        lastActivity: session.last_activity,
        expiresAt: session.expires_at,
        isActive: session.is_active
      }));
    } catch (error) {
      console.error('❌ [Session] Failed to get active sessions:', error);
      return [];
    }
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(sessionId: string): Promise<void> {
    try {
      await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('session_id', sessionId);

      console.log(`✅ [Session] Session ${sessionId} terminated`);
    } catch (error) {
      console.error('❌ [Session] Failed to terminate session:', error);
    }
  }

  /**
   * Check if session is active
   */
  isSessionActive(): boolean {
    return this.isActive;
  }

  /**
   * Get time until idle timeout
   */
  getTimeUntilTimeout(): number {
    const idleTime = Date.now() - this.lastActivityTime;
    return Math.max(0, this.config.idleTimeout - idleTime);
  }
}

export const sessionManager = SessionManager.getInstance();

export default sessionManager;

