import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
  Zap,
  Code,
  ListOrdered,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { useError, ErrorDetails, FixSuggestion } from '../context/ErrorContext';
import { toast } from 'react-hot-toast';

interface ErrorPanelProps {
  error?: ErrorDetails;
  onClose?: () => void;
  onRetry?: () => void;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ error: propError, onClose, onRetry }) => {
  const { currentError, removeError, setShowErrorPanel } = useError();
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(0);
  const [showTechnical, setShowTechnical] = useState(false);

  const error = propError || currentError;

  if (!error) return null;

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      setShowErrorPanel(false);
      removeError(error.id);
    }
  };

  const copyToClipboard = (text: string, label: string = 'text') => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const getSeverityColor = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: ErrorDetails['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-6 h-6 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'low':
        return <Info className="w-6 h-6 text-blue-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-gray-600" />;
    }
  };

  const getTypeLabel = (type: ErrorDetails['type']) => {
    const labels = {
      database: 'Database Error',
      network: 'Network Error',
      validation: 'Validation Error',
      auth: 'Authentication Error',
      api: 'API Error',
      unknown: 'Error'
    };
    return labels[type] || 'Error';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`
          relative w-full max-w-3xl max-h-[90vh] overflow-hidden
          bg-white rounded-2xl shadow-2xl border-2
          ${getSeverityColor(error.severity)}
          animate-in slide-in-from-bottom duration-300
        `}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {getSeverityIcon(error.severity)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-900">{error.title}</h2>
                  {error.code && (
                    <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-gray-200 text-gray-700 rounded">
                      {error.code}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{getTypeLabel(error.type)}</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-6">
          {/* Error Message */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">What happened?</h3>
            <p className="text-gray-900">{error.message}</p>
            {error.context && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">Context:</span> {error.context}
              </p>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-xs text-gray-500">
            Error occurred at: {new Date(error.timestamp).toLocaleString()}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 z-10 bg-white border-t px-6 py-4 flex gap-3">
          {onRetry && (
            <button
              onClick={() => {
                onRetry();
                handleClose();
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPanel;
