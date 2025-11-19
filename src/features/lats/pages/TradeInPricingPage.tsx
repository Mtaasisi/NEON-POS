/**
 * Trade-In Pricing Management Page
 * Allows admin to set and manage base trade-in prices for devices
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, DollarSign, Smartphone, Filter } from 'lucide-react';
import { toast } from 'sonner';
import type { TradeInPrice, TradeInPriceFormData } from '../types/tradeIn';
import {
  getTradeInPrices,
  createTradeInPrice,
  updateTradeInPrice,
  deleteTradeInPrice,
} from '../lib/tradeInApi';
import { format } from '../lib/format';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

export const TradeInPricingPage: React.FC = () => {
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [prices, setPrices] = useState<TradeInPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<TradeInPrice | null>(null);

  // Load prices
  const loadPrices = async () => {
    const jobId = startLoading('Loading trade-in prices...');
    setLoading(true);
    const result = await getTradeInPrices({ is_active: showActiveOnly });
    if (result.success && result.data) {
      setPrices(result.data);
      completeLoading(jobId);
    } else {
      failLoading(jobId, 'Failed to load prices');
      toast.error(result.error || 'Failed to load prices');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPrices();
  }, [showActiveOnly]);

  // Filter prices
  const filteredPrices = prices.filter((price) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      price.device_name.toLowerCase().includes(search) ||
      price.device_model.toLowerCase().includes(search)
    );
  });

  const handleEdit = (price: TradeInPrice) => {
    setEditingPrice(price);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trade-in price?')) return;
    
    const result = await deleteTradeInPrice(id);
    if (result.success) {
      toast.success('Trade-in price deleted');
      loadPrices();
    } else {
      toast.error(result.error || 'Failed to delete');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPrice(null);
  };

  const handleSave = () => {
    loadPrices();
    handleCloseModal();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <DollarSign className="w-8 h-8 text-blue-600" />
          Trade-In Pricing Management
        </h1>
        <p className="text-gray-600 mt-2">
          Set and manage base trade-in prices for different device models
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search device name or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-3 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Active Only</span>
            </label>

            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Trade-In Price
            </button>
          </div>
        </div>
      </div>

      {/* Prices Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading prices...</p>
          </div>
        ) : filteredPrices.length === 0 ? (
          <div className="p-12 text-center">
            <Smartphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Trade-In Prices</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm
                ? 'No prices match your search'
                : 'Start by adding base trade-in prices for your devices'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Price
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Device
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Base Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Condition Multipliers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPrices.map((price) => (
                  <tr key={price.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{price.device_name}</div>
                        <div className="text-sm text-gray-500">{price.device_model}</div>
                        {price.notes && (
                          <div className="text-xs text-gray-400 mt-1">{price.notes}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-lg font-semibold text-gray-900">
                        {format.money(price.base_trade_in_price)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Excellent:</span>
                          <span className="font-medium text-green-600">
                            {(price.excellent_multiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Good:</span>
                          <span className="font-medium text-blue-600">
                            {(price.good_multiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Fair:</span>
                          <span className="font-medium text-yellow-600">
                            {(price.fair_multiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-600">Poor:</span>
                          <span className="font-medium text-red-600">
                            {(price.poor_multiplier * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          price.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {price.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(price)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(price.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <TradeInPriceModal
          price={editingPrice}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

// ================================================
// MODAL COMPONENT
// ================================================

interface TradeInPriceModalProps {
  price: TradeInPrice | null;
  onClose: () => void;
  onSave: () => void;
}

const TradeInPriceModal: React.FC<TradeInPriceModalProps> = ({ price, onClose, onSave }) => {
  const [formData, setFormData] = useState<TradeInPriceFormData>({
    device_name: price?.device_name || '',
    device_model: price?.device_model || '',
    base_trade_in_price: price?.base_trade_in_price || 0,
    excellent_multiplier: price?.excellent_multiplier || 1.0,
    good_multiplier: price?.good_multiplier || 0.85,
    fair_multiplier: price?.fair_multiplier || 0.70,
    poor_multiplier: price?.poor_multiplier || 0.50,
    notes: price?.notes || '',
    is_active: price?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = price
      ? await updateTradeInPrice(price.id, formData)
      : await createTradeInPrice(formData);

    setSaving(false);

    if (result.success) {
      toast.success(price ? 'Price updated successfully' : 'Price created successfully');
      onSave();
    } else {
      toast.error(result.error || 'Failed to save price');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {price ? 'Edit Trade-In Price' : 'Add Trade-In Price'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Device Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Name *
              </label>
              <input
                type="text"
                required
                value={formData.device_name}
                onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., iPhone 14 Pro"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Model *
              </label>
              <input
                type="text"
                required
                value={formData.device_model}
                onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., A2890 256GB"
              />
            </div>
          </div>

          {/* Base Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Trade-In Price *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.01"
              value={formData.base_trade_in_price}
              onChange={(e) =>
                setFormData({ ...formData, base_trade_in_price: parseFloat(e.target.value) || 0 })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            <p className="text-sm text-gray-500 mt-1">
              This is the maximum trade-in value for an excellent condition device
            </p>
          </div>

          {/* Condition Multipliers */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Condition Multipliers
            </label>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">Excellent Condition:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.excellent_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, excellent_multiplier: parseFloat(e.target.value) || 1 })
                    }
                    className="w-20 px-3 py-1 border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-600">
                    ({(formData.excellent_multiplier * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">Good Condition:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.good_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, good_multiplier: parseFloat(e.target.value) || 0.85 })
                    }
                    className="w-20 px-3 py-1 border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-600">
                    ({(formData.good_multiplier * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">Fair Condition:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.fair_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, fair_multiplier: parseFloat(e.target.value) || 0.70 })
                    }
                    className="w-20 px-3 py-1 border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-600">
                    ({(formData.fair_multiplier * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <span className="text-sm font-medium text-gray-700">Poor Condition:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.poor_multiplier}
                    onChange={(e) =>
                      setFormData({ ...formData, poor_multiplier: parseFloat(e.target.value) || 0.50 })
                    }
                    className="w-20 px-3 py-1 border border-gray-300 rounded text-center"
                  />
                  <span className="text-sm text-gray-600">
                    ({(formData.poor_multiplier * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional notes about this pricing..."
            />
          </div>

          {/* Active Status */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : price ? 'Update Price' : 'Create Price'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TradeInPricingPage;

