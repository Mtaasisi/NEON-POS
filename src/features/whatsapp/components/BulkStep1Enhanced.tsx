/**
 * Bulk WhatsApp Step 1 - Enhanced Recipient Selection
 * Professional, clean UI matching SetPricingModal style
 */

import React, { useRef } from 'react';
import {
  Users, Filter, X, BarChart3, Eye, Upload, CheckCheck,
  RefreshCw, AlertCircle, Database, FolderOpen, Save,
  Search, TrendingUp, Star, Award, Zap, HelpCircle, Phone, ChevronDown,
  Clock, UserX, MessageCircle, User, Download
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import type { Conversation } from '../pages/WhatsAppInboxPage';
import type { BlacklistEntry } from '../../../types/whatsapp-advanced';
import type { SegmentFilter } from '../utils/recipientSegmentation';
import RecipientSegmentationPanel from './RecipientSegmentationPanel';

interface Props {
  // Data
  filteredConversations: Conversation[];
  selectedRecipients: Array<{phone: string, name: string}>;
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
  setSelectedRecipients: (recipients: Array<{phone: string, name: string}>) => void;
  applyQuickFilter: (filter: string) => void;
  clearQuickFilter: () => void;
  handleCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  clearCsvImport: () => void;
  setShowCsvPreviewModal: (show: boolean) => void;
  setShowCsvTooltip: (show: boolean) => void;
  setShowSaveListModal: (show: boolean) => void;
  fileInputKey?: number;
  setShowCustomerImport: (show: boolean) => void;
  setShowImportSection: (show: boolean) => void;
  loadRecipientList: (id: string) => void;
  loadAllCustomers: () => void;
  getInitials: (name: string) => string;
  getEngagementScore: (conversation: Conversation) => { level: string; color: string; score: number };
  isPhoneBlacklisted: (phone: string) => boolean;
  isValidPhone: (phone: string) => boolean;
  
  // Segmentation
  segmentFilter: SegmentFilter | null;
  applySegmentation: (filter: SegmentFilter) => void;
  clearSegmentation: () => void;

  // Navigation
  onNextStep?: () => void;
}

export default function BulkStep1Enhanced(props: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    fileInputKey = 0,
    setShowCustomerImport,
    setShowImportSection,
    loadRecipientList,
    loadAllCustomers,
    getInitials,
    getEngagementScore,
    isPhoneBlacklisted,
    isValidPhone,
    segmentFilter,
    applySegmentation,
    clearSegmentation,
    onNextStep
  } = props;

  // Expose file input reset function
  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Debug logging
  console.log('BulkStep1Enhanced render:', {
    csvFile: csvFile?.name,
    csvRecipientsCount: csvRecipients.length,
    csvUploading,
    condition: csvRecipients.length > 0
  });

  // Local UI state: switch between recent conversations, database customers, and CSV recipients
  const [recipientsSource, setRecipientsSource] = React.useState<'recents' | 'database' | 'csv'>('recents');
  const [dbCustomers, setDbCustomers] = React.useState<Array<{ phone: string; name?: string }>>([]);
  const [loadingDbCustomers, setLoadingDbCustomers] = React.useState(false);

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
    valid: selectedRecipients.filter(recipient => isValidPhone(recipient.phone)).length,
    invalid: selectedRecipients.filter(recipient => !isValidPhone(recipient.phone)).length,
    blacklisted: selectedRecipients.filter(recipient => isPhoneBlacklisted(recipient.phone)).length,
    duplicates: selectedRecipients.length - new Set(selectedRecipients.map(r => r.phone)).size,
    withNames: selectedRecipients.filter(recipient => {
      const conv = filteredConversations.find(c => c.phone === recipient.phone);
      const csvRec = csvRecipients.find(r => r.phone === recipient.phone);
      return (conv?.customer_name && conv.customer_name !== 'Unknown') ||
             (csvRec?.name && csvRec.name !== 'Unknown') ||
             (recipient.name && recipient.name !== 'Unknown');
    }).length,
    fromConversations: selectedRecipients.filter(recipient =>
      filteredConversations.find(c => c.phone === recipient.phone)
    ).length,
    fromCsv: selectedRecipients.filter(recipient =>
      csvRecipients.find(r => r.phone === recipient.phone)
    ).length,
  };

  // Calculate warnings
  const warnings = [];
  if (stats.blacklisted > 0) warnings.push(`${stats.blacklisted} blacklisted numbers will be auto-excluded`);
  if (stats.invalid > 0) warnings.push(`${stats.invalid} invalid phone numbers detected`);
  if (stats.duplicates > 0) warnings.push(`${stats.duplicates} duplicate phone numbers`);
  
  // Check recently contacted
  const recentlyContacted = selectedRecipients.filter(recipient => {
    const conv = filteredConversations.find(c => c.phone === recipient.phone);
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

  // Lazy-load DB customers when the Database tab is selected
  React.useEffect(() => {
    if (recipientsSource !== 'database') return;
    if (dbCustomers.length > 0) return; // already loaded

    let mounted = true;
    const loadCustomersInline = async () => {
      try {
        setLoadingDbCustomers(true);
        // Fetch up to 2000 customers (adjust as needed)
        const { data, error } = await supabase
          .from('customers')
          .select('name, phone, whatsapp')
          .limit(2000);

        if (error) throw error;

        const customers: Array<{ phone: string; name?: string }> = [];
        (data || []).forEach((c: any) => {
          const raw = c.whatsapp || c.phone || '';
          const clean = (raw || '').toString().replace(/[\s\-\(\)]/g, '');
          if (clean) {
            customers.push({ phone: clean, name: c.name || 'Unknown' });
          }
        });

        if (mounted) setDbCustomers(customers);
      } catch (err) {
        console.error('Failed to load DB customers inline:', err);
        toast.error('Failed to load database customers');
      } finally {
        if (mounted) setLoadingDbCustomers(false);
      }
    };

    loadCustomersInline();
    return () => { mounted = false; };
  }, [recipientsSource, dbCustomers.length]);

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

      {/* Advanced Segmentation */}
      <RecipientSegmentationPanel
        onApply={applySegmentation}
        onClear={clearSegmentation}
        currentFilter={segmentFilter}
      />

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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">CSV File</label>
                <button
                  onClick={() => {
                    // Create and download a sample CSV template
                    const csvContent = 'Name,Phone\nJohn Doe,+255700000001\nJane Smith,+255700000002\n';
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'whatsapp-recipients-template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                  title="Download CSV template"
                >
                  <Download className="w-3 h-3" />
                  Template
                </button>
              </div>
              <div className="space-y-2">
                {/* Always visible Choose CSV button */}
                <label
                  htmlFor="csv-file-input"
                  className="cursor-pointer block"
                  onClick={() => console.log('CSV button clicked, disabled:', csvUploading || bulkSending)}
                >
                  <input
                    ref={fileInputRef}
                    id="csv-file-input"
                    type="file"
                    accept=".csv"
                    key={`csv-input-${fileInputKey}`} // Force re-render when key changes
                    onChange={(e) => {
                      console.log('CSV file selected:', e.target.files?.[0]);
                      if (handleCsvUpload) {
                        handleCsvUpload(e);
                      } else {
                        console.error('handleCsvUpload function not provided');
                      }
                    }}
                    disabled={csvUploading || bulkSending}
                    className="hidden"
                  />
                  <div className={`px-4 py-3 rounded-xl transition-all flex items-center justify-center gap-2 font-medium ${
                    csvUploading || bulkSending
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                  }`}>
                    <Upload className="w-5 h-5" />
                    Choose CSV
                  </div>
                </label>

                {/* CSV Status Display - only show when there's something to display */}
                {(csvUploading || csvRecipients.length > 0 || csvFile) && (
                  <div className={`px-4 py-3 bg-gray-100 text-gray-700 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center gap-2 font-medium ${
                    csvRecipients.length > 0 ? 'flex-col' : 'flex-row'
                  }`}>
                    {csvUploading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Processing...
                      </>
                    ) : csvRecipients.length > 0 ? (
                      <div className="w-full text-center py-1">
                        <div className="flex items-center justify-center gap-2 mb-2">
                          <CheckCheck className="w-4 h-4 text-green-600" />
                          <span className="font-medium">{csvRecipients.length} Recipients Loaded</span>
                        </div>
                        <div className="text-xs opacity-75 space-y-1">
                          {csvRecipients.slice(0, 2).map((r, i) => (
                            <div key={i} className="truncate">
                              {r.name || 'Unknown'} • {r.phone}
                            </div>
                          ))}
                          {csvRecipients.length > 2 && (
                            <div>+{csvRecipients.length - 2} more...</div>
                          )}
                        </div>
                      </div>
                    ) : csvFile ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Processing {csvFile.name}...
                      </>
                    ) : null}
                  </div>
                )}

                {/* CSV Recipients Actions */}
                {csvRecipients.length > 0 && !csvUploading && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCsvPreviewModal(true)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
                      title="Preview and edit CSV recipients"
                    >
                      <Eye className="w-4 h-4" />
                      Preview ({csvRecipients.length})
                    </button>
                    <button
                      onClick={clearCsvImport}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center font-medium text-sm"
                      title="Clear CSV import"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* CSV Format Help */}
                {!csvFile && !csvUploading && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-lg">
                    <p className="font-medium mb-1">CSV Format:</p>
                    <p>• First row: headers (optional)</p>
                    <p>• Columns: Name, Phone (or Phone, Name)</p>
                    <p>• Phone format: +255XXXXXXXXX or 255XXXXXXXXX</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Import from Database (removed per request) */}
          </div>
        )}
      </div>

      {/* Recipient List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          {/* Tabs: Recents vs Database */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRecipientsSource('recents')}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm ${recipientsSource === 'recents' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
              >
                Recents
              </button>
              <button
                onClick={() => {
                  setRecipientsSource('database');
                  // trigger parent to load customers (opens DB import modal elsewhere)
                  try {
                    loadAllCustomers();
                  } catch (e) {
                    // noop
                  }
                }}
                className={`px-3 py-1.5 rounded-lg font-medium text-sm ${recipientsSource === 'database' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
              >
                Database
              </button>
              {csvRecipients.length > 0 && (
                <button
                  onClick={() => setRecipientsSource('csv')}
                  className={`px-3 py-1.5 rounded-lg font-medium text-sm ${recipientsSource === 'csv' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 hover:bg-gray-50'}`}
                >
                  CSV ({csvRecipients.length})
                </button>
              )}
            </div>

            <label className="block text-sm font-medium text-gray-700 ml-4">
              {sentPhones.length > 0 ? 'Pending Recipients' : 'Recipients'} ({selectedRecipients.length} selected)
              {recipientsSource === 'csv' && ` • ${csvRecipients.length} from CSV`}
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                let visibleList: Array<{ phone: string; name?: string }> = [];
                if (recipientsSource === 'recents') {
                  visibleList = searchFilteredConversations;
                } else if (recipientsSource === 'database') {
                  visibleList = dbCustomers;
                } else if (recipientsSource === 'csv') {
                  visibleList = csvRecipients;
                }
                setSelectedRecipients(visibleList.filter(c => !isPhoneBlacklisted(c.phone)).map(c => {
                  // Handle different data structures
                  const name = (c as any).name || (c as any).customer_name || 'Unknown';
                  return {phone: c.phone, name};
                }));
              }}
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
          {recipientsSource === 'csv' ? (
            // CSV Recipients view
            csvRecipients.length === 0 ? (
              <div className="text-center py-8">
                <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No CSV recipients uploaded</p>
                <p className="text-xs text-gray-400 mt-1">Upload a CSV file to see recipients here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {csvRecipients.map((recipient, index) => {
                  const isBlacklisted = isPhoneBlacklisted(recipient.phone);
                  const isInvalid = !isValidPhone(recipient.phone);
                  return (
                    <label
                      key={`${recipient.phone}-${index}`}
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
                        checked={selectedRecipients.some(r => r.phone === recipient.phone)}
                        onChange={(e) => {
                          if (isBlacklisted) {
                            toast.error('Cannot select blacklisted number');
                            return;
                          }

                          if (e.target.checked) {
                            setSelectedRecipients(prev => [...prev, {phone: recipient.phone, name: recipient.name || 'Unknown'}]);
                          } else {
                            setSelectedRecipients(prev => prev.filter(r => r.phone !== recipient.phone));
                          }
                        }}
                        disabled={bulkSending || isBlacklisted}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />

                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                        isBlacklisted ? 'bg-gray-400' : 'bg-green-600'
                      }`}>
                        {recipient.name ? getInitials(recipient.name) : <User className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {recipient.name || 'Unknown'}
                          </p>
                          {isBlacklisted && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium flex-shrink-0">
                              Blocked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono">{recipient.phone}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )
          ) : recipientsSource === 'recents' ? (
            searchFilteredConversations.length === 0 ? (
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
                      checked={selectedRecipients.some(r => r.phone === conversation.phone)}
                      onChange={(e) => {
                        if (isBlacklisted) {
                          toast.error('Cannot select blacklisted number');
                          return;
                        }

                        if (e.target.checked) {
                          setSelectedRecipients(prev => [...prev, {phone: conversation.phone, name: conversation.customer_name || 'Unknown'}]);
                        } else {
                          setSelectedRecipients(prev => prev.filter(r => r.phone !== conversation.phone));
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
            )
          ) : (
            // Database customers view
            dbCustomers.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No database customers loaded.</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => {
                      setShowCustomerImport(true);
                      try { loadAllCustomers(); } catch (e) {}
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Open Customer Database
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {dbCustomers.map((cust) => {
                  const isBlacklisted = isPhoneBlacklisted(cust.phone);
                  const isInvalid = !isValidPhone(cust.phone);
                  return (
                    <label
                      key={cust.phone}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all border ${
                        isBlacklisted ? 'bg-red-50 border-red-200 opacity-60 cursor-not-allowed' :
                        isInvalid ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.some(r => r.phone === cust.phone)}
                        onChange={(e) => {
                          if (isBlacklisted) {
                            toast.error('Cannot select blacklisted number');
                            return;
                          }

                          if (e.target.checked) {
                            setSelectedRecipients(prev => [...prev, {phone: cust.phone, name: cust.name || 'Unknown'}]);
                          } else {
                            setSelectedRecipients(prev => prev.filter(r => r.phone !== cust.phone));
                          }
                        }}
                        disabled={bulkSending || isBlacklisted}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${isBlacklisted ? 'bg-gray-400' : 'bg-blue-600'}`}>
                        {cust.name ? getInitials(cust.name) : <User className="w-5 h-5" />}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-semibold text-gray-900 text-sm truncate">{cust.name}</p>
                          {isBlacklisted && (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-medium flex-shrink-0">
                              Blocked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono">{cust.phone}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )
          )}
        </div>

        {/* Next Step Button */}
        {onNextStep && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                if (selectedRecipients.length === 0) {
                  toast.error('Please select at least one recipient');
                  return;
                }
                onNextStep();
              }}
              disabled={selectedRecipients.length === 0 || bulkSending}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Next: Compose Message
              <ChevronDown className="w-5 h-5 rotate-[-90deg]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
