import React, { useState, useEffect, useRef } from 'react';
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
      case 'sent': return '✅';
      case 'delivered': return '📨';
      case 'failed': return '❌';
      case 'pending': return '⏳';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'delivered': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
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
    toast.success(`Price per SMS updated to ${newPrice} TZS`);
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading SMS Logs</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={fetchSMSLogs}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Logs</h1>
          <p className="text-gray-600">View and monitor all SMS activity</p>
        </div>

        {/* Price per SMS Setting */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm font-medium text-gray-700">Price per SMS Unit:</div>
              {showPriceInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={pricePerSMS}
                    onChange={(e) => setPricePerSMS(parseFloat(e.target.value) || 0)}
                    className="w-24 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                  <span className="text-sm text-gray-600">TZS</span>
                  <button
                    onClick={() => {
                      updatePricePerSMS(pricePerSMS);
                      setShowPriceInput(false);
                    }}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setPricePerSMS(parseFloat(localStorage.getItem('sms_price_per_unit') || '50'));
                      setShowPriceInput(false);
                    }}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-600">{pricePerSMS} TZS</span>
                  <button
                    onClick={() => setShowPriceInput(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    ✏️ Edit
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              💡 This price is used to calculate the cost for each SMS based on message length
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total SMS</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.delivered}</div>
            <div className="text-sm text-gray-600">Delivered</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-indigo-600">{stats.totalSMSUnits}</div>
            <div className="text-sm text-gray-600">SMS Units</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">{(Number(stats.totalCost) || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Cost (TZS)</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by phone number or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* SMS Logs Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chars / Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log) => {
                  if (!log || !log.id) return null;
                  
                  const smsInfo = calculateSMSInfo(log.message || '');
                  const calculatedCost = smsInfo.smsUnits * pricePerSMS;
                  
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(log.status || 'unknown')}`}>
                          {getStatusIcon(log.status || 'unknown')} {log.status || 'unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.recipient_phone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {log.message || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{smsInfo.charCount} chars</span>
                          <span className="text-xs text-gray-500">{smsInfo.smsUnits} unit{smsInfo.smsUnits > 1 ? 's' : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.sent_at ? formatDate(log.sent_at) : (log.created_at ? formatDate(log.created_at) : 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{calculatedCost} TZS</span>
                          <span className="text-xs text-gray-500">{smsInfo.encoding}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">No SMS logs found</div>
              <div className="text-gray-400 text-sm mt-2">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search filters' 
                  : 'SMS logs will appear here when you send messages'
                }
              </div>
              {!searchTerm && statusFilter === 'all' && (
                <div className="mt-4">
                  <button
                    onClick={async () => {
                      try {
                        // Insert a test SMS log entry
                        const { data, error } = await supabase
                          .from('sms_logs')
                          .insert({
                            recipient_phone: '255700000000',
                            message: 'Test SMS from SMS logs page - ' + new Date().toLocaleTimeString(),
                            status: 'sent',
                            sent_at: new Date().toISOString(),
                            created_at: new Date().toISOString()
                          })
                          .select()
                          .single();

                        if (error) {
                          console.error('Error creating test SMS log:', error);
                          toast.error('Failed to create test log');
                        } else {
                          console.log('✅ Test SMS log created:', data);
                          toast.success('Test SMS log created!');
                          fetchSMSLogs(); // Refresh the logs
                        }
                      } catch (err) {
                        console.error('Error:', err);
                        toast.error('Failed to create test log');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Create Test SMS Log
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SMS Log Details Modal */}
        {selectedLog && (() => {
          const smsInfo = calculateSMSInfo(selectedLog.message || '');
          const calculatedCost = smsInfo.smsUnits * pricePerSMS;
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">SMS Details</h3>
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedLog.status || 'unknown')}`}>
                        {getStatusIcon(selectedLog.status || 'unknown')} {selectedLog.status || 'unknown'}
                      </span>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="text-sm text-gray-900">{selectedLog.recipient_phone || 'N/A'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Message</label>
                      <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-900 whitespace-pre-wrap">
                        {selectedLog.message || 'N/A'}
                      </div>
                    </div>

                    {/* SMS Analytics Section */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">📊 SMS Analytics</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Character Count</label>
                          <p className="text-lg font-bold text-gray-900">{smsInfo.charCount}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">SMS Units</label>
                          <p className="text-lg font-bold text-gray-900">{smsInfo.smsUnits}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Encoding</label>
                          <p className="text-sm font-medium text-gray-900">{smsInfo.encoding}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600">Chars per SMS</label>
                          <p className="text-sm font-medium text-gray-900">{smsInfo.charsPerSMS}</p>
                        </div>
                      </div>
                    </div>

                    {/* Cost Calculation */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">💰 Cost Calculation</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Price per SMS Unit:</span>
                          <span className="font-medium text-gray-900">{pricePerSMS} TZS</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">SMS Units Used:</span>
                          <span className="font-medium text-gray-900">{smsInfo.smsUnits}</span>
                        </div>
                        <div className="border-t border-green-300 pt-2 flex justify-between">
                          <span className="font-semibold text-gray-900">Total Cost:</span>
                          <span className="text-lg font-bold text-green-700">{calculatedCost} TZS</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Created At</label>
                        <p className="text-sm text-gray-900">{selectedLog.created_at ? formatDate(selectedLog.created_at) : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sent At</label>
                        <p className="text-sm text-gray-900">
                          {selectedLog.sent_at ? formatDate(selectedLog.sent_at) : 'Not sent'}
                        </p>
                      </div>
                    </div>

                    {selectedLog.sent_by && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Sent By</label>
                        <p className="text-sm text-gray-900">{selectedLog.sent_by}</p>
                      </div>
                    )}

                    {selectedLog.device_id && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Device ID</label>
                        <p className="text-sm text-gray-900">{selectedLog.device_id}</p>
                      </div>
                    )}

                    {selectedLog.error_message && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Error Message</label>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                          {selectedLog.error_message}
                        </div>
                      </div>
                    )}

                  </div>
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
