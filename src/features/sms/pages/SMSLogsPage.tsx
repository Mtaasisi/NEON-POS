import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, RefreshCw, Search, X, CheckCircle2, XCircle, Clock, Send, Lightbulb, Edit2, DollarSign, Phone, FileText, Calendar, User, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface SMSLog {
  id: string;
  recipient_phone: string; // Direct from sms_logs table
  message: string;
  status: 'sent' | 'delivered' | 'failed' | 'pending';
  error_message?: string;
  sent_at?: string;
  sent_by?: string;
  created_at: string;
  device_id?: string;
  cost?: number;
}

// Calculate SMS units and character info
const calculateSMSInfo = (message: string) => {
  const charCount = message.length;
  
  // Check if message contains Unicode characters
  const hasUnicode = /[^\x00-\x7F]/.test(message);
  
  // Standard SMS: 160 chars for GSM-7, 70 chars for Unicode
  const charsPerSMS = hasUnicode ? 70 : 160;
  
  // Calculate number of SMS units needed
  const smsUnits = Math.ceil(charCount / charsPerSMS);
  
  return {
    charCount,
    smsUnits,
    charsPerSMS,
    encoding: hasUnicode ? 'Unicode' : 'GSM-7'
  };
};

// Helper function to format numbers with comma separators (matching SetPricingModal)
const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  // Remove .00 for whole numbers
  if (num % 1 === 0) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const SMSLogsPage: React.FC = () => {
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SMSLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pricePerSMS, setPricePerSMS] = useState<number>(() => {
    const saved = localStorage.getItem('sms_price_per_unit');
    return saved ? parseFloat(saved) : 50; // Default 50 TZS per SMS
  });
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [animateStats, setAnimateStats] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchSMSLogs();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSMSLogs = async () => {
    const jobId = startLoading('Loading SMS logs...');
    try {
      setLoading(true);
      setError(null);
      console.log('📡 Fetching SMS logs from all sources...');
      
      // Fetch from sms_logs table
      const { data: smsLogsData, error: smsLogsError } = await supabase
        .from('sms_logs')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📥 SMS logs from sms_logs table:', smsLogsData?.length || 0);

      // Fetch from customer_communications table (SMS type)
      const { data: commData, error: commError } = await supabase
        .from('customer_communications')
        .select('*')
        .eq('type', 'sms')
        .order('created_at', { ascending: false });

      console.log('📥 SMS logs from customer_communications table:', commData?.length || 0);

      // Check for errors
      if (smsLogsError && commError) {
        console.warn('❌ Both tables failed:', { smsLogsError, commError });
        setError('Unable to fetch SMS logs. Please contact your administrator.');
        toast.error('Failed to fetch SMS logs');
        return;
      }

      // Combine and normalize data from both sources
      const allLogs: SMSLog[] = [];

      // Add logs from sms_logs table
      if (smsLogsData) {
        const normalizedSmsLogs = smsLogsData.map(log => ({
          id: log.id,
          recipient_phone: log.recipient_phone,
          message: log.message,
          status: log.status,
          error_message: log.error_message,
          sent_at: log.sent_at,
          sent_by: log.sent_by,
          created_at: log.created_at,
          device_id: log.device_id,
          cost: log.cost
        }));
        allLogs.push(...normalizedSmsLogs);
      }

      // Add logs from customer_communications table
      if (commData) {
        const normalizedCommLogs = commData.map(log => ({
          id: log.id,
          recipient_phone: log.phone_number || 'N/A',
          message: log.message,
          status: log.status,
          error_message: undefined,
          sent_at: log.sent_at,
          sent_by: log.sent_by,
          created_at: log.created_at,
          device_id: undefined,
          cost: undefined
        }));
        allLogs.push(...normalizedCommLogs);
      }

      // Sort by created_at (newest first)
      allLogs.sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateB - dateA;
      });

      console.log('✅ Total SMS logs combined:', allLogs.length);

      // Validate and clean the combined data
      const validLogs = allLogs.filter(log => {
        return log && 
               typeof log.id === 'string' && 
               typeof log.recipient_phone === 'string' && 
               typeof log.message === 'string' &&
               typeof log.status === 'string';
      });

      console.log('🔧 Valid logs after filtering:', validLogs.length);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLogs(validLogs);
        completeLoading(jobId);
      }
    } catch (err: any) {
      // Handle case where entire response object is thrown
      console.log('🚨 Exception caught in fetchSMSLogs:', err);
      
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;
      
      if (err?.error && err?.data !== undefined) {
        const error = err.error;
        console.log('🔍 Extracted error from response object:', error);
        
        if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
          console.warn('⚠️ SMS logs view not configured yet');
          setError('SMS logs database not configured. Please contact your administrator.');
        } else {
          console.warn('❌ SMS logs database error (from thrown response):', error);
          setError(`Database error: ${error.message || 'Unknown database error'}`);
        }
      } else {
        console.warn('❓ Unable to load SMS logs - unexpected error:', err);
        setError(`Unable to load SMS logs. Please try again later.`);
      }
      failLoading(jobId, 'Failed to load SMS logs');
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const filteredLogs = logs.filter(log => {
    // Add safety checks to prevent crashes
    if (!log || !log.recipient_phone || !log.message) {
      return false;
    }
    
    const matchesSearch = (log.recipient_phone || '').includes(searchTerm) || 
                         log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent': return <Send className="w-4 h-4" />;
      case 'delivered': return <CheckCircle2 className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-700 bg-green-100 border border-green-200';
      case 'delivered': return 'text-blue-700 bg-blue-100 border border-blue-200';
      case 'failed': return 'text-red-700 bg-red-100 border border-red-200';
      case 'pending': return 'text-orange-700 bg-orange-100 border border-orange-200';
      default: return 'text-gray-700 bg-gray-100 border border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStats = () => {
    const total = logs.length;
    const sent = logs.filter(log => log && log.status === 'sent').length;
    const delivered = logs.filter(log => log && log.status === 'delivered').length;
    const failed = logs.filter(log => log && log.status === 'failed').length;
    const pending = logs.filter(log => log && log.status === 'pending').length;
    
    // Calculate total cost based on SMS units
    let totalCost = 0;
    let totalSMSUnits = 0;
    
    logs.forEach(log => {
      if (!log || !log.message) return;
      const smsInfo = calculateSMSInfo(log.message);
      totalSMSUnits += smsInfo.smsUnits;
      totalCost += smsInfo.smsUnits * pricePerSMS;
    });

    return { total, sent, delivered, failed, pending, totalCost, totalSMSUnits };
  };

  const stats = getStats();
  
  // Save price per SMS to localStorage when it changes
  const updatePricePerSMS = (newPrice: number) => {
    setPricePerSMS(newPrice);
    localStorage.setItem('sms_price_per_unit', newPrice.toString());
    toast.success(`Price per SMS updated to ${formatPrice(newPrice)} TZS`);
    setAnimateStats(true);
    setTimeout(() => setAnimateStats(false), 600);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-semibold">Loading SMS logs...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading SMS Logs</h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={fetchSMSLogs}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Icon Header - Matching SetPricingModal */}
        <div className="mb-6 bg-white rounded-2xl shadow-xl p-8 border-b border-gray-200">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Stats */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">SMS Logs</h1>
              <p className="text-gray-600 mb-3">View and monitor all SMS activity</p>
              
              {/* Quick Stats Indicator */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">{stats.total} Total</span>
                </div>
                {stats.failed > 0 && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg animate-pulse">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-bold text-red-700">{stats.failed} Failed</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Price per SMS Setting - Matching SetPricingModal style */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DollarSign className="w-6 h-6 text-orange-600" />
              <div className="text-sm font-medium text-gray-700">Price per SMS Unit:</div>
              {showPriceInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formatPrice(pricePerSMS)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setPricePerSMS(numValue);
                    }}
                    className="w-32 px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-bold text-lg"
                    autoFocus
                  />
                  <span className="text-sm text-gray-600 font-semibold">TZS</span>
                  <button
                    onClick={() => {
                      updatePricePerSMS(pricePerSMS);
                      setShowPriceInput(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-semibold shadow-lg transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setPricePerSMS(parseFloat(localStorage.getItem('sms_price_per_unit') || '50'));
                      setShowPriceInput(false);
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 text-sm font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-orange-600">{formatPrice(pricePerSMS)} TZS</span>
                  <button
                    onClick={() => setShowPriceInput(true)}
                    className="flex items-center gap-1 px-3 py-1 text-orange-600 hover:text-orange-800 text-sm font-semibold hover:bg-orange-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span>This price is used to calculate the cost for each SMS based on message length</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards - Matching SetPricingModal style */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-gray-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-gray-900">{formatPrice(stats.total)}</div>
                <div className="text-xs font-medium text-gray-600">Total SMS</div>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-green-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-green-600">{formatPrice(stats.sent)}</div>
                <div className="text-xs font-medium text-gray-600">Sent</div>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-blue-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-blue-600">{formatPrice(stats.delivered)}</div>
                <div className="text-xs font-medium text-gray-600">Delivered</div>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-red-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-red-600">{formatPrice(stats.failed)}</div>
                <div className="text-xs font-medium text-gray-600">Failed</div>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-orange-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-orange-600">{formatPrice(stats.pending)}</div>
                <div className="text-xs font-medium text-gray-600">Pending</div>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-indigo-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-indigo-600">{formatPrice(stats.totalSMSUnits)}</div>
                <div className="text-xs font-medium text-gray-600">SMS Units</div>
              </div>
            </div>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-5 border-2 border-purple-200 transition-all duration-300 ${animateStats ? 'scale-105 shadow-xl' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-2xl font-bold text-purple-600">{formatPrice(stats.totalCost)}</div>
                <div className="text-xs font-medium text-gray-600">Total Cost</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Matching SetPricingModal style */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by phone number or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 font-semibold cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
                <option value="failed">Failed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <button
              onClick={fetchSMSLogs}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
          </div>
        </div>

        {/* SMS Logs List - Expandable Cards like SetPricingModal */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">SMS Activity Logs</h2>
            <p className="text-sm text-gray-600 mt-1">Click on any log to view detailed information</p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12 px-6">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-500 text-lg font-semibold mb-2">No SMS logs found</div>
                <div className="text-gray-400 text-sm">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search filters' 
                    : 'SMS logs will appear here when you send messages'
                  }
                </div>
              </div>
            ) : (
              filteredLogs.map((log) => {
                if (!log || !log.id) return null;
                
                const smsInfo = calculateSMSInfo(log.message || '');
                const calculatedCost = smsInfo.smsUnits * pricePerSMS;
                const isExpanded = expandedItemId === log.id;
                
                return (
                  <div 
                    key={log.id} 
                    className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 m-4 ${
                      isExpanded 
                        ? 'border-blue-500 shadow-xl' 
                        : log.status === 'failed'
                          ? 'border-red-200 hover:border-red-300 hover:shadow-md'
                          : log.status === 'sent' || log.status === 'delivered'
                            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    {/* Log Header - Clickable */}
                    <div 
                      className="flex items-start justify-between p-6 cursor-pointer"
                      onClick={() => setExpandedItemId(isExpanded ? null : log.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                            isExpanded ? 'bg-blue-500' : 'bg-gray-200'
                          }`}>
                            <svg 
                              className={`w-4 h-4 text-white transition-transform duration-200 ${
                                isExpanded ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(log.status || 'unknown')}`}>
                              {getStatusIcon(log.status || 'unknown')}
                              <span className="capitalize">{log.status || 'unknown'}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-900">{log.recipient_phone || 'N/A'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-600">
                              {log.sent_at ? formatDate(log.sent_at) : (log.created_at ? formatDate(log.created_at) : 'N/A')}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">{log.message || 'N/A'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{formatPrice(calculatedCost)} TZS</div>
                          <div className="text-xs text-gray-500">{smsInfo.smsUnits} unit{smsInfo.smsUnits > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-6 pb-6 border-t border-gray-100">
                        {/* Summary Cards */}
                        <div className="bg-white rounded-xl p-4 mb-4 border border-gray-200 shadow-sm">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Characters</p>
                                <p className="text-base font-bold text-orange-600">{smsInfo.charCount}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                                <MessageSquare className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">SMS Units</p>
                                <p className="text-base font-bold text-indigo-600">{smsInfo.smsUnits}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <DollarSign className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Cost</p>
                                <p className="text-base font-bold text-emerald-600">{formatPrice(calculatedCost)} TZS</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500">Encoding</p>
                                <p className="text-sm font-bold text-blue-600">{smsInfo.encoding}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Full Message */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-700 mb-2">Full Message</label>
                          <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-900 whitespace-pre-wrap border border-gray-200">
                            {log.message || 'N/A'}
                          </div>
                        </div>

                        {/* Additional Details */}
                        <div className="grid grid-cols-2 gap-4">
                          {log.sent_by && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Sent By</label>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className="text-sm text-gray-900">{log.sent_by}</span>
                              </div>
                            </div>
                          )}
                          {log.device_id && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Device ID</label>
                              <span className="text-sm text-gray-900">{log.device_id}</span>
                            </div>
                          )}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Created At</label>
                            <span className="text-sm text-gray-900">{log.created_at ? formatDate(log.created_at) : 'N/A'}</span>
                          </div>
                          {log.sent_at && (
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Sent At</label>
                              <span className="text-sm text-gray-900">{formatDate(log.sent_at)}</span>
                            </div>
                          )}
                        </div>

                        {log.error_message && (
                          <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-700 mb-2">Error Message</label>
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                              {log.error_message}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SMS Log Details Modal - Matching SetPricingModal style */}
        {selectedLog && (() => {
          const smsInfo = calculateSMSInfo(selectedLog.message || '');
          const calculatedCost = smsInfo.smsUnits * pricePerSMS;
          
          return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[99999]" role="dialog" aria-modal="true">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
                {/* Close Button */}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Icon Header */}
                <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
                  <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">SMS Details</h3>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(selectedLog.status || 'unknown')}`}>
                        {getStatusIcon(selectedLog.status || 'unknown')}
                        <span className="capitalize">{selectedLog.status || 'unknown'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">

                  <div className="space-y-6">
                    {/* Phone Number */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Phone Number</label>
                      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                        <Phone className="w-5 h-5 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-900">{selectedLog.recipient_phone || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Full Message */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Full Message</label>
                      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-900 whitespace-pre-wrap border border-gray-200">
                        {selectedLog.message || 'N/A'}
                      </div>
                    </div>

                    {/* SMS Analytics Section - Matching SetPricingModal style */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        SMS Analytics
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Characters</p>
                            <p className="text-base font-bold text-orange-600">{smsInfo.charCount}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">SMS Units</p>
                            <p className="text-base font-bold text-indigo-600">{smsInfo.smsUnits}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Encoding</p>
                            <p className="text-sm font-bold text-blue-600">{smsInfo.encoding}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Chars/SMS</p>
                            <p className="text-sm font-bold text-purple-600">{smsInfo.charsPerSMS}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cost Calculation - Matching SetPricingModal style */}
                    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                      <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        Cost Calculation
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600 font-medium">Price per SMS Unit:</span>
                          <span className="text-sm font-bold text-gray-900">{formatPrice(pricePerSMS)} TZS</span>
                        </div>
                        <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-600 font-medium">SMS Units Used:</span>
                          <span className="text-sm font-bold text-gray-900">{smsInfo.smsUnits}</span>
                        </div>
                        <div className="border-t-2 border-emerald-300 pt-3 flex justify-between items-center px-3 py-2 bg-emerald-50 rounded-lg">
                          <span className="text-base font-bold text-gray-900">Total Cost:</span>
                          <span className="text-xl font-bold text-emerald-700">{formatPrice(calculatedCost)} TZS</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Created At</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-900">{selectedLog.created_at ? formatDate(selectedLog.created_at) : 'N/A'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Sent At</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-900">
                            {selectedLog.sent_at ? formatDate(selectedLog.sent_at) : 'Not sent'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(selectedLog.sent_by || selectedLog.device_id) && (
                      <div className="grid grid-cols-2 gap-4">
                        {selectedLog.sent_by && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Sent By</label>
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                              <User className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-900">{selectedLog.sent_by}</span>
                            </div>
                          </div>
                        )}
                        {selectedLog.device_id && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Device ID</label>
                            <div className="px-3 py-2 bg-gray-50 rounded-xl border border-gray-200">
                              <span className="text-sm text-gray-900">{selectedLog.device_id}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedLog.error_message && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-2">Error Message</label>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                          {selectedLog.error_message}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SMSLogsPage;
