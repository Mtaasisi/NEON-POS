import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Database,
  Wifi,
  Shield,
  AlertCircle,
  Info,
  Filter,
  Trash2,
  Download,
  Search,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useError, ErrorDetails } from '../context/ErrorContext';
import { toast } from 'react-hot-toast';

export const ErrorDiagnosticsPanel: React.FC = () => {
  const { errors, clearErrors, setShowDiagnostics, setShowErrorPanel, currentError } = useError();
  const [filterType, setFilterType] = useState<ErrorDetails['type'] | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ErrorDetails['severity'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorDetails | null>(null);

  // Filter and search errors
  const filteredErrors = useMemo(() => {
    return errors.filter(error => {
      const matchesType = filterType === 'all' || error.type === filterType;
      const matchesSeverity = filterSeverity === 'all' || error.severity === filterSeverity;
      const matchesSearch = searchTerm === '' || 
        error.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        error.code?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesType && matchesSeverity && matchesSearch;
    });
  }, [errors, filterType, filterSeverity, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const typeCount = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ErrorDetails['type'], number>);

    const severityCount = errors.reduce((acc, error) => {
      acc[error.severity] = (acc[error.severity] || 0) + 1;
      return acc;
    }, {} as Record<ErrorDetails['severity'], number>);

    return { typeCount, severityCount, total: errors.length };
  }, [errors]);

  const handleExportErrors = () => {
    const data = JSON.stringify(errors, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-log-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Error log exported!');
  };

  const handleClearErrors = () => {
    if (window.confirm('Are you sure you want to clear all error history?')) {
      clearErrors();
      toast.success('Error history cleared');
    }
  };

  const getTypeIcon = (type: ErrorDetails['type']) => {
    switch (type) {
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'network':
        return <Wifi className="w-4 h-4" />;
      case 'auth':
        return <Shield className="w-4 h-4" />;
      case 'validation':
        return <AlertCircle className="w-4 h-4" />;
      case 'api':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-6xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Error Diagnostics</h2>
              <p className="text-sm text-blue-100">View and analyze error history</p>
            </div>
          </div>
          <button
            onClick={() => setShowDiagnostics(false)}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Statistics Bar */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-xs text-gray-600">Total Errors</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-red-600">{stats.severityCount.critical || 0}</div>
              <div className="text-xs text-gray-600">Critical</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-orange-600">{stats.severityCount.high || 0}</div>
              <div className="text-xs text-gray-600">High</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.severityCount.medium || 0}</div>
              <div className="text-xs text-gray-600">Medium</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-blue-600">{stats.severityCount.low || 0}</div>
              <div className="text-xs text-gray-600">Low</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search errors by title, message, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="database">Database</option>
              <option value="network">Network</option>
              <option value="auth">Authentication</option>
              <option value="validation">Validation</option>
              <option value="api">API</option>
              <option value="unknown">Unknown</option>
            </select>

            {/* Severity Filter */}
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExportErrors}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                title="Export errors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden md:inline">Export</span>
              </button>
              <button
                onClick={handleClearErrors}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 transition-colors"
                title="Clear errors"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden md:inline">Clear</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredErrors.length === 0 ? (
            <div className="text-center py-12">
              <Info className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No errors found</h3>
              <p className="text-gray-500">
                {errors.length === 0
                  ? 'No errors have been recorded yet.'
                  : 'Try adjusting your filters or search term.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredErrors.map((error) => (
                <div
                  key={error.id}
                  className={`
                    p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${selectedError?.id === error.id
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                  onClick={() => setSelectedError(selectedError?.id === error.id ? null : error)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(error.type)}
                        <h3 className="font-semibold text-gray-900">{error.title}</h3>
                        {error.code && (
                          <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 text-gray-700 rounded">
                            {error.code}
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getSeverityColor(error.severity)}`}>
                          {error.severity.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{error.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                        {error.context && (
                          <span className="truncate max-w-xs">Context: {error.context}</span>
                        )}
                      </div>

                      {/* Expanded Details */}
                      {selectedError?.id === error.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          {error.fixSuggestions && error.fixSuggestions.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-sm font-semibold text-gray-700 mb-2">Fix Suggestions:</h4>
                              <ul className="space-y-1 text-sm text-gray-600">
                                {error.fixSuggestions.map((fix, idx) => (
                                  <li key={idx}>• {fix.title}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {error.technicalDetails && (
                            <details className="text-sm">
                              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                                Technical Details
                              </summary>
                              <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                                {JSON.stringify(error.technicalDetails, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDiagnostics(false);
                        setShowErrorPanel(true);
                        // Set this error as current
                      }}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDiagnosticsPanel;

