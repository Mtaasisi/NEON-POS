/**
 * Cache Error Log Viewer Component
 * 
 * Displays error logs from cache management operations with:
 * - Filtering by module, error type, severity, date range
 * - Sorting and pagination
 * - Export to JSON/CSV
 * - Mark errors as resolved
 * - View detailed error information
 */

import React, { useState, useEffect } from 'react';
import { cacheErrorLogger, CacheErrorLog } from '../services/cacheErrorLogger';
import { 
  AlertCircle, 
  CheckCircle, 
  Download, 
  Filter, 
  Search, 
  X,
  FileText,
  Calendar,
  User,
  Settings,
  AlertTriangle,
  Info,
  Trash2,
  RefreshCw,
  Copy
} from 'lucide-react';

interface LogFilters {
  module?: string;
  errorType?: string;
  severity?: string;
  resolved?: boolean;
  searchText?: string;
  startDate?: string;
  endDate?: string;
}

export const CacheErrorLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<CacheErrorLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<CacheErrorLog[]>([]);
  const [filters, setFilters] = useState<LogFilters>({});
  const [selectedLog, setSelectedLog] = useState<CacheErrorLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const logsPerPage = 20;

  // Load logs and stats
  useEffect(() => {
    loadLogs();
    loadStats();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, logs]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const allLogs = await cacheErrorLogger.getLogs();
      setLogs(allLogs);
      setFilteredLogs(allLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statistics = await cacheErrorLogger.getStats();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Filter by module
    if (filters.module) {
      filtered = filtered.filter(log => log.module === filters.module);
    }

    // Filter by error type
    if (filters.errorType) {
      filtered = filtered.filter(log => log.errorType === filters.errorType);
    }

    // Filter by severity
    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    // Filter by resolved status
    if (filters.resolved !== undefined) {
      filtered = filtered.filter(log => log.resolved === filters.resolved);
    }

    // Filter by search text
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      filtered = filtered.filter(log =>
        log.errorMessage.toLowerCase().includes(searchLower) ||
        log.module.toLowerCase().includes(searchLower) ||
        log.function.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter(log => log.timestamp <= filters.endDate!);
    }

    setFilteredLogs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleMarkResolved = async (logId: number) => {
    const userName = localStorage.getItem('userName') || 'Unknown';
    const success = await cacheErrorLogger.markResolved(logId, userName);
    if (success) {
      loadLogs();
      loadStats();
      if (selectedLog?.id === logId) {
        setSelectedLog(null);
      }
    }
  };

  const handleDeleteLog = async (logId: number) => {
    if (confirm('Are you sure you want to delete this log?')) {
      const success = await cacheErrorLogger.deleteLog(logId);
      if (success) {
        loadLogs();
        loadStats();
        if (selectedLog?.id === logId) {
          setSelectedLog(null);
        }
      }
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to clear ALL logs? This cannot be undone.')) {
      const success = await cacheErrorLogger.clearAllLogs();
      if (success) {
        loadLogs();
        loadStats();
        setSelectedLog(null);
      }
    }
  };

  const handleExportJSON = async () => {
    const json = await cacheErrorLogger.exportLogs(filters);
    downloadFile(json, 'cache-error-logs.json', 'application/json');
  };

  const handleExportCSV = async () => {
    const csv = await cacheErrorLogger.exportLogsCSV(filters);
    downloadFile(csv, 'cache-error-logs.csv', 'text/csv');
  };

  const downloadFile = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyFullError = async (log: CacheErrorLog) => {
    try {
      // Format the full error details for Cursor AI
      const fullErrorText = `
=== CACHE ERROR LOG ===
Timestamp: ${new Date(log.timestamp).toLocaleString()}
Severity: ${log.severity.toUpperCase()}
Error Type: ${log.errorType}
Status: ${log.resolved ? 'Resolved' : 'Unresolved'}

Module: ${log.module}
Function: ${log.function}
Operation: ${log.operation}
Online Status: ${log.isOnline ? 'Online' : 'Offline'}

--- ERROR MESSAGE ---
${log.errorMessage}

${log.errorStack ? `--- STACK TRACE ---
${log.errorStack}
` : ''}
${log.userName || log.userId ? `--- USER INFO ---
User Name: ${log.userName || 'N/A'}
User ID: ${log.userId || 'N/A'}
User Role: ${log.userRole || 'N/A'}
` : ''}
${log.branchName || log.branchId ? `--- BRANCH INFO ---
Branch Name: ${log.branchName || 'N/A'}
Branch ID: ${log.branchId || 'N/A'}
` : ''}
${log.operationContext && Object.keys(log.operationContext).length > 0 ? `--- OPERATION CONTEXT ---
${JSON.stringify(log.operationContext, null, 2)}
` : ''}
${log.resolved && log.resolvedAt ? `--- RESOLUTION INFO ---
Resolved At: ${new Date(log.resolvedAt).toLocaleString()}
Resolved By: ${log.resolvedBy || 'N/A'}
Notes: ${log.notes || 'N/A'}
` : ''}
======================
`.trim();

      await navigator.clipboard.writeText(fullErrorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please try again.');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4" />;
      case 'high': return <AlertTriangle className="w-4 h-4" />;
      case 'medium': return <Info className="w-4 h-4" />;
      case 'low': return <Info className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  // Pagination
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  // Get unique values for filters
  const uniqueModules = [...new Set(logs.map(log => log.module))];
  const uniqueErrorTypes = [...new Set(logs.map(log => log.errorType))];
  const severities = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cache Error Logs</h1>
        <p className="text-gray-600">
          Monitor and track cache management errors during offline operations
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unresolved</p>
                <p className="text-2xl font-bold text-red-600">{stats.unresolved}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Last 24 Hours</p>
                <p className="text-2xl font-bold text-orange-600">{stats.last24Hours}</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </div>
        </div>
      )}

      {/* Actions Bar */}
      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.searchText || ''}
                onChange={(e) => setFilters({ ...filters, searchText: e.target.value })}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border ${
                showFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700'
              } hover:bg-blue-100 transition-colors flex items-center gap-2`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>

            <button
              onClick={loadLogs}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>

            <button
              onClick={handleExportJSON}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>

            <button
              onClick={handleClearAll}
              className="px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Module Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.module || ''}
                onChange={(e) => setFilters({ ...filters, module: e.target.value || undefined })}
              >
                <option value="">All Modules</option>
                {uniqueModules.map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
            </div>

            {/* Error Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Error Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.errorType || ''}
                onChange={(e) => setFilters({ ...filters, errorType: e.target.value || undefined })}
              >
                <option value="">All Types</option>
                {uniqueErrorTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.severity || ''}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
              >
                <option value="">All Severities</option>
                {severities.map(severity => (
                  <option key={severity} value={severity}>{severity}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                value={filters.resolved === undefined ? '' : filters.resolved ? 'resolved' : 'unresolved'}
                onChange={(e) => setFilters({ 
                  ...filters, 
                  resolved: e.target.value === '' ? undefined : e.target.value === 'resolved' 
                })}
              >
                <option value="">All Status</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {indexOfFirstLog + 1}-{Math.min(indexOfLastLog, filteredLogs.length)} of {filteredLogs.length} errors
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No error logs found</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(log.severity)}`}>
                          {getSeverityIcon(log.severity)}
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {log.module}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {log.errorType}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                        {log.errorMessage}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {log.userName || log.userId || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {log.resolved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertCircle className="w-3 h-3" />
                            Unresolved
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        <div className="flex gap-2">
                          {!log.resolved && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkResolved(log.id!);
                              }}
                              className="text-green-600 hover:text-green-800"
                              title="Mark as resolved"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLog(log.id!);
                            }}
                            className="text-red-600 hover:text-red-800"
                            title="Delete log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Log Details</h2>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getSeverityColor(selectedLog.severity)}`}>
                    {getSeverityIcon(selectedLog.severity)}
                    {selectedLog.severity.toUpperCase()} - {selectedLog.errorType}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Copy Full Error Button */}
              <div className="mb-6">
                <button
                  onClick={() => handleCopyFullError(selectedLog)}
                  className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium ${
                    copied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <Copy className="w-5 h-5" />
                  {copied ? '✓ Copied to Clipboard!' : 'Copy Full Error for Cursor AI'}
                </button>
              </div>

              {/* Content */}
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Timestamp</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <p className="mt-1">
                      {selectedLog.resolved ? (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          Unresolved
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Module</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.module}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Function</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.function}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Operation</p>
                    <p className="mt-1 text-sm text-gray-900">{selectedLog.operation}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Online Status</p>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedLog.isOnline ? '🟢 Online' : '🔴 Offline'}
                    </p>
                  </div>
                </div>

                {/* Error Message */}
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">Error Message</p>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-900 font-mono whitespace-pre-wrap">
                      {selectedLog.errorMessage}
                    </p>
                  </div>
                </div>

                {/* Stack Trace */}
                {selectedLog.errorStack && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Stack Trace</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                        {selectedLog.errorStack}
                      </pre>
                    </div>
                  </div>
                )}

                {/* User Info */}
                {(selectedLog.userName || selectedLog.userId) && (
                  <div className="grid grid-cols-3 gap-4">
                    {selectedLog.userName && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">User Name</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.userName}</p>
                      </div>
                    )}
                    {selectedLog.userId && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">User ID</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.userId}</p>
                      </div>
                    )}
                    {selectedLog.userRole && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">User Role</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.userRole}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Branch Info */}
                {(selectedLog.branchName || selectedLog.branchId) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.branchName && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Branch Name</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.branchName}</p>
                      </div>
                    )}
                    {selectedLog.branchId && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">Branch ID</p>
                        <p className="mt-1 text-sm text-gray-900">{selectedLog.branchId}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Operation Context */}
                {selectedLog.operationContext && Object.keys(selectedLog.operationContext).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Operation Context</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <pre className="text-xs text-blue-900 whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedLog.operationContext, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Resolution Info */}
                {selectedLog.resolved && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800 mb-2">Resolution Details</p>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedLog.resolvedAt && (
                        <div>
                          <p className="text-sm text-green-700">Resolved At</p>
                          <p className="text-sm text-green-900">
                            {new Date(selectedLog.resolvedAt).toLocaleString()}
                          </p>
                        </div>
                      )}
                      {selectedLog.resolvedBy && (
                        <div>
                          <p className="text-sm text-green-700">Resolved By</p>
                          <p className="text-sm text-green-900">{selectedLog.resolvedBy}</p>
                        </div>
                      )}
                    </div>
                    {selectedLog.notes && (
                      <div className="mt-2">
                        <p className="text-sm text-green-700">Notes</p>
                        <p className="text-sm text-green-900 mt-1">{selectedLog.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3 justify-end">
                {!selectedLog.resolved && (
                  <button
                    onClick={() => handleMarkResolved(selectedLog.id!)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark as Resolved
                  </button>
                )}
                <button
                  onClick={() => handleDeleteLog(selectedLog.id!)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Log
                </button>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

