import React, { useState } from 'react';
import { useEnhancedError } from '../hooks/useEnhancedError';
import { Database, Wifi, Shield, AlertTriangle } from 'lucide-react';

/**
 * Example component showing how to use the enhanced error handling system
 * This is for demonstration purposes - you can use these patterns in your real components
 */
export const ErrorHandlingExample: React.FC = () => {
  const {
    handleError,
    handleDatabaseError,
    handleNetworkError,
    handleAuthError,
    handleValidationError,
    createCustomError,
    setShowDiagnostics
  } = useEnhancedError();

  const [loading, setLoading] = useState(false);

  // Example 1: Simulate a database error
  const simulateDatabaseError = () => {
    setLoading(true);
    setTimeout(() => {
      // Simulate a unique constraint violation
      const mockError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint "products_sku_key"',
        details: 'Key (sku)=(LAPTOP-001) already exists.',
        hint: 'Try using a different SKU or update the existing product'
      };
      
      handleDatabaseError(
        mockError,
        'Creating product',
        'lats_inventory'
      );
      setLoading(false);
    }, 500);
  };

  // Example 2: Simulate a network error
  const simulateNetworkError = () => {
    setLoading(true);
    setTimeout(() => {
      const mockError = new Error('ERR_CONNECTION_CLOSED: net::ERR_CONNECTION_CLOSED');
      handleNetworkError(mockError, '/api/products');
      setLoading(false);
    }, 500);
  };

  // Example 3: Simulate an auth error
  const simulateAuthError = () => {
    setLoading(true);
    setTimeout(() => {
      const mockError = {
        code: 'PGRST116',
        message: 'JWT expired',
        hint: 'Please log in again'
      };
      handleAuthError(mockError, 'Accessing protected resource');
      setLoading(false);
    }, 500);
  };

  // Example 4: Simulate a validation error
  const simulateValidationError = () => {
    handleValidationError(
      'Product name must be at least 3 characters long',
      'product_name'
    );
  };

  // Example 5: Simulate a missing table error
  const simulateMissingTableError = () => {
    setLoading(true);
    setTimeout(() => {
      const mockError = {
        code: '42P01',
        message: 'relation "lats_inventory" does not exist',
        hint: 'Run database migrations to create the missing table'
      };
      
      handleDatabaseError(
        mockError,
        'Querying inventory',
        'lats_inventory'
      );
      setLoading(false);
    }, 500);
  };

  // Example 6: Simulate a permission error
  const simulatePermissionError = () => {
    setLoading(true);
    setTimeout(() => {
      const mockError = {
        code: '42501',
        message: 'permission denied for table products',
        hint: 'Check Row Level Security policies'
      };
      
      handleDatabaseError(
        mockError,
        'Updating product',
        'products'
      );
      setLoading(false);
    }, 500);
  };

  // Example 7: Custom error with specific fix suggestions
  const simulateCustomError = () => {
    createCustomError({
      title: 'Payment Gateway Error',
      message: 'Unable to connect to the payment gateway. Transaction could not be completed.',
      type: 'api',
      severity: 'high',
      context: 'Processing checkout',
      fixSuggestions: [
        {
          title: 'Check payment gateway status',
          description: 'Verify the payment service is online',
          steps: [
            'Go to payment gateway dashboard',
            'Check service status page',
            'Verify API credentials are active',
            'Contact payment provider if service is down'
          ]
        },
        {
          title: 'Try alternative payment method',
          description: 'Use a different payment processor',
          steps: [
            'Enable backup payment gateway in settings',
            'Configure alternative payment methods',
            'Retry the transaction'
          ]
        },
        {
          title: 'Manual payment processing',
          description: 'Process the payment manually',
          steps: [
            'Record customer payment details',
            'Process payment outside the system',
            'Mark order as paid manually',
            'Add note explaining manual processing'
          ]
        }
      ]
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced Error Handling Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Click any button below to see how errors are displayed with actionable fix suggestions.
            After triggering an error, check the error panel for detailed information and fixes!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Database Errors */}
            <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Database Errors</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={simulateDatabaseError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Unique Constraint Violation (23505)
                </button>
                <button
                  onClick={simulateMissingTableError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Table Not Found (42P01)
                </button>
                <button
                  onClick={simulatePermissionError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Permission Denied (42501)
                </button>
              </div>
            </div>

            {/* Network Errors */}
            <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <Wifi className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Network Errors</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={simulateNetworkError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Connection Closed
                </button>
              </div>
            </div>

            {/* Auth Errors */}
            <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Auth Errors</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={simulateAuthError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  JWT Expired (PGRST116)
                </button>
              </div>
            </div>

            {/* Other Errors */}
            <div className="border-2 border-orange-200 rounded-lg p-4 bg-orange-50">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Other Errors</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={simulateValidationError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Validation Error
                </button>
                <button
                  onClick={simulateCustomError}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-lg transition-colors text-sm"
                >
                  Custom Error with Fixes
                </button>
              </div>
            </div>
          </div>

          {/* View Diagnostics Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowDiagnostics(true)}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-lg font-medium transition-colors"
            >
              📊 View Error Diagnostics Panel
            </button>
            <p className="text-sm text-gray-500 text-center mt-2">
              Or look for the red button in the bottom-right corner after triggering an error
            </p>
          </div>
        </div>

        {/* Features Info */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            ✨ What You'll See
          </h2>
          <div className="space-y-3 text-gray-700">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div>
                <strong>Error Panel:</strong> Beautiful modal with clear error explanation
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div>
                <strong>Fix Suggestions:</strong> Step-by-step instructions to resolve the issue
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div>
                <strong>SQL Fixes:</strong> Copy-paste ready SQL commands (for database errors)
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <div>
                <strong>Technical Details:</strong> Full error info for debugging
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">5</div>
              <div>
                <strong>Error History:</strong> View all errors in the diagnostics panel
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorHandlingExample;

