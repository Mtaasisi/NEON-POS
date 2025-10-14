/**
 * Example: How to Fetch Unified Branding Settings
 * 
 * This file shows different ways to fetch and use branding settings
 */

import React, { useEffect, useState } from 'react';
import { useBrandingSettings, useUnifiedBranding } from '../hooks/useUnifiedBranding';
import UnifiedBrandingAPI, { UnifiedBrandingSettings } from '../lib/unifiedBrandingApi';

// ============================================
// METHOD 1: Using React Hook (Recommended for components)
// ============================================

export const BrandingDisplayExample: React.FC = () => {
  const { settings, loading } = useBrandingSettings();

  if (loading) return <div>Loading branding...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Company Branding</h2>
      
      {/* Display Logo */}
      {settings?.business_logo && (
        <img 
          src={settings.business_logo} 
          alt={settings.company_name}
          className="w-32 h-32 object-contain mb-4"
        />
      )}
      
      {/* Display Company Info */}
      <div className="space-y-2">
        <h3 className="text-xl font-semibold" style={{ color: settings?.primary_color }}>
          {settings?.company_name}
        </h3>
        <p className="text-gray-600">{settings?.business_address}</p>
        <p className="text-gray-600">{settings?.business_phone}</p>
        <p className="text-gray-600">{settings?.business_email}</p>
        <p className="text-gray-600">{settings?.business_website}</p>
      </div>

      {/* Display Colors */}
      <div className="mt-4 flex gap-4">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: settings?.primary_color }}
          />
          <span className="text-sm">Primary</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: settings?.secondary_color }}
          />
          <span className="text-sm">Secondary</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded border"
            style={{ backgroundColor: settings?.accent_color }}
          />
          <span className="text-sm">Accent</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// METHOD 2: Using API Directly (For services/utilities)
// ============================================

export const fetchBrandingDirectly = async () => {
  try {
    const settings = await UnifiedBrandingAPI.loadSettings();
    console.log('✅ Branding settings loaded:', settings);
    return settings;
  } catch (error) {
    console.error('❌ Error fetching branding:', error);
    return null;
  }
};

// ============================================
// METHOD 3: With Full Control (Edit capability)
// ============================================

export const BrandingEditorExample: React.FC = () => {
  const { settings, loading, saving, saveSettings, updateSettings } = useUnifiedBranding();
  const [localCompanyName, setLocalCompanyName] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalCompanyName(settings.company_name);
    }
  }, [settings]);

  const handleSave = async () => {
    const success = await saveSettings({
      ...settings!,
      company_name: localCompanyName
    });

    if (success) {
      alert('✅ Branding updated successfully!');
    } else {
      alert('❌ Failed to update branding');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-4">Edit Branding</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Company Name</label>
        <input
          type="text"
          value={localCompanyName}
          onChange={(e) => setLocalCompanyName(e.target.value)}
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
};

// ============================================
// METHOD 4: Using useState (Manual control)
// ============================================

export const BrandingManualFetchExample: React.FC = () => {
  const [settings, setSettings] = useState<UnifiedBrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBranding = async () => {
      try {
        const data = await UnifiedBrandingAPI.loadSettings();
        setSettings(data);
      } catch (error) {
        console.error('Error loading branding:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBranding();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h3>{settings?.company_name}</h3>
      <p>{settings?.business_address}</p>
    </div>
  );
};

// ============================================
// METHOD 5: For Dashboard Service (Non-React)
// ============================================

export class BrandingService {
  private static cachedSettings: UnifiedBrandingSettings | null = null;
  private static cacheExpiry: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get branding settings with caching
   */
  static async getBranding(): Promise<UnifiedBrandingSettings | null> {
    const now = Date.now();

    // Return cached if valid
    if (this.cachedSettings && now < this.cacheExpiry) {
      console.log('🎨 Using cached branding settings');
      return this.cachedSettings;
    }

    try {
      console.log('🎨 Fetching fresh branding settings...');
      const settings = await UnifiedBrandingAPI.loadSettings();
      
      // Update cache
      this.cachedSettings = settings;
      this.cacheExpiry = now + this.CACHE_DURATION;
      
      console.log('✅ Branding settings loaded:', settings?.company_name);
      return settings;
    } catch (error) {
      console.error('❌ Error fetching branding:', error);
      return this.cachedSettings; // Return stale cache on error
    }
  }

  /**
   * Clear cache (call after updating settings)
   */
  static clearCache() {
    this.cachedSettings = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get specific branding field
   */
  static async getBrandingField<K extends keyof UnifiedBrandingSettings>(
    field: K
  ): Promise<UnifiedBrandingSettings[K] | undefined> {
    const settings = await this.getBranding();
    return settings?.[field];
  }

  /**
   * Get logo URL
   */
  static async getLogo(): Promise<string | null> {
    const settings = await this.getBranding();
    return settings?.business_logo || settings?.app_logo || null;
  }

  /**
   * Get company name
   */
  static async getCompanyName(): Promise<string> {
    const settings = await this.getBranding();
    return settings?.company_name || 'My Business';
  }

  /**
   * Get all company info as formatted string
   */
  static async getFormattedCompanyInfo(): Promise<string> {
    const settings = await this.getBranding();
    if (!settings) return '';

    return [
      settings.company_name,
      settings.business_address,
      settings.business_phone,
      settings.business_email
    ].filter(Boolean).join('\n');
  }
}

// ============================================
// USAGE EXAMPLES
// ============================================

// Example 1: In a React component
export const ExampleUsage1 = () => {
  const { settings } = useBrandingSettings();
  return <h1>{settings?.company_name}</h1>;
};

// Example 2: In a service/utility
export const exampleUsage2 = async () => {
  const logo = await BrandingService.getLogo();
  const companyName = await BrandingService.getCompanyName();
  console.log('Logo:', logo);
  console.log('Company:', companyName);
};

// Example 3: In dashboard service
export const exampleUsage3 = async () => {
  const branding = await BrandingService.getBranding();
  
  return {
    dashboard: {
      title: branding?.company_name || 'Dashboard',
      logo: branding?.business_logo,
      colors: {
        primary: branding?.primary_color,
        secondary: branding?.secondary_color
      }
    }
  };
};

export default BrandingDisplayExample;

