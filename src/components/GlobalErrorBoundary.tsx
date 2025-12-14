/**
 * Global Error Boundary
 * 
 * Catches React component errors and logs them to cache error logger
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, Download, RefreshCw, Home } from 'lucide-react';
import { handleReactError } from '../services/globalErrorHandler';
import { errorExporter } from '../utils/errorExporter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('🚨 [GlobalErrorBoundary] Caught error:', error, errorInfo);

    // Log to cache error logger
    handleReactError(error, errorInfo).catch(err => {
      console.error('Failed to log React error:', err);
    });

    // Cache error logs (auto-download disabled)
    errorExporter.exportError(error, {
      severity: 'critical',
      module: 'ReactErrorBoundary',
      function: 'componentDidCatch',
      operation: 'component_render',
      context: {
        componentStack: errorInfo.componentStack,
      },
    }).catch(err => {
      console.error('Failed to cache React error:', err);
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                Something went wrong
              </h1>
            </div>

            <p className="text-gray-600 mb-4">
              An unexpected error occurred. The error has been logged and our team will look into it.
            </p>

            {this.state.error && (
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Error Details:
                </p>
                <p className="text-xs text-gray-600 font-mono">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2 mb-3">
              <button
                onClick={() => {
                  if (this.state.error) {
                    errorExporter.exportError(this.state.error, {
                      severity: 'critical',
                      module: 'ReactErrorBoundary',
                      function: 'manualDownload',
                      operation: 'component_render',
                      context: {
                        componentStack: this.state.errorInfo?.componentStack,
                      },
                      autoDownload: true,
                    });
                    alert('Error details downloaded!');
                  }
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <Download className="w-4 h-4" />
                Download Error Details
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Component Stack (Dev Only)
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto p-2 bg-gray-50 rounded border border-gray-200">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

