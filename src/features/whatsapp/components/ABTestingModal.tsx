/**
 * A/B Testing Modal - Test message variants before full send
 */

import React, { useState } from 'react';
import { X, Zap, Copy, Plus, Trash2, TrendingUp, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateTest: (test: ABTest) => void;
}

interface ABTest {
  name: string;
  variants: Array<{
    id: string;
    name: string;
    message: string;
    mediaUrl?: string;
  }>;
  testSize: number; // percentage 1-50
  metric: 'response_rate' | 'click_rate' | 'conversion_rate';
}

export default function ABTestingModal({ isOpen, onClose, onCreateTest }: Props) {
  const [testName, setTestName] = useState('');
  const [variants, setVariants] = useState<ABTest['variants']>([
    { id: 'A', name: 'Variant A', message: '' },
    { id: 'B', name: 'Variant B', message: '' }
  ]);
  const [testSize, setTestSize] = useState(10);
  const [metric, setMetric] = useState<ABTest['metric']>('response_rate');

  if (!isOpen) return null;

  const addVariant = () => {
    const nextId = String.fromCharCode(65 + variants.length); // A, B, C, D...
    setVariants([...variants, { id: nextId, name: `Variant ${nextId}`, message: '' }]);
  };

  const removeVariant = (id: string) => {
    if (variants.length > 2) {
      setVariants(variants.filter(v => v.id !== id));
    }
  };

  const updateVariant = (id: string, field: 'message' | 'name', value: string) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleCreate = () => {
    if (!testName || variants.some(v => !v.message)) {
      alert('Please fill in all fields');
      return;
    }

    onCreateTest({
      name: testName,
      variants,
      testSize,
      metric
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Zap className="w-8 h-8" />
                A/B Testing
              </h2>
              <p className="text-orange-100">Test different messages to find what works best</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* How It Works */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
            <h3 className="font-bold text-orange-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              How A/B Testing Works
            </h3>
            <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
              <li>Create 2+ message variants</li>
              <li>Test on small sample (e.g., 10% of recipients)</li>
              <li>System tracks performance automatically</li>
              <li>Winner gets sent to remaining 90%</li>
            </ol>
          </div>

          {/* Test Name */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2">Test Name</label>
            <input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g., Summer Sale Message Test"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-900">Message Variants</label>
              <button
                onClick={addVariant}
                disabled={variants.length >= 5}
                className="flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Variant
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((variant, index) => (
                <div key={variant.id} className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                      className="font-bold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-orange-500 focus:outline-none px-2 py-1"
                    />
                    {variants.length > 2 && (
                      <button
                        onClick={() => removeVariant(variant.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    value={variant.message}
                    onChange={(e) => updateVariant(variant.id, 'message', e.target.value)}
                    placeholder="Enter message for this variant..."
                    rows={4}
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Test Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Size */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Test Size: {testSize}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={testSize}
                onChange={(e) => setTestSize(Number(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-gray-600 mt-1">
                Test on {testSize}% of recipients, send winner to remaining {100 - testSize}%
              </p>
            </div>

            {/* Success Metric */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Success Metric</label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value as ABTest['metric'])}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:outline-none"
              >
                <option value="response_rate">Response Rate</option>
                <option value="click_rate">Click Rate</option>
                <option value="conversion_rate">Conversion Rate</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Create A/B Test
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

