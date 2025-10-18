// General Settings Tab Component
import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { Settings, Monitor, Eye, Zap, Database, Calculator, Building2, Upload, X, Lock, Shield } from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch, NumberInput, TextInput, Select } from './UniversalFormComponents';
import { useGeneralSettings } from '../../../../hooks/usePOSSettings';
import toast from 'react-hot-toast';

export interface GeneralSettingsTabRef {
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
}

const GeneralSettingsTab = forwardRef<GeneralSettingsTabRef>((props, ref) => {
  const {
    settings,
    setSettings,
    loading: isLoading,
    saving: isSaving,
    error,
    saveSettings,
    updateSettings,
    resetSettings
  } = useGeneralSettings();
  
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.business_logo || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync logoPreview with settings.business_logo when settings change
  React.useEffect(() => {
    if (settings.business_logo !== logoPreview) {
      setLogoPreview(settings.business_logo || null);
    }
  }, [settings.business_logo]);

  const handleSave = async () => {
    const success = await saveSettings(settings);
    
    if (success) {
      // Force refresh the context after saving
      window.dispatchEvent(new CustomEvent('settingsUpdated', { detail: { type: 'general' } }));
    }
    
    return success;
  };

  const handleReset = async () => {
    const success = await resetSettings();
    if (success) {
      // Settings reset successfully
    }
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Apply font size immediately when changed
    if (key === 'font_size') {
      applyFontSize(value);
    }
  };

  // Function to apply font size to the document
  const applyFontSize = (size: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large') => {
    const root = document.documentElement;
    switch (size) {
      case 'tiny':
        root.style.fontSize = '11px'; // Polished: More readable than 10px
        break;
      case 'extra-small':
        root.style.fontSize = '12px';
        break;
      case 'small':
        root.style.fontSize = '14px';
        break;
      case 'medium':
        root.style.fontSize = '16px';
        break;
      case 'large':
        root.style.fontSize = '18px';
        break;
    }
  };

  // Apply font size on component mount
  React.useEffect(() => {
    if (settings.font_size) {
      applyFontSize(settings.font_size);
    }
  }, [settings.font_size]);

  // Handle logo file selection
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    setUploadingLogo(true);

    try {
      // Convert to base64 for preview and storage
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoPreview(base64String);
        handleSettingChange('business_logo', base64String);
        toast.success('Logo uploaded successfully! Remember to save settings.');
      };
      reader.onerror = () => {
        toast.error('Failed to read image file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Remove logo
  const handleRemoveLogo = () => {
    setLogoPreview(null);
    handleSettingChange('business_logo', null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast.success('Logo removed. Remember to save settings.');
  };

  // Expose save and reset functions through ref
  useImperativeHandle(ref, () => ({
    saveSettings: handleSave,
    resetSettings: handleReset
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Error: {error}</p>
      </div>
    );
  }

  return (
    <UniversalSettingsTab
      title="General Settings"
      description="Configure basic interface and behavior settings for your POS system"
      onSave={handleSave}
      onReset={handleReset}
      onCancel={() => {}} // Add empty function for now
      isLoading={isLoading}
      isSaving={isSaving}
      isDirty={false} // Add default value for now
    >
      {/* Business Information */}
      <SettingsSection
        title="Business Information"
        description="Configure your business details and branding"
        icon={<Building2 className="w-5 h-5" />}
      >
        <div className="space-y-6">
          {/* Business Name and Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextInput
              label="Business Name"
              value={settings.business_name || ''}
              onChange={(value) => handleSettingChange('business_name', value)}
              placeholder="My Store"
            />
            
            <TextInput
              label="Business Phone"
              value={settings.business_phone || ''}
              onChange={(value) => handleSettingChange('business_phone', value)}
              placeholder="+255 123 456 789"
            />
            
            <TextInput
              label="Business Email"
              value={settings.business_email || ''}
              onChange={(value) => handleSettingChange('business_email', value)}
              placeholder="info@mystore.com"
            />
            
            <TextInput
              label="Business Website"
              value={settings.business_website || ''}
              onChange={(value) => handleSettingChange('business_website', value)}
              placeholder="www.mystore.com"
            />
          </div>
          
          <div className="col-span-full">
            <TextInput
              label="Business Address"
              value={settings.business_address || ''}
              onChange={(value) => handleSettingChange('business_address', value)}
              placeholder="123 Main Street, City, Country"
            />
          </div>

          {/* Business Logo Upload */}
          <div className="col-span-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Logo
            </label>
            <div className="flex items-start gap-4">
              {/* Logo Preview */}
              {logoPreview ? (
                <div className="relative">
                  <div className="w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                    <img 
                      src={logoPreview} 
                      alt="Business Logo" 
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    title="Remove logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}

              {/* Upload Button */}
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Upload className="w-4 h-4" />
                  {uploadingLogo ? 'Uploading...' : logoPreview ? 'Change Logo' : 'Upload Logo'}
                </label>
                <p className="mt-2 text-sm text-gray-500">
                  Upload your business logo. Recommended size: 200x200px. Max size: 2MB. 
                  Supported formats: JPG, PNG, GIF, WebP.
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  💡 This logo will appear on receipts, invoices, and other documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Interface Settings */}
      <SettingsSection
        title="Interface Settings"
        description="Customize the look and feel of your POS interface"
        icon={<Monitor className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Theme"
            value={settings.theme}
            onChange={(value) => handleSettingChange('theme', value)}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
              { value: 'auto', label: 'Auto' }
            ]}
          />
          
          <Select
            label="Language"
            value={settings.language}
            onChange={(value) => handleSettingChange('language', value)}
            options={[
              { value: 'en', label: 'English' },
              { value: 'sw', label: 'Swahili' },
              { value: 'fr', label: 'French' }
            ]}
          />
          
          <TextInput
            label="Currency"
            value={settings.currency}
            onChange={(value) => handleSettingChange('currency', value)}
            placeholder="TZS"
          />
          
          <TextInput
            label="Timezone"
            value={settings.timezone}
            onChange={(value) => handleSettingChange('timezone', value)}
            placeholder="Africa/Dar_es_Salaam"
          />
          
          <TextInput
            label="Date Format"
            value={settings.date_format}
            onChange={(value) => handleSettingChange('date_format', value)}
            placeholder="DD/MM/YYYY"
          />
          
          <Select
            label="Time Format"
            value={settings.time_format}
            onChange={(value) => handleSettingChange('time_format', value)}
            options={[
              { value: '12', label: '12-hour' },
              { value: '24', label: '24-hour' }
            ]}
          />
          
          <Select
            label="Font Size"
            value={settings.font_size}
            onChange={(value) => handleSettingChange('font_size', value)}
            options={[
              { value: 'tiny', label: 'Tiny (11px) - Ultra Compact ✨' },
              { value: 'extra-small', label: 'Extra Small (12px) - Very Compact' },
              { value: 'small', label: 'Small (14px) - Compact' },
              { value: 'medium', label: 'Medium (16px) - Default ⭐' },
              { value: 'large', label: 'Large (18px) - Comfortable' }
            ]}
          />
        </div>
      </SettingsSection>

      {/* Display Settings */}
      <SettingsSection
        title="Display Settings"
        description="Control what information is shown in the POS interface"
        icon={<Eye className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Show Product Images"
            checked={settings.show_product_images}
            onChange={(checked) => handleSettingChange('show_product_images', checked)}
          />
          
          <ToggleSwitch
            label="Show Stock Levels"
            checked={settings.show_stock_levels}
            onChange={(checked) => handleSettingChange('show_stock_levels', checked)}
          />
          
          <ToggleSwitch
            label="Show Prices"
            checked={settings.show_prices}
            onChange={(checked) => handleSettingChange('show_prices', checked)}
          />
          
          <ToggleSwitch
            label="Show Barcodes"
            checked={settings.show_barcodes}
            onChange={(checked) => handleSettingChange('show_barcodes', checked)}
          />
        </div>
        
        {/* Product Grid Layout */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3 mb-4">
            <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">Product Grid Display</h4>
              <p className="text-sm text-blue-700 mb-4">
                Choose how many products to display in the POS grid. More products = more scrolling but see everything at once.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Products Per Page (Quick Select)"
              value={settings.products_per_page.toString()}
              onChange={(value) => handleSettingChange('products_per_page', parseInt(value))}
              options={[
                { value: '12', label: '12 Products - Minimal (3x4 grid)' },
                { value: '16', label: '16 Products - Compact (4x4 grid)' },
                { value: '20', label: '20 Products - Default ⭐ (4x5 grid)' },
                { value: '24', label: '24 Products - More Items (4x6 grid)' },
                { value: '30', label: '30 Products - Dense (5x6 grid)' },
                { value: '40', label: '40 Products - Maximum (5x8 grid)' },
                { value: '50', label: '50 Products - Power User (5x10 grid)' },
                { value: '100', label: '100 Products - Show All 📋' }
              ]}
            />
            
            <NumberInput
              label="Custom Amount (Advanced)"
              value={settings.products_per_page}
              onChange={(value) => handleSettingChange('products_per_page', value)}
              min={6}
              max={200}
              step={1}
            />
          </div>
          
          <div className="mt-3 text-xs text-blue-600">
            <strong>💡 Tip:</strong> 
            <span className="ml-1">
              Small screen? Use 12-20. Large monitor? Try 30-50. 
              {settings.products_per_page >= 50 && ' Current: Power user mode! 🚀'}
              {settings.products_per_page < 20 && ' Current: Comfortable viewing 👀'}
              {settings.products_per_page >= 20 && settings.products_per_page < 50 && ' Current: Balanced ⚖️'}
            </span>
          </div>
        </div>
      </SettingsSection>

      {/* Behavior Settings */}
      <SettingsSection
        title="Behavior Settings"
        description="Configure how the POS system behaves during operation"
        icon={<Settings className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Auto Complete Search"
            checked={settings.auto_complete_search}
            onChange={(checked) => handleSettingChange('auto_complete_search', checked)}
          />
          
          <ToggleSwitch
            label="Confirm Delete"
            checked={settings.confirm_delete}
            onChange={(checked) => handleSettingChange('confirm_delete', checked)}
          />
          
          <ToggleSwitch
            label="Show Confirmations"
            checked={settings.show_confirmations}
            onChange={(checked) => handleSettingChange('show_confirmations', checked)}
          />
          
          <ToggleSwitch
            label="Enable Sound Effects"
            checked={settings.enable_sound_effects}
            onChange={(checked) => handleSettingChange('enable_sound_effects', checked)}
          />
          
          <ToggleSwitch
            label="Enable Animations"
            checked={settings.enable_animations}
            onChange={(checked) => handleSettingChange('enable_animations', checked)}
          />
        </div>
      </SettingsSection>

      {/* Performance Settings */}
      <SettingsSection
        title="Performance Settings"
        description="Optimize system performance and caching"
        icon={<Zap className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Enable Caching"
            checked={settings.enable_caching}
            onChange={(checked) => handleSettingChange('enable_caching', checked)}
          />
          
          <NumberInput
            label="Cache Duration (seconds)"
            value={settings.cache_duration}
            onChange={(value) => handleSettingChange('cache_duration', value)}
            min={60}
            max={3600}
            step={30}
          />
          
          <ToggleSwitch
            label="Enable Lazy Loading"
            checked={settings.enable_lazy_loading}
            onChange={(checked) => handleSettingChange('enable_lazy_loading', checked)}
          />
          
          <NumberInput
            label="Max Search Results"
            value={settings.max_search_results}
            onChange={(value) => handleSettingChange('max_search_results', value)}
            min={10}
            max={200}
            step={10}
          />
        </div>
      </SettingsSection>

      {/* Tax Settings */}
      <SettingsSection
        title="Tax Settings"
        description="Configure tax calculation for sales"
        icon={<Calculator className="w-5 h-5" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Enable Tax"
            checked={settings.enable_tax}
            onChange={(checked) => handleSettingChange('enable_tax', checked)}
          />
          
          {settings.enable_tax && (
            <NumberInput
              label="Tax Rate (%)"
              value={settings.tax_rate}
              onChange={(value) => handleSettingChange('tax_rate', value)}
              min={0}
              max={50}
              step={0.1}
            />
          )}
        </div>
      </SettingsSection>

      {/* Hardware Settings */}
      <SettingsSection
        title="Hardware Settings"
        description="Configure barcode scanner and hardware devices"
        icon={<Zap className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Barcode Scanner</h4>
                <p className="text-sm text-blue-700 mb-4">
                  Simplified barcode scanner settings. Advanced options are auto-configured.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSwitch
                    label="Enable Barcode Scanner"
                    checked={settings.show_barcodes}
                    onChange={(checked) => handleSettingChange('show_barcodes', checked)}
                  />
                  <ToggleSwitch
                    label="Play Sound on Scan"
                    checked={settings.enable_sound_effects}
                    onChange={(checked) => handleSettingChange('enable_sound_effects', checked)}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-3">
                  💡 <strong>Auto-configured:</strong> Scanner timeout, retry attempts, supported code types, and connection settings are automatically optimized.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications & Alerts"
        description="Configure important system notifications"
        icon={<Settings className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 mb-1">Key Alerts</h4>
                <p className="text-sm text-green-700 mb-4">
                  Enable important notifications to stay informed about your business.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ToggleSwitch
                    label="Low Stock Alerts"
                    checked={settings.show_stock_levels}
                    onChange={(checked) => handleSettingChange('show_stock_levels', checked)}
                  />
                  <ToggleSwitch
                    label="Payment Confirmations"
                    checked={settings.show_confirmations}
                    onChange={(checked) => handleSettingChange('show_confirmations', checked)}
                  />
                </div>
                <p className="text-xs text-green-600 mt-3">
                  💡 <strong>Note:</strong> Critical system alerts are always enabled for security.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Security Settings */}
      <SettingsSection
        title="Security Settings"
        description="Manage passcodes and security features"
        icon={<Shield className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Day Closing Passcode</h4>
                <p className="text-sm text-amber-700 mb-3">
                  This passcode is required to close and open the day in the POS. Keep it secure and share only with authorized staff.
                </p>
                <div className="max-w-md">
                  <TextInput
                    label="Passcode (4 digits recommended)"
                    value={settings.day_closing_passcode || '1234'}
                    onChange={(value) => handleSettingChange('day_closing_passcode', value)}
                    placeholder="Enter passcode"
                    type="password"
                  />
                  <p className="text-xs text-amber-600 mt-2">
                    💡 <strong>Important:</strong> Remember this passcode! You'll need it to close and reopen the day.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Passcode Tips</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use a memorable but secure passcode</li>
                  <li>• Avoid obvious combinations like "1111" or "0000"</li>
                  <li>• Change passcode regularly for security</li>
                  <li>• Don't share with unauthorized personnel</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
          </UniversalSettingsTab>
    );
  });
  
  GeneralSettingsTab.displayName = 'GeneralSettingsTab';
  
  // Wrap with React.memo to prevent unnecessary re-renders
  export default React.memo(GeneralSettingsTab);
