import React, { useState, useEffect } from 'react';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { Shield, Save, Users, Lock, Activity, Building2, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface AdminSettingsProps {
  isActive?: boolean;
}

const AdminSettings: React.FC<AdminSettingsProps> = ({ isActive }) => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [settings, setSettings] = useState({
    userRegistration: true,
    requireEmailVerification: true,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    enableAuditLog: true,
    backupFrequency: 'daily',
    dataRetention: 365
  });

  // Business Information State
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo: null as string | null
  });
  const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(true);

  // System Settings State (loaded from unified settings)
  const [systemSettings, setSystemSettings] = useState({
    currency: 'TZS',
    language: 'en',
    theme: 'light',
    enableTax: false,
    // UI settings
    showProductImages: true,
    showStockLevels: true,
    showPrices: true,
    showBarcodes: true,
    autoCompleteSearch: true,
    confirmDelete: true
  });
  const [loadingSystemSettings, setLoadingSystemSettings] = useState(true);

  useEffect(() => {
    const handleSave = async () => {
      try {
        // Save business information to database
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');
        await unifiedSettingsService.updateBusinessInfo(businessInfo);

        // Save admin security settings to database
        await Promise.all([
          unifiedSettingsService.setSetting('system', 'admin_security', 'user_registration', settings.userRegistration, 'boolean'),
          unifiedSettingsService.setSetting('system', 'admin_security', 'require_email_verification', settings.requireEmailVerification, 'boolean'),
          unifiedSettingsService.setSetting('system', 'admin_security', 'session_timeout', settings.sessionTimeout, 'number'),
          unifiedSettingsService.setSetting('system', 'admin_security', 'max_login_attempts', settings.maxLoginAttempts, 'number'),
          unifiedSettingsService.setSetting('system', 'admin_security', 'enable_audit_log', settings.enableAuditLog, 'boolean'),
          unifiedSettingsService.setSetting('system', 'admin_security', 'backup_frequency', settings.backupFrequency, 'string'),
          unifiedSettingsService.setSetting('system', 'admin_security', 'data_retention', settings.dataRetention, 'number'),
        ]);

        // Save system settings to database
        await Promise.all([
          unifiedSettingsService.setSetting('system', 'system', 'currency', systemSettings.currency, 'string'),
          unifiedSettingsService.setSetting('system', 'system', 'language', systemSettings.language, 'string'),
          unifiedSettingsService.setSetting('system', 'system', 'theme', systemSettings.theme, 'string'),
          unifiedSettingsService.setSetting('system', 'system', 'enable_tax', systemSettings.enableTax, 'boolean'),
          // UI settings
          unifiedSettingsService.setSetting('system', 'ui', 'show_product_images', systemSettings.showProductImages, 'boolean'),
          unifiedSettingsService.setSetting('system', 'ui', 'show_stock_levels', systemSettings.showStockLevels, 'boolean'),
          unifiedSettingsService.setSetting('system', 'ui', 'show_prices', systemSettings.showPrices, 'boolean'),
          unifiedSettingsService.setSetting('system', 'ui', 'show_barcodes', systemSettings.showBarcodes, 'boolean'),
          unifiedSettingsService.setSetting('system', 'ui', 'auto_complete_search', systemSettings.autoCompleteSearch, 'boolean'),
          unifiedSettingsService.setSetting('system', 'ui', 'confirm_delete', systemSettings.confirmDelete, 'boolean')
        ]);

        toast.success('All admin settings saved to database!');
      } catch (error) {
        console.error('Error saving admin settings:', error);
        toast.error('Failed to save admin settings to database');
        throw error; // Re-throw to prevent the save context from thinking it succeeded
      }
    };

    registerSaveHandler('admin-settings', handleSave);
    return () => unregisterSaveHandler('admin-settings');
  }, [settings, businessInfo, systemSettings, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    setHasChanges(true);
  }, [settings, businessInfo, systemSettings, setHasChanges]);

  // Load settings on mount
  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');
        const { businessInfoService } = await import('../../../lib/businessInfoService');

        // Load business information
        console.log('🔍 Loading business information...');
        setLoadingBusinessInfo(true);
        try {
          const businessData = await businessInfoService.getBusinessInfo();
          console.log('📊 Business data loaded:', businessData);
          if (businessData) {
            setBusinessInfo({
              name: businessData.name || '',
              address: businessData.address || '',
              phone: businessData.phone || '',
              email: businessData.email || '',
              website: businessData.website || '',
              logo: businessData.logo || null
            });
            console.log('✅ Business info set in state:', {
              name: businessData.name || '',
              address: businessData.address || '',
              phone: businessData.phone || '',
              email: businessData.email || '',
              website: businessData.website || '',
              logo: businessData.logo || null
            });
          }
        } finally {
          setLoadingBusinessInfo(false);
        }

        // Load admin security settings
        const userRegistration = await unifiedSettingsService.getSetting('system', 'admin_security', 'user_registration');
        const requireEmailVerification = await unifiedSettingsService.getSetting('system', 'admin_security', 'require_email_verification');
        const sessionTimeout = await unifiedSettingsService.getSetting('system', 'admin_security', 'session_timeout');
        const maxLoginAttempts = await unifiedSettingsService.getSetting('system', 'admin_security', 'max_login_attempts');
        const enableAuditLog = await unifiedSettingsService.getSetting('system', 'admin_security', 'enable_audit_log');
        const backupFrequency = await unifiedSettingsService.getSetting('system', 'admin_security', 'backup_frequency');
        const dataRetention = await unifiedSettingsService.getSetting('system', 'admin_security', 'data_retention');

        const loadedSettings: any = {};
        if (userRegistration !== null) loadedSettings.userRegistration = userRegistration;
        if (requireEmailVerification !== null) loadedSettings.requireEmailVerification = requireEmailVerification;
        if (sessionTimeout !== null) loadedSettings.sessionTimeout = sessionTimeout;
        if (maxLoginAttempts !== null) loadedSettings.maxLoginAttempts = maxLoginAttempts;
        if (enableAuditLog !== null) loadedSettings.enableAuditLog = enableAuditLog;
        if (backupFrequency !== null) loadedSettings.backupFrequency = backupFrequency;
        if (dataRetention !== null) loadedSettings.dataRetention = dataRetention;

        if (Object.keys(loadedSettings).length > 0) {
          setSettings(prev => ({ ...prev, ...loadedSettings }));
        }
      } catch (error) {
        console.error('Error loading admin settings from database:', error);
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
          try {
            const parsed = JSON.parse(savedSettings);
            setSettings(prev => ({ ...prev, ...parsed }));
          } catch (fallbackError) {
            console.error('Error loading admin settings from localStorage:', fallbackError);
          }
        }
      }
    };

    loadAdminSettings();
  }, []);

  // Load business information
  useEffect(() => {
    const loadBusinessInfo = async () => {
      try {
        setLoadingBusinessInfo(true);
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');
        const info = await unifiedSettingsService.getBusinessInfo();
        setBusinessInfo({
          name: info.name || '',
          address: info.address || '',
          phone: info.phone || '',
          email: info.email || '',
          website: info.website || '',
          logo: info.logo || null
        });
      } catch (error) {
        console.error('Error loading business information:', error);
        toast.error('Failed to load business information');
      } finally {
        setLoadingBusinessInfo(false);
      }
    };

    loadBusinessInfo();
  }, []);

  // Load system settings
  useEffect(() => {
    const loadSystemSettings = async () => {
      try {
        setLoadingSystemSettings(true);
        const { unifiedSettingsService } = await import('../../../lib/unifiedSettingsService');

        // Load system settings
        const systemCategorySettings = await unifiedSettingsService.getSettingsByCategory('system', 'system');
        const uiCategorySettings = await unifiedSettingsService.getSettingsByCategory('system', 'ui');

        setSystemSettings({
          currency: systemCategorySettings.currency?.value || 'TZS',
          language: systemCategorySettings.language?.value || 'en',
          theme: systemCategorySettings.theme?.value || 'light',
          enableTax: systemCategorySettings.enable_tax?.value === true,
          // UI settings
          showProductImages: uiCategorySettings.show_product_images?.value !== false,
          showStockLevels: uiCategorySettings.show_stock_levels?.value !== false,
          showPrices: uiCategorySettings.show_prices?.value !== false,
          showBarcodes: uiCategorySettings.show_barcodes?.value !== false,
          autoCompleteSearch: uiCategorySettings.auto_complete_search?.value !== false,
          confirmDelete: uiCategorySettings.confirm_delete?.value !== false
        });
      } catch (error) {
        console.error('Error loading system settings:', error);
      } finally {
        setLoadingSystemSettings(false);
      }
    };

    loadSystemSettings();
  }, []);



  return (
    <div className="space-y-6">
      {/* Icon Header - Matching SetPricingModal style */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 border-b border-gray-200">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Administrative Settings</h3>
            <p className="text-sm text-gray-600">Configure system administration and security settings</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
        <div className="space-y-6">
          {/* User Management */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-white" />
              </div>
              User Management
            </h4>
            
            <div className="space-y-3">
              <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                settings.userRegistration 
                  ? 'border-blue-300 bg-blue-50 hover:border-blue-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <span className="text-sm font-semibold text-gray-900">Allow new user registration</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.userRegistration}
                    onChange={(e) => setSettings({ ...settings, userRegistration: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                </label>
              </div>

              <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                settings.requireEmailVerification 
                  ? 'border-blue-300 bg-blue-50 hover:border-blue-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <span className="text-sm font-semibold text-gray-900">Require email verification</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireEmailVerification}
                    onChange={(e) => setSettings({ ...settings, requireEmailVerification: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                <Lock className="w-4 h-4 text-white" />
              </div>
              Security Settings
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({ ...settings, sessionTimeout: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900 font-medium transition-colors"
                  min="5"
                  max="480"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({ ...settings, maxLoginAttempts: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900 font-medium transition-colors"
                  min="3"
                  max="10"
                />
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              System Settings
            </h4>
            
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-4 border-2 rounded-xl transition-all ${
                settings.enableAuditLog 
                  ? 'border-green-300 bg-green-50 hover:border-green-400' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}>
                <span className="text-sm font-semibold text-gray-900">Enable audit logging</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableAuditLog}
                    onChange={(e) => setSettings({ ...settings, enableAuditLog: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={settings.backupFrequency}
                  onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors bg-white"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  value={settings.dataRetention}
                  onChange={(e) => setSettings({ ...settings, dataRetention: Number(e.target.value) })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 text-gray-900 font-medium transition-colors"
                  min="30"
                  max="1095"
                />
              </div>
            </div>
          </div>

          {/* Business Information */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              Business Information
            </h4>

            {loadingBusinessInfo ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                <span className="ml-2 text-gray-600">Loading business information...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
                    placeholder="Enter business name"
                  />
                </div>

                {/* Business Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Business Address
                  </label>
                  <input
                    type="text"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
                    placeholder="Enter business address"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
                    placeholder="Enter phone number"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
                    placeholder="Enter email address"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website
                  </label>
                  <input
                    type="url"
                    value={businessInfo.website}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, website: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 text-gray-900 font-medium transition-colors"
                    placeholder="https://yourwebsite.com"
                  />
                </div>
              </div>
            )}
          </div>

          {/* System Settings */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-200 shadow-sm">
            <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              System Settings
            </h4>

            {loadingSystemSettings ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                <span className="ml-2 text-gray-600">Loading system settings...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Currency */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900 font-medium transition-colors bg-white"
                  >
                    <option value="TZS">Tanzanian Shilling (TZS)</option>
                    <option value="USD">US Dollar (USD)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="GBP">British Pound (GBP)</option>
                  </select>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={systemSettings.language}
                    onChange={(e) => setSystemSettings({ ...systemSettings, language: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900 font-medium transition-colors bg-white"
                  >
                    <option value="en">English</option>
                    <option value="sw">Swahili</option>
                  </select>
                </div>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Theme
                  </label>
                  <select
                    value={systemSettings.theme}
                    onChange={(e) => setSystemSettings({ ...systemSettings, theme: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-gray-900 font-medium transition-colors bg-white"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                {/* Enable Tax */}
                <div className="flex items-center justify-between p-4 border-2 rounded-xl transition-all border-gray-200 hover:border-gray-300">
                  <span className="text-sm font-semibold text-gray-900">Enable Tax Calculation</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enableTax}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enableTax: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600 shadow-sm"></div>
                  </label>
                </div>

                {/* UI Settings */}
                <div className="md:col-span-2">
                  <h5 className="text-md font-semibold text-gray-800 mb-3">User Interface Settings</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'showProductImages', label: 'Show Product Images', value: systemSettings.showProductImages },
                      { key: 'showStockLevels', label: 'Show Stock Levels', value: systemSettings.showStockLevels },
                      { key: 'showPrices', label: 'Show Prices', value: systemSettings.showPrices },
                      { key: 'showBarcodes', label: 'Show Barcodes', value: systemSettings.showBarcodes },
                      { key: 'autoCompleteSearch', label: 'Auto-complete Search', value: systemSettings.autoCompleteSearch },
                      { key: 'confirmDelete', label: 'Confirm Delete Actions', value: systemSettings.confirmDelete }
                    ].map((setting) => (
                      <div key={setting.key} className="flex items-center justify-between p-3 border-2 rounded-lg transition-all border-gray-200 hover:border-gray-300">
                        <span className="text-sm font-medium text-gray-900">{setting.label}</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={setting.value}
                            onChange={(e) => setSystemSettings({ ...systemSettings, [setting.key]: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
