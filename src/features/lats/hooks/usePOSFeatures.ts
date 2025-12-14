// Custom hook to manage POS feature toggles
import { useState, useEffect } from 'react';

export interface POSFeatures {
  enableDelivery: boolean;
  enableLoyaltyProgram: boolean;
  enableCustomerProfiles: boolean;
  enablePaymentTracking: boolean;
  enableDynamicPricing: boolean;
}

const DEFAULT_FEATURES: POSFeatures = {
  enableDelivery: false,
  enableLoyaltyProgram: true,
  enableCustomerProfiles: true,
  enablePaymentTracking: true,
  enableDynamicPricing: true,
};

/**
 * Hook to access POS feature toggles from localStorage
 * Features are stored in 'lats-pos-features' localStorage key
 */
export const usePOSFeatures = () => {
  const [features, setFeatures] = useState<POSFeatures>(DEFAULT_FEATURES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load features from localStorage
    const loadFeatures = () => {
      try {
        const saved = localStorage.getItem('lats-pos-features');
        if (saved) {
          const parsed = JSON.parse(saved);
          setFeatures({ ...DEFAULT_FEATURES, ...parsed });
        }
      } catch (error) {
        console.error('Error loading POS features:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFeatures();

    // Listen for storage changes (in case settings are updated in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lats-pos-features' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setFeatures({ ...DEFAULT_FEATURES, ...parsed });
        } catch (error) {
          console.error('Error parsing updated features:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Method to update features (useful for runtime updates)
  const updateFeatures = (newFeatures: Partial<POSFeatures>) => {
    const updated = { ...features, ...newFeatures };
    setFeatures(updated);
    localStorage.setItem('lats-pos-features', JSON.stringify(updated));
  };

  // Individual feature checkers
  const isDeliveryEnabled = () => features.enableDelivery;
  const isLoyaltyEnabled = () => features.enableLoyaltyProgram;
  const isCustomerProfilesEnabled = () => features.enableCustomerProfiles;
  const isPaymentTrackingEnabled = () => features.enablePaymentTracking;
  const isDynamicPricingEnabled = () => features.enableDynamicPricing;

  return {
    features,
    isLoading,
    updateFeatures,
    isDeliveryEnabled,
    isLoyaltyEnabled,
    isCustomerProfilesEnabled,
    isPaymentTrackingEnabled,
    isDynamicPricingEnabled,
  };
};

