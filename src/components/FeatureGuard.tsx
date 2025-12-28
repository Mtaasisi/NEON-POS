import React, { useState, useEffect } from 'react';
import { featureToggleService } from '../services/featureToggleService';

interface FeatureGuardProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

/**
 * FeatureGuard component that conditionally renders children based on feature toggle state
 * In development: all features are enabled
 * In production: only enabled features are shown
 */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({
  feature,
  children,
  fallback = null,
  showLoading = false
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        // In development, all features are enabled by default
        if (import.meta.env.MODE === 'development') {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        // In production, check feature toggle service
        await featureToggleService.initialize();
        const enabled = featureToggleService.isEnabled(feature);
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Error checking feature ${feature}:`, error);
        // Default to disabled on error
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeature();
  }, [feature]);

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300"></div>
        <span className="ml-2 text-sm text-gray-500">Loading feature...</span>
      </div>
    );
  }

  if (loading) {
    return null; // Don't render anything while loading
  }

  // In production mode, completely hide disabled features (don't show fallback)
  // In development mode, show fallback for disabled features to help with testing
  if (import.meta.env.MODE === 'production') {
    return isEnabled ? <>{children}</> : null;
  }

  // In development, show fallback for disabled features
  return isEnabled ? <>{children}</> : <>{fallback}</>;
};

interface FeatureToggleProps {
  feature: string;
  children: (isEnabled: boolean) => React.ReactNode;
  showLoading?: boolean;
}

/**
 * FeatureToggle component that provides the feature state to its children function
 */
export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  feature,
  children,
  showLoading = false
}) => {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        if (import.meta.env.MODE === 'development') {
          setIsEnabled(true);
          setLoading(false);
          return;
        }

        await featureToggleService.initialize();
        const enabled = featureToggleService.isEnabled(feature);
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Error checking feature ${feature}:`, error);
        setIsEnabled(false);
      } finally {
        setLoading(false);
      }
    };

    checkFeature();
  }, [feature]);

  if (loading && showLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300"></div>
        <span className="ml-2 text-sm text-gray-500">Loading feature...</span>
      </div>
    );
  }

  if (loading) {
    return null;
  }

  return <>{children(isEnabled || false)}</>;
};

// Export convenience hooks
export const useFeatureToggle = (feature: string): boolean => {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkFeature = async () => {
      try {
        if (import.meta.env.MODE === 'development') {
          setIsEnabled(true);
          return;
        }

        await featureToggleService.initialize();
        const enabled = featureToggleService.isEnabled(feature);
        setIsEnabled(enabled);
      } catch (error) {
        console.error(`Error checking feature ${feature}:`, error);
        setIsEnabled(false);
      }
    };

    checkFeature();
  }, [feature]);

  return isEnabled;
};

export const useMultipleFeatures = (...features: string[]): Record<string, boolean> => {
  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const checkFeatures = async () => {
      try {
        if (import.meta.env.MODE === 'development') {
          const states = features.reduce((acc, feature) => {
            acc[feature] = true;
            return acc;
          }, {} as Record<string, boolean>);
          setFeatureStates(states);
          return;
        }

        await featureToggleService.initialize();
        const states = features.reduce((acc, feature) => {
          acc[feature] = featureToggleService.isEnabled(feature);
          return acc;
        }, {} as Record<string, boolean>);
        setFeatureStates(states);
      } catch (error) {
        console.error('Error checking multiple features:', error);
        const states = features.reduce((acc, feature) => {
          acc[feature] = false;
          return acc;
        }, {} as Record<string, boolean>);
        setFeatureStates(states);
      }
    };

    checkFeatures();
  }, [features]);

  return featureStates;
};
