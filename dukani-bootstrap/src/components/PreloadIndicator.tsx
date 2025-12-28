/**
 * PreloadIndicator Component - Bootstrap Version
 * Simplified loading indicator for bootstrap
 */

import React from 'react';

const PreloadIndicator: React.FC = () => {
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
    </div>
  );
};

export default PreloadIndicator;
