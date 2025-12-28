import React from 'react';
import CircularProgress from './CircularProgress';

interface ModernLoadingOverlayProps {
  /** Message to display below the spinner (optional) */
  message?: string;
  /** Size of the spinner (default: 80) */
  size?: number;
  /** Color of the spinner (default: 'blue') */
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'white';
  /** Whether to show as fullscreen overlay (default: true) */
  fullscreen?: boolean;
  /** Custom z-index (default: 9999) */
  zIndex?: number;
}

/**
 * Modern loading overlay with glassmorphism design
 * Consistent loading experience across the entire app
 */
const ModernLoadingOverlay: React.FC<ModernLoadingOverlayProps> = ({
  message,
  size = 80,
  color = 'blue',
  fullscreen = true,
  zIndex = 9999
}) => {
  if (fullscreen) {
    return (
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center" 
        style={{ zIndex }}
      >
        <div className="relative text-center bg-white rounded-3xl shadow-2xl border border-gray-200 p-10">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800/10 via-blue-800/10 to-gray-800/10 rounded-3xl"></div>
          <div className="relative">
            <CircularProgress size={size} strokeWidth={6} color={color} />
            {message && (
              <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline loading (for smaller components)
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <CircularProgress size={size} strokeWidth={6} color={color} />
        {message && (
          <p className="mt-4 text-sm font-medium text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
};

export default ModernLoadingOverlay;

