import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassInput from '../../shared/components/ui/EnhancedInput';
import { 
  Code, 
  Key, 
  Webhook,
  Plus, 
  Edit, 
  Trash2, 
  Save,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface APIKey {
  id?: string;
  name: string;
  key: string;
  scopes: string[];
  is_active: boolean;
  last_used?: string;
  created_at?: string;
  expires_at?: string;
}

interface WebhookEndpoint {
  id?: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  secret: string;
  retry_attempts: number;
  timeout_seconds: number;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
}

const APIWebhooksSettings: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'api-keys' | 'webhooks' | 'rate-limits'>('api-keys');
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [editingApiKey, setEditingApiKey] = useState<APIKey | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  
  // Rate limit settings
  const [rateLimitSettings, setRateLimitSettings] = useState({
    requests_per_minute: 60,
    requests_per_hour: 1000,
    requests_per_day: 10000,
    enable_rate_limiting: true,
    whitelist_ips: [] as string[],
    blacklist_ips: [] as string[]
  });

  const availableScopes = [
    { id: 'products:read', label: 'Read Products', description: 'View product information' },
    { id: 'products:write', label: 'Write Products', description: 'Create/update products' },
    { id: 'orders:read', label: 'Read Orders', description: 'View order information' },
    { id: 'orders:write', label: 'Write Orders', description: 'Create/update orders' },
    { id: 'customers:read', label: 'Read Customers', description: 'View customer information' },
    { id: 'customers:write', label: 'Write Customers', description: 'Create/update customers' },
    { id: 'inventory:read', label: 'Read Inventory', description: 'View inventory levels' },
    { id: 'inventory:write', label: 'Write Inventory', description: 'Update inventory levels' },
    { id: 'reports:read', label: 'Read Reports', description: 'Access reports and analytics' }
  ];

  const availableEvents = [
    { id: 'order.created', label: 'Order Created' },
    { id: 'order.updated', label: 'Order Updated' },
    { id: 'order.cancelled', label: 'Order Cancelled' },
    { id: 'product.created', label: 'Product Created' },
    { id: 'product.updated', label: 'Product Updated' },
    { id: 'customer.created', label: 'Customer Created' },
    { id: 'customer.updated', label: 'Customer Updated' },
    { id: 'inventory.low', label: 'Low Inventory Alert' },
    { id: 'payment.received', label: 'Payment Received' },
    { id: 'payment.failed', label: 'Payment Failed' }
  ];

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load API keys
      const { data: keysData, error: keysError } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (keysError) console.error('Error loading API keys:', keysError);
      else setApiKeys(keysData || []);

      // Load webhooks
      const { data: webhooksData, error: webhooksError } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .order('created_at', { ascending: false });

      if (webhooksError) console.error('Error loading webhooks:', webhooksError);
      else setWebhooks(webhooksData || []);

      // Load rate limit settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('*')
        .eq('key', 'api_rate_limits')
        .single();

      if (!settingsError && settingsData) {
        try {
          const parsed = JSON.parse(settingsData.value);
          setRateLimitSettings(parsed);
        } catch (e) {
          console.error('Error parsing rate limit settings:', e);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load API settings');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk_';
    for (let i = 0; i < 48; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const generateWebhookSecret = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'whsec_';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const handleSaveApiKey = async (apiKey: APIKey) => {
    try {
      if (apiKey.id) {
        const { error } = await supabase
          .from('api_keys')
          .update(apiKey)
          .eq('id', apiKey.id);

        if (error) throw error;
        toast.success('API key updated successfully');
      } else {
        const newKey = { ...apiKey, key: generateApiKey() };
        const { error } = await supabase
          .from('api_keys')
          .insert([newKey]);

        if (error) throw error;
        toast.success('API key created successfully');
      }

      setShowApiKeyForm(false);
      setEditingApiKey(null);
      loadSettings();
    } catch (error: any) {
      console.error('Error saving API key:', error);
      toast.error(error.message || 'Failed to save API key');
    }
  };

  const handleSaveWebhook = async (webhook: WebhookEndpoint) => {
    try {
      if (webhook.id) {
        const { error } = await supabase
          .from('webhook_endpoints')
          .update(webhook)
          .eq('id', webhook.id);

        if (error) throw error;
        toast.success('Webhook updated successfully');
      } else {
        const newWebhook = { ...webhook, secret: generateWebhookSecret() };
        const { error } = await supabase
          .from('webhook_endpoints')
          .insert([newWebhook]);

        if (error) throw error;
        toast.success('Webhook created successfully');
      }

      setShowWebhookForm(false);
      setEditingWebhook(null);
      loadSettings();
    } catch (error: any) {
      console.error('Error saving webhook:', error);
      toast.error(error.message || 'Failed to save webhook');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('API key deleted successfully');
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete API key');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const { error } = await supabase
        .from('webhook_endpoints')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Webhook deleted successfully');
      loadSettings();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete webhook');
    }
  };

  const testWebhook = async (webhook: WebhookEndpoint) => {
    try {
      toast.loading('Testing webhook...');
      
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': webhook.secret
        },
        body: JSON.stringify({
          event: 'test.webhook',
          data: { message: 'This is a test webhook event' },
          timestamp: new Date().toISOString()
        })
      });

      toast.dismiss();
      
      if (response.ok) {
        toast.success('Webhook test successful!');
      } else {
        toast.error(`Webhook test failed: ${response.statusText}`);
      }
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Webhook test failed: ${error.message}`);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 12) return key;
    return key.substring(0, 10) + '•'.repeat(key.length - 14) + key.substring(key.length - 4);
  };

  const saveRateLimitSettings = async () => {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'api_rate_limits',
          value: JSON.stringify(rateLimitSettings)
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success('Rate limit settings saved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rate limit settings');
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-6">
        <div className="text-center py-8">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-gray-600">Loading API settings...</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Code className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-800">API & Webhooks</h2>
            <p className="text-sm text-gray-600">Manage API keys, webhooks, and rate limits</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('api-keys')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'api-keys'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Key className="w-4 h-4 inline mr-2" />
          API Keys
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'webhooks'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Webhook className="w-4 h-4 inline mr-2" />
          Webhooks
        </button>
        <button
          onClick={() => setActiveTab('rate-limits')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'rate-limits'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Rate Limits
        </button>
      </div>

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              API keys allow external applications to access your system
            </p>
            {!showApiKeyForm && !editingApiKey && (
              <GlassButton
                onClick={() => setShowApiKeyForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Generate API Key
              </GlassButton>
            )}
          </div>

          {(showApiKeyForm || editingApiKey) && (
            <ApiKeyForm
              apiKey={editingApiKey || {
                name: '',
                key: '',
                scopes: [],
                is_active: true
              }}
              onSave={handleSaveApiKey}
              onCancel={() => {
                setShowApiKeyForm(false);
                setEditingApiKey(null);
              }}
              availableScopes={availableScopes}
            />
          )}

          <div className="space-y-3">
            {apiKeys.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Key className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No API keys configured</p>
              </div>
            ) : (
              apiKeys.map((apiKey) => (
                <div
                  key={apiKey.id}
                  className="bg-white rounded-lg p-4 border-2 border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{apiKey.name}</h4>
                        {apiKey.is_active ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono">
                          {visibleKeys.has(apiKey.id!) ? apiKey.key : maskKey(apiKey.key)}
                        </code>
                        <button
                          onClick={() => toggleKeyVisibility(apiKey.id!)}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {visibleKeys.has(apiKey.id!) ? (
                            <EyeOff className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Eye className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => copyToClipboard(apiKey.key, 'API key')}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          <Copy className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {apiKey.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                      {apiKey.last_used && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last used: {new Date(apiKey.last_used).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingApiKey(apiKey)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteApiKey(apiKey.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Webhooks notify your application when events happen
            </p>
            {!showWebhookForm && !editingWebhook && (
              <GlassButton
                onClick={() => setShowWebhookForm(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Add Webhook
              </GlassButton>
            )}
          </div>

          {(showWebhookForm || editingWebhook) && (
            <WebhookForm
              webhook={editingWebhook || {
                name: '',
                url: '',
                events: [],
                is_active: true,
                secret: '',
                retry_attempts: 3,
                timeout_seconds: 30,
                success_count: 0,
                failure_count: 0
              }}
              onSave={handleSaveWebhook}
              onCancel={() => {
                setShowWebhookForm(false);
                setEditingWebhook(null);
              }}
              availableEvents={availableEvents}
            />
          )}

          <div className="space-y-3">
            {webhooks.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Webhook className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">No webhooks configured</p>
              </div>
            ) : (
              webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="bg-white rounded-lg p-4 border-2 border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{webhook.name}</h4>
                        {webhook.is_active ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{webhook.url}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>✅ {webhook.success_count} successful</span>
                        <span>❌ {webhook.failure_count} failed</span>
                        <span>⏱️ {webhook.timeout_seconds}s timeout</span>
                        <span>🔄 {webhook.retry_attempts} retries</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => testWebhook(webhook)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                        title="Test Webhook"
                      >
                        <Activity className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingWebhook(webhook)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteWebhook(webhook.id!)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Rate Limits Tab */}
      {activeTab === 'rate-limits' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <Activity className="h-5 w-5 text-blue-600 mr-2" />
              Rate Limiting Configuration
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <GlassInput
                label="Requests per Minute"
                type="number"
                value={rateLimitSettings.requests_per_minute}
                onChange={(e) => setRateLimitSettings({
                  ...rateLimitSettings,
                  requests_per_minute: parseInt(e.target.value)
                })}
              />
              <GlassInput
                label="Requests per Hour"
                type="number"
                value={rateLimitSettings.requests_per_hour}
                onChange={(e) => setRateLimitSettings({
                  ...rateLimitSettings,
                  requests_per_hour: parseInt(e.target.value)
                })}
              />
              <GlassInput
                label="Requests per Day"
                type="number"
                value={rateLimitSettings.requests_per_day}
                onChange={(e) => setRateLimitSettings({
                  ...rateLimitSettings,
                  requests_per_day: parseInt(e.target.value)
                })}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="text-sm font-medium text-gray-700">Enable Rate Limiting</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={rateLimitSettings.enable_rate_limiting}
                  onChange={(e) => setRateLimitSettings({
                    ...rateLimitSettings,
                    enable_rate_limiting: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <GlassButton
              onClick={saveRateLimitSettings}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Rate Limits
            </GlassButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
};

// API Key Form Component
const ApiKeyForm: React.FC<{
  apiKey: APIKey;
  onSave: (apiKey: APIKey) => void;
  onCancel: () => void;
  availableScopes: any[];
}> = ({ apiKey, onSave, onCancel, availableScopes }) => {
  const [formData, setFormData] = useState<APIKey>(apiKey);

  const toggleScope = (scopeId: string) => {
    const scopes = formData.scopes.includes(scopeId)
      ? formData.scopes.filter(s => s !== scopeId)
      : [...formData.scopes, scopeId];
    setFormData({ ...formData, scopes });
  };

  return (
    <div className="bg-white rounded-lg p-4 border-2 border-blue-200 space-y-4">
      <GlassInput
        label="API Key Name *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., Mobile App API Key"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permissions (Scopes)
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableScopes.map((scope) => (
            <label
              key={scope.id}
              className="flex items-start p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={formData.scopes.includes(scope.id)}
                onChange={() => toggleScope(scope.id)}
                className="mt-1 mr-2"
              />
              <div>
                <div className="font-medium text-sm text-gray-900">{scope.label}</div>
                <div className="text-xs text-gray-600">{scope.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Active</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>

      <div className="flex gap-3">
        <GlassButton
          onClick={() => onSave(formData)}
          disabled={!formData.name || formData.scopes.length === 0}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {apiKey.id ? 'Update' : 'Generate'} API Key
        </GlassButton>
        <GlassButton onClick={onCancel} variant="outline">
          Cancel
        </GlassButton>
      </div>
    </div>
  );
};

// Webhook Form Component
const WebhookForm: React.FC<{
  webhook: WebhookEndpoint;
  onSave: (webhook: WebhookEndpoint) => void;
  onCancel: () => void;
  availableEvents: any[];
}> = ({ webhook, onSave, onCancel, availableEvents }) => {
  const [formData, setFormData] = useState<WebhookEndpoint>(webhook);

  const toggleEvent = (eventId: string) => {
    const events = formData.events.includes(eventId)
      ? formData.events.filter(e => e !== eventId)
      : [...formData.events, eventId];
    setFormData({ ...formData, events });
  };

  return (
    <div className="bg-white rounded-lg p-4 border-2 border-purple-200 space-y-4">
      <GlassInput
        label="Webhook Name *"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., Order Notification Webhook"
        required
      />

      <GlassInput
        label="Webhook URL *"
        value={formData.url}
        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
        placeholder="https://your-app.com/webhooks/endpoint"
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Events to Listen For
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableEvents.map((event) => (
            <label
              key={event.id}
              className="flex items-center p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
            >
              <input
                type="checkbox"
                checked={formData.events.includes(event.id)}
                onChange={() => toggleEvent(event.id)}
                className="mr-2"
              />
              <span className="text-sm text-gray-900">{event.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassInput
          label="Retry Attempts"
          type="number"
          value={formData.retry_attempts}
          onChange={(e) => setFormData({ ...formData, retry_attempts: parseInt(e.target.value) })}
          min="0"
          max="10"
        />
        <GlassInput
          label="Timeout (seconds)"
          type="number"
          value={formData.timeout_seconds}
          onChange={(e) => setFormData({ ...formData, timeout_seconds: parseInt(e.target.value) })}
          min="5"
          max="120"
        />
      </div>

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Active</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>
      </div>

      <div className="flex gap-3">
        <GlassButton
          onClick={() => onSave(formData)}
          disabled={!formData.name || !formData.url || formData.events.length === 0}
          className="flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {webhook.id ? 'Update' : 'Create'} Webhook
        </GlassButton>
        <GlassButton onClick={onCancel} variant="outline">
          Cancel
        </GlassButton>
      </div>
    </div>
  );
};

export default APIWebhooksSettings;

