/**
 * Offline Mode Toggle Component
 * Allows users to switch between online and offline database modes
 */

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Wifi, WifiOff, Database, HardDrive } from 'lucide-react';

interface OfflineModeToggleProps {
  variant?: 'button' | 'switch' | 'status';
  className?: string;
}

const OfflineModeToggle: React.FC<OfflineModeToggleProps> = ({
  variant = 'button',
  className = ''
}) => {
  const { isOffline, isInitialized, migrationStatus, toggleOfflineMode } = useDatabase();

  const handleToggle = () => {
    toggleOfflineMode();
    // Reload the page to apply the database change
    window.location.reload();
  };

  if (variant === 'status') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isOffline ? (
          <>
            <HardDrive className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-orange-700">Offline Mode</span>
            {isInitialized && (
              <span className="text-xs text-gray-500">
                v{migrationStatus?.version || 0}
              </span>
            )}
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">Online Mode</span>
          </>
        )}
      </div>
    );
  }

  if (variant === 'switch') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <span className="text-sm font-medium">
          {isOffline ? 'Offline' : 'Online'} Mode
        </span>
        <button
          onClick={handleToggle}
          className={`
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            ${isOffline ? 'bg-orange-500' : 'bg-green-500'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${isOffline ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
        <div className="flex items-center gap-1">
          {isOffline ? (
            <HardDrive className="w-4 h-4 text-orange-500" />
          ) : (
            <Wifi className="w-4 h-4 text-green-500" />
          )}
        </div>
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleToggle}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
        ${isOffline
          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
          : 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300'
        }
        ${className}
      `}
      title={isOffline ? 'Switch to online mode' : 'Switch to offline mode'}
    >
      {isOffline ? (
        <>
          <HardDrive className="w-4 h-4" />
          <span>Offline Mode</span>
          {isInitialized && (
            <span className="text-xs opacity-75">v{migrationStatus?.version || 0}</span>
          )}
        </>
      ) : (
        <>
          <Wifi className="w-4 h-4" />
          <span>Online Mode</span>
        </>
      )}
    </button>
  );
};

export default OfflineModeToggle;
