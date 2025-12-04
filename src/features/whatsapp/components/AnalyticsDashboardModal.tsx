/**
 * Analytics Dashboard Modal - Campaign Performance Insights
 * Beautiful charts and metrics for WhatsApp campaigns
 */

import React, { useState, useEffect } from 'react';
import { X, TrendingUp, MessageCircle, Users, DollarSign, BarChart3, Calendar, Download, RefreshCw } from 'lucide-react';
import { analyticsService } from '../../../services/whatsappAdvancedService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnalyticsDashboardModal({ isOpen, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (isOpen) {
      loadAnalytics();
    }
  }, [isOpen, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getDashboard();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">📊 Campaign Analytics</h2>
              <p className="text-purple-100">Performance insights and trends</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadAnalytics}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="mt-4 flex gap-2">
            {[
              { value: '7d', label: 'Last 7 Days' },
              { value: '30d', label: 'Last 30 Days' },
              { value: '90d', label: 'Last 90 Days' },
              { value: 'all', label: 'All Time' }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  timeRange === range.value
                    ? 'bg-white text-purple-600 shadow-lg'
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
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            </div>
          ) : analytics ? (
            <div className="space-y-6">
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={<BarChart3 className="w-6 h-6" />}
                  title="Total Campaigns"
                  value={analytics.overview.total_campaigns}
                  color="blue"
                />
                <StatCard
                  icon={<MessageCircle className="w-6 h-6" />}
                  title="Messages Sent"
                  value={analytics.overview.total_sent}
                  color="green"
                />
                <StatCard
                  icon={<Users className="w-6 h-6" />}
                  title="Success Rate"
                  value={`${((analytics.overview.total_success / analytics.overview.total_sent) * 100 || 0).toFixed(1)}%`}
                  color="purple"
                />
                <StatCard
                  icon={<TrendingUp className="w-6 h-6" />}
                  title="Response Rate"
                  value={`${analytics.overview.avg_response_rate.toFixed(1)}%`}
                  color="orange"
                />
              </div>

              {/* Recent Campaigns */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Recent Campaigns</h3>
                <div className="space-y-3">
                  {analytics.recent_campaigns.length > 0 ? (
                    analytics.recent_campaigns.map((campaign: any) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <h4 className="font-semibold text-gray-900">{campaign.name}</h4>
                          <p className="text-sm text-gray-600">
                            {new Date(campaign.created_at).toLocaleDateString()} • {campaign.sent_count} sent
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">{campaign.success_count}</div>
                          <div className="text-xs text-gray-600">successful</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">No campaigns yet</p>
                  )}
                </div>
              </div>

              {/* Export Button */}
              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
                  <Download className="w-5 h-5" />
                  Export Report (PDF)
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No analytics data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ icon, title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600'
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

