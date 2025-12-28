/**
 * Recipient Segmentation Panel
 * Advanced filtering by customer purchase history, tags, etc.
 */

import React, { useState } from 'react';
import { Filter, TrendingUp, DollarSign, ShoppingCart, Calendar, MapPin, Tag, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { SegmentFilter } from '../utils/recipientSegmentation';

interface Props {
  onApply: (filter: SegmentFilter) => void;
  onClear: () => void;
  currentFilter: SegmentFilter | null;
}

export default function RecipientSegmentationPanel({ onApply, onClear, currentFilter }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<SegmentFilter>(currentFilter || {});

  const handleApply = () => {
    // Validate filter has at least one criteria
    const hasCriteria = 
      filter.minTotalSpent !== undefined ||
      filter.maxTotalSpent !== undefined ||
      filter.minOrders !== undefined ||
      filter.maxOrders !== undefined ||
      filter.daysSinceLastOrder !== undefined ||
      filter.lastPurchaseAmount !== undefined ||
      filter.hasEmail !== undefined ||
      filter.hasAddress !== undefined ||
      filter.customerTags?.length ||
      filter.excludeTags?.length ||
      filter.createdAfter ||
      filter.createdBefore ||
      filter.city ||
      filter.region;

    if (!hasCriteria) {
      toast.error('Please set at least one filter criteria');
      return;
    }

    onApply(filter);
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl hover:border-purple-300 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              <Filter className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-900">Advanced Segmentation</p>
              <p className="text-xs text-gray-600">Filter by purchase history, tags, location...</p>
            </div>
          </div>
          {currentFilter && (
            <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium">
              Active
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Advanced Segmentation</h3>
            <p className="text-sm text-gray-600">Filter recipients by customer data</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="w-8 h-8 flex items-center justify-center bg-white hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Purchase History Filters */}
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-purple-600" />
            Purchase History
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Min Total Spent</label>
              <input
                type="number"
                value={filter.minTotalSpent || ''}
                onChange={(e) => setFilter({ ...filter, minTotalSpent: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Max Total Spent</label>
              <input
                type="number"
                value={filter.maxTotalSpent || ''}
                onChange={(e) => setFilter({ ...filter, maxTotalSpent: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Min Orders</label>
              <input
                type="number"
                value={filter.minOrders || ''}
                onChange={(e) => setFilter({ ...filter, minOrders: e.target.value ? parseInt(e.target.value) : undefined })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Days Since Last Order (Min)</label>
              <input
                type="number"
                value={filter.daysSinceLastOrder?.min || ''}
                onChange={(e) => setFilter({ 
                  ...filter, 
                  daysSinceLastOrder: { 
                    ...filter.daysSinceLastOrder, 
                    min: e.target.value ? parseInt(e.target.value) : undefined 
                  } 
                })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Days Since Last Order (Max)</label>
              <input
                type="number"
                value={filter.daysSinceLastOrder?.max || ''}
                onChange={(e) => setFilter({ 
                  ...filter, 
                  daysSinceLastOrder: { 
                    ...filter.daysSinceLastOrder, 
                    max: e.target.value ? parseInt(e.target.value) : undefined 
                  } 
                })}
                placeholder="No limit"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Customer Attributes */}
        <div className="bg-white p-4 rounded-lg border border-purple-100">
          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-600" />
            Customer Attributes
          </h4>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.hasEmail || false}
                onChange={(e) => setFilter({ ...filter, hasEmail: e.target.checked || undefined })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Has Email Address</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.hasAddress || false}
                onChange={(e) => setFilter({ ...filter, hasAddress: e.target.checked || undefined })}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Has Address</span>
            </label>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Include Tags (comma-separated)</label>
              <input
                type="text"
                value={filter.customerTags?.join(', ') || ''}
                onChange={(e) => setFilter({ 
                  ...filter, 
                  customerTags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : undefined 
                })}
                placeholder="VIP, Premium, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Exclude Tags (comma-separated)</label>
              <input
                type="text"
                value={filter.excludeTags?.join(', ') || ''}
                onChange={(e) => setFilter({ 
                  ...filter, 
                  excludeTags: e.target.value ? e.target.value.split(',').map(t => t.trim()).filter(Boolean) : undefined 
                })}
                placeholder="Do Not Contact, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">City</label>
              <input
                type="text"
                value={filter.city || ''}
                onChange={(e) => setFilter({ ...filter, city: e.target.value || undefined })}
                placeholder="Dar es Salaam"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600 mb-1 block">Region</label>
              <input
                type="text"
                value={filter.region || ''}
                onChange={(e) => setFilter({ ...filter, region: e.target.value || undefined })}
                placeholder="Dar es Salaam"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleApply}
          className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Apply Filter
        </button>
        {currentFilter && (
          <button
            onClick={() => {
              setFilter({});
              onClear();
              setIsOpen(false);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Clear Filter
          </button>
        )}
        <button
          onClick={() => setIsOpen(false)}
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
