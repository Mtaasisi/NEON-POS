import { useState, useEffect } from 'react';
import { businessInfoService, BusinessInfo } from '../lib/businessInfoService';

/**
 * Hook to get business information from settings
 * Automatically refreshes when settings are updated
 */
export function useBusinessInfo() {
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: 'inauzwa',
    address: 'Dar es Salaam, Tanzania',
    phone: '+255 123 456 789',
    email: undefined,
    website: undefined,
    logo: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadBusinessInfo = async () => {
      try {
        setLoading(true);
        const info = await businessInfoService.getBusinessInfo();
        if (mounted) {
          setBusinessInfo(info);
          setError(null);
          // Log logo status in development
          if (process.env.NODE_ENV === 'development') {
            console.log('📸 Business Info loaded:', {
              name: info.name,
              hasLogo: !!info.logo,
              logoType: info.logo ? (info.logo.startsWith('data:') ? 'base64' : 'url') : 'none',
              logoLength: info.logo ? info.logo.length : 0
            });
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load business info');
          console.error('❌ Error loading business info:', err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadBusinessInfo();

    // Listen for settings updates
    const handleSettingsUpdate = (event: CustomEvent) => {
      if (event.detail?.type === 'general') {
        // Clear cache and reload
        businessInfoService.clearCache();
        loadBusinessInfo();
      }
    };

    window.addEventListener('settingsUpdated', handleSettingsUpdate as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('settingsUpdated', handleSettingsUpdate as EventListener);
    };
  }, []);

  return { businessInfo, loading, error };
}

