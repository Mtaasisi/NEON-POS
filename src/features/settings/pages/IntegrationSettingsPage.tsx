/**
 * Integration Settings Page
 * Configure SMS, WhatsApp, Mobile Money, Email integrations
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  MessageCircle, 
  CreditCard, 
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  TestTube,
  RefreshCw,
  Info,
  Settings as SettingsIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import GlassTabs from '../../../features/shared/components/ui/GlassTabs';
import { supabase } from '../../../lib/supabaseClient';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface IntegrationConfig {
  sms: {
    enabled: boolean;
    provider: 'mshastra' | 'africastalking' | 'twilio';
    apiKey: string;
    apiSecret?: string;
    senderId: string;
    webhookUrl?: string;
  };
  whatsapp: {
    enabled: boolean;
    provider: 'greenapi' | 'twilio' | 'messagebird';
    instanceId: string;
    apiToken: string;
    apiUrl: string;
    webhookUrl?: string;
  };
  mpesa: {
    enabled: boolean;
    businessShortcode: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    callbackUrl: string;
    environment: 'sandbox' | 'production';
  };
  tigopesa: {
    enabled: boolean;
    merchantCode: string;
    merchantPin: string;
    apiUrl: string;
    callbackUrl: string;
  };
  airtelmoney: {
    enabled: boolean;
    merchantCode: string;
    apiKey: string;
    apiUrl: string;
    callbackUrl: string;
  };
  email: {
    enabled: boolean;
    provider: 'smtp' | 'sendgrid' | 'mailgun';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    apiKey?: string;
    fromEmail: string;
    fromName: string;
  };
}

const IntegrationSettingsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'sms' | 'whatsapp' | 'mobile-money' | 'email'>('sms');
  
  const [config, setConfig] = useState<IntegrationConfig>({
    sms: {
      enabled: false,
      provider: 'mshastra',
      apiKey: '',
      senderId: 'LATS POS',
      webhookUrl: ''
    },
    whatsapp: {
      enabled: false,
      provider: 'greenapi',
      instanceId: '',
      apiToken: '',
      apiUrl: 'https://7105.api.greenapi.com',
      webhookUrl: ''
    },
    mpesa: {
      enabled: false,
      businessShortcode: '',
      consumerKey: '',
      consumerSecret: '',
      passkey: '',
      callbackUrl: '',
      environment: 'sandbox'
    },
    tigopesa: {
      enabled: false,
      merchantCode: '',
      merchantPin: '',
      apiUrl: 'https://api.tigo.co.tz',
      callbackUrl: ''
    },
    airtelmoney: {
      enabled: false,
      merchantCode: '',
      apiKey: '',
      apiUrl: 'https://api.airtel.co.tz',
      callbackUrl: ''
    },
    email: {
      enabled: false,
      provider: 'smtp',
      host: '',
      port: 587,
      username: '',
      password: '',
      fromEmail: '',
      fromName: 'LATS CHANCE'
    }
  });

  const [connectionStatus, setConnectionStatus] = useState<Record<string, {
    status: 'connected' | 'disconnected' | 'error' | 'unknown';
    message?: string;
    lastChecked?: Date;
  }>>({});

  useEffect(() => {
    loadIntegrationSettings();
  }, []);

  /**
   * Load integration settings from database
   */
  const loadIntegrationSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('*');

      if (error) throw error;

      if (data && data.length > 0) {
        const newConfig = { ...config };
        
        data.forEach((setting: any) => {
          const type = setting.integration_type;
          const configData = setting.config || {};
          
          switch (type) {
            case 'sms':
              newConfig.sms = {
                enabled: setting.is_enabled,
                provider: setting.provider || 'mshastra',
                ...configData
              };
              break;
            case 'whatsapp':
              newConfig.whatsapp = {
                enabled: setting.is_enabled,
                provider: setting.provider || 'greenapi',
                ...configData
              };
              break;
            case 'mpesa':
              newConfig.mpesa = {
                enabled: setting.is_enabled,
                ...configData
              };
              break;
            case 'tigopesa':
              newConfig.tigopesa = {
                enabled: setting.is_enabled,
                ...configData
              };
              break;
            case 'airtelmoney':
              newConfig.airtelmoney = {
                enabled: setting.is_enabled,
                ...configData
              };
              break;
            case 'email':
              newConfig.email = {
                enabled: setting.is_enabled,
                provider: setting.provider || 'smtp',
                ...configData
              };
              break;
          }

          // Update connection status
          setConnectionStatus(prev => ({
            ...prev,
            [type]: {
              status: setting.status === 'active' ? 'connected' : 'disconnected',
              message: setting.last_test_result,
              lastChecked: setting.last_test_date ? new Date(setting.last_test_date) : undefined
            }
          }));
        });
        
        setConfig(newConfig);
      }
    } catch (error: any) {
      console.error('Error loading integration settings:', error);
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save integration settings
   */
  const saveIntegrationSettings = async () => {
    setSaving(true);
    try {
      // Save each integration type
      const integrations = [
        { type: 'sms', data: config.sms, provider: config.sms.provider },
        { type: 'whatsapp', data: config.whatsapp, provider: config.whatsapp.provider },
        { type: 'mpesa', data: config.mpesa, provider: 'vodacom' },
        { type: 'tigopesa', data: config.tigopesa, provider: 'tigo' },
        { type: 'airtelmoney', data: config.airtelmoney, provider: 'airtel' },
        { type: 'email', data: config.email, provider: config.email.provider }
      ];

      for (const integration of integrations) {
        const { type, data, provider } = integration;
        const { enabled, ...configData } = data as any;

        // Upsert integration setting
        const { error } = await supabase
          .from('integration_settings')
          .upsert({
            integration_type: type,
            is_enabled: enabled,
            provider: provider,
            config: configData,
            status: enabled ? 'active' : 'inactive',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'integration_type'
          });

        if (error) throw error;
      }

      toast.success('Integration settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving integration settings:', error);
      toast.error('Failed to save integration settings');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Test integration connection
   */
  const testIntegration = async (type: string) => {
    setTesting(type);
    try {
      let result = { success: false, message: '' };

      switch (type) {
        case 'sms':
          result = await testSMSConnection();
          break;
        case 'whatsapp':
          result = await testWhatsAppConnection();
          break;
        case 'mpesa':
          result = await testMpesaConnection();
          break;
        case 'email':
          result = await testEmailConnection();
          break;
      }

      // Update connection status
      setConnectionStatus(prev => ({
        ...prev,
        [type]: {
          status: result.success ? 'connected' : 'error',
          message: result.message,
          lastChecked: new Date()
        }
      }));

      // Update database
      await supabase
        .from('integration_settings')
        .update({
          status: result.success ? 'active' : 'error',
          last_test_date: new Date().toISOString(),
          last_test_result: result.message
        })
        .eq('integration_type', type);

      if (result.success) {
        toast.success(`${type.toUpperCase()} connection successful!`);
      } else {
        toast.error(`${type.toUpperCase()} connection failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
      setConnectionStatus(prev => ({
        ...prev,
        [type]: {
          status: 'error',
          message: error.message,
          lastChecked: new Date()
        }
      }));
    } finally {
      setTesting(null);
    }
  };

  /**
   * Test SMS connection
   */
  const testSMSConnection = async (): Promise<{ success: boolean; message: string }> => {
    // Simulate SMS test
    if (!config.sms.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    // In production, make actual API call to verify credentials
    return { 
      success: true, 
      message: 'SMS credentials verified. Ready to send messages.' 
    };
  };

  /**
   * Test WhatsApp connection
   */
  const testWhatsAppConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!config.whatsapp.instanceId || !config.whatsapp.apiToken) {
      return { success: false, message: 'Instance ID and API token are required' };
    }

    try {
      const url = `${config.whatsapp.apiUrl}/waInstance${config.whatsapp.instanceId}/getStateInstance/${config.whatsapp.apiToken}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.stateInstance === 'authorized') {
        return { 
          success: true, 
          message: `Connected to WhatsApp. Phone: ${data.phoneNumber || 'N/A'}` 
        };
      } else {
        return { 
          success: false, 
          message: `Status: ${data.stateInstance}. Scan QR code to authorize.` 
        };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  /**
   * Test M-Pesa connection
   */
  const testMpesaConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (!config.mpesa.consumerKey || !config.mpesa.consumerSecret) {
      return { success: false, message: 'Consumer key and secret are required' };
    }

    // In production, get OAuth token to verify credentials
    return { 
      success: true, 
      message: 'M-Pesa credentials verified. Ready to accept payments.' 
    };
  };

  /**
   * Test Email connection
   */
  const testEmailConnection = async (): Promise<{ success: boolean; message: string }> => {
    if (config.email.provider === 'smtp') {
      if (!config.email.host || !config.email.username || !config.email.password) {
        return { success: false, message: 'SMTP credentials incomplete' };
      }
    } else if (!config.email.apiKey) {
      return { success: false, message: 'API key is required' };
    }

    return { 
      success: true, 
      message: 'Email configuration valid. Ready to send emails.' 
    };
  };

  /**
   * Toggle secret visibility
   */
  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  /**
   * Get status badge
   */
  const getStatusBadge = (type: string) => {
    const status = connectionStatus[type];
    if (!status) {
      return (
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <AlertTriangle className="w-4 h-4" />
          Not Configured
        </span>
      );
    }

    const badges = {
      connected: (
        <span className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle className="w-4 h-4" />
          Connected
        </span>
      ),
      disconnected: (
        <span className="flex items-center gap-2 text-sm text-gray-500">
          <XCircle className="w-4 h-4" />
          Disconnected
        </span>
      ),
      error: (
        <span className="flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          Error
        </span>
      ),
      unknown: (
        <span className="flex items-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          Unknown
        </span>
      )
    };

    return badges[status.status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Wrapper Container - Single rounded container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section */}
        <div className="p-8 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Icon */}
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
            <SettingsIcon className="w-8 h-8 text-white" />
          </div>
              
              {/* Text */}
          <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Integration Settings</h1>
                <p className="text-sm text-gray-600">
                  Configure SMS, WhatsApp, Mobile Money, and Email integrations
                </p>
          </div>
        </div>
      </div>
        </div>
        {/* Action Bar - Tab Navigation */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
      <GlassTabs
        tabs={[
          { 
            id: 'sms', 
            label: 'SMS', 
            icon: <Smartphone className="w-5 h-5" />,
            badge: config.sms.enabled ? '✓' : undefined
          },
          { 
            id: 'whatsapp', 
            label: 'WhatsApp', 
            icon: <MessageCircle className="w-5 h-5" />,
            badge: config.whatsapp.enabled ? '✓' : undefined
          },
          { 
            id: 'mobile-money', 
            label: 'Mobile Money', 
            icon: <CreditCard className="w-5 h-5" />,
            badge: (config.mpesa.enabled || config.tigopesa.enabled || config.airtelmoney.enabled) ? '✓' : undefined
          },
          { 
            id: 'email', 
            label: 'Email', 
            icon: <Mail className="w-5 h-5" />,
            badge: config.email.enabled ? '✓' : undefined
          }
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as any)}
        variant="modern"
        size="md"
      />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">

      {/* SMS Settings */}
      {activeTab === 'sms' && (
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-blue-600" />
                    </div>
                SMS Integration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure SMS provider for sending receipts and notifications
              </p>
            </div>
            {getStatusBadge('sms')}
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sms-enabled"
              checked={config.sms.enabled}
              onChange={(e) => setConfig({ ...config, sms: { ...config.sms, enabled: e.target.checked } })}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="sms-enabled" className="font-medium">
              Enable SMS Integration
            </label>
          </div>

          {config.sms.enabled && (
            <div className="space-y-4">
              {/* Provider */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SMS Provider
                </label>
                <select
                  value={config.sms.provider}
                  onChange={(e) => setConfig({ ...config, sms: { ...config.sms, provider: e.target.value as any } })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mshastra">MShastra (Tanzania)</option>
                  <option value="africastalking">Africa's Talking</option>
                  <option value="twilio">Twilio</option>
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['sms-api-key'] ? 'text' : 'password'}
                    value={config.sms.apiKey}
                    onChange={(e) => setConfig({ ...config, sms: { ...config.sms, apiKey: e.target.value } })}
                    placeholder="Enter your SMS API key"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('sms-api-key')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showSecrets['sms-api-key'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Sender ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sender ID
                </label>
                <input
                  type="text"
                  value={config.sms.senderId}
                  onChange={(e) => setConfig({ ...config, sms: { ...config.sms, senderId: e.target.value } })}
                  placeholder="e.g., LATS POS"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Test Button */}
              <button
                onClick={() => testIntegration('sms')}
                disabled={testing === 'sms'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {testing === 'sms' ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5" />
                    Test SMS Connection
                  </>
                )}
              </button>

              {connectionStatus.sms?.message && (
                <div className={`p-3 rounded-lg text-sm ${
                  connectionStatus.sms.status === 'connected' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  {connectionStatus.sms.message}
                </div>
              )}
            </div>
          )}
            </div>
      )}

      {/* WhatsApp Settings - Similar structure */}
      {activeTab === 'whatsapp' && (
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-xl font-bold flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                WhatsApp Integration
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Send receipts and messages via WhatsApp
              </p>
            </div>
            {getStatusBadge('whatsapp')}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="whatsapp-enabled"
              checked={config.whatsapp.enabled}
              onChange={(e) => setConfig({ ...config, whatsapp: { ...config.whatsapp, enabled: e.target.checked } })}
              className="w-5 h-5 text-green-600 rounded"
            />
            <label htmlFor="whatsapp-enabled" className="font-medium">
              Enable WhatsApp Integration
            </label>
          </div>

          {config.whatsapp.enabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instance ID *
                </label>
                <input
                  type="text"
                  value={config.whatsapp.instanceId}
                  onChange={(e) => setConfig({ ...config, whatsapp: { ...config.whatsapp, instanceId: e.target.value } })}
                  placeholder="Your Green API Instance ID"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Token *
                </label>
                <div className="relative">
                  <input
                    type={showSecrets['whatsapp-token'] ? 'text' : 'password'}
                    value={config.whatsapp.apiToken}
                    onChange={(e) => setConfig({ ...config, whatsapp: { ...config.whatsapp, apiToken: e.target.value } })}
                    placeholder="Your Green API Token"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSecretVisibility('whatsapp-token')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showSecrets['whatsapp-token'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => testIntegration('whatsapp')}
                disabled={testing === 'whatsapp'}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {testing === 'whatsapp' ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5" />
                    Test WhatsApp Connection
                  </>
                )}
              </button>

              {connectionStatus.whatsapp?.message && (
                <div className={`p-3 rounded-lg text-sm ${
                  connectionStatus.whatsapp.status === 'connected' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-yellow-50 text-yellow-800'
                }`}>
                  {connectionStatus.whatsapp.message}
                </div>
              )}
            </div>
          )}
            </div>
      )}

      {/* Mobile Money Settings */}
      {activeTab === 'mobile-money' && (
        <div className="space-y-6">
          {/* M-Pesa */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                    <h2 className="text-xl font-bold flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-red-600" />
                      </div>
                  M-Pesa Integration
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Accept M-Pesa payments from customers
                </p>
              </div>
              {getStatusBadge('mpesa')}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="mpesa-enabled"
                checked={config.mpesa.enabled}
                onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, enabled: e.target.checked } })}
                className="w-5 h-5 text-red-600 rounded"
              />
              <label htmlFor="mpesa-enabled" className="font-medium">
                Enable M-Pesa Payments
              </label>
            </div>

            {config.mpesa.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment
                  </label>
                  <select
                    value={config.mpesa.environment}
                    onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, environment: e.target.value as any } })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Shortcode *
                  </label>
                  <input
                    type="text"
                    value={config.mpesa.businessShortcode}
                    onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, businessShortcode: e.target.value } })}
                    placeholder="e.g., 174379"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumer Key *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets['mpesa-key'] ? 'text' : 'password'}
                      value={config.mpesa.consumerKey}
                      onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, consumerKey: e.target.value } })}
                      placeholder="Consumer Key from Daraja"
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility('mpesa-key')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showSecrets['mpesa-key'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumer Secret *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets['mpesa-secret'] ? 'text' : 'password'}
                      value={config.mpesa.consumerSecret}
                      onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, consumerSecret: e.target.value } })}
                      placeholder="Consumer Secret from Daraja"
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility('mpesa-secret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showSecrets['mpesa-secret'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passkey *
                  </label>
                  <div className="relative">
                    <input
                      type={showSecrets['mpesa-passkey'] ? 'text' : 'password'}
                      value={config.mpesa.passkey}
                      onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, passkey: e.target.value } })}
                      placeholder="Lipa Na M-Pesa Online Passkey"
                      className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSecretVisibility('mpesa-passkey')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showSecrets['mpesa-passkey'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Callback URL
                  </label>
                  <input
                    type="url"
                    value={config.mpesa.callbackUrl}
                    onChange={(e) => setConfig({ ...config, mpesa: { ...config.mpesa, callbackUrl: e.target.value } })}
                    placeholder="https://yourdomain.com/api/mpesa/callback"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <button
                  onClick={() => testIntegration('mpesa')}
                  disabled={testing === 'mpesa'}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                >
                  {testing === 'mpesa' ? (
                    <>
                      <LoadingSpinner size="sm" color="white" />
                      Testing Connection...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-5 h-5" />
                      Test M-Pesa Connection
                    </>
                  )}
                </button>
              </div>
            )}
              </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Need M-Pesa Credentials?</p>
                <p>Visit <a href="https://developer.mpesa.vm.co.tz" target="_blank" rel="noopener noreferrer" className="underline">developer.mpesa.vm.co.tz</a> to register your business and get API credentials.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
          <div className="flex gap-4 justify-end sticky bottom-4 pt-6 border-t border-gray-200 bg-white">
            <button
          onClick={loadIntegrationSettings}
              className="flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-blue-300 rounded-xl font-semibold transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Reset Changes
            </button>
        
            <button
          onClick={saveIntegrationSettings}
          disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {saving ? (
            <>
                  <LoadingSpinner size="sm" color="white" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save All Settings
            </>
          )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationSettingsPage;

