/**
 * Trade-In Pricing Management Tab
 * Allows admin to set and manage base trade-in prices for devices
 */

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import type { TradeInPrice, TradeInPriceFormData } from '../../types/tradeIn';
import {
  getTradeInPrices,
  createTradeInPrice,
  updateTradeInPrice,
  deleteTradeInPrice,
} from '../../lib/tradeInApi';
import { format } from '../../lib/format';
import { TradeInPriceModal } from './TradeInPriceModal';

const TradeInPricingTab: React.FC = () => {
  const [prices, setPrices] = useState<TradeInPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPrice, setEditingPrice] = useState<TradeInPrice | null>(null);

  // Load prices
  const loadPrices = async () => {
    setLoading(true);
    const result = await getTradeInPrices({ is_active: showActiveOnly });
    if (result.success && result.data) {
      setPrices(result.data);
    } else {
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
    <div>
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
          isOpen={showModal}
          price={editingPrice}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default TradeInPricingTab;

