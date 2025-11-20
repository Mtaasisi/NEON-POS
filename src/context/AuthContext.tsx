import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import { retryWithBackoff } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { POSSettingsAPI } from '../lib/posSettingsApi';
import { logInfo, logError, logWarn, trackInit } from '../lib/debugUtils';
import { clearAuthState, isSessionValid, handle403Error } from '../lib/authUtils';
import { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRoute, getUserPermissions, hasRole, checkAccess, Permission } from '../lib/permissionUtils';

// Import the inventory store for automatic product loading
import { useInventoryStore } from '../features/lats/stores/useInventoryStore';

interface AuthContextType {
  currentUser: any;
  originalUser: any; // For admin testing - stores the real admin user
  isImpersonating: boolean; // Whether admin is currently impersonating another user
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
  loading: boolean;
  refreshSession: () => Promise<boolean>;
  handleAuthError: (error: any) => Promise<boolean>;
  // User impersonation for testing (admin only)
  impersonateUser: (userId: string) => Promise<boolean>;
  stopImpersonation: () => void;
  getAvailableTestUsers: () => Promise<any[]>;
  // Permission checking functions
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canAccessRoute: (path: string) => boolean;
  getUserPermissions: () => string[];
  hasRole: (roles: string | string[]) => boolean;
  checkAccess: (options: { roles?: string[]; permissions?: string[]; requireAll?: boolean }) => boolean;
  Permission: typeof Permission;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Silently handle HMR issues - only throw error in production
    if (import.meta.env.PROD) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    // Return a fallback context during development HMR
    return {
      currentUser: null,
      originalUser: null,
      isImpersonating: false,
      login: async () => false,
      logout: async () => { },
      isAuthenticated: false,
      error: null,
      clearError: () => { },
      loading: true,
      refreshSession: async () => false,
      handleAuthError: async () => false,
      impersonateUser: async () => false,
      stopImpersonation: () => { },
      getAvailableTestUsers: async () => [],
      hasPermission: () => false,
      hasAnyPermission: () => false,
      hasAllPermissions: () => false,
      canAccessRoute: () => false,
      getUserPermissions: () => [],
      hasRole: () => false,
      checkAccess: () => false,
      Permission
    } as AuthContextType;
  }
  return context;
};

// Global flag to prevent multiple AuthProvider instances
let globalAuthProviderInitialized = false;

const authProviderMountCount = 0; // Static mount counter for debugging

// Helper to map Supabase user (is_active) to app User (isActive)
function mapUserFromSupabase(user: any): any {
  // Get role-based permissions
  const getRolePermissions = (role: string): string[] => {
    switch (role) {
      case 'admin':
        return ['all'];
      case 'technician':
        return ['view_devices', 'update_device_status', 'view_customers', 'view_spare_parts'];
      case 'customer-care':
        return ['view_customers', 'create_customers', 'edit_customers', 'view_devices', 'assign_devices'];
      default:
        return ['view_devices', 'update_device_status', 'view_customers'];
    }
  };

  return {
    ...user,
    isActive: user.is_active,
    maxDevicesAllowed: user.max_devices_allowed || 10,
    requireApproval: user.require_approval || false,
    failedLoginAttempts: user.failed_login_attempts || 0,
    twoFactorEnabled: user.two_factor_enabled || false,
    twoFactorSecret: user.two_factor_secret,
    lastLogin: user.last_login,
    permissions: user.permissions && Array.isArray(user.permissions) && user.permissions.length > 0
      ? user.permissions
      : getRolePermissions(user.role),
    assignedDevices: [],
    assignedCustomers: [],
  };
}

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [originalUser, setOriginalUser] = useState<any>(() => {
    // Initialize from localStorage to persist impersonation across page reloads
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_impersonation_state');
      if (stored) {
        try {
          const { originalUser } = JSON.parse(stored);
          return originalUser || null;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });
  const [isImpersonating, setIsImpersonating] = useState(() => {
    // Initialize from localStorage to persist impersonation across page reloads
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('admin_impersonation_state');
      if (stored) {
        try {
          const { isImpersonating } = JSON.parse(stored);
          return isImpersonating || false;
        } catch (e) {
          return false;
        }
      }
    }
    return false;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const authProviderMountCount = useRef(0);
  const dataLoadedRef = useRef(false);

  // Helper function to persist impersonation state
  const saveImpersonationState = (isImpersonating: boolean, originalUser: any = null, impersonatedUser: any = null) => {
    if (typeof window !== 'undefined') {
      if (isImpersonating && originalUser && impersonatedUser) {
        localStorage.setItem('admin_impersonation_state', JSON.stringify({
          isImpersonating: true,
          originalUser,
          impersonatedUser
        }));
      } else {
        localStorage.removeItem('admin_impersonation_state');
      }
    }
  };

  // Expose data loaded flag globally for cache manager
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__AUTH_DATA_LOADED_FLAG__ = dataLoadedRef.current;
    }
  }, []);

  // Function to load products and other data automatically in background
  const loadInitialDataInBackground = async () => {
    // Prevent multiple data loads
    if (dataLoadedRef.current) {
      console.log('📦 Data already loaded, skipping...');
      return;
    }

    try {
      console.log('🚀 Starting comprehensive data preload...');
      dataLoadedRef.current = true;

      // Small delay to ensure UI is fully loaded first
      await new Promise(resolve => setTimeout(resolve, 300));

      // Use the new preload service for comprehensive data loading
      const { dataPreloadService } = await import('../services/dataPreloadService');
      const result = await dataPreloadService.preloadAllData();

      if (result.success) {
        console.log('✅ All data preloaded successfully');
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Loaded: ${result.loaded.length} data types`);
      } else {
        console.warn('⚠️ Data preload completed with some failures');
        console.log(`   Loaded: ${result.loaded.join(', ')}`);
        console.log(`   Failed: ${result.failed.join(', ')}`);
      }

      // Get preload summary
      const summary = dataPreloadService.getSummary();
      console.log('📊 Preload Summary:', {
        customers: summary.dataCounts.customers,
        products: summary.dataCounts.products,
        categories: summary.dataCounts.categories,
        suppliers: summary.dataCounts.suppliers,
      });
    } catch (error) {
      console.error('❌ Error in background data loading:', error);
      // Don't throw error - this is background loading, shouldn't affect login
      // Reset flag so it can be retried
      dataLoadedRef.current = false;
    }
  };

  // Helper function to load customer data
  const loadCustomersData = async () => {
    try {

      // Add retry logic for customer loading
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Import dynamically to avoid circular dependencies
          const { fetchAllCustomersLight } = await import('../lib/customerApi');
          const customers = await fetchAllCustomersLight();

          return customers;
        } catch (error) {
          retryCount++;

          if (retryCount < maxRetries) {
            console.log(`⏳ Retrying customer loading in 1 second... (${retryCount}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.error('❌ All customer loading attempts failed');
            throw error;
          }
        }
      }

      return [];
    } catch (error) {
      console.error('❌ Error loading customers:', error);
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error stringified:', JSON.stringify(error, null, 2));
      if (error && typeof error === 'object') {
        console.error('❌ Error keys:', Object.keys(error as any));
        console.error('❌ Error message:', (error as any)?.message);
        console.error('❌ Error code:', (error as any)?.code);
        console.error('❌ Error details:', (error as any)?.details);
        console.error('❌ Error hint:', (error as any)?.hint);
      }
      return [];
    }
  };

  // Helper function to load device data
  const loadDevicesData = async () => {
    try {

      // Import dynamically to avoid circular dependencies
      const { fetchAllDevices } = await import('../lib/deviceApi');
      const devices = await fetchAllDevices();

      return devices;
    } catch (error) {
      console.error('❌ Error loading devices:', error);
      return [];
    }
  };

  // Helper function to load settings data
  const loadSettingsData = async () => {
    try {

      // Import dynamically to avoid circular dependencies
      const { POSSettingsService } = await import('../lib/posSettingsApi');
      const generalSettings = await POSSettingsService.loadGeneralSettings();

      return generalSettings;
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      return null;
    }
  };

  const fetchAndSetUserProfile = async (user: any) => {
    try {
      // Fetch from users table (our ONLY user table)
      let { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // If not found in users table by ID, try by email
      if (profileError || !profileData) {
        console.log(`🔍 Trying to find profile by email: ${user.email}`);
        const { data: authProfileByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', user.email)
          .single();

        console.log(`📊 Profile data by email:`, authProfileByEmail, 'Error:', emailError);

        if (!emailError && authProfileByEmail) {
          profileData = authProfileByEmail;
          console.log(`✅ Found profile by email:`, profileData);
        }
      }

      // Create default profile if not found
      if (!profileData) {
        // Check if this is admin@pos.com or care@care.com and set admin role
        const isAdmin = user.email === 'admin@pos.com' || user.email === 'care@care.com';
        const defaultRole = isAdmin ? 'admin' : 'technician';

        console.log(`Creating default profile for ${user.email} with role: ${defaultRole}`);

        // Create a default user profile in the users table
        const defaultProfile = {
          id: user.id,
          email: user.email,
          username: (user.email as string)?.split('@')[0] || 'user',
          full_name: (user.email as string)?.split('@')[0] || 'User',
          password: '123456', // Default password
          role: defaultRole,
          is_active: true,
          permissions: defaultRole === 'admin' ? ['all'] : ['view_devices', 'view_customers'],
          max_devices_allowed: 1000,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('users')
          .insert([defaultProfile]);

        if (insertError) {
          console.error('Error creating default profile:', insertError);
        } else {
          profileData = defaultProfile;
        }
      }

      if (!profileData) {
        // Check if this is admin@pos.com or care@care.com and set admin role
        const isAdmin = user.email === 'admin@pos.com' || user.email === 'care@care.com';
        const defaultRole = isAdmin ? 'admin' : 'technician';

        console.log(`Using fallback user for ${user.email} with role: ${defaultRole}`);

        // Set user with appropriate default role
        const defaultUser = {
          ...user,
          role: defaultRole,
          full_name: (user.email as string)?.split('@')[0] || 'User',
          is_active: true,
          permissions: isAdmin ? ['all'] : ['view_devices', 'update_device_status', 'view_customers']
        };
        setCurrentUser(defaultUser);
        setLoading(false);

        // Start background data loading after successful authentication
        loadInitialDataInBackground();
        return;
      }

      // Map the user data from Supabase to our app format
      const mappedUser = mapUserFromSupabase(profileData);



      setCurrentUser(mappedUser);
      setLoading(false);

      // Start background data loading after successful authentication
      // Moved to separate useEffect to avoid initialization issues
    } catch (err) {
      console.error('Error in fetchAndSetUserProfile:', err);
      // Check if this is admin@pos.com or care@care.com and set admin role
      const isAdmin = user.email === 'admin@pos.com' || user.email === 'care@care.com';
      const defaultRole = isAdmin ? 'admin' : 'technician';

      console.log(`Error fallback for ${user.email} with role: ${defaultRole}`);

      // Set user with appropriate default role if there's an error
      const fallbackUser = {
        ...user,
        role: defaultRole,
        full_name: (user.email as string)?.split('@')[0] || 'User',
        is_active: true,
        permissions: isAdmin ? ['all'] : ['view_devices', 'update_device_status', 'view_customers']
      };
      setCurrentUser(fallbackUser);
      setLoading(false);

      // Start background data loading after successful authentication
      // Moved to separate useEffect to avoid initialization issues
    }
  };

  // Add a session refresh function
  const refreshSession = async () => {
    try {

      const result = await retryWithBackoff(async () => {
        return await supabase.auth.refreshSession();
      });

      const { data, error } = result;

      if (error) {
        console.error('❌ Session refresh failed:', error);
        return false;
      }

      if (data.session) {

        await fetchAndSetUserProfile(data.session.user);
        return true;
      } else {

        return false;
      }
    } catch (err) {
      console.error('❌ Error refreshing session:', err);
      return false;
    }
  };

  // Add automatic session refresh on 401/403 errors
  const handleAuthError = async (error: any) => {
    if (error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('401') ||
      error?.message?.includes('403') ||
      error?.message?.includes('Unauthorized') ||
      error?.message?.includes('Forbidden') ||
      error?.message?.includes('bad_jwt') ||
      error?.message?.includes('missing sub claim')) {

      const refreshed = await refreshSession();
      if (!refreshed) {

        // Clear authentication state and redirect to login
        await handle403Error();
        setCurrentUser(null);
        setError('Session expired. Please log in again.');
        // You might want to navigate to login page here
        // navigate('/login');
      }
      return refreshed;
    }
    return false;
  };

  // On mount, check for Supabase session and fetch profile
  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current || globalAuthProviderInitialized) {
      logWarn('AuthProvider', 'Already initialized, skipping...');
      return;
    }

    if (!trackInit('AuthProvider')) {
      return;
    }

    globalAuthProviderInitialized = true;
    authProviderMountCount.current++;
    logInfo('AuthProvider', `Initializing (mount #${authProviderMountCount.current})`);

    const initializeAuth = async () => {
      try {
        setLoading(true);
        logInfo('AuthProvider', 'Checking for existing session...');

        // Check if session is valid first
        const isValid = await isSessionValid();
        if (!isValid) {
          logInfo('AuthProvider', 'No valid session found, clearing auth state');
          await clearAuthState();
          setCurrentUser(null);
          setLoading(false);
          initializedRef.current = true;
          return;
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logError('AuthProvider', 'Session error:', sessionError);

          // Handle 403 errors specifically
          if (sessionError.message?.includes('403') ||
            sessionError.message?.includes('Forbidden') ||
            sessionError.message?.includes('bad_jwt')) {
            logInfo('AuthProvider', '403 error detected, clearing auth state');
            await handle403Error();
          }

          setCurrentUser(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          logInfo('AuthProvider', `Found existing session for user: ${session.user.email}`);
          await fetchAndSetUserProfile(session.user);

          // Check if there's an active impersonation session to restore
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('admin_impersonation_state');
            if (stored && isImpersonating) {
              try {
                const { impersonatedUser } = JSON.parse(stored);
                if (impersonatedUser) {
                  logInfo('AuthProvider', `Restoring impersonation as: ${impersonatedUser.full_name} (${impersonatedUser.role})`);
                  setCurrentUser(impersonatedUser);
                }
              } catch (e) {
                logWarn('AuthProvider', 'Failed to restore impersonation state:', e);
                // Clear corrupted state
                localStorage.removeItem('admin_impersonation_state');
                setIsImpersonating(false);
                setOriginalUser(null);
              }
            }
          }
        } else {
          logInfo('AuthProvider', 'No existing session found');
          setCurrentUser(null);
          // Clear impersonation state if no session
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_impersonation_state');
          }
          setIsImpersonating(false);
          setOriginalUser(null);
        }

        setLoading(false);
        initializedRef.current = true;
        logInfo('AuthProvider', 'Auth initialization complete');
      } catch (err) {
        logError('AuthProvider', 'Error initializing auth:', err);

        // Handle 403 errors in catch block too
        if (err?.message?.includes('403') ||
          err?.message?.includes('Forbidden') ||
          err?.message?.includes('bad_jwt')) {
          logInfo('AuthProvider', '403 error in catch block, clearing auth state');
          await handle403Error();
        }

        setCurrentUser(null);
        setLoading(false);
        initializedRef.current = true;
      }
    };

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logInfo('AuthProvider', `Auth state change: ${event}`, session?.user?.email);

      if (event === 'SIGNED_IN' && session?.user) {
        logInfo('AuthProvider', `User signed in: ${session.user.email}`);
        fetchAndSetUserProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        logInfo('AuthProvider', 'User signed out');

        // Clear POS settings user cache
        // POSSettingsAPI.clearUserCache(); // Removed to avoid circular dependency

        setCurrentUser(null);
        setLoading(false);
        dataLoadedRef.current = false; // Reset data loaded flag
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        logInfo('AuthProvider', `Token refreshed for user: ${session.user.email}`);
        // Don't refetch profile on token refresh, just ensure user is still set
        if (!currentUser) {
          fetchAndSetUserProfile(session.user);
        }
      }
    });

    // Initialize auth
    initializeAuth();

    // Cleanup function
    return () => {
      logInfo('AuthProvider', 'Cleaning up AuthProvider');
      subscription.unsubscribe();
      authProviderMountCount.current--;
      // Don't reset globalAuthProviderInitialized on cleanup to prevent re-initialization
    };
  }, []); // Empty dependency array to run only once

  // Separate useEffect for data loading to avoid initialization issues
  useEffect(() => {
    if (currentUser && !dataLoadedRef.current) {
      loadInitialDataInBackground();
    }
  }, [currentUser]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);

      // Use Supabase auth for login
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('❌ Login error:', error);
        setError(error.message || 'Invalid email or password');
        setLoading(false);
        return false;
      }

      if (data.user) {

        await fetchAndSetUserProfile(data.user);
        setLoading(false);
        return true;
      }

      setError('Login failed');
      setLoading(false);
      return false;
    } catch (err) {
      console.error('❌ Login error:', err);
      setError('An unexpected error occurred during login');
      setLoading(false);
      return false;
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Logging out...');
      setLoading(true);

      // Clear POS settings user cache
      POSSettingsAPI.clearUserCache();

      // Clear preloaded data
      try {
        const { dataPreloadService } = await import('../services/dataPreloadService');
        dataPreloadService.clearAll();
        console.log('🧹 Cleared preloaded data');
      } catch (error) {
        console.error('❌ Error clearing preloaded data:', error);
      }

      // Clear impersonation state
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_impersonation_state');
      }
      setIsImpersonating(false);
      setOriginalUser(null);

      await supabase.auth.signOut();
      setCurrentUser(null);
      setError(null);
      dataLoadedRef.current = false; // Reset data loaded flag

    } catch (err) {
      console.error('❌ Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  // Permission checking functions that use the current user
  const userHasPermission = (permission: string) => hasPermission(currentUser, permission);
  const userHasAnyPermission = (permissions: string[]) => hasAnyPermission(currentUser, permissions);
  const userHasAllPermissions = (permissions: string[]) => hasAllPermissions(currentUser, permissions);
  const userCanAccessRoute = (path: string) => canAccessRoute(currentUser, path);
  const userGetPermissions = () => getUserPermissions(currentUser);
  const userHasRole = (roles: string | string[]) => hasRole(currentUser, roles);
  const userCheckAccess = (options: { roles?: string[]; permissions?: string[]; requireAll?: boolean }) =>
    checkAccess(currentUser, options);

  // User impersonation methods (admin only)
  const impersonateUser = async (userId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Only admins can impersonate users');
      return false;
    }

    try {
      // Store original user
      setOriginalUser(currentUser);
      setIsImpersonating(true);

      // Get user data from database
      const { data: userData, error } = await supabase
        .from('users')
        .select('id, full_name, email, role, is_active')
        .eq('id', userId)
        .single();

      if (error || !userData) {
        throw new Error('User not found');
      }

      // Create impersonated user object with proper structure
      const getRolePermissions = (role: string): string[] => {
        switch (role) {
          case 'admin':
            return ['all'];
          case 'technician':
            return ['view_devices', 'update_device_status', 'view_customers'];
          case 'customer-care':
            return ['view_customers', 'create_customers', 'edit_customers', 'view_devices', 'assign_devices'];
          default:
            return ['view_devices', 'update_device_status', 'view_customers'];
        }
      };

      const impersonatedUser = {
        ...userData,
        role: userData.role || 'user',
        permissions: getRolePermissions(userData.role || 'user'),
        name: userData.full_name || userData.name || userData.email || 'Unknown User'
      };

      setCurrentUser(impersonatedUser);

      // Persist impersonation state
      saveImpersonationState(true, currentUser, impersonatedUser);

      toast.success(`Now testing as: ${impersonatedUser.name} (${impersonatedUser.role})`);

      return true;
    } catch (error) {
      console.error('Impersonation error:', error);
      toast.error('Failed to impersonate user');
      return false;
    }
  };

  const stopImpersonation = () => {
    if (originalUser) {
      setCurrentUser(originalUser);
      setOriginalUser(null);
      setIsImpersonating(false);

      // Clear persisted impersonation state
      saveImpersonationState(false);

      toast.success('Returned to admin account');
    }
  };

  const getAvailableTestUsers = async (): Promise<any[]> => {
    if (!currentUser || currentUser.role !== 'admin') {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .neq('role', 'admin') // Don't include other admins
        .order('full_name');

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching test users:', error);
      return [];
    }
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      originalUser,
      isImpersonating,
      login,
      logout,
      isAuthenticated: !!currentUser,
      error,
      clearError,
      loading,
      refreshSession,
      handleAuthError,
      // User impersonation for testing
      impersonateUser,
      stopImpersonation,
      getAvailableTestUsers,
      // Permission checking functions
      hasPermission: userHasPermission,
      hasAnyPermission: userHasAnyPermission,
      hasAllPermissions: userHasAllPermissions,
      canAccessRoute: userCanAccessRoute,
      getUserPermissions: userGetPermissions,
      hasRole: userHasRole,
      checkAccess: userCheckAccess,
      Permission
    }}>
      {children}
    </AuthContext.Provider>
  );
};