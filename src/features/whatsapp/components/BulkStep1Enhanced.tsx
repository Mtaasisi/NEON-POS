/**
 * Bulk WhatsApp Step 1 - Enhanced Recipient Selection
 * Professional, clean UI matching SetPricingModal style
 */

import React from 'react';
import { 
  Users, Filter, X, BarChart3, Eye, Upload, CheckCheck, 
  RefreshCw, AlertCircle, Database, FolderOpen, Save,
  Search, TrendingUp, Star, Award, Zap, HelpCircle, Phone, ChevronDown,
  Clock, UserX, MessageCircle, User
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { Conversation } from '../pages/WhatsAppInboxPage';
import type { BlacklistEntry } from '../../../types/whatsapp-advanced';

interface Props {
  // Data
  filteredConversations: Conversation[];
  selectedRecipients: string[];
  csvRecipients: Array<{ phone: string; name: string }>;
  blacklist: BlacklistEntry[];
  savedLists: Array<{ id: string; name: string; recipients: string[]; createdAt: string }>;
  sentPhones: string[]; // Track already-sent contacts to hide them
  
  // State
  campaignName: string;
  recipientSearch: string;
  activeQuickFilter: string | null;
  csvFile: File | null;
  csvUploading: boolean;
  showCsvTooltip: boolean;
  showImportSection: boolean;
  
  // Settings
  bulkSending: boolean;
  randomDelay: boolean;
  minDelay: number;
  maxDelay: number;
  usePresence: boolean;
  
  // Handlers
  setCampaignName: (name: string) => void;
  setRecipientSearch: (search: string) => void;
  setSelectedRecipients: (recipients: string[]) => void;
  applyQuickFilter: (filter: string) => void;
  clearQuickFilter: () => void;
  handleCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearCsvImport: () => void;
  setShowCsvPreviewModal: (show: boolean) => void;
  setShowCsvTooltip: (show: boolean) => void;
  setShowSaveListModal: (show: boolean) => void;
  setShowCustomerImport: (show: boolean) => void;
  setShowImportSection: (show: boolean) => void;
  loadRecipientList: (id: string) => void;
  loadAllCustomers: () => void;
  getInitials: (name: string) => string;
  getEngagementScore: (conversation: Conversation) => { level: string; color: string; score: number };
  isPhoneBlacklisted: (phone: string) => boolean;
  isValidPhone: (phone: string) => boolean;
}

export default function BulkStep1Enhanced(props: Props) {
  const {
    filteredConversations,
    selectedRecipients,
    csvRecipients,
    blacklist,
    savedLists,
    sentPhones,
    campaignName,
    recipientSearch,
    activeQuickFilter,
    csvFile,
    csvUploading,
    showCsvTooltip,
    showImportSection,
    bulkSending,
    randomDelay,
    minDelay,
    maxDelay,
    usePresence,
    setCampaignName,
    setRecipientSearch,
    setSelectedRecipients,
    applyQuickFilter,
    clearQuickFilter,
    handleCsvUpload,
    clearCsvImport,
    setShowCsvPreviewModal,
    setShowCsvTooltip,
    setShowSaveListModal,
    setShowCustomerImport,
    setShowImportSection,
    loadRecipientList,
    loadAllCustomers,
    getInitials,
    getEngagementScore,
    isPhoneBlacklisted,
    isValidPhone
  } = props;

  // Filter conversations based on search AND exclude already-sent contacts
  const searchFilteredConversations = filteredConversations.filter(conv => {
    // First, exclude contacts who already received the message
    if (sentPhones.includes(conv.phone)) {
      return false;
    }
    
    // Then apply search filter
    if (!recipientSearch) return true;
    const search = recipientSearch.toLowerCase();
    return (
      conv.customer_name?.toLowerCase().includes(search) ||
      conv.phone?.toLowerCase().includes(search)
    );
  });

  // Calculate statistics
  const stats = {
    total: selectedRecipients.length,
    valid: selectedRecipients.filter(isValidPhone).length,
    invalid: selectedRecipients.filter(p => !isValidPhone(p)).length,
    blacklisted: selectedRecipients.filter(isPhoneBlacklisted).length,
    duplicates: selectedRecipients.length - new Set(selectedRecipients).size,
    withNames: selectedRecipients.filter(phone => {
      const conv = filteredConversations.find(c => c.phone === phone);
      const csvRec = csvRecipients.find(r => r.phone === phone);
      return (conv?.customer_name && conv.customer_name !== 'Unknown') || 
             (csvRec?.name && csvRec.name !== 'Unknown');
    }).length,
    fromConversations: selectedRecipients.filter(phone => 
      filteredConversations.find(c => c.phone === phone)
    ).length,
    fromCsv: selectedRecipients.filter(phone => 
      csvRecipients.find(r => r.phone === phone)
    ).length,
  };

  // Calculate warnings
  const warnings = [];
  if (stats.blacklisted > 0) warnings.push(`${stats.blacklisted} blacklisted numbers will be auto-excluded`);
  if (stats.invalid > 0) warnings.push(`${stats.invalid} invalid phone numbers detected`);
  if (stats.duplicates > 0) warnings.push(`${stats.duplicates} duplicate phone numbers`);
  
  // Check recently contacted
  const recentlyContacted = selectedRecipients.filter(phone => {
    const conv = filteredConversations.find(c => c.phone === phone);
    if (!conv) return false;
    const lastMsg = conv.messages[conv.messages.length - 1];
    if (!lastMsg || lastMsg.type !== 'sent') return false;
    const hoursSince = (Date.now() - new Date(lastMsg.timestamp).getTime()) / (1000 * 60 * 60);
    return hoursSince < 6;
  }).length;
  
  if (recentlyContacted > 0) {
    warnings.push(`${recentlyContacted} contacts messaged in last 6h`);
  }

  // Calculate estimated time
  const estimatedTime = (() => {
    if (selectedRecipients.length === 0) return '0s';
    const avgDelay = randomDelay ? (minDelay + maxDelay) / 2 : minDelay;
    const typingTime = usePresence ? 1.5 : 0;
    const totalSeconds = selectedRecipients.length * (avgDelay + typingTime + 1);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  })();

  return (
    <div>
      {/* Campaign Name */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Campaign Name (Optional)
        </label>
        <input
          type="text"
          value={campaignName}
          onChange={(e) => setCampaignName(e.target.value)}
          placeholder="e.g., Black Friday 2024"
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900"
          title="Name your campaign for tracking and analytics"
        />
      </div>

      {/* Already Sent Info Banner */}
      {sentPhones.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">
                {sentPhones.length} Contact{sentPhones.length !== 1 ? 's' : ''} Already Sent
              </h4>
              <p className="text-sm text-green-700">
                These contacts have been removed from the list below to prevent duplicate messages. Only pending recipients are shown.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Filters */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Filters
        </label>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <button
            onClick={() => applyQuickFilter('inactive')}
            title="Inactive (30+ days)"
            className={`p-3 rounded-lg border transition-all text-center ${
              activeQuickFilter === 'inactive'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            <Clock className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">Inactive</p>
          </button>
          
          <button
            onClick={() => applyQuickFilter('new')}
            title="New (Last 7 days)"
            className={`p-3 rounded-lg border transition-all text-center ${
              activeQuickFilter === 'new'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            <Star className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">New</p>
          </button>
          
          <button
            onClick={() => applyQuickFilter('unreplied')}
            title="Unreplied messages"
            className={`p-3 rounded-lg border transition-all text-center ${
              activeQuickFilter === 'unreplied'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            <MessageCircle className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">Pending</p>
          </button>
          
          <button
            onClick={() => applyQuickFilter('high-engagement')}
            title="High engagement"
            className={`p-3 rounded-lg border transition-all text-center ${
              activeQuickFilter === 'high-engagement'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            <Zap className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">Engaged</p>
          </button>
          
          <button
            onClick={() => applyQuickFilter('never-messaged')}
            title="Never messaged"
            className={`p-3 rounded-lg border transition-all text-center ${
              activeQuickFilter === 'never-messaged'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            <UserX className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">Unsent</p>
          </button>
          
          <button
            onClick={() => applyQuickFilter('all')}
            title="Select all"
            className={`p-3 rounded-lg border transition-all text-center ${
              activeQuickFilter === 'all'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            <CheckCheck className="w-5 h-5 mx-auto mb-1" />
            <p className="text-xs font-medium">All</p>
          </button>
        </div>
        
        {activeQuickFilter && (
          <button
            onClick={clearQuickFilter}
            className="mt-2 text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Clear Filter
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="search"
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* Statistics - Compact */}
      {selectedRecipients.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
              <p className="text-xs text-gray-600">Selected</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
              <p className="text-xs text-gray-600">Valid</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats.withNames}</p>
              <p className="text-xs text-gray-600">Named</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{estimatedTime}</p>
              <p className="text-xs text-gray-600">Time</p>
            </div>
          </div>
        </div>
      )}

      {/* Warnings - Minimal */}
      {warnings.length > 0 && (
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <ul className="space-y-1 text-sm text-yellow-800">
                {warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Import Section - Collapsible */}
      <div className="mb-6">
        <button
          onClick={() => setShowImportSection(!showImportSection)}
          className="w-full flex items-center justify-between p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all border border-gray-200"
          title="Import recipients from CSV or database"
        >
          <span className="font-medium text-gray-900 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import Recipients
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-600 transition-transform ${showImportSection ? 'rotate-180' : ''}`} />
        </button>
        
        {showImportSection && (
          <div className="mt-2 p-4 bg-white border border-gray-200 rounded-xl space-y-3">
            {/* CSV Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={csvUploading || bulkSending}
                  className="hidden"
                />
                <div className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 font-medium">
                  {csvUploading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : csvFile ? (
                    <>
                      <CheckCheck className="w-5 h-5" />
                      {csvFile.name}
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      Choose CSV
                    </>
                  )}
                </div>
              </label>
            </div>
            
            {/* Import from Database */}
            <button
              onClick={() => {
                setShowCustomerImport(true);
                loadAllCustomers();
              }}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-medium flex items-center justify-center gap-2"
            >
              <Database className="w-5 h-5" />
              Customer Database
            </button>
          </div>
        )}
      </div>

      {/* Recipient List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {sentPhones.length > 0 ? 'Pending Recipients' : 'Recipients'} ({selectedRecipients.length} selected)
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedRecipients(searchFilteredConversations.filter(c => !isPhoneBlacklisted(c.phone)).map(c => c.phone))}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Select All
            </button>
            <button
              onClick={() => setSelectedRecipients([])}
              className="text-sm px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
            >
              Clear
            </button>
          </div>
        </div>
        
        <div className="max-h-96 overflow-y-auto border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
          {searchFilteredConversations.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No recipients match your search</p>
            </div>
          ) : (
            <div className="space-y-2">
              {searchFilteredConversations.map((conversation) => {
                const isBlacklisted = isPhoneBlacklisted(conversation.phone);
                const engagement = getEngagementScore(conversation);
                const isInvalid = !isValidPhone(conversation.phone);
                
                return (
                  <label
                    key={conversation.phone}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                      isBlacklisted 
                        ? 'bg-red-50 border-red-200 opacity-60 cursor-not-allowed'
                        : isInvalid
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.includes(conversation.phone)}
                      onChange={(e) => {
                        if (isBlacklisted) {
                          toast.error('Cannot select blacklisted number');
                          return;
                        }
                        
                        if (e.target.checked) {
                          setSelectedRecipients(prev => [...prev, conversation.phone]);
                        } else {
                          setSelectedRecipients(prev => prev.filter(p => p !== conversation.phone));
                        }
                      }}
                      disabled={bulkSending || isBlacklisted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      isBlacklisted ? 'bg-gray-400' : 'bg-blue-600'
                    }`}>
                      {conversation.customer_name ? getInitials(conversation.customer_name) : <User className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900 text-sm truncate">
                          {conversation.customer_name}
                        </p>
                        {isBlacklisted && (
                          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium flex-shrink-0">
                            Blocked
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <Phone className="w-3 h-3" />
                        <span className="font-mono">{conversation.phone}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
