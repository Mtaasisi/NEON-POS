/**
 * Scheduled Campaigns Modal
 * View and manage scheduled campaigns
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Calendar, Clock, Play, Trash2, Edit3, AlertCircle,
  CheckCircle, XCircle, Search
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getAllScheduled,
  deleteScheduled,
  cancelScheduled,
  updateScheduledStatus,
  type ScheduledCampaign
} from '../utils/scheduledCampaigns';

interface ScheduledCampaignsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadCampaign: (campaign: ScheduledCampaign) => void;
}

const ScheduledCampaignsModal: React.FC<ScheduledCampaignsModalProps> = ({
  isOpen,
  onClose,
  onLoadCampaign
}) => {
  const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
      // Refresh every 30 seconds to check for pending campaigns
      const interval = setInterval(loadCampaigns, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadCampaigns = () => {
    const loaded = getAllScheduled();
    setCampaigns(loaded);
  };

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         c.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || c.status === filter;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: ScheduledCampaign['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'running':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Play className="w-3 h-3" />
            Running
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Cancelled
          </span>
        );
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) {
      return 'Past due';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `In ${days} day${days !== 1 ? 's' : ''}`;
    if (hours > 0) return `In ${hours} hour${hours !== 1 ? 's' : ''}`;
    return `In ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-orange-600 to-red-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Scheduled Campaigns</h2>
                <p className="text-orange-100 text-sm">Manage campaigns scheduled for later</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search scheduled campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No scheduled campaigns</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery || filter !== 'all' ? 'Try adjusting your filters' : 'Schedule campaigns from the Bulk Send modal'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">{campaign.name}</h3>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(campaign.scheduledFor).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-orange-600 font-medium">
                            {campaign.status === 'pending' ? formatScheduledTime(campaign.scheduledFor) : 'Executed'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          {campaign.selectedRecipients.length} recipients
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {campaign.message.substring(0, 150)}...
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {campaign.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              if (window.confirm('Start this campaign now?')) {
                                onLoadCampaign(campaign);
                                updateScheduledStatus(campaign.id, 'running', new Date().toISOString());
                                onClose();
                              }
                            }}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-1"
                          >
                            <Play className="w-4 h-4" />
                            Start Now
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm('Cancel this scheduled campaign?')) {
                                cancelScheduled(campaign.id);
                                loadCampaigns();
                                toast.success('Campaign cancelled');
                              }
                            }}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {campaign.status !== 'pending' && (
                        <button
                          onClick={() => {
                            deleteScheduled(campaign.id);
                            loadCampaigns();
                            toast.success('Scheduled campaign deleted');
                          }}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredCampaigns.length} scheduled campaign{filteredCampaigns.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ScheduledCampaignsModal;
