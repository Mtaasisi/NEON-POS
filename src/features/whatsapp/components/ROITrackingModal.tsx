/**
 * ROI Tracking Modal - Track campaign ROI and conversions
 */

import React, { useState } from 'react';
import { X, DollarSign, TrendingUp, ShoppingCart, Users, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ROITrackingModal({ isOpen, onClose }: Props) {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');

  if (!isOpen) return null;

  // Mock data
  const roiData = {
    totalSpent: 125.50,
    totalRevenue: 3450.00,
    roi: 2648, // percentage
    conversions: 47,
    conversionRate: 23.5,
    avgOrderValue: 73.40,
    costPerAcquisition: 2.67
  };

  const campaigns = [
    { id: 'campaign1', name: 'Summer Sale 2024', spent: 45.20, revenue: 1250.00, conversions: 18 },
    { id: 'campaign2', name: 'New Product Launch', spent: 35.80, revenue: 890.50, conversions: 12 },
    { id: 'campaign3', name: 'Customer Re-engagement', spent: 44.50, revenue: 1309.50, conversions: 17 }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <DollarSign className="w-8 h-8" />
                ROI & Conversion Tracking
              </h2>
              <p className="text-emerald-100">Measure campaign profitability</p>
            </div>
            <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters */}
          <div className="mt-4 flex gap-2">
            {[
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setDateRange(range.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  dateRange === range.value
                    ? 'bg-white text-emerald-600 shadow-lg'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={<TrendingUp className="w-6 h-6" />}
              label="Total ROI"
              value={`${roiData.roi}%`}
              trend="+145%"
              color="emerald"
            />
            <MetricCard
              icon={<DollarSign className="w-6 h-6" />}
              label="Revenue"
              value={`$${roiData.totalRevenue.toFixed(2)}`}
              trend="+32%"
              color="green"
            />
            <MetricCard
              icon={<ShoppingCart className="w-6 h-6" />}
              label="Conversions"
              value={roiData.conversions}
              trend="+18%"
              color="blue"
            />
            <MetricCard
              icon={<Users className="w-6 h-6" />}
              label="Conv. Rate"
              value={`${roiData.conversionRate}%`}
              trend="+5%"
              color="purple"
            />
          </div>

          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">${roiData.totalSpent.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">${roiData.avgOrderValue.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Cost Per Acquisition</p>
              <p className="text-2xl font-bold text-gray-900">${roiData.costPerAcquisition.toFixed(2)}</p>
            </div>
          </div>

          {/* Campaign Performance */}
          <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Campaign Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">Campaign</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Spent</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Revenue</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">Conversions</th>
                    <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => {
                    const roi = ((campaign.revenue - campaign.spent) / campaign.spent * 100).toFixed(0);
                    return (
                      <tr key={campaign.id} className="border-t border-gray-200 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{campaign.name}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">${campaign.spent.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-green-600">${campaign.revenue.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{campaign.conversions}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">
                            +{roi}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              <Download className="w-5 h-5" />
              Export ROI Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend: string;
  color: 'emerald' | 'green' | 'blue' | 'purple';
}

function MetricCard({ icon, label, value, trend, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm font-medium text-green-600">{trend}</p>
    </div>
  );
}

