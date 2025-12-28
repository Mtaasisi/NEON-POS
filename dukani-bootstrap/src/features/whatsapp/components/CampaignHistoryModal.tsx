/**
 * Campaign History Modal
 * View, clone, export, and analyze past campaigns
 */

import React, { useState, useEffect } from 'react';
import { X, History, Download, Copy, Eye, TrendingUp, BarChart3, Calendar, Users, CheckCheck, XCircle, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import type { WhatsAppCampaign } from '../../../types/whatsapp-advanced';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onClone?: (campaign: WhatsAppCampaign) => void;
}

export default function CampaignHistoryModal({ isOpen, onClose, onClone }: Props) {
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState<WhatsAppCampaign | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen]);

  async function loadCampaigns() {
    try {
      setLoading(true);
      const data = await whatsappAdvancedService.campaign.getAll(50);
      setCampaigns(data);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(campaign: WhatsAppCampaign) {
    try {
      const blob = await whatsappAdvancedService.analytics.exportCampaign(campaign.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-${campaign.name}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast.success('Campaign exported!');
    } catch (error) {
      toast.error('Export failed');
    }
  }

  async function handleClone(campaign: WhatsAppCampaign) {
    try {
      const newName = prompt('Enter name for cloned campaign:', `${campaign.name} (Copy)`);
      if (!newName) return;
      
      const cloned = await whatsappAdvancedService.campaign.clone(campaign.id, newName);
      toast.success(`Campaign "${newName}" created!`);
      
      if (onClone) {
        onClone(cloned);
        onClose();
      }
    } catch (error) {
      toast.error('Clone failed');
    }
  }

  const filteredCampaigns = campaigns.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'completed') return c.status === 'completed';
    if (filter === 'failed') return c.status === 'failed';
    return true;
  }).map(c => ({
    ...c,
    sent_count: c.sent_count || 0,
    success_count: c.success_count || 0,
    failed_count: c.failed_count || 0,
    replied_count: c.replied_count || 0
  }));

  const stats = {
    total: campaigns.length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    failed: campaigns.filter(c => c.status === 'failed').length,
    totalSent: campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0),
    avgSuccessRate: campaigns.length > 0 
      ? (campaigns.reduce((sum, c) => sum + ((c.success_count || 0) / Math.max(c.sent_count || 1, 1) * 100), 0) / campaigns.length).toFixed(1)
      : '0.0'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <History className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Campaign History</h2>
                <p className="text-purple-100">View and manage past campaigns</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Total Sent</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalSent}</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Avg Success</p>
              <p className="text-2xl font-bold text-purple-600">{stats.avgSuccessRate}%</p>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm">
              <p className="text-xs text-gray-600 mb-1">Failed</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({campaigns.length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                filter === 'completed'
                  ? 'bg-green-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({stats.completed})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${
                filter === 'failed'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Failed ({stats.failed})
            </button>
          </div>
        </div>

        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-20">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No campaigns found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          campaign.status === 'completed' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'failed' ? 'bg-red-100 text-red-700' :
                          campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                          campaign.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          campaign.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {campaign.message.length > 150 
                          ? `${campaign.message.substring(0, 150)}...` 
                          : campaign.message}
                      </p>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">
                            {(() => {
                              const date = new Date(campaign.created_at);
                              return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{campaign.total_recipients} recipients</span>
                        </div>
                        {campaign.duration_seconds && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-700">
                              {Math.floor(campaign.duration_seconds / 60)}m {campaign.duration_seconds % 60}s
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => setSelectedCampaign(campaign)}
                        className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-semibold text-sm flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleClone(campaign)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-semibold flex items-center gap-1"
                          title="Clone campaign"
                        >
                          <Copy className="w-3 h-3" />
                          Clone
                        </button>
                        <button
                          onClick={() => handleExport(campaign)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-semibold flex items-center gap-1"
                          title="Export data"
                        >
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campaign Metrics */}
                  <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{campaign.sent_count || 0}</p>
                      <p className="text-xs text-gray-600">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{campaign.success_count || 0}</p>
                      <p className="text-xs text-gray-600">Success</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">{campaign.failed_count || 0}</p>
                      <p className="text-xs text-gray-600">Failed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">{campaign.replied_count || 0}</p>
                      <p className="text-xs text-gray-600">Replied</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Campaign Details</h3>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <h4 className="text-2xl font-bold text-gray-900 mb-4">{selectedCampaign.name}</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message:</label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="whitespace-pre-wrap">{selectedCampaign.message}</p>
                  </div>
                </div>

                {selectedCampaign.media_url && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Media:</label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Type: {selectedCampaign.media_type}</p>
                      <a href={selectedCampaign.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        View Media
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Status:</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      selectedCampaign.status === 'completed' ? 'bg-green-100 text-green-700' :
                      selectedCampaign.status === 'failed' ? 'bg-red-100 text-red-700' :
                      selectedCampaign.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      selectedCampaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedCampaign.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Duration:</label>
                    <p className="text-gray-900">
                      {selectedCampaign.duration_seconds 
                        ? `${Math.floor(selectedCampaign.duration_seconds / 60)}m ${selectedCampaign.duration_seconds % 60}s`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Performance:</label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-blue-600">{selectedCampaign.sent_count || 0}</p>
                      <p className="text-xs text-gray-600">Sent</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-600">{selectedCampaign.success_count || 0}</p>
                      <p className="text-xs text-gray-600">Success</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-600">{selectedCampaign.failed_count || 0}</p>
                      <p className="text-xs text-gray-600">Failed</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-purple-600">{selectedCampaign.replied_count || 0}</p>
                      <p className="text-xs text-gray-600">Replied</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleClone(selectedCampaign)}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Clone Campaign
                </button>
                <button
                  onClick={() => handleExport(selectedCampaign)}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Export Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

