import React from 'react';
import { useError } from '../context/ErrorContext';
import ErrorPanel from './ErrorPanel';
import ErrorDiagnosticsPanel from './ErrorDiagnosticsPanel';
import { AlertCircle } from 'lucide-react';

/**
 * Error Manager Component
 * Displays error panels and a floating diagnostics button
 */
export const ErrorManager: React.FC = () => {
  const { showErrorPanel, showDiagnostics, setShowDiagnostics, errors, currentError } = useError();

  return (
    <>
      {/* Error Panel */}
      {showErrorPanel && currentError && <ErrorPanel />}

      {/* Diagnostics Panel */}
      {showDiagnostics && <ErrorDiagnosticsPanel />}

      {/* Floating Diagnostics Button (only show if there are errors) */}
      {errors.length > 0 && !showDiagnostics && !showErrorPanel && (
        <button
          onClick={() => setShowDiagnostics(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all group"
          title="View error diagnostics"
        >
          <div className="relative">
            <AlertCircle className="w-6 h-6" />
            {errors.length > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 text-red-900 text-xs font-bold rounded-full flex items-center justify-center">
                {errors.length > 99 ? '99+' : errors.length}
              </span>
            )}
          </div>
          <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            View {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        </button>
      )}
    </>
  );
};

export default ErrorManager;

