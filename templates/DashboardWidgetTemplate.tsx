/**
 * [YourFeature]Widget.tsx
 * 
 * Template for creating new dashboard widgets that follow the system standards.
 * 
 * CHECKLIST BEFORE USING:
 * 1. [ ] Added to useDashboardSettings.ts interface
 * 2. [ ] Added to useDashboardSettings.ts defaults
 * 3. [ ] Added to roleBasedWidgets.ts interface
 * 4. [ ] Added to roleBasedWidgets.ts role permissions
 * 5. [ ] Registered in DashboardPage.tsx
 * 6. [ ] Added to DashboardCustomizationSettings.tsx
 */

import React, { useState, useEffect } from 'react';
import GlassCard from '../ui/GlassCard';
import { YourIcon, RefreshCw } from 'lucide-react'; // Replace YourIcon
import { toast } from 'react-hot-toast';

interface [YourFeature]WidgetProps {
  className?: string; // ✅ REQUIRED - for grid layout integration
  // Add your custom props here
}

export const [YourFeature]Widget: React.FC<[YourFeature]WidgetProps> = ({ 
  className 
}) => {
  // State
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);

  // Load widget data
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Your data loading logic here
      // const response = await yourApi.getData();
      // setData(response);
      
      // Temporary placeholder
      setData({ value: 123, label: 'Sample Data' });
    } catch (err) {
      console.error('Error loading widget data:', err);
      setError('Failed to load data');
      toast.error('Failed to load [YourFeature] widget data');
    } finally {
      setLoading(false);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    loadData();
  };

  return (
    <GlassCard className={className}> {/* ✅ REQUIRED - pass className */}
      <div className="p-4 sm:p-6"> {/* ✅ Responsive padding */}
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <YourIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              [Your Widget Title]
            </h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {loading && !data ? (
            // Loading state
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            // Error state
            <div className="text-center py-8">
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={handleRefresh}
                className="mt-2 text-blue-600 hover:underline text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
            // Data display
            <>
              {/* Main Metric */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">
                    Metric Label
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {data?.value || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <YourIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              {/* Additional Content */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Additional Info</span>
                  <span className="font-semibold text-gray-900">
                    {data?.label || '-'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </GlassCard>
  );
};

/**
 * REGISTRATION STEPS:
 * 
 * 1. Add to useDashboardSettings.ts:
 *    widgets: {
 *      yourNewWidget: boolean;
 *    }
 * 
 * 2. Add to defaultDashboardSettings:
 *    widgets: {
 *      yourNewWidget: true,
 *    }
 * 
 * 3. Add to roleBasedWidgets.ts interface:
 *    export interface RoleWidgetPermissions {
 *      yourNewWidget: boolean;
 *    }
 * 
 * 4. Add to role permissions:
 *    adminWidgetPermissions: {
 *      yourNewWidget: true,
 *    }
 * 
 * 5. Import in DashboardPage.tsx:
 *    import { YourNewWidget } from '../components/dashboard';
 * 
 * 6. Render in DashboardPage.tsx:
 *    {isWidgetEnabled('yourNewWidget') && (
 *      <YourNewWidget className="h-full" />
 *    )}
 * 
 * 7. Add to DashboardCustomizationSettings.tsx:
 *    const widgetItems = [
 *      {
 *        key: 'yourNewWidget',
 *        label: 'Your Widget',
 *        description: 'Widget description',
 *        icon: YourIcon
 *      },
 *    ];
 */

export default [YourFeature]Widget;

