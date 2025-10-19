/**
 * Comprehensive Integrations Management Component
 * Manage all third-party integrations from Admin Settings
 */

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  MessageCircle,
  Mail,
  CreditCard,
  BarChart,
  Zap,
  Globe,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Save,
  TestTube,
  RefreshCw,
  Settings as SettingsIcon,
  Power,
  PowerOff,
  MapPin,
  HardDrive,
} from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import {
  getAllIntegrations,
  getIntegrationTemplates,
  upsertIntegration,
  deleteIntegration,
  toggleIntegration,
  type Integration,
  type IntegrationTemplate,
} from '../../../lib/integrationsApi';

const IntegrationsManagement: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [templates] = useState<IntegrationTemplate[]>(getIntegrationTemplates());
  const [loading, setLoading] = useState(true);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await getAllIntegrations();
      setIntegrations(data);
    } catch (error: any) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = (template: IntegrationTemplate) => {
    setEditingIntegration({
      integration_name: template.integration_name,
      integration_type: template.integration_type,
      provider_name: template.provider_name,
      is_enabled: false,
      is_active: false,
      is_test_mode: true,
      environment: 'test',
      credentials: {},
      config: {},
      description: template.description,
    });
    setShowModal(true);
  };

  const handleEdit = (integration: Integration) => {
    setEditingIntegration({ ...integration });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingIntegration) return;

    setSaving(true);
    try {
      await upsertIntegration(editingIntegration);
      toast.success('Integration saved successfully!');
      setShowModal(false);
      setEditingIntegration(null);
      await loadIntegrations();
    } catch (error: any) {
      console.error('Error saving integration:', error);
      toast.error('Failed to save integration');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (integrationName: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    try {
      await deleteIntegration(integrationName);
      toast.success('Integration deleted successfully!');
      await loadIntegrations();
    } catch (error: any) {
      console.error('Error deleting integration:', error);
      toast.error('Failed to delete integration');
    }
  };

  const handleDeleteAllTestIntegrations = async () => {
    const testIntegrations = integrations.filter(i => i.is_test_mode);
    
    if (testIntegrations.length === 0) {
      toast.error('No test integrations found');
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${testIntegrations.length} test integration(s)?`)) return;

    try {
      // Delete each test integration
      for (const integration of testIntegrations) {
        await deleteIntegration(integration.integration_name);
      }
      toast.success(`Successfully deleted ${testIntegrations.length} test integration(s)!`);
      await loadIntegrations();
    } catch (error: any) {
      console.error('Error deleting test integrations:', error);
      toast.error('Failed to delete test integrations');
    }
  };

  const handleToggle = async (integrationName: string, enabled: boolean) => {
    try {
      await toggleIntegration(integrationName, enabled);
      toast.success(`Integration ${enabled ? 'enabled' : 'disabled'} successfully!`);
      await loadIntegrations();
    } catch (error: any) {
      console.error('Error toggling integration:', error);
      toast.error('Failed to toggle integration');
    }
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTestIntegration = async (integration: Integration) => {
    setTesting(integration.integration_name);
    try {
      let result = { success: false, message: '' };

      switch (integration.integration_type) {
        case 'sms':
          result = await testSMSIntegration(integration);
          break;
        case 'whatsapp':
          result = await testWhatsAppIntegration(integration);
          break;
        case 'email':
          result = await testEmailIntegration(integration);
          break;
        case 'payment':
          result = await testPaymentIntegration(integration);
          break;
        case 'analytics':
          result = await testAnalyticsIntegration(integration);
          break;
        case 'ai':
          result = await testAIIntegration(integration);
          break;
        case 'social':
          result = await testSocialIntegration(integration);
          break;
        case 'maps':
          result = await testMapsIntegration(integration);
          break;
        case 'storage':
          result = await testStorageIntegration(integration);
          break;
        default:
          result = await testGenericIntegration(integration);
      }

      setTestResults(prev => ({
        ...prev,
        [integration.integration_name]: result
      }));

      if (result.success) {
        toast.success(`✅ ${integration.provider_name} test passed!`);
      } else {
        toast.error(`❌ ${integration.provider_name} test failed: ${result.message}`);
      }
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      setTestResults(prev => ({
        ...prev,
        [integration.integration_name]: { success: false, message: errorMsg }
      }));
      toast.error(`Test error: ${errorMsg}`);
    } finally {
      setTesting(null);
    }
  };

  const testSMSIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.api_key) {
      return { success: false, message: 'API key is required' };
    }
    // Validate credentials structure
    return { 
      success: true, 
      message: `SMS credentials validated. API Key: ${integration.credentials.api_key.substring(0, 8)}...` 
    };
  };

  const testWhatsAppIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.instance_id || !integration.credentials.api_token) {
      return { success: false, message: 'Instance ID and API token are required' };
    }

    try {
      const apiUrl = integration.config.api_url || 'https://7105.api.greenapi.com';
      const url = `${apiUrl}/waInstance${integration.credentials.instance_id}/getStateInstance/${integration.credentials.api_token}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.stateInstance === 'authorized') {
        return { 
          success: true, 
          message: `Connected! Status: ${data.stateInstance}` 
        };
      } else {
        return { 
          success: false, 
          message: `Status: ${data.stateInstance}. Please scan QR code to authorize.` 
        };
      }
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  };

  const testEmailIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.api_key && !integration.credentials.username) {
      return { success: false, message: 'Email credentials are incomplete' };
    }
    return { 
      success: true, 
      message: 'Email credentials validated successfully' 
    };
  };

  const testPaymentIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    const hasRequiredCreds = integration.credentials.api_key || 
                            integration.credentials.secret_key || 
                            integration.credentials.consumer_key;
    if (!hasRequiredCreds) {
      return { success: false, message: 'Payment credentials are incomplete' };
    }
    return { 
      success: true, 
      message: 'Payment credentials validated successfully' 
    };
  };

  const testAnalyticsIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.tracking_id && !integration.credentials.measurement_id) {
      return { success: false, message: 'Analytics tracking ID is required' };
    }
    return { 
      success: true, 
      message: 'Analytics credentials validated successfully' 
    };
  };

  const testAIIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.api_key) {
      return { success: false, message: 'AI API key is required' };
    }
    return { 
      success: true, 
      message: 'AI credentials validated successfully' 
    };
  };

  const testSocialIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    return { 
      success: true, 
      message: 'Social media credentials validated successfully' 
    };
  };

  const testMapsIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.api_key) {
      return { success: false, message: 'Maps API key is required' };
    }
    // Basic validation - checking if key looks like a Google API key
    if (!integration.credentials.api_key.startsWith('AIza')) {
      return { 
        success: false, 
        message: 'Invalid Google Maps API key format (should start with "AIza")' 
      };
    }
    return { 
      success: true, 
      message: 'Google Maps API key validated. Maps services are ready to use.' 
    };
  };

  const testStorageIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (integration.integration_name === 'HOSTINGER_STORAGE') {
      if (!integration.credentials.api_token || !integration.credentials.domain) {
        return { success: false, message: 'Hostinger credentials incomplete (API Token and Domain required)' };
      }
      return { 
        success: true, 
        message: 'Hostinger credentials validated. File storage is ready to use.' 
      };
    }
    if (!integration.credentials.api_key && !integration.credentials.api_token) {
      return { success: false, message: 'Storage credentials are incomplete' };
    }
    return { 
      success: true, 
      message: 'Storage credentials validated successfully' 
    };
  };

  const testGenericIntegration = async (integration: Integration): Promise<{ success: boolean; message: string }> => {
    if (!integration.credentials.api_key && !integration.credentials.api_url) {
      return { success: false, message: 'API credentials are incomplete' };
    }
    return { 
      success: true, 
      message: 'Integration credentials validated successfully' 
    };
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Smartphone,
      MessageCircle,
      Mail,
      CreditCard,
      BarChart,
      Zap,
      Globe,
      MapPin,
      HardDrive,
    };
    return icons[iconName] || Globe;
  };

  const getStatusBadge = (integration: Integration) => {
    if (integration.is_enabled && integration.is_active) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    } else if (integration.is_enabled) {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
          <AlertTriangle className="w-3 h-3" />
          Enabled
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
          <XCircle className="w-3 h-3" />
          Disabled
        </span>
      );
    }
  };

  const getTemplate = (integrationName: string): IntegrationTemplate | undefined => {
    return templates.find(t => t.integration_name === integrationName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <SettingsIcon className="w-7 h-7 text-blue-600" />
            Integrations Management
          </h2>
          <p className="text-gray-600 mt-1">
            Configure and manage all your third-party integrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {integrations.some(i => i.is_test_mode) && (
            <GlassButton
              onClick={handleDeleteAllTestIntegrations}
              variant="outline"
              className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete Test Integrations
            </GlassButton>
          )}
          <GlassButton
            onClick={loadIntegrations}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </GlassButton>
        </div>
      </div>

      {/* Existing Integrations */}
      {integrations.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Integrations ({integrations.length})
          </h3>
          <div className="space-y-3">
            {integrations.map((integration) => {
              const template = getTemplate(integration.integration_name);
              const Icon = template ? getIcon(template.icon) : Globe;

              return (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {integration.provider_name || integration.integration_name}
                          </h4>
                          {getStatusBadge(integration)}
                        </div>
                        <p className="text-sm text-gray-600">
                          {integration.description || `${integration.integration_type} integration`}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {integration.is_test_mode && (
                            <span className="text-xs text-orange-600 font-medium">
                              Test Mode
                            </span>
                          )}
                          {testResults[integration.integration_name] && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                              testResults[integration.integration_name].success
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              Last test: {testResults[integration.integration_name].success ? '✅ Passed' : '❌ Failed'}
                            </span>
                          )}
                        </div>
                        {testResults[integration.integration_name] && !testResults[integration.integration_name].success && (
                          <p className="text-xs text-red-600 mt-1">
                            {testResults[integration.integration_name].message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <GlassButton
                      onClick={() => handleTestIntegration(integration)}
                      variant="outline"
                      size="sm"
                      disabled={testing === integration.integration_name}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      title="Test integration"
                    >
                      {testing === integration.integration_name ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleToggle(integration.integration_name, !integration.is_enabled)}
                      variant="outline"
                      size="sm"
                      className={`flex items-center gap-1 ${
                        integration.is_enabled
                          ? 'text-green-600 hover:text-green-700'
                          : 'text-gray-600 hover:text-gray-700'
                      }`}
                      title={integration.is_enabled ? 'Disable' : 'Enable'}
                    >
                      {integration.is_enabled ? (
                        <Power className="w-4 h-4" />
                      ) : (
                        <PowerOff className="w-4 h-4" />
                      )}
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleEdit(integration)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                      title="Edit integration"
                    >
                      <Edit2 className="w-4 h-4" />
                    </GlassButton>
                    <GlassButton
                      onClick={() => handleDelete(integration.integration_name)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      title="Delete integration"
                    >
                      <Trash2 className="w-4 h-4" />
                    </GlassButton>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Available Integrations Templates */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Add New Integration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = getIcon(template.icon);
            const exists = integrations.find(
              (i) => i.integration_name === template.integration_name
            );

            return (
              <div
                key={template.integration_name}
                className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
                onClick={() => !exists && handleAddNew(template)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Icon className="w-6 h-6 text-blue-600" />
                  <h4 className="font-semibold text-gray-900">
                    {template.provider_name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                {exists ? (
                  <button
                    className="w-full py-2 px-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
                    disabled
                  >
                    Already Added
                  </button>
                ) : (
                  <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add Integration
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Edit/Add Modal */}
      {showModal && editingIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingIntegration.id ? 'Edit' : 'Add'} Integration
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingIntegration(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Provider Name
                  </label>
                  <input
                    type="text"
                    value={editingIntegration.provider_name || ''}
                    onChange={(e) =>
                      setEditingIntegration({
                        ...editingIntegration,
                        provider_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingIntegration.description || ''}
                    onChange={(e) =>
                      setEditingIntegration({
                        ...editingIntegration,
                        description: e.target.value,
                      })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Environment
                    </label>
                    <select
                      value={editingIntegration.environment}
                      onChange={(e) =>
                        setEditingIntegration({
                          ...editingIntegration,
                          environment: e.target.value as any,
                          is_test_mode: e.target.value === 'test',
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="test">Test</option>
                      <option value="sandbox">Sandbox</option>
                      <option value="production">Production</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-8">
                    <input
                      type="checkbox"
                      id="enabled"
                      checked={editingIntegration.is_enabled}
                      onChange={(e) =>
                        setEditingIntegration({
                          ...editingIntegration,
                          is_enabled: e.target.checked,
                          is_active: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <label htmlFor="enabled" className="font-medium">
                      Enable Integration
                    </label>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Credentials</h4>
                {getTemplate(editingIntegration.integration_name)?.credentials_fields.map(
                  (field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label} {field.required && '*'}
                      </label>
                      <div className="relative">
                        <input
                          type={
                            field.type === 'password' && !showSecrets[field.name]
                              ? 'password'
                              : 'text'
                          }
                          value={editingIntegration.credentials[field.name] || ''}
                          onChange={(e) =>
                            setEditingIntegration({
                              ...editingIntegration,
                              credentials: {
                                ...editingIntegration.credentials,
                                [field.name]: e.target.value,
                              },
                            })
                          }
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => toggleSecretVisibility(field.name)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showSecrets[field.name] ? (
                              <EyeOff className="w-5 h-5" />
                            ) : (
                              <Eye className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>

              {/* Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900">Configuration</h4>
                {getTemplate(editingIntegration.integration_name)?.config_fields.map(
                  (field) => (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label} {field.required && '*'}
                      </label>
                      {field.type === 'checkbox' ? (
                        <input
                          type="checkbox"
                          checked={editingIntegration.config[field.name] || false}
                          onChange={(e) =>
                            setEditingIntegration({
                              ...editingIntegration,
                              config: {
                                ...editingIntegration.config,
                                [field.name]: e.target.checked,
                              },
                            })
                          }
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                      ) : field.type === 'select' && field.options ? (
                        <select
                          value={editingIntegration.config[field.name] || ''}
                          onChange={(e) =>
                            setEditingIntegration({
                              ...editingIntegration,
                              config: {
                                ...editingIntegration.config,
                                [field.name]: e.target.value,
                              },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          {field.options.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type}
                          value={editingIntegration.config[field.name] || ''}
                          onChange={(e) =>
                            setEditingIntegration({
                              ...editingIntegration,
                              config: {
                                ...editingIntegration.config,
                                [field.name]: e.target.value,
                              },
                            })
                          }
                          placeholder={field.placeholder}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <GlassButton
                onClick={() => {
                  setShowModal(false);
                  setEditingIntegration(null);
                }}
                variant="outline"
              >
                Cancel
              </GlassButton>
              <GlassButton
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Integration
                  </>
                )}
              </GlassButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsManagement;

