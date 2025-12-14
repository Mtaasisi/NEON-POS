import { useState, useEffect, useCallback } from 'react';
import {
  getInventorySettings,
  updateInventorySetting,
  updateInventorySettings,
  getInventorySetting,
  type InventorySettings
} from '../lib/inventorySettingsApi';

interface UseInventorySettingsReturn {
  settings: InventorySettings | null;
  loading: boolean;
  error: Error | null;
  updateSetting: (key: keyof InventorySettings, value: any) => Promise<void>;
  updateMultipleSettings: (updates: Partial<InventorySettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  getSetting: (key: keyof InventorySettings) => any;
}

/**
 * React hook for managing inventory settings
 * 
 * @example
 * ```tsx
 * const { settings, loading, updateSetting } = useInventorySettings();
 * 
 * if (loading) return <div>Loading...</div>;
 * 
 * return (
 *   <div>
 *     <p>Low Stock Threshold: {settings.low_stock_threshold}</p>
 *     <button onClick={() => updateSetting('low_stock_threshold', 15)}>
 *       Update Threshold
 *     </button>
 *   </div>
 * );
 * ```
 */
export const useInventorySettings = (): UseInventorySettingsReturn => {
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Load settings on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInventorySettings();
      setSettings(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load inventory settings');
      setError(error);
      console.error('Error loading inventory settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Update a single setting
  const updateSetting = useCallback(async (key: keyof InventorySettings, value: any) => {
    if (!settings) return;

    try {
      await updateInventorySetting(key, value);
      // Update local state optimistically
      setSettings(prev => prev ? { ...prev, [key]: value } : null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update ${key}`);
      setError(error);
      console.error(`Error updating inventory setting ${key}:`, err);
      throw error;
    }
  }, [settings]);

  // Update multiple settings
  const updateMultipleSettings = useCallback(async (updates: Partial<InventorySettings>) => {
    if (!settings) return;

    try {
      await updateInventorySettings(updates);
      // Update local state optimistically
      setSettings(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update settings');
      setError(error);
      console.error('Error updating inventory settings:', err);
      throw error;
    }
  }, [settings]);

  // Refresh settings from server
  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  // Get a specific setting value
  const getSetting = useCallback((key: keyof InventorySettings): any => {
    return settings?.[key];
  }, [settings]);

  return {
    settings,
    loading,
    error,
    updateSetting,
    updateMultipleSettings,
    refreshSettings,
    getSetting
  };
};

/**
 * Hook to get a single inventory setting value
 * 
 * @example
 * ```tsx
 * const lowStockThreshold = useInventorySetting('low_stock_threshold');
 * ```
 */
export const useInventorySetting = (key: keyof InventorySettings): any => {
  const [value, setValue] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSetting = async () => {
      setLoading(true);
      try {
        const settingValue = await getInventorySetting(key);
        setValue(settingValue);
      } catch (error) {
        console.error(`Error loading inventory setting ${key}:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadSetting();
  }, [key]);

  return loading ? null : value;
};

export default useInventorySettings;

