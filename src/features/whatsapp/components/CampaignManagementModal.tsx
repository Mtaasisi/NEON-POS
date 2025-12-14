import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Eye, Trash2, RefreshCw, Clock, History,
  ChevronDown, Download, Filter, Calendar, TrendingUp, Users,
  CheckCircle, XCircle, Loader, AlertTriangle, Activity,
  Send, Pause, StopCircle, Play, MessageSquare, CheckCheck,
  BarChart3, Edit3, Copy, CheckSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import type { WhatsAppCampaign } from '../../../types/whatsapp-advanced';

interface CampaignProgress {
  current: number;
  total: number;
  success: number;
  failed: number;
}

interface Campaign {
  id: string;
  name: string;
  status: 'paused' | 'completed' | 'stopped' | 'failed' | 'active' | 'pending' | 'draft' | 'sending';
  timestamp: string;
  pauseTimestamp?: string;
  selectedRecipients: string[];
  sentPhones?: string[];
  bulkMessage: string;
  bulkMessageType: string;
  bulkMedia?: any;
  bulkProgress: CampaignProgress;
  usePersonalization?: boolean;
  randomDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
  source: 'database' | 'localStorage';
  dbCampaign?: WhatsAppCampaign; // Store the original DB campaign if from database
}

interface CurrentActiveCampaign {
  name: string;
  status: 'active' | 'paused' | 'stopped';
  selectedRecipients: string[];
  sentPhones: string[];
  bulkMessage: string;
  bulkMessageType: string;
  bulkMedia?: any;
  bulkProgress: CampaignProgress;
  usePersonalization?: boolean;
  randomDelay?: boolean;
  minDelay?: number;
  maxDelay?: number;
  timestamp: string;
}

interface CampaignManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentActiveCampaign?: CurrentActiveCampaign;
  onResumeCampaign?: (campaign: Campaign) => void;
  onViewCampaign?: (campaign: Campaign) => void;
  onDeleteCampaign?: (campaignId: string) => void;
  onClone?: (campaign: WhatsAppCampaign) => void;
}

const CampaignManagementModal: React.FC<CampaignManagementModalProps> = ({
  isOpen,
  onClose,
  currentActiveCampaign,
  onResumeCampaign,
  onViewCampaign,
  onDeleteCampaign,
  onClone
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  
  // State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paused' | 'completed' | 'stopped' | 'failed' | 'active'>('all');
  const [sortBy, setSortBy] = useState<'timestamp' | 'name' | 'progress'>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'database' | 'localStorage'>('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedCampaignForDetails, setSelectedCampaignForDetails] = useState<Campaign | null>(null);

  // Load campaigns from both database and localStorage
  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const loadedCampaigns: Campaign[] = [];
      
      // 1. Load campaigns from database
      try {
        const dbCampaigns = await whatsappAdvancedService.campaign.getAll(100);
        console.log(`📊 Loaded ${dbCampaigns.length} campaigns from database`);
        
        dbCampaigns.forEach(dbCampaign => {
          const totalRecipients = dbCampaign.recipients_data?.length || dbCampaign.total_recipients || 0;
          const sentCount = dbCampaign.sent_count || 0;
          const successCount = dbCampaign.success_count || 0;
          const failedCount = sentCount - successCount;
          
          loadedCampaigns.push({
            id: `db_${dbCampaign.id}`,
            name: dbCampaign.name,
            status: (dbCampaign.status as any) || 'pending',
            timestamp: dbCampaign.created_at,
            selectedRecipients: dbCampaign.recipients_data?.map((r: any) => r.phone) || [],
            sentPhones: [], // DB campaigns are completed, all sent
            bulkMessage: dbCampaign.message,
            bulkMessageType: dbCampaign.message_type || 'text',
            bulkProgress: {
              current: sentCount,
              total: totalRecipients,
              success: successCount,
              failed: failedCount
            },
            source: 'database',
            dbCampaign
          });
        });
      } catch (error) {
        console.error('Error loading database campaigns:', error);
        toast.error('Failed to load database campaigns');
      }
      
      // 2. Load campaigns from localStorage (paused/active campaigns)
      try {
        const keys = Object.keys(localStorage);
        const campaignKeys = keys.filter(key => 
          key.startsWith('whatsapp_paused_campaign') || 
          key.startsWith('whatsapp_campaign_')
        );
        
        console.log(`💾 Found ${campaignKeys.length} campaigns in localStorage`);
        
        campaignKeys.forEach(key => {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const campaign = JSON.parse(data);
              
              // Determine status
              let status: Campaign['status'] = 'paused';
              
              if (campaign.bulkProgress?.current === campaign.bulkProgress?.total && campaign.bulkProgress?.total > 0) {
                status = 'completed';
              } else if (campaign.isStopped) {
                status = 'stopped';
              } else if (campaign.bulkProgress?.failed > campaign.bulkProgress?.success && campaign.bulkProgress?.current > 10) {
                status = 'failed';
              } else if (campaign.isPaused || key.includes('paused')) {
                status = 'paused';
              } else {
                status = 'active';
              }
              
              loadedCampaigns.push({
                id: key,
                name: campaign.campaignName || 'Unnamed Campaign',
                status,
                timestamp: campaign.timestamp || new Date().toISOString(),
                pauseTimestamp: campaign.pauseTimestamp,
                selectedRecipients: campaign.selectedRecipients || [],
                sentPhones: campaign.sentPhones || [],
                bulkMessage: campaign.bulkMessage || '',
                bulkMessageType: campaign.bulkMessageType || 'text',
                bulkMedia: campaign.bulkMedia,
                bulkProgress: campaign.bulkProgress || { current: 0, total: 0, success: 0, failed: 0 },
                usePersonalization: campaign.usePersonalization,
                randomDelay: campaign.randomDelay,
                minDelay: campaign.minDelay,
                maxDelay: campaign.maxDelay,
                source: 'localStorage'
              });
            }
          } catch (error) {
            console.error('Error loading campaign from localStorage:', key, error);
          }
        });
      } catch (error) {
        console.error('Error loading localStorage campaigns:', error);
      }
      
      // 3. Add current active campaign if it exists (from current session)
      if (currentActiveCampaign) {
        console.log('🟢 Adding current active campaign from session');
        loadedCampaigns.unshift({
          id: 'current_active',
          name: currentActiveCampaign.name + ' (Current)',
          status: currentActiveCampaign.status,
          timestamp: currentActiveCampaign.timestamp,
          selectedRecipients: currentActiveCampaign.selectedRecipients,
          sentPhones: currentActiveCampaign.sentPhones,
          bulkMessage: currentActiveCampaign.bulkMessage,
          bulkMessageType: currentActiveCampaign.bulkMessageType,
          bulkMedia: currentActiveCampaign.bulkMedia,
          bulkProgress: currentActiveCampaign.bulkProgress,
          usePersonalization: currentActiveCampaign.usePersonalization,
          randomDelay: currentActiveCampaign.randomDelay,
          minDelay: currentActiveCampaign.minDelay,
          maxDelay: currentActiveCampaign.maxDelay,
          source: 'localStorage'
        });
      }
      
      console.log(`✅ Total campaigns loaded: ${loadedCampaigns.length}`);
      setCampaigns(loadedCampaigns);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCampaigns();
    }
  }, [isOpen, currentActiveCampaign]);

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    let filtered = [...campaigns];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.bulkMessage.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === statusFilter);
    }

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.source === sourceFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'progress':
          aValue = a.bulkProgress.current / a.bulkProgress.total || 0;
          bValue = b.bulkProgress.current / b.bulkProgress.total || 0;
          break;
        default:
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [campaigns, searchQuery, statusFilter, sourceFilter, sortBy, sortOrder]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === 'active').length,
      paused: campaigns.filter(c => c.status === 'paused').length,
      completed: campaigns.filter(c => c.status === 'completed').length,
      stopped: campaigns.filter(c => c.status === 'stopped').length,
      failed: campaigns.filter(c => c.status === 'failed').length,
      database: campaigns.filter(c => c.source === 'database').length,
      localStorage: campaigns.filter(c => c.source === 'localStorage').length
    };
  }, [campaigns]);

  const handleDeleteCampaign = (campaignId: string) => {
    const campaign = campaigns.find(c => c.id === campaignId);
    
    if (campaign?.source === 'database') {
      toast.error('Cannot delete database campaigns from here. Use Campaign History instead.', {
        duration: 5000
      });
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this local campaign? This action cannot be undone.')) {
      try {
        localStorage.removeItem(campaignId);
        setCampaigns(campaigns.filter(c => c.id !== campaignId));
        toast.success('Campaign deleted successfully');
        if (onDeleteCampaign) {
          onDeleteCampaign(campaignId);
        }
      } catch (error) {
        console.error('Error deleting campaign:', error);
        toast.error('Failed to delete campaign');
      }
    }
  };

  const handleResumeCampaign = (campaign: Campaign) => {
    if (onResumeCampaign) {
      onResumeCampaign(campaign);
      onClose();
    }
  };

  const handleCancelCampaign = async (campaign: Campaign) => {
    const canCancel = ['pending', 'sending', 'draft', 'active', 'paused'].includes(campaign.status);
    
    if (!canCancel) {
      toast.error(`Cannot cancel campaign with status: ${campaign.status}`);
      return;
    }

    const confirmMessage = campaign.source === 'database'
      ? `Are you sure you want to cancel "${campaign.name}"? This will stop the campaign and mark it as stopped.`
      : `Are you sure you want to cancel "${campaign.name}"? This will delete the campaign.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      if (campaign.source === 'database') {
        // Cancel database campaign
        const campaignId = campaign.id.replace('db_', '');
        await whatsappAdvancedService.campaign.cancel(campaignId);
        toast.success('Campaign cancelled successfully');
        // Reload campaigns to reflect the change
        loadCampaigns();
      } else {
        // Delete localStorage campaign
        localStorage.removeItem(campaign.id);
        setCampaigns(campaigns.filter(c => c.id !== campaign.id));
        toast.success('Campaign cancelled and deleted');
        if (onDeleteCampaign) {
          onDeleteCampaign(campaign.id);
        }
      }
    } catch (error: any) {
      console.error('Error cancelling campaign:', error);
      toast.error(error.message || 'Failed to cancel campaign');
    }
  };

  const handleCloneCampaign = async (campaign: Campaign) => {
    if (!campaign.dbCampaign && campaign.source === 'database') {
      // Need to fetch the full campaign data
      try {
        const campaignId = campaign.id.replace('db_', '');
        const dbCampaign = await whatsappAdvancedService.campaign.getById(campaignId);
        if (dbCampaign) {
          const newName = prompt('Enter name for cloned campaign:', `${campaign.name} (Copy)`);
          if (!newName) return;
          
          const cloned = await whatsappAdvancedService.campaign.clone(campaignId, newName);
          toast.success(`Campaign "${newName}" created!`);
          
          if (onClone) {
            onClone(cloned);
            onClose();
          }
        }
      } catch (error) {
        toast.error('Clone failed');
      }
    } else if (campaign.dbCampaign) {
      const newName = prompt('Enter name for cloned campaign:', `${campaign.name} (Copy)`);
      if (!newName) return;
      
      try {
        const cloned = await whatsappAdvancedService.campaign.clone(campaign.dbCampaign.id, newName);
        toast.success(`Campaign "${newName}" created!`);
        
        if (onClone) {
          onClone(cloned);
          onClose();
        }
      } catch (error) {
        toast.error('Clone failed');
      }
    } else {
      toast.error('Cannot clone local campaigns. Only database campaigns can be cloned.');
    }
  };

  const getStatusBadge = (status: Campaign['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Activity className="w-3 h-3" />
            Active
          </span>
        );
      case 'paused':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Pause className="w-3 h-3" />
            Paused
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Edit3 className="w-3 h-3" />
            Draft
          </span>
        );
      case 'sending':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1">
            <Send className="w-3 h-3" />
            Sending
          </span>
        );
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Completed
          </span>
        );
      case 'stopped':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1">
            <StopCircle className="w-3 h-3" />
            Stopped
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium flex items-center gap-1">
            {status}
          </span>
        );
    }
  };

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.bulkProgress.total === 0) return 0;
    return Math.round((campaign.bulkProgress.current / campaign.bulkProgress.total) * 100);
  };

  const getRemainingCount = (campaign: Campaign) => {
    // For database campaigns, use bulkProgress data
    if (campaign.source === 'database') {
      return Math.max(0, campaign.bulkProgress.total - campaign.bulkProgress.current);
    }
    // For localStorage campaigns, use sentPhones and selectedRecipients
    const sent = campaign.sentPhones?.length || 0;
    const total = campaign.selectedRecipients?.length || 0;
    return Math.max(0, total - sent);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInHours / 24);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4">
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Campaign Management</h2>
                <p className="text-blue-100 text-sm">View and manage all WhatsApp campaigns</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">Active</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {stats.active}
                <Activity className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">Paused</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {stats.paused}
                <Pause className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">Completed</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {stats.completed}
                <CheckCircle className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">Stopped</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {stats.stopped}
                <StopCircle className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">Failed</p>
              <p className="text-xl font-bold flex items-center gap-1">
                {stats.failed}
                <AlertTriangle className="w-3 h-3" />
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <p className="text-blue-100 text-xs mb-1">DB / Local</p>
              <p className="text-xl font-bold">{stats.database} / {stats.localStorage}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
              <option value="failed">Failed</option>
            </select>

            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sources</option>
              <option value="database">Database ({stats.database})</option>
              <option value="localStorage">Local ({stats.localStorage})</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timestamp">Sort by Date</option>
              <option value="name">Sort by Name</option>
              <option value="progress">Sort by Progress</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>

            {/* Refresh */}
            <button
              onClick={loadCampaigns}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            {/* Bulk Operations Toggle */}
            <button
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedCampaigns(new Set());
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isSelectionMode 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              {isSelectionMode ? 'Cancel' : 'Select'}
            </button>
          </div>
          
          {/* Bulk Actions Bar */}
          {isSelectionMode && selectedCampaigns.size > 0 && (
            <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-purple-900">
                {selectedCampaigns.size} campaign{selectedCampaigns.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const selected = filteredAndSortedCampaigns.filter(c => selectedCampaigns.has(c.id));
                    const deletable = selected.filter(c => c.source === 'localStorage' && c.id !== 'current_active');
                    if (deletable.length > 0) {
                      if (window.confirm(`Delete ${deletable.length} campaign(s)?`)) {
                        deletable.forEach(c => {
                          handleDeleteCampaign(c.id);
                          setSelectedCampaigns(prev => {
                            const next = new Set(prev);
                            next.delete(c.id);
                            return next;
                          });
                        });
                        toast.success(`Deleted ${deletable.length} campaign(s)`);
                      }
                    } else {
                      toast.error('Selected campaigns cannot be deleted');
                    }
                  }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Delete Selected
                </button>
                <button
                  onClick={() => setSelectedCampaigns(new Set())}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Campaign List */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentActiveCampaign && (
            <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-bold text-blue-900">Live Campaign Active</p>
                  <p className="text-sm text-blue-700">
                    Your current campaign "{currentActiveCampaign.name}" is running now
                  </p>
                </div>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredAndSortedCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No campaigns found</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start a bulk WhatsApp campaign to see it here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${
                    campaign.id === 'current_active' 
                      ? 'border-2 border-blue-500 ring-2 ring-blue-200' 
                      : 'border border-gray-200'
                  }`}
                >
                  {/* Campaign Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 flex items-start gap-3">
                        {/* Selection Checkbox */}
                        {isSelectionMode && campaign.id !== 'current_active' && campaign.source === 'localStorage' && (
                          <input
                            type="checkbox"
                            checked={selectedCampaigns.has(campaign.id)}
                            onChange={(e) => {
                              setSelectedCampaigns(prev => {
                                const next = new Set(prev);
                                if (e.target.checked) {
                                  next.add(campaign.id);
                                } else {
                                  next.delete(campaign.id);
                                }
                                return next;
                              });
                            }}
                            className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="font-bold text-gray-900 text-lg">{campaign.name}</h3>
                          {campaign.id === 'current_active' && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium flex items-center gap-1 animate-pulse">
                              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                              LIVE NOW
                            </span>
                          )}
                          {getStatusBadge(campaign.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            campaign.source === 'database' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {campaign.source === 'database' ? '☁️ Database' : '💾 Local'}
                          </span>
                        </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(campaign.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {campaign.selectedRecipients.length} recipients
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-4 h-4" />
                            {campaign.bulkMessageType}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        {campaign.id === 'current_active' ? (
                          <button
                            onClick={() => {
                              onClose();
                              toast.success('Showing live campaign in minimized view');
                            }}
                            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                            title="View live campaign"
                          >
                            <Activity className="w-4 h-4" />
                            View Live
                          </button>
                        ) : (
                          <>
                            {campaign.status === 'paused' && campaign.source === 'localStorage' && (
                              <button
                                onClick={() => handleResumeCampaign(campaign)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                title="Resume campaign"
                              >
                                <Play className="w-4 h-4" />
                                Resume
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedCampaign(expandedCampaign === campaign.id ? null : campaign.id)}
                              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              {expandedCampaign === campaign.id ? 'Hide' : 'View'}
                            </button>
                            {campaign.source === 'database' && campaign.dbCampaign && (
                              <>
                                <button
                                  onClick={() => handleCloneCampaign(campaign)}
                                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                  title="Clone campaign"
                                >
                                  <Copy className="w-4 h-4" />
                                  Clone
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const blob = await whatsappAdvancedService.analytics.exportCampaign(campaign.dbCampaign!.id);
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = `campaign-${campaign.name}-${new Date().toISOString().split('T')[0]}.csv`;
                                      a.click();
                                      toast.success('Campaign exported!');
                                    } catch (error) {
                                      toast.error('Export failed');
                                    }
                                  }}
                                  className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-sm font-medium"
                                  title="Export campaign data"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {campaign.id !== 'current_active' && (
                              <button
                                onClick={() => handleDeleteCampaign(campaign.id)}
                                className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                                  campaign.source === 'database'
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                                title={campaign.source === 'database' ? 'Cannot delete database campaigns' : 'Delete campaign'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2 text-sm">
                        <span className="font-medium text-gray-700">Progress</span>
                        <span className="font-bold text-blue-600">
                          {campaign.bulkProgress.current || 0} / {campaign.bulkProgress.total || 0} ({getProgressPercentage(campaign)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-3 transition-all duration-300 ${
                            campaign.status === 'completed' ? 'bg-green-500' :
                            campaign.status === 'failed' ? 'bg-red-500' :
                            campaign.status === 'stopped' ? 'bg-orange-500' :
                            'bg-blue-500'
                          }`}
                          style={{ width: `${getProgressPercentage(campaign)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-700 mb-1">Successful</p>
                        <p className="text-lg font-bold text-green-600 flex items-center gap-1">
                          <CheckCheck className="w-4 h-4" />
                          {campaign.bulkProgress.success || 0}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3">
                        <p className="text-xs text-red-700 mb-1">Failed</p>
                        <p className="text-lg font-bold text-red-600 flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          {campaign.bulkProgress.failed || 0}
                        </p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs text-blue-700 mb-1">Remaining</p>
                        <p className="text-lg font-bold text-blue-600 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {getRemainingCount(campaign)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedCampaign === campaign.id && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      {campaign.id === 'current_active' && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium">
                            🔴 This campaign is currently running in your session
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Real-time progress is shown below
                          </p>
                        </div>
                      )}
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Campaign Details
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Message Type</p>
                          <p className="font-medium text-gray-900">{campaign.bulkMessageType}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Personalization</p>
                          <p className="font-medium text-gray-900">
                            {campaign.usePersonalization ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Random Delay</p>
                          <p className="font-medium text-gray-900">
                            {campaign.randomDelay ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                        {campaign.randomDelay && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Delay Range</p>
                            <p className="font-medium text-gray-900">
                              {campaign.minDelay}s - {campaign.maxDelay}s
                            </p>
                          </div>
                        )}
                        {campaign.pauseTimestamp && (
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Paused At</p>
                            <p className="font-medium text-gray-900">
                              {formatDate(campaign.pauseTimestamp)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">Message Preview</p>
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-900 whitespace-pre-wrap line-clamp-3">
                            {campaign.bulkMessage}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {campaign.status === 'paused' && campaign.source === 'localStorage' && (
                          <button
                            onClick={() => handleResumeCampaign(campaign)}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium"
                          >
                            <Activity className="w-4 h-4" />
                            Resume Campaign
                          </button>
                        )}
                        {campaign.source === 'database' && campaign.dbCampaign && (
                          <>
                            <button
                              onClick={() => handleCloneCampaign(campaign)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
                            >
                              <Copy className="w-4 h-4" />
                              Clone
                            </button>
                            <button
                              onClick={() => setSelectedCampaignForDetails(campaign)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 font-medium"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                          </>
                        )}
                        {campaign.source === 'database' && !campaign.dbCampaign && (
                          <div className="flex-1 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-center text-sm font-medium">
                            ☁️ Completed campaign from database
                          </div>
                        )}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(campaign.bulkMessage);
                            toast.success('Message copied to clipboard');
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Message
                        </button>
                        {['pending', 'sending', 'draft', 'active', 'paused'].includes(campaign.status) && (
                          <button
                            onClick={() => handleCancelCampaign(campaign)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 font-medium"
                          >
                            <StopCircle className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredAndSortedCampaigns.length} of {campaigns.length} campaigns
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Campaign Details Modal */}
      {selectedCampaignForDetails && selectedCampaignForDetails.dbCampaign && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Campaign Details</h3>
                <button
                  onClick={() => setSelectedCampaignForDetails(null)}
                  className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <h4 className="text-2xl font-bold text-gray-900 mb-4">{selectedCampaignForDetails.name}</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Message:</label>
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="whitespace-pre-wrap">{selectedCampaignForDetails.bulkMessage}</p>
                  </div>
                </div>

                {selectedCampaignForDetails.dbCampaign.media_url && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Media:</label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-600">Type: {selectedCampaignForDetails.dbCampaign.media_type}</p>
                      <a href={selectedCampaignForDetails.dbCampaign.media_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                        View Media
                      </a>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Status:</label>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                      selectedCampaignForDetails.status === 'completed' ? 'bg-green-100 text-green-700' :
                      selectedCampaignForDetails.status === 'failed' ? 'bg-red-100 text-red-700' :
                      selectedCampaignForDetails.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      selectedCampaignForDetails.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedCampaignForDetails.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Duration:</label>
                    <p className="text-gray-900">
                      {selectedCampaignForDetails.dbCampaign.duration_seconds 
                        ? `${Math.floor(selectedCampaignForDetails.dbCampaign.duration_seconds / 60)}m ${selectedCampaignForDetails.dbCampaign.duration_seconds % 60}s`
                        : 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Performance:</label>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-blue-600">{selectedCampaignForDetails.dbCampaign.sent_count || 0}</p>
                      <p className="text-xs text-gray-600">Sent</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-green-600">{selectedCampaignForDetails.dbCampaign.success_count || 0}</p>
                      <p className="text-xs text-gray-600">Success</p>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-red-600">{selectedCampaignForDetails.dbCampaign.failed_count || 0}</p>
                      <p className="text-xs text-gray-600">Failed</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-purple-600">{selectedCampaignForDetails.dbCampaign.replied_count || 0}</p>
                      <p className="text-xs text-gray-600">Replied</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    handleCloneCampaign(selectedCampaignForDetails);
                    setSelectedCampaignForDetails(null);
                  }}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
                >
                  <Copy className="w-5 h-5" />
                  Clone Campaign
                </button>
                <button
                  onClick={async () => {
                    try {
                      const blob = await whatsappAdvancedService.analytics.exportCampaign(selectedCampaignForDetails.dbCampaign!.id);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `campaign-${selectedCampaignForDetails.name}-${new Date().toISOString().split('T')[0]}.csv`;
                      a.click();
                      toast.success('Campaign exported!');
                    } catch (error) {
                      toast.error('Export failed');
                    }
                  }}
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
    </div>,
    document.body
  );
};

export default CampaignManagementModal;
