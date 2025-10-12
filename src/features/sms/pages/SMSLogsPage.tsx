import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';

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

const SMSLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<SMSLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<SMSLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSMSLogs();
  }, []);

  const fetchSMSLogs = async () => {
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
      setLogs(validLogs);
    } catch (err: any) {
      // Handle case where entire response object is thrown
      console.log('🚨 Exception caught in fetchSMSLogs:', err);
      
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
    } finally {
      setLoading(false);
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
    const totalCost = logs.reduce((sum, log) => {
      if (!log) return sum;
      const cost = typeof log.cost === 'string' ? parseFloat(log.cost) : log.cost;
      return sum + (cost || 0);
    }, 0);

    return { total, sent, delivered, failed, pending, totalCost };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Logs</h1>
          <p className="text-gray-600">View and monitor all SMS activity</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
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
            <div className="text-2xl font-bold text-purple-600">{(Number(stats.totalCost) || 0).toFixed(0)}</div>
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.sent_at ? formatDate(log.sent_at) : (log.created_at ? formatDate(log.created_at) : 'N/A')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.cost ? `${log.cost} TZS` : '-'}
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
        {selectedLog && (
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
                    <p className="text-sm text-gray-900">{selectedLog.phone_number || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedLog.message || 'N/A'}
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

                  {selectedLog.cost && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Cost</label>
                      <p className="text-sm text-gray-900">{selectedLog.cost} TZS</p>
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
        )}
      </div>
    </div>
  );
};

export default SMSLogsPage;
