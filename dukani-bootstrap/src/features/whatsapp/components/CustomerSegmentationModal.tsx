/**
 * Customer Segmentation Modal - Create and manage customer segments
 */

import React, { useState } from 'react';
import { X, Users, Plus, Save, Filter, Star, TrendingUp, Clock, DollarSign } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectSegment: (segment: Segment) => void;
  savedSegments: Segment[];
}

export interface Segment {
  id: string;
  name: string;
  description: string;
  filters: SegmentFilter[];
  recipientCount?: number;
  dynamic: boolean; // Updates automatically
}

interface SegmentFilter {
  field: string;
  operator: string;
  value: any;
}

export default function CustomerSegmentationModal({ isOpen, onClose, onSelectSegment, savedSegments }: Props) {
  const [view, setView] = useState<'saved' | 'create'>('saved');
  const [newSegmentName, setNewSegmentName] = useState('');
  const [newSegmentDesc, setNewSegmentDesc] = useState('');
  const [filters, setFilters] = useState<SegmentFilter[]>([]);
  const [isDynamic, setIsDynamic] = useState(true);

  if (!isOpen) return null;

  const quickSegments: Segment[] = [
    {
      id: 'vip',
      name: '👑 VIP Customers',
      description: 'Customers with 100+ calls or high purchase value',
      filters: [{ field: 'engagement_level', operator: 'equals', value: 'VIP' }],
      dynamic: true
    },
    {
      id: 'inactive',
      name: '😴 Inactive Customers',
      description: 'No contact in last 30 days',
      filters: [{ field: 'last_contact_days', operator: 'greater_than', value: 30 }],
      dynamic: true
    },
    {
      id: 'new',
      name: '✨ New Customers',
      description: 'Added in last 7 days',
      filters: [{ field: 'created_days', operator: 'less_than', value: 7 }],
      dynamic: true
    },
    {
      id: 'high-spenders',
      name: '💰 High Spenders',
      description: 'Total purchases > $1000',
      filters: [{ field: 'total_spent', operator: 'greater_than', value: 1000 }],
      dynamic: true
    }
  ];

  const addFilter = () => {
    setFilters([...filters, { field: 'total_calls', operator: 'greater_than', value: 0 }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const updateFilter = (index: number, field: keyof SegmentFilter, value: any) => {
    setFilters(filters.map((f, i) => i === index ? { ...f, [field]: value } : f));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Users className="w-8 h-8" />
                Customer Segmentation
              </h2>
              <p className="text-indigo-100">Target the right customers with precision</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* View Tabs */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setView('saved')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'saved' ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Saved Segments
            </button>
            <button
              onClick={() => setView('create')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                view === 'create' ? 'bg-white text-indigo-600 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Create New
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {view === 'saved' ? (
            <div className="space-y-4">
              {/* Quick Segments */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">Quick Segments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {quickSegments.map(segment => (
                    <button
                      key={segment.id}
                      onClick={() => {
                        onSelectSegment(segment);
                        onClose();
                      }}
                      className="text-left p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl hover:shadow-lg transition-all"
                    >
                      <h4 className="font-bold text-gray-900 mb-1">{segment.name}</h4>
                      <p className="text-sm text-gray-600">{segment.description}</p>
                      {segment.dynamic && (
                        <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Auto-updates
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saved Custom Segments */}
              {savedSegments.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3 mt-6">Your Saved Segments</h3>
                  <div className="space-y-2">
                    {savedSegments.map(segment => (
                      <button
                        key={segment.id}
                        onClick={() => {
                          onSelectSegment(segment);
                          onClose();
                        }}
                        className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900">{segment.name}</h4>
                            <p className="text-sm text-gray-600">{segment.description}</p>
                          </div>
                          {segment.recipientCount !== undefined && (
                            <div className="text-right">
                              <div className="text-2xl font-bold text-indigo-600">{segment.recipientCount}</div>
                              <div className="text-xs text-gray-600">recipients</div>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Create New Segment */
            <div className="space-y-6">
              {/* Segment Name */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Segment Name</label>
                <input
                  type="text"
                  value={newSegmentName}
                  onChange={(e) => setNewSegmentName(e.target.value)}
                  placeholder="e.g., High-Value Inactive Customers"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                <input
                  type="text"
                  value={newSegmentDesc}
                  onChange={(e) => setNewSegmentDesc(e.target.value)}
                  placeholder="Brief description of this segment"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Dynamic Segment Toggle */}
              <div className="flex items-center gap-3 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                <input
                  type="checkbox"
                  checked={isDynamic}
                  onChange={(e) => setIsDynamic(e.target.checked)}
                  className="w-5 h-5"
                />
                <div>
                  <label className="font-bold text-gray-900 cursor-pointer">Dynamic Segment</label>
                  <p className="text-sm text-gray-600">Auto-updates as customer data changes</p>
                </div>
              </div>

              {/* Filters */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-gray-900">Filters</label>
                  <button
                    onClick={addFilter}
                    className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Filter
                  </button>
                </div>

                {filters.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl">
                    <Filter className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600">No filters yet. Click "Add Filter" to start.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filters.map((filter, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 bg-gray-50 border-2 border-gray-200 rounded-xl">
                        <select
                          value={filter.field}
                          onChange={(e) => updateFilter(index, 'field', e.target.value)}
                          className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="total_calls">Total Calls</option>
                          <option value="engagement_level">Engagement Level</option>
                          <option value="last_contact_days">Days Since Last Contact</option>
                          <option value="total_spent">Total Spent</option>
                          <option value="created_days">Days Since Created</option>
                        </select>

                        <select
                          value={filter.operator}
                          onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                          className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="equals">Equals</option>
                          <option value="greater_than">Greater Than</option>
                          <option value="less_than">Less Than</option>
                          <option value="contains">Contains</option>
                        </select>

                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, 'value', e.target.value)}
                          placeholder="Value"
                          className="w-32 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                        />

                        <button
                          onClick={() => removeFilter(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <Save className="w-5 h-5" />
                  Save Segment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

