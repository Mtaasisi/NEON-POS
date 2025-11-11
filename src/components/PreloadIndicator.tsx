/**
 * PreloadIndicator Component
 * Shows progress during initial data preload at login
 */

import React from 'react';
import { usePreloadStatus } from '../stores/useDataStore';

const PreloadIndicator: React.FC = () => {
  const { isPreloading, progress, status } = usePreloadStatus();

  if (!isPreloading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Loading Icon */}
          <div className="mx-auto w-16 h-16 mb-6">
            <svg className="animate-spin h-16 w-16 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Loading Your Data
          </h2>
          
          {/* Status */}
          <p className="text-gray-600 mb-6">
            {status}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Progress Percentage */}
          <p className="text-sm font-medium text-gray-700">
            {progress}% Complete
          </p>

          {/* Hint */}
          <p className="text-xs text-gray-500 mt-4">
            This only happens once at login. Future page switches will be instant! 
          </p>
        </div>
      </div>
    </div>
  );
};

export default PreloadIndicator;

