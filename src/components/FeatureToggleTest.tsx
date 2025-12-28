import React from 'react';
import { useFeature, useConfig } from '../context/ConfigContext';
import { FeatureGuard, useFeatureToggle } from './FeatureGuard';

/**
 * Simple test component to verify feature toggle system works
 */
export const FeatureToggleTest: React.FC = () => {
  const { config, loading, error } = useConfig();

  // Test different ways of accessing features
  const loyaltyEnabled = useFeature('loyaltyProgram');
  const aiEnabled = useFeatureToggle('ai_assistant');

  if (loading) {
    return <div>Loading configuration...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h3>Feature Toggle Test</h3>

      <div>Environment: {import.meta.env.MODE}</div>

      <div>
        <h4>Config Features:</h4>
        <pre>{JSON.stringify(config?.features, null, 2)}</pre>
      </div>

      <div>
        <h4>Feature Access Tests:</h4>
        <div>Loyalty Program (useFeature): {loyaltyEnabled ? 'ENABLED' : 'DISABLED'}</div>
        <div>AI Assistant (useFeatureToggle): {aiEnabled ? 'ENABLED' : 'DISABLED'}</div>
      </div>

      <div>
        <h4>Feature Guard Test:</h4>
        <FeatureGuard
          feature="ai_assistant"
          fallback={<div>AI Assistant feature is disabled</div>}
        >
          <div>AI Assistant feature is ENABLED!</div>
        </FeatureGuard>
      </div>

      <div>
        <h4>System Status:</h4>
        <div>All feature toggle components loaded successfully!</div>
      </div>
    </div>
  );
};

export default FeatureToggleTest;
