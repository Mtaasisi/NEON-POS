/**
 * Error Management Page
 * View, export, and manage saved error logs
 * 
 * Features:
 * - View all saved errors from localStorage
 * - Download individual or all errors
 * - Clear old errors
 * - Filter by severity, date, module
 * - Search error messages
 */

import React, { useState, useEffect } from 'react';
import { AlertCircle, Download, Trash2, Search, Filter, RefreshCw, FileJson, Calendar, Code, AlertTriangle, XCircle, Info } from 'lucide-react';
import { errorExporter } from '../utils/errorExporter';
import { toast } from 'react-hot-toast';

interface SavedError {
  timestamp: string;
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  module?: string;
  function?: string;
  operation?: string;
  context?: Record<string, any>;
  userAgent: string;
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  online: boolean;
}

export default function ErrorManagement() {
  const [errors, setErrors] = useState<SavedError[]>([]);
  const [filteredErrors, setFilteredErrors] = useState<SavedError[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadErrors();
  }, []);

  useEffect(() => {
    filterErrors();
  }, [errors, searchQuery, selectedSeverity]);

  const loadErrors = () => {
    try {
      setLoading(true);
      const errorKeys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_log_'))
        .sort()
        .reverse();

      const loadedErrors = errorKeys.map(key => {
        try {
          const data = localStorage.getItem(key);
          return data ? JSON.parse(data) : null;
        } catch {
          return null;
        }
      }).filter(e => e !== null) as SavedError[];

      setErrors(loadedErrors);
    } catch (error) {
      console.error('Failed to load errors:', error);
      toast.error('Failed to load saved errors');
    } finally {
      setLoading(false);
    }
  };

  const filterErrors = () => {
    let filtered = [...errors];

    // Filter by severity
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(e => e.severity === selectedSeverity);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e => 
        e.message.toLowerCase().includes(query) ||
        e.errorType.toLowerCase().includes(query) ||
        e.module?.toLowerCase().includes(query) ||
        e.operation?.toLowerCase().includes(query)
      );
    }

    setFilteredErrors(filtered);
  };

  const downloadError = (error: SavedError) => {
    const filename = `error-${error.timestamp.replace(/[:.]/g, '-')}.json`;
    const json = JSON.stringify(error, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    URL.revokeObjectURL(url);
    toast.success('Error downloaded!');
  };

  const downloadAllErrors = () => {
    errorExporter.exportAllSavedErrors();
  };

  const clearAllErrors = () => {
    if (!confirm('Are you sure you want to delete all saved errors? This cannot be undone.')) {
      return;
    }

    errorExporter.clearSavedErrors();
    loadErrors();
    toast.success('All errors cleared!');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-4 h-4" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <AlertCircle className="w-4 h-4" />;
      case 'low':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Error Management</h1>
            <p className="text-gray-600">View and manage saved error logs</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Total Errors</p>
          <p className="text-3xl font-bold">{errors.length}</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">High Severity</p>
          <p className="text-3xl font-bold">{errors.filter(e => e.severity === 'high' || e.severity === 'critical').length}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Medium Severity</p>
          <p className="text-3xl font-bold">{errors.filter(e => e.severity === 'medium').length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-sm opacity-90">Low Severity</p>
          <p className="text-3xl font-bold">{errors.filter(e => e.severity === 'low').length}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search errors..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Severity Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 appearance-none bg-white"
            >
              <option value="all">All Severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={loadErrors}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={downloadAllErrors}
              disabled={errors.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
            <button
              onClick={clearAllErrors}
              disabled={errors.length === 0}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredErrors.length === 0 ? (
          <div className="text-center py-20">
            <FileJson className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              {errors.length === 0 ? 'No saved errors' : 'No errors match your filters'}
            </p>
          </div>
        ) : (
          filteredErrors.map((error, index) => (
            <div
              key={error.timestamp}
              className="bg-white rounded-lg shadow-sm border-2 border-gray-200 overflow-hidden hover:shadow-md transition-all"
            >
              {/* Error Header */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Severity Badge */}
                  <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1 ${getSeverityColor(error.severity)}`}>
                    {getSeverityIcon(error.severity)}
                    {error.severity.toUpperCase()}
                  </div>

                  {/* Error Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">{error.errorType}</h3>
                        <p className="text-gray-600 mt-1 break-words">{error.message}</p>
                        <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(error.timestamp)}
                          </div>
                          {error.module && (
                            <div className="flex items-center gap-1">
                              <Code className="w-4 h-4" />
                              {error.module}
                              {error.function && ` → ${error.function}`}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => downloadError(error)}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                        <button
                          onClick={() => setExpandedError(expandedError === error.timestamp ? null : error.timestamp)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-semibold"
                        >
                          {expandedError === error.timestamp ? 'Hide' : 'Details'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedError === error.timestamp && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">Operation</p>
                      <p className="text-sm text-gray-600">{error.operation || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">URL</p>
                      <p className="text-sm text-gray-600 break-all">{error.url}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">Viewport</p>
                      <p className="text-sm text-gray-600">{error.viewport.width} x {error.viewport.height}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-1">Status</p>
                      <p className="text-sm text-gray-600">{error.online ? '🟢 Online' : '🔴 Offline'}</p>
                    </div>
                  </div>

                  {error.stack && (
                    <div className="mb-4">
                      <p className="text-sm font-bold text-gray-700 mb-2">Stack Trace</p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
                        {error.stack}
                      </pre>
                    </div>
                  )}

                  {error.context && Object.keys(error.context).length > 0 && (
                    <div>
                      <p className="text-sm font-bold text-gray-700 mb-2">Additional Context</p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto">
                        {JSON.stringify(error.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


