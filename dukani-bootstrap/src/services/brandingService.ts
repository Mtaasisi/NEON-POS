/**
 * Branding Service
 * 
 * Integrates unified branding settings with other services
 * Use this in non-React contexts (services, utilities, etc.)
 */

import UnifiedBrandingAPI, { UnifiedBrandingSettings } from '../lib/unifiedBrandingApi';

export class BrandingService {
  private static cachedSettings: UnifiedBrandingSettings | null = null;
  private static cacheExpiry: number = 0;
  private static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get branding settings with automatic caching
   * 
   * @example
   * const branding = await BrandingService.getBranding();
   * console.log(branding.company_name);
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
      
      console.log('✅ Branding loaded:', settings?.company_name);
      return settings;
    } catch (error) {
      console.error('❌ Error fetching branding:', error);
      return this.cachedSettings; // Return stale cache on error
    }
  }

  /**
   * Clear cache (call this after updating branding settings)
   * 
   * @example
   * await UnifiedBrandingAPI.saveSettings(...);
   * BrandingService.clearCache();
   */
  static clearCache() {
    this.cachedSettings = null;
    this.cacheExpiry = 0;
    console.log('🗑️ Branding cache cleared');
  }

  /**
   * Get specific branding field
   * 
   * @example
   * const logo = await BrandingService.getField('business_logo');
   */
  static async getField<K extends keyof UnifiedBrandingSettings>(
    field: K
  ): Promise<UnifiedBrandingSettings[K] | undefined> {
    const settings = await this.getBranding();
    return settings?.[field];
  }

  /**
   * Get logo URL (business_logo or fallback to app_logo)
   * 
   * @example
   * const logo = await BrandingService.getLogo();
   */
  static async getLogo(): Promise<string | null> {
    const settings = await this.getBranding();
    return settings?.business_logo || settings?.app_logo || null;
  }

  /**
   * Get company name
   * 
   * @example
   * const name = await BrandingService.getCompanyName();
   */
  static async getCompanyName(): Promise<string> {
    const settings = await this.getBranding();
    return settings?.company_name || 'My Business';
  }

  /**
   * Get business name (for receipts/invoices)
   * 
   * @example
   * const businessName = await BrandingService.getBusinessName();
   */
  static async getBusinessName(): Promise<string> {
    const settings = await this.getBranding();
    return settings?.business_name || settings?.company_name || 'My Business';
  }

  /**
   * Get all company contact info
   * 
   * @example
   * const contact = await BrandingService.getContactInfo();
   * console.log(contact.phone, contact.email);
   */
  static async getContactInfo() {
    const settings = await this.getBranding();
    return {
      address: settings?.business_address || '',
      phone: settings?.business_phone || '',
      email: settings?.business_email || '',
      website: settings?.business_website || ''
    };
  }

  /**
   * Get brand colors
   * 
   * @example
   * const colors = await BrandingService.getColors();
   * console.log(colors.primary); // #3B82F6
   */
  static async getColors() {
    const settings = await this.getBranding();
    return {
      primary: settings?.primary_color || '#3B82F6',
      secondary: settings?.secondary_color || '#1E40AF',
      accent: settings?.accent_color || '#10B981'
    };
  }

  /**
   * Get formatted company info as text (for receipts/documents)
   * 
   * @example
   * const info = await BrandingService.getFormattedInfo();
   * // Returns:
   * // My Company
   * // 123 Main St, City
   * // +255 123 456 789
   * // info@company.com
   */
  static async getFormattedInfo(): Promise<string> {
    const settings = await this.getBranding();
    if (!settings) return '';

    const parts = [
      settings.business_name || settings.company_name,
      settings.business_address,
      settings.business_phone,
      settings.business_email
    ].filter(Boolean);

    return parts.join('\n');
  }

  /**
   * Get receipt header info
   * 
   * @example
   * const header = await BrandingService.getReceiptHeader();
   */
  static async getReceiptHeader() {
    const settings = await this.getBranding();
    return {
      logo: settings?.business_logo,
      businessName: settings?.business_name || settings?.company_name || 'My Business',
      address: settings?.business_address || '',
      phone: settings?.business_phone || '',
      email: settings?.business_email || '',
      website: settings?.business_website || '',
      taxId: settings?.tax_id || '',
      registrationNumber: settings?.registration_number || ''
    };
  }

  /**
   * Check if branding is configured
   * 
   * @example
   * if (await BrandingService.isConfigured()) {
   *   // Show branding
   * } else {
   *   // Show default
   * }
   */
  static async isConfigured(): Promise<boolean> {
    const settings = await this.getBranding();
    return settings !== null && (
      !!settings.business_logo ||
      !!settings.company_name ||
      !!settings.business_name
    );
  }

  /**
   * Get all settings as plain object (for dashboard/analytics)
   * 
   * @example
   * const data = await BrandingService.getAllSettings();
   */
  static async getAllSettings(): Promise<UnifiedBrandingSettings | null> {
    return this.getBranding();
  }

  /**
   * Subscribe to branding changes
   * 
   * @example
   * const unsubscribe = BrandingService.subscribe((newSettings) => {
   *   console.log('Branding updated:', newSettings);
   * });
   * 
   * // Later: unsubscribe();
   */
  static subscribe(callback: (settings: UnifiedBrandingSettings) => void) {
    // Clear cache on updates
    const wrappedCallback = (settings: UnifiedBrandingSettings) => {
      this.clearCache();
      callback(settings);
    };

    return UnifiedBrandingAPI.subscribeToSettings(wrappedCallback);
  }

  /**
   * Unsubscribe from branding changes
   */
  static unsubscribe() {
    UnifiedBrandingAPI.unsubscribeFromSettings();
  }
}

export default BrandingService;

