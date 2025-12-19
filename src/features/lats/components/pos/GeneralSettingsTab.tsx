// General Settings Tab Component
import React, { forwardRef, useImperativeHandle, useState, useRef } from 'react';
import { Settings, Monitor, Eye, Zap, Database, Calculator, Building2, Upload, X, Lock, Shield } from 'lucide-react';
import UniversalSettingsTab from './UniversalSettingsTab';
import { SettingsSection } from './UniversalFormComponents';
import { ToggleSwitch, NumberInput, TextInput, Select } from './UniversalFormComponents';
import { useGeneralSettings } from '../../../../hooks/usePOSSettings';
import toast from 'react-hot-toast';
import HelpTooltip from './HelpTooltip';
import { useTranslation } from '../../lib/i18n/useTranslation';

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
  const { t } = useTranslation(); // Use the translation hook
  
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
      isLoading={isLoading}
    >
      {/* Business Information */}
      <SettingsSection
        title={t('general.businessInfo')}
        icon={<Building2 className="w-5 h-5" />}
        helpText={t('general.businessInfoHelp')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Logo Section - Left Side */}
          <div className="lg:col-span-3">
            <div className="h-full flex flex-col">
              {/* Logo Preview */}
              <div className="flex-1 flex items-center justify-center mb-3">
                {logoPreview ? (
                  <div className="relative">
                    <div className="w-48 h-48 border-2 border-gray-200 rounded-lg overflow-hidden bg-white flex items-center justify-center">
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
                  <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-white">
                    <Upload className="w-10 h-10 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Upload Button */}
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
                className={`w-full inline-flex items-center justify-center gap-2 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer transition-colors ${uploadingLogo ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload className="w-4 h-4" />
                {uploadingLogo ? t('general.uploading') : logoPreview ? t('general.changeLogo') : t('general.uploadLogo')}
              </label>
            </div>
          </div>

          {/* Business Fields - Right Side */}
          <div className="lg:col-span-9">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput
                label={t('general.businessName')}
                value={settings.business_name || ''}
                onChange={(value) => handleSettingChange('business_name', value)}
                placeholder="My Store"
              />
              
              <TextInput
                label={t('general.businessPhone')}
                value={settings.business_phone || ''}
                onChange={(value) => handleSettingChange('business_phone', value)}
                placeholder="+255 123 456 789"
              />
              
              <TextInput
                label={t('general.businessEmail')}
                value={settings.business_email || ''}
                onChange={(value) => handleSettingChange('business_email', value)}
                placeholder="info@mystore.com"
              />
              
              <TextInput
                label={t('general.businessWebsite')}
                value={settings.business_website || ''}
                onChange={(value) => handleSettingChange('business_website', value)}
                placeholder="www.mystore.com"
              />
              
              <div className="sm:col-span-2">
                <TextInput
                  label={t('general.businessAddress')}
                  value={settings.business_address || ''}
                  onChange={(value) => handleSettingChange('business_address', value)}
                  placeholder="123 Main Street, City, Country"
                />
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Interface Settings */}
      <SettingsSection
        title={t('interface.title')}
        icon={<Monitor className="w-5 h-5" />}
        helpText={t('interface.help')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Select
            label={t('interface.theme')}
            value={settings.theme}
            onChange={(value) => handleSettingChange('theme', value)}
            options={[
              { value: 'light', label: t('interface.light') },
              { value: 'dark', label: t('interface.dark') },
              { value: 'auto', label: t('interface.auto') }
            ]}
          />
          
          <Select
            label={t('interface.language')}
            value={settings.language}
            onChange={(value) => handleSettingChange('language', value)}
            options={[
              { value: 'en', label: t('interface.english') },
              { value: 'sw', label: t('interface.swahili') },
              { value: 'fr', label: t('interface.french') }
            ]}
          />
          
          <Select
            label={t('interface.fontSize')}
            value={settings.font_size}
            onChange={(value) => handleSettingChange('font_size', value)}
            options={[
              { value: 'tiny', label: `${t('interface.tiny')} (11px)` },
              { value: 'extra-small', label: `${t('interface.extraSmall')} (12px)` },
              { value: 'small', label: `${t('interface.small')} (14px)` },
              { value: 'medium', label: `${t('interface.medium')} (16px)` },
              { value: 'large', label: `${t('interface.large')} (18px)` }
            ]}
          />
          
          <TextInput
            label={t('interface.currency')}
            value={settings.currency}
            onChange={(value) => handleSettingChange('currency', value)}
            placeholder="TZS"
          />
          
          <TextInput
            label={t('interface.dateFormat')}
            value={settings.date_format}
            onChange={(value) => handleSettingChange('date_format', value)}
            placeholder="DD/MM/YYYY"
          />
          
          <Select
            label={t('interface.timeFormat')}
            value={settings.time_format}
            onChange={(value) => handleSettingChange('time_format', value)}
            options={[
              { value: '12', label: t('interface.12hour') },
              { value: '24', label: t('interface.24hour') }
            ]}
          />
        </div>
      </SettingsSection>

      {/* Display Settings */}
      <SettingsSection
        title="Display Settings"
        icon={<Eye className="w-5 h-5" />}
        helpText="Chagua ni taarifa gani zinaonekana kwenye product cards za POS."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Show Product Images"
            checked={settings.show_product_images}
            onChange={(checked) => handleSettingChange('show_product_images', checked)}
            helpText="Onyesha picha za bidhaa kwenye POS grid."
          />
          
          <ToggleSwitch
            label="Show Stock Levels"
            checked={settings.show_stock_levels}
            onChange={(checked) => handleSettingChange('show_stock_levels', checked)}
            helpText="Onyesha idadi ya stock kwa kila bidhaa."
          />
          
          <ToggleSwitch
            label="Show Prices"
            checked={settings.show_prices}
            onChange={(checked) => handleSettingChange('show_prices', checked)}
            helpText="Onyesha bei kwenye product cards."
          />
          
          <ToggleSwitch
            label="Show Barcodes"
            checked={settings.show_barcodes}
            onChange={(checked) => handleSettingChange('show_barcodes', checked)}
            helpText="Onyesha barcode kwenye product cards."
          />
        </div>
      </SettingsSection>

      {/* Product Grid Settings */}
      <SettingsSection
        title="Product Grid Settings"
        icon={<Eye className="w-5 h-5" />}
        helpText={
          <div>
            <p className="mb-2">Dhibiti layout ya product grid kwenye POS.</p>
            <p className="mb-2"><strong>Recommendations:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Screen ndogo: 2-3 bidhaa kwa row</li>
              <li>Screen wastani: 3-4 bidhaa kwa row</li>
              <li>Monitor kubwa: 4-6 bidhaa kwa row</li>
              <li>Ultra-wide: 6-8 bidhaa kwa row</li>
            </ul>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Products Per Row"
            value={settings.products_per_row.toString()}
            onChange={(value) => handleSettingChange('products_per_row', parseInt(value))}
            options={[
              { value: '2', label: '2 Products' },
              { value: '3', label: '3 Products' },
              { value: '4', label: '4 Products (Default)' },
              { value: '5', label: '5 Products' },
              { value: '6', label: '6 Products' },
              { value: '8', label: '8 Products' }
            ]}
          />
          
          <NumberInput
            label="Custom Amount"
            value={settings.products_per_row}
            onChange={(value) => handleSettingChange('products_per_row', value)}
            min={2}
            max={12}
            step={1}
            helpText="Weka namba kati ya 2 na 12."
          />
        </div>
        
        <div className="mt-4">
          <Select
            label="Products Per Page"
            value={settings.products_per_page.toString()}
            onChange={(value) => handleSettingChange('products_per_page', parseInt(value))}
            options={[
              { value: '12', label: '12 Products' },
              { value: '16', label: '16 Products' },
              { value: '20', label: '20 Products (Default)' },
              { value: '24', label: '24 Products' },
              { value: '30', label: '30 Products' },
              { value: '40', label: '40 Products' },
              { value: '50', label: '50 Products' },
              { value: '100', label: '100 Products' }
            ]}
            helpText="Jumla ya bidhaa za kuonyesha kwa page."
          />
        </div>
      </SettingsSection>

      {/* Behavior Settings */}
      <SettingsSection
        title="Behavior Settings"
        icon={<Settings className="w-5 h-5" />}
        helpText="Dhibiti jinsi POS inavyofanya kazi wakati unachangia."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Auto Complete Search"
            checked={settings.auto_complete_search}
            onChange={(checked) => handleSettingChange('auto_complete_search', checked)}
            helpText="Onyesha search suggestions wakati unaandika."
          />
          
          <ToggleSwitch
            label="Confirm Delete"
            checked={settings.confirm_delete}
            onChange={(checked) => handleSettingChange('confirm_delete', checked)}
            helpText="Uliza confirmation kabla ya kufuta item."
          />
          
          <ToggleSwitch
            label="Show Confirmations"
            checked={settings.show_confirmations}
            onChange={(checked) => handleSettingChange('show_confirmations', checked)}
            helpText="Onyesha success messages baada ya kumaliza action."
          />
          
          <ToggleSwitch
            label="Enable Sound Effects"
            checked={settings.enable_sound_effects}
            onChange={(checked) => handleSettingChange('enable_sound_effects', checked)}
            helpText="Play sounds wakati unapiga buttons."
          />
          
          <ToggleSwitch
            label="Enable Animations"
            checked={settings.enable_animations}
            onChange={(checked) => handleSettingChange('enable_animations', checked)}
            helpText="Enable smooth transitions na animations."
          />
        </div>
      </SettingsSection>

      {/* Performance Settings */}
      <SettingsSection
        title="Performance Settings"
        icon={<Zap className="w-5 h-5" />}
        helpText="Optimize jinsi POS inavyopakia data kwa speed ya haraka."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Enable Caching"
            checked={settings.enable_caching}
            onChange={(checked) => handleSettingChange('enable_caching', checked)}
            helpText="Save data kwa muda ili POS ipake haraka."
          />
          
          <ToggleSwitch
            label="Enable Lazy Loading"
            checked={settings.enable_lazy_loading}
            onChange={(checked) => handleSettingChange('enable_lazy_loading', checked)}
            helpText="Pakia picha na data wakati inahitajika tu."
          />
          
          <NumberInput
            label="Cache Duration (seconds)"
            value={settings.cache_duration}
            onChange={(value) => handleSettingChange('cache_duration', value)}
            min={60}
            max={3600}
            step={30}
            helpText="Muda wa kukeep cached data kabla ya refresh."
          />
          
          <NumberInput
            label="Max Search Results"
            value={settings.max_search_results}
            onChange={(value) => handleSettingChange('max_search_results', value)}
            min={10}
            max={200}
            step={10}
            helpText="Maximum ya bidhaa za kuonyesha kwenye search results."
          />
        </div>
      </SettingsSection>

      {/* Tax Settings */}
      <SettingsSection
        title="Tax Settings"
        icon={<Calculator className="w-5 h-5" />}
        helpText="Weka automatic tax calculation kwa sales."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Enable Tax"
            checked={settings.enable_tax}
            onChange={(checked) => handleSettingChange('enable_tax', checked)}
            helpText="Calculate na ongeza tax automatically kwa sales."
          />

          <NumberInput
            label="Tax Rate (%)"
            value={settings.tax_rate}
            onChange={(value) => handleSettingChange('tax_rate', value)}
            min={0}
            max={50}
            step={0.1}
            helpText="Percent ya tax kwa sales (mfano: 18 kwa 18% VAT)."
            disabled={!settings.enable_tax}
          />
        </div>
      </SettingsSection>

      {/* Hardware Settings */}
      <SettingsSection
        title="Hardware Settings"
        icon={<Zap className="w-5 h-5" />}
        helpText="Weka barcode scanner na vifaa vingine."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Enable Barcode Scanner"
            checked={settings.show_barcodes}
            onChange={(checked) => handleSettingChange('show_barcodes', checked)}
            helpText="Scan barcode kuongeza bidhaa haraka kwenye cart."
          />
          <ToggleSwitch
            label="Play Sound on Scan"
            checked={settings.enable_sound_effects}
            onChange={(checked) => handleSettingChange('enable_sound_effects', checked)}
            helpText="Play sound wakati barcode imescan successfully."
          />
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        title="Notifications & Alerts"
        icon={<Settings className="w-5 h-5" />}
        helpText="Chagua ni notifications gani zinaonekana kwenye POS."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ToggleSwitch
            label="Low Stock Alerts"
            checked={settings.show_stock_levels}
            onChange={(checked) => handleSettingChange('show_stock_levels', checked)}
            helpText="Pata notification wakati stock inaisha."
          />
          <ToggleSwitch
            label="Payment Confirmations"
            checked={settings.show_confirmations}
            onChange={(checked) => handleSettingChange('show_confirmations', checked)}
            helpText="Onyesha confirmation messages baada ya payment."
          />
        </div>
      </SettingsSection>

      {/* Security Settings */}
      <SettingsSection
        title="Security Settings"
        icon={<Shield className="w-5 h-5" />}
        helpText={
          <div>
            <p className="mb-2"><strong>Security Tips:</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Tumia passcode ambayo unakumbuka lakini ni secure</li>
              <li>Usitumie "1111" au "1234"</li>
              <li>Badilisha passcode mara kwa mara</li>
              <li>Share na wafanyakazi authorized tu</li>
            </ul>
          </div>
        }
      >
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Day Closing Passcode
              </label>
              <div className="max-w-sm">
                <TextInput
                  label=""
                  value={settings.day_closing_passcode || '1234'}
                  onChange={(value) => handleSettingChange('day_closing_passcode', value)}
                  placeholder="Weka passcode"
                  type="password"
                  helpText="Inahitajika kufunga na kufungua siku."
                />
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
