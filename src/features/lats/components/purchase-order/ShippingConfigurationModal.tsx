import React, { useState, useEffect } from 'react';
import { X, Save, Truck, MapPin, Package, Calendar, Ship, Plane, User, Building } from 'lucide-react';
import { toast } from 'react-hot-toast';
import shippingApi, { ShippingAgent, ShippingMethod, ShippingSettings } from '../../../../lib/shippingApi';

interface ShippingInfo {
  expectedDelivery: string;
  shippingAddress: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  billingAddress: {
    street: string;
    city: string;
    region: string;
    country: string;
    postalCode: string;
  };
  shippingMethod: string;
  trackingNumber?: string;
  notes?: string;
}

interface ShippingConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shippingInfo: ShippingInfo) => void;
  initialData?: Partial<ShippingInfo>;
}

const ShippingConfigurationModal: React.FC<ShippingConfigurationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    expectedDelivery: '',
    shippingAddress: {
      street: '',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      country: 'Tanzania',
      postalCode: ''
    },
    billingAddress: {
      street: '',
      city: 'Dar es Salaam',
      region: 'Dar es Salaam',
      country: 'Tanzania',
      postalCode: ''
    },
    shippingMethod: 'standard',
    trackingNumber: '',
    notes: ''
  });

  const [useSameAddress, setUseSameAddress] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Shipping data from database
  const [agents, setAgents] = useState<ShippingAgent[]>([]);
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [loadingData, setLoadingData] = useState(true);

  // Load shipping data from database
  useEffect(() => {
    if (isOpen) {
      loadShippingData();
    }
  }, [isOpen]);

  const loadShippingData = async () => {
    setLoadingData(true);
    try {
      const [agentsData, methodsData, settingsData] = await Promise.all([
        shippingApi.agents.getAll(true), // Only active agents
        shippingApi.methods.getAll(true), // Only active methods
        shippingApi.settings.get(),
      ]);

      setAgents(agentsData);
      setMethods(methodsData);
      setSettings(settingsData);

      // Apply default settings if available
      if (settingsData && !initialData) {
        setShippingInfo(prev => ({
          ...prev,
          shippingAddress: {
            ...prev.shippingAddress,
            street: settingsData.default_shipping_address_street || prev.shippingAddress.street,
            city: settingsData.default_shipping_address_city || prev.shippingAddress.city,
            region: settingsData.default_shipping_address_region || prev.shippingAddress.region,
            country: settingsData.default_shipping_address_country || prev.shippingAddress.country,
            postalCode: settingsData.default_shipping_address_postal_code || prev.shippingAddress.postalCode,
          }
        }));

        if (settingsData.default_agent_id) {
          setSelectedAgent(settingsData.default_agent_id);
        }
      }
    } catch (error) {
      console.error('Error loading shipping data:', error);
      toast.error('Failed to load shipping configuration');
    } finally {
      setLoadingData(false);
    }
  };

  // Initialize with default data
  useEffect(() => {
    if (isOpen && initialData) {
      setShippingInfo(prev => ({
        ...prev,
        ...initialData,
        shippingAddress: {
          ...prev.shippingAddress,
          ...initialData.shippingAddress
        },
        billingAddress: {
          ...prev.billingAddress,
          ...initialData.billingAddress
        }
      }));
    }
  }, [isOpen, initialData]);

  // Auto-fill billing address when useSameAddress is true
  useEffect(() => {
    if (useSameAddress) {
      setShippingInfo(prev => ({
        ...prev,
        billingAddress: prev.shippingAddress
      }));
    }
  }, [useSameAddress, shippingInfo.shippingAddress]);

  const handleInputChange = (field: string, value: string, addressType?: 'shipping' | 'billing') => {
    if (addressType) {
      setShippingInfo(prev => ({
        ...prev,
        [addressType + 'Address']: {
          ...prev[addressType + 'Address' as keyof typeof prev] as any,
          [field]: value
        }
      }));
    } else {
      setShippingInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSave = async () => {
    // Validation
    if (!shippingInfo.expectedDelivery) {
      toast.error('Please select expected delivery date');
      return;
    }

    if (!shippingInfo.shippingAddress.street || !shippingInfo.shippingAddress.city) {
      toast.error('Please complete shipping address');
      return;
    }

    if (!useSameAddress && (!shippingInfo.billingAddress.street || !shippingInfo.billingAddress.city)) {
      toast.error('Please complete billing address');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(shippingInfo);
      toast.success('Shipping configuration saved');
      onClose();
    } catch (error) {
      console.error('Error saving shipping configuration:', error);
      toast.error('Failed to save shipping configuration');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  if (loadingData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading shipping configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Shipping Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="space-y-6">
            {/* Expected Delivery */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={shippingInfo.expectedDelivery}
                onChange={(e) => handleInputChange('expectedDelivery', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Shipping Agent */}
            {agents.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Shipping Agent / Freight Forwarder
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select shipping agent (optional)</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} {agent.is_preferred && '⭐'}
                      {agent.company_name && ` - ${agent.company_name}`}
                    </option>
                  ))}
                </select>
                {selectedAgent && (() => {
                  const agent = agents.find(a => a.id === selectedAgent);
                  return agent ? (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 text-blue-900 font-medium mb-1">
                        <Building className="w-4 h-4" />
                        {agent.name}
                      </div>
                      {agent.phone && (
                        <div className="text-blue-700">📞 {agent.phone}</div>
                      )}
                      {agent.email && (
                        <div className="text-blue-700">📧 {agent.email}</div>
                      )}
                      <div className="flex gap-2 mt-2">
                        {agent.shipping_methods.map((method) => (
                          <span
                            key={method}
                            className="px-2 py-0.5 text-xs bg-blue-200 text-blue-800 rounded-full"
                          >
                            {method === 'sea' && '🚢'}
                            {method === 'air' && '✈️'}
                            {method === 'road' && '🚛'}
                            {' '}{method.charAt(0).toUpperCase() + method.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Shipping Method */}
            {methods.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Truck className="w-4 h-4 inline mr-2" />
                  Shipping Method
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {methods.map((method) => (
                    <label 
                      key={method.id} 
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        shippingInfo.shippingMethod === method.code
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="shippingMethod"
                        value={method.code}
                        checked={shippingInfo.shippingMethod === method.code}
                        onChange={(e) => handleInputChange('shippingMethod', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {method.code === 'sea' && <Ship className="w-4 h-4 text-blue-600" />}
                          {method.code.includes('air') && <Plane className="w-4 h-4 text-blue-600" />}
                          {method.code === 'road' && <Truck className="w-4 h-4 text-blue-600" />}
                          <span className="font-medium text-gray-900">{method.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {method.estimated_days_min}-{method.estimated_days_max} days
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Shipping Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-2" />
                Shipping Address
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={shippingInfo.shippingAddress.street}
                    onChange={(e) => handleInputChange('street', e.target.value, 'shipping')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="City"
                  value={shippingInfo.shippingAddress.city}
                  onChange={(e) => handleInputChange('city', e.target.value, 'shipping')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Region/State"
                  value={shippingInfo.shippingAddress.region}
                  onChange={(e) => handleInputChange('region', e.target.value, 'shipping')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Postal Code"
                  value={shippingInfo.shippingAddress.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value, 'shipping')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={shippingInfo.shippingAddress.country}
                  onChange={(e) => handleInputChange('country', e.target.value, 'shipping')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <div className="flex items-center mb-2">
                <input
                  type="checkbox"
                  id="useSameAddress"
                  checked={useSameAddress}
                  onChange={(e) => setUseSameAddress(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="useSameAddress" className="text-sm font-medium text-gray-700">
                  Use same address for billing
                </label>
              </div>

              {!useSameAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billing Address
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Street Address"
                        value={shippingInfo.billingAddress.street}
                        onChange={(e) => handleInputChange('street', e.target.value, 'billing')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="City"
                      value={shippingInfo.billingAddress.city}
                      onChange={(e) => handleInputChange('city', e.target.value, 'billing')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Region/State"
                      value={shippingInfo.billingAddress.region}
                      onChange={(e) => handleInputChange('region', e.target.value, 'billing')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Postal Code"
                      value={shippingInfo.billingAddress.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value, 'billing')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={shippingInfo.billingAddress.country}
                      onChange={(e) => handleInputChange('country', e.target.value, 'billing')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tracking Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="w-4 h-4 inline mr-2" />
                Tracking Number (Optional)
              </label>
              <input
                type="text"
                placeholder="Enter tracking number if available"
                value={shippingInfo.trackingNumber}
                onChange={(e) => handleInputChange('trackingNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Notes (Optional)
              </label>
              <textarea
                placeholder="Any special shipping instructions..."
                value={shippingInfo.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isLoading ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShippingConfigurationModal;
