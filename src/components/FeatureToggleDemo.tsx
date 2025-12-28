import React from 'react';
import { FeatureGuard, FeatureToggle, useFeatureToggle, useMultipleFeatures } from './FeatureGuard';
import { Star, Zap, Eye, EyeOff } from 'lucide-react';

/**
 * Demonstration component showing how to use feature toggles
 * This component shows different ways to conditionally render features
 */
export const FeatureToggleDemo: React.FC = () => {
  // Example 1: Using the useFeatureToggle hook
  const loyaltyEnabled = useFeatureToggle('loyalty_program');
  const aiEnabled = useFeatureToggle('ai_assistant');

  // Example 2: Using useMultipleFeatures for multiple features
  const features = useMultipleFeatures(
    'advanced_analytics',
    'bulk_operations',
    'customer_portal'
  );

  return (
    <div className="p-6 space-y-6 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900">Feature Toggle Demo</h3>

      {/* Example 1: Direct hook usage */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium mb-2">Using useFeatureToggle Hook:</h4>
        <div className="flex items-center gap-2">
          <Star className={`w-5 h-5 ${loyaltyEnabled ? 'text-yellow-500' : 'text-gray-400'}`} />
          <span className={loyaltyEnabled ? 'text-green-600' : 'text-red-600'}>
            Loyalty Program: {loyaltyEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Zap className={`w-5 h-5 ${aiEnabled ? 'text-blue-500' : 'text-gray-400'}`} />
          <span className={aiEnabled ? 'text-green-600' : 'text-red-600'}>
            AI Assistant: {aiEnabled ? 'ENABLED' : 'DISABLED'}
          </span>
        </div>
      </div>

      {/* Example 2: Multiple features */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium mb-2">Using useMultipleFeatures Hook:</h4>
        <div className="space-y-2">
          {Object.entries(features).map(([feature, enabled]) => (
            <div key={feature} className="flex items-center gap-2">
              <Eye className={`w-4 h-4 ${enabled ? 'text-green-500' : 'text-gray-400'}`} />
              <span className={`text-sm ${enabled ? 'text-green-600' : 'text-red-600'}`}>
                {feature.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: {enabled ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Example 3: FeatureGuard component */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium mb-2">Using FeatureGuard Component:</h4>

        <FeatureGuard
          feature="ai_assistant"
          fallback={
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700">
                <EyeOff className="w-5 h-5" />
                <span className="font-medium">AI Assistant Feature is Disabled</span>
              </div>
              <p className="text-sm text-red-600 mt-1">
                This feature has been disabled in production. Contact your administrator to enable it.
              </p>
            </div>
          }
        >
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <Zap className="w-5 h-5" />
              <span className="font-medium">AI Assistant Feature is Active!</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Welcome to the AI Assistant! This feature is enabled and ready to use.
            </p>
          </div>
        </FeatureGuard>
      </div>

      {/* Example 4: FeatureToggle with render prop */}
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium mb-2">Using FeatureToggle Render Prop:</h4>

        <FeatureToggle feature="customer_portal">
          {(isEnabled) => (
            <div className={`p-4 border rounded-lg ${isEnabled ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <Eye className={`w-5 h-5 ${isEnabled ? 'text-blue-600' : 'text-gray-500'}`} />
                <span className={`font-medium ${isEnabled ? 'text-blue-700' : 'text-gray-700'}`}>
                  Customer Portal: {isEnabled ? 'Available' : 'Unavailable'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${isEnabled ? 'text-blue-600' : 'text-gray-600'}`}>
                {isEnabled
                  ? 'Customers can access their portal to view orders and account information.'
                  : 'Customer portal access has been disabled in this environment.'
                }
              </p>
            </div>
          )}
        </FeatureToggle>
      </div>

      {/* Development vs Production Info */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h4 className="font-medium text-yellow-800 mb-2">Environment Information:</h4>
        <p className="text-sm text-yellow-700">
          <strong>Current Mode:</strong> {import.meta.env.MODE || 'development'}
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          {import.meta.env.MODE === 'development'
            ? 'In development mode, all features are enabled by default for testing.'
            : 'In production mode, feature availability is controlled by the admin settings.'
          }
        </p>
      </div>
    </div>
  );
};

export default FeatureToggleDemo;
