import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import getConfig from '../config/appConfig';
import { featureToggleService } from '../services/featureToggleService';

interface ConfigContextType {
  config: any;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load base config synchronously
      const baseConfig = getConfig();

      // Load feature toggles asynchronously in production
      if (import.meta.env.MODE === 'production') {
        try {
          await featureToggleService.initialize();

          // Update config with dynamic features
          const dynamicFeatures = {
            loyaltyProgram: featureToggleService.isEnabled('loyalty_program'),
            inventoryManagement: featureToggleService.isEnabled('inventory_management'),
            customerPortal: featureToggleService.isEnabled('customer_portal'),
            whatsappIntegration: featureToggleService.isEnabled('whatsapp_integration'),
            paymentProcessing: featureToggleService.isEnabled('payment_processing'),
            aiAssistant: featureToggleService.isEnabled('ai_assistant'),
            advancedAnalytics: featureToggleService.isEnabled('advanced_analytics'),
            bulkOperations: featureToggleService.isEnabled('bulk_operations'),
            multiBranch: featureToggleService.isEnabled('multi_branch'),
            barcodeScanning: featureToggleService.isEnabled('barcode_scanning'),
            arTryOn: featureToggleService.isEnabled('ar_try_on'),
            voiceCommands: featureToggleService.isEnabled('voice_commands'),
            predictivePricing: featureToggleService.isEnabled('predictive_pricing'),
            blockchainTracking: featureToggleService.isEnabled('blockchain_tracking'),
            subscriptionBilling: featureToggleService.isEnabled('subscription_billing'),
            marketplaceIntegration: featureToggleService.isEnabled('marketplace_integration'),
            advancedWorkflow: featureToggleService.isEnabled('advanced_workflow'),
          };

          const updatedConfig = {
            ...baseConfig,
            features: dynamicFeatures,
          };

          setConfig(updatedConfig);
        } catch (featureError) {
          console.error('Failed to load feature toggles:', featureError);
          // Use base config with default features
          setConfig(baseConfig);
        }
      } else {
        // In development, use base config (all features enabled by default)
        setConfig(baseConfig);
      }
    } catch (err) {
      console.error('Failed to load config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      // Set a fallback config
      setConfig(getConfig());
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const value: ConfigContextType = {
    config,
    loading,
    error,
    refreshConfig,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = (): ConfigContextType => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};

// Convenience hook for checking feature status
export const useFeature = (featureKey: string): boolean => {
  const { config, loading } = useConfig();

  if (loading || !config) {
    return false; // Default to disabled while loading
  }

  return config.features?.[featureKey] ?? false;
};
