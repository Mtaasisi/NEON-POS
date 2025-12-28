import { useState, useEffect, useCallback } from 'react';
import UnifiedBrandingAPI, { UnifiedBrandingSettings } from '../lib/unifiedBrandingApi';

/**
 * Hook for accessing and updating unified branding settings
 * Use this hook in any component that needs branding information
 */
export const useUnifiedBranding = () => {
  const [settings, setSettings] = useState<UnifiedBrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  // Subscribe to settings changes
  useEffect(() => {
    const subscription = UnifiedBrandingAPI.subscribeToSettings((newSettings) => {
      setSettings(newSettings);
    });

    return () => {
      UnifiedBrandingAPI.unsubscribeFromSettings();
    };
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await UnifiedBrandingAPI.loadSettings();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async (
    newSettings: Omit<UnifiedBrandingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    setSaving(true);
    setError(null);
    try {
      const data = await UnifiedBrandingAPI.saveSettings(newSettings);
      if (data) {
        setSettings(data);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const updateSettings = useCallback(async (
    updates: Partial<Omit<UnifiedBrandingSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    setSaving(true);
    setError(null);
    try {
      const data = await UnifiedBrandingAPI.updateSettings(updates);
      if (data) {
        setSettings(data);
        return true;
      }
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branding settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const migrateFromPOS = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await UnifiedBrandingAPI.migrateFromPOSSettings();
      if (success) {
        await loadSettings(); // Reload settings after migration
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to migrate from POS settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  const migrateFromAdmin = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const success = await UnifiedBrandingAPI.migrateFromAdminSettings();
      if (success) {
        await loadSettings(); // Reload settings after migration
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to migrate from Admin settings');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadSettings]);

  return {
    settings,
    loading,
    saving,
    error,
    loadSettings,
    saveSettings,
    updateSettings,
    migrateFromPOS,
    migrateFromAdmin
  };
};

/**
 * Simplified hook that only returns the settings (read-only)
 * Use this when you only need to display branding, not edit it
 */
export const useBrandingSettings = () => {
  const [settings, setSettings] = useState<UnifiedBrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      const data = await UnifiedBrandingAPI.loadSettings();
      setSettings(data);
      setLoading(false);
    };

    loadSettings();

    // Subscribe to changes
    const subscription = UnifiedBrandingAPI.subscribeToSettings((newSettings) => {
      setSettings(newSettings);
    });

    return () => {
      UnifiedBrandingAPI.unsubscribeFromSettings();
    };
  }, []);

  return { settings, loading };
};

export default useUnifiedBranding;

