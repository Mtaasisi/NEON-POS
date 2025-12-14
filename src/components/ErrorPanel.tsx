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

          {/* Fix Suggestions */}
          {error.fixSuggestions && error.fixSuggestions.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                How to fix this
              </h3>
              <div className="space-y-3">
                {error.fixSuggestions.map((suggestion, index) => (
                  <FixSuggestionCard
                    key={index}
                    suggestion={suggestion}
                    index={index}
                    isExpanded={expandedSuggestion === index}
                    onToggle={() => setExpandedSuggestion(expandedSuggestion === index ? null : index)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Technical Details */}
          {error.technicalDetails && (
            <div className="mb-4">
              <button
                onClick={() => setShowTechnical(!showTechnical)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                <Code className="w-4 h-4" />
                Technical Details
                {showTechnical ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showTechnical && (
                <div className="mt-3 p-4 bg-gray-900 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-gray-100 font-mono">
                    {JSON.stringify(error.technicalDetails, null, 2)}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(error.technicalDetails, null, 2), 'Technical details')}
                    className="mt-2 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Stack */}
          {error.stack && (
            <div className="mb-4">
              <details className="group">
                <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Stack Trace
                  <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-3 p-4 bg-gray-900 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              </details>
            </div>
          )}

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
          <a
            href="https://www.postgresql.org/docs/current/errcodes-appendix.html"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            PostgreSQL Docs
          </a>
        </div>
      </div>
    </div>
  );
};

interface FixSuggestionCardProps {
  suggestion: FixSuggestion;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}

const FixSuggestionCard: React.FC<FixSuggestionCardProps> = ({
  suggestion,
  index,
  isExpanded,
  onToggle
}) => {
  const [isFixing, setIsFixing] = useState(false);

  const handleAutoFix = async () => {
    if (!suggestion.onAutoFix) return;
    
    setIsFixing(true);
    try {
      await suggestion.onAutoFix();
      toast.success('Auto-fix applied successfully!');
    } catch (error) {
      toast.error('Auto-fix failed. Please apply manually.');
    } finally {
      setIsFixing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('SQL copied to clipboard!');
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 text-left">
          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </span>
          <div>
            <h4 className="font-semibold text-gray-900">{suggestion.title}</h4>
            <p className="text-sm text-gray-600">{suggestion.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {suggestion.autoFixAvailable && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded font-medium">
              Auto-fix
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
          {/* Steps */}
          <div className="mb-4">
            <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <ListOrdered className="w-4 h-4" />
              Steps to fix:
            </h5>
            <ol className="space-y-2">
              {suggestion.steps.map((step, stepIndex) => (
                <li key={stepIndex} className="flex gap-2 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                    {stepIndex + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* SQL Fix */}
          {suggestion.sqlFix && (
            <div className="mb-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" />
                SQL Fix:
              </h5>
              <div className="relative">
                <pre className="p-3 bg-gray-900 text-gray-100 rounded-lg text-xs font-mono overflow-x-auto">
                  {suggestion.sqlFix}
                </pre>
                <button
                  onClick={() => copyToClipboard(suggestion.sqlFix!)}
                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-white transition-colors"
                  title="Copy SQL"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Auto-fix Button */}
          {suggestion.autoFixAvailable && suggestion.onAutoFix && (
            <button
              onClick={handleAutoFix}
              disabled={isFixing}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {isFixing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Applying fix...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Apply Auto-fix
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorPanel;

