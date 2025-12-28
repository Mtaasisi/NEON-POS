import React, { useState, useEffect } from 'react';
import { 
  Truck, Ship, Plane, Plus, Edit2, Trash2, Save, X, Star, StarOff,
  Phone, Mail, MapPin, Building, Globe, CheckCircle, AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import shippingApi, { 
  ShippingAgent, 
  ShippingMethod, 
  ShippingSettings as ShippingSettingsType 
} from '../../../lib/shippingApi';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface ShippingSettingsProps {
  isActive?: boolean;
}

const ShippingSettings: React.FC<ShippingSettingsProps> = ({ isActive = true }) => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [activeTab, setActiveTab] = useState<'agents' | 'methods' | 'defaults'>('agents');
  const [agents, setAgents] = useState<ShippingAgent[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [settings, setSettings] = useState<ShippingSettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Agent form state
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ShippingAgent | null>(null);
  const [agentForm, setAgentForm] = useState<Partial<ShippingAgent>>({
    name: '',
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    whatsapp: '',
    shipping_methods: [],
    address: '',
    city: '',
    country: '',
    license_number: '',
    website: '',
    notes: '',
    base_rate_sea: 0,
    base_rate_air: 0,
    currency: 'USD',
    is_active: true,
    is_preferred: false,
  });

  // Load data
  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, methodsData, settingsData] = await Promise.all([
        shippingApi.agents.getAll(false),
        shippingApi.methods.getAll(false),
        shippingApi.settings.get(),
      ]);

      setAgents(agentsData);
      setMethods(methodsData);
      setSettings(settingsData || {
        default_shipping_address_city: 'Dar es Salaam',
        default_shipping_address_country: 'Tanzania',
        notify_on_shipment: true,
        notify_on_arrival: true,
        include_insurance: true,
        insurance_percentage: 2.0,
      });
    } catch (error) {
      console.error('Error loading shipping data:', error);
      toast.error('Failed to load shipping settings');
    } finally {
      setLoading(false);
    }
  };

  // Agent CRUD operations
  const handleSaveAgent = async () => {
    try {
      if (!agentForm.name) {
        toast.error('Agent name is required');
        return;
      }

      setSaving(true);

      if (editingAgent) {
        // Update existing agent
        await shippingApi.agents.update(editingAgent.id, agentForm as Partial<ShippingAgent>);
        toast.success('Agent updated successfully');
      } else {
        // Create new agent
        await shippingApi.agents.create(agentForm as Omit<ShippingAgent, 'id' | 'created_at' | 'updated_at'>);
        toast.success('Agent created successfully');
      }

      await loadData();
      handleCloseAgentForm();
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Failed to save agent');
    } finally {
      setSaving(false);
    }
  };

  const handleEditAgent = (agent: ShippingAgent) => {
    setEditingAgent(agent);
    setAgentForm(agent);
    setShowAgentForm(true);
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shipping agent?')) return;

    try {
      await shippingApi.agents.delete(id);
      toast.success('Agent deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const handleTogglePreferred = async (agent: ShippingAgent) => {
    try {
      await shippingApi.agents.update(agent.id, { is_preferred: !agent.is_preferred });
      toast.success(agent.is_preferred ? 'Removed from preferred' : 'Added to preferred');
      await loadData();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
    }
  };

  const handleToggleAgentActive = async (agent: ShippingAgent) => {
    try {
      await shippingApi.agents.update(agent.id, { is_active: !agent.is_active });
      toast.success(agent.is_active ? 'Agent deactivated' : 'Agent activated');
      await loadData();
    } catch (error) {
      console.error('Error updating agent:', error);
      toast.error('Failed to update agent');
    }
  };

  const handleCloseAgentForm = () => {
    setShowAgentForm(false);
    setEditingAgent(null);
    setAgentForm({
      name: '',
      company_name: '',
      contact_person: '',
      phone: '',
      email: '',
      whatsapp: '',
      shipping_methods: [],
      address: '',
      city: '',
      country: '',
      license_number: '',
      website: '',
      notes: '',
      base_rate_sea: 0,
      base_rate_air: 0,
      currency: 'USD',
      is_active: true,
      is_preferred: false,
    });
  };

  // Settings operations
  useEffect(() => {
      if (!settings) return;

    const handleSaveSettings = async () => {
      try {
      setSaving(true);
      await shippingApi.settings.save(settings);
      toast.success('Settings saved successfully');
      await loadData();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
    
    registerSaveHandler('shipping-settings', handleSaveSettings);
    return () => unregisterSaveHandler('shipping-settings');
  }, [settings, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    if (settings) {
      setHasChanges(true);
    }
  }, [settings, setHasChanges]);

  const toggleShippingMethod = (method: string) => {
    setAgentForm(prev => ({
      ...prev,
      shipping_methods: prev.shipping_methods?.includes(method)
        ? prev.shipping_methods.filter(m => m !== method)
        : [...(prev.shipping_methods || []), method]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shipping settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
      {/* Icon Header - Fixed - Matching Store Management style */}
      <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Shipping Management</h2>
            <p className="text-sm text-gray-600">Manage shipping agents, methods, and default settings for purchase orders</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b-2 border-gray-200">
          <nav className="flex space-x-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('agents')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl ${
                activeTab === 'agents'
                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Building className="w-5 h-5" />
              Shipping Agents
            </button>
            <button
              onClick={() => setActiveTab('methods')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl ${
                activeTab === 'methods'
                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Truck className="w-5 h-5" />
              Shipping Methods
            </button>
            <button
              onClick={() => setActiveTab('defaults')}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl ${
                activeTab === 'defaults'
                  ? 'border-orange-500 text-orange-700 bg-orange-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <MapPin className="w-5 h-5" />
              Default Settings
            </button>
          </nav>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
        <div className="py-6">

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Shipping Agents</h3>
            <button
              onClick={() => setShowAgentForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Agent
            </button>
          </div>

          {/* Agents List */}
          {agents.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Ship className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No shipping agents added yet</p>
              <button
                onClick={() => setShowAgentForm(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first agent
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`p-4 border-2 rounded-lg ${
                    agent.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900">{agent.name}</h4>
                        {agent.is_preferred && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </div>
                      {agent.company_name && (
                        <p className="text-sm text-gray-600">{agent.company_name}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleTogglePreferred(agent)}
                        className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
                        title={agent.is_preferred ? 'Remove from preferred' : 'Mark as preferred'}
                      >
                        {agent.is_preferred ? (
                          <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                        ) : (
                          <StarOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditAgent(agent)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit agent"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete agent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Shipping Methods */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {agent.shipping_methods.map((method) => (
                      <span
                        key={method}
                        className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"
                      >
                        {method === 'sea' && <Ship className="w-3 h-3 inline mr-1" />}
                        {method === 'air' && <Plane className="w-3 h-3 inline mr-1" />}
                        {method === 'road' && <Truck className="w-3 h-3 inline mr-1" />}
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </span>
                    ))}
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-1 text-sm text-gray-600">
                    {agent.contact_person && (
                      <div className="flex items-center gap-2">
                        <Building className="w-3 h-3" />
                        <span>{agent.contact_person}</span>
                      </div>
                    )}
                    {agent.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3" />
                        <span>{agent.phone}</span>
                      </div>
                    )}
                    {agent.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3 h-3" />
                        <span>{agent.email}</span>
                      </div>
                    )}
                    {agent.city && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        <span>{agent.city}, {agent.country}</span>
                      </div>
                    )}
                  </div>

                  {/* Rates */}
                  {(agent.base_rate_sea || agent.base_rate_air) && (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex gap-4 text-sm">
                      {agent.base_rate_sea > 0 && (
                        <div>
                          <span className="text-gray-600">Sea: </span>
                          <span className="font-semibold text-gray-900">
                            {agent.currency} {agent.base_rate_sea}
                          </span>
                        </div>
                      )}
                      {agent.base_rate_air > 0 && (
                        <div>
                          <span className="text-gray-600">Air: </span>
                          <span className="font-semibold text-gray-900">
                            {agent.currency} {agent.base_rate_air}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Toggle */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleToggleAgentActive(agent)}
                      className={`flex items-center gap-2 text-sm font-medium ${
                        agent.is_active ? 'text-green-600' : 'text-gray-500'
                      }`}
                    >
                      {agent.is_active ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Active
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-4 h-4" />
                          Inactive
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Methods Tab */}
      {activeTab === 'methods' && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Shipping Methods</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {methods.map((method) => (
              <div
                key={method.id}
                className="p-4 border-2 border-gray-200 rounded-lg bg-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  {method.code === 'sea' && <Ship className="w-6 h-6 text-blue-600" />}
                  {method.code === 'air' && <Plane className="w-6 h-6 text-blue-600" />}
                  {method.code.includes('air') && <Plane className="w-6 h-6 text-blue-600" />}
                  {method.code === 'road' && <Truck className="w-6 h-6 text-blue-600" />}
                  {method.code === 'rail' && <Truck className="w-6 h-6 text-blue-600" />}
                  <div>
                    <h4 className="font-semibold text-gray-900">{method.name}</h4>
                    <span className="text-xs text-gray-500">{method.code}</span>
                  </div>
                </div>
                
                {method.description && (
                  <p className="text-sm text-gray-600 mb-3">{method.description}</p>
                )}

                <div className="flex justify-between text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <div className="font-medium text-gray-900">
                      {method.estimated_days_min}-{method.estimated_days_max} days
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Multiplier:</span>
                    <div className="font-medium text-gray-900">
                      {method.cost_multiplier}x
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Defaults Tab */}
      {activeTab === 'defaults' && settings && (
        <GlassCard className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Default Settings</h3>
          
          <div className="space-y-6">
            {/* Default Shipping Address */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Default Shipping Address</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                  <input
                    type="text"
                    value={settings.default_shipping_address_street || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, default_shipping_address_street: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={settings.default_shipping_address_city || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, default_shipping_address_city: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Region</label>
                  <input
                    type="text"
                    value={settings.default_shipping_address_region || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, default_shipping_address_region: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Region/State"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={settings.default_shipping_address_country || ''}
                    onChange={(e) =>
                      setSettings({ ...settings, default_shipping_address_country: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Default Shipping Method */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Default Shipping Method</h4>
              <select
                value={settings.default_shipping_method_id || ''}
                onChange={(e) =>
                  setSettings({ ...settings, default_shipping_method_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select default method</option>
                {methods.filter(m => m.is_active).map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Agent */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Default Shipping Agent</h4>
              <select
                value={settings.default_agent_id || ''}
                onChange={(e) =>
                  setSettings({ ...settings, default_agent_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No default agent</option>
                {agents.filter(a => a.is_active).map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.is_preferred && '⭐'}
                  </option>
                ))}
              </select>
            </div>

            {/* Notifications */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notify_on_shipment || false}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_on_shipment: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Notify when shipment is dispatched</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.notify_on_arrival || false}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_on_arrival: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Notify when shipment arrives</span>
                </label>
              </div>
            </div>

            {/* Insurance */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Insurance Settings</h4>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.include_insurance || false}
                    onChange={(e) =>
                      setSettings({ ...settings, include_insurance: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Include insurance by default</span>
                </label>
                {settings.include_insurance && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Insurance Percentage
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        step="0.1"
                        value={settings.insurance_percentage || 2.0}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            insurance_percentage: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-700">% of goods value</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </GlassCard>
      )}

        </div>
      </div>

      {/* Agent Form Modal */}
      {showAgentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingAgent ? 'Edit Shipping Agent' : 'Add Shipping Agent'}
              </h3>
              <button
                onClick={handleCloseAgentForm}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Agent Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={agentForm.name || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Agent name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={agentForm.company_name || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Company name"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={agentForm.contact_person || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, contact_person: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Contact person"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={agentForm.phone || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={agentForm.email || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    value={agentForm.whatsapp || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              {/* Shipping Methods */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shipping Methods <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {['sea', 'air', 'road', 'rail'].map((method) => (
                    <label
                      key={method}
                      className={`flex items-center gap-2 px-4 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                        agentForm.shipping_methods?.includes(method)
                          ? 'border-blue-600 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={agentForm.shipping_methods?.includes(method)}
                        onChange={() => toggleShippingMethod(method)}
                        className="sr-only"
                      />
                      {method === 'sea' && <Ship className="w-4 h-4" />}
                      {method === 'air' && <Plane className="w-4 h-4" />}
                      {method === 'road' && <Truck className="w-4 h-4" />}
                      {method === 'rail' && <Truck className="w-4 h-4" />}
                      <span className="font-medium capitalize">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={agentForm.city || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={agentForm.country || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Country"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Number
                  </label>
                  <input
                    type="text"
                    value={agentForm.license_number || ''}
                    onChange={(e) => setAgentForm({ ...agentForm, license_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="License #"
                  />
                </div>
              </div>

              {/* Rates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sea Base Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={agentForm.base_rate_sea || ''}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, base_rate_sea: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Air Base Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={agentForm.base_rate_air || ''}
                    onChange={(e) =>
                      setAgentForm({ ...agentForm, base_rate_air: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                  <select
                    value={agentForm.currency || 'USD'}
                    onChange={(e) => setAgentForm({ ...agentForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TZS">TZS</option>
                    <option value="CNY">CNY</option>
                  </select>
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={agentForm.address || ''}
                  onChange={(e) => setAgentForm({ ...agentForm, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full address"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={agentForm.notes || ''}
                  onChange={(e) => setAgentForm({ ...agentForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Additional notes about this agent..."
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={agentForm.is_active || false}
                    onChange={(e) => setAgentForm({ ...agentForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={agentForm.is_preferred || false}
                    onChange={(e) => setAgentForm({ ...agentForm, is_preferred: e.target.checked })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700">Preferred Agent</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleCloseAgentForm}
                disabled={saving}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAgent}
                disabled={saving || !agentForm.name || !agentForm.shipping_methods?.length}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingAgent ? 'Update Agent' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingSettings;

