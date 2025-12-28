/**
 * Database Status Indicator
 * Shows database connection status, sync status, and offline mode
 */

import React from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Wifi, WifiOff, HardDrive, RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface DatabaseStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

const DatabaseStatusIndicator: React.FC<DatabaseStatusIndicatorProps> = ({
  showDetails = false,
  className = ''
}) => {
  const { isOffline, isInitialized, isSyncing, lastSyncResult } = useDatabase();

  const getStatusInfo = () => {
    if (isOffline) {
      return {
        icon: <HardDrive className="w-4 h-4 text-orange-500" />,
        text: 'Offline Database',
        color: 'text-orange-700',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }

    if (!navigator.onLine) {
      return {
        icon: <WifiOff className="w-4 h-4 text-red-500" />,
        text: 'Offline',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    if (isSyncing) {
      return {
        icon: <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />,
        text: 'Syncing...',
        color: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    }

    if (lastSyncResult?.success) {
      return {
        icon: <CheckCircle className="w-4 h-4 text-green-500" />,
        text: 'Synced',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    if (lastSyncResult && !lastSyncResult.success) {
      return {
        icon: <XCircle className="w-4 h-4 text-red-500" />,
        text: 'Sync Failed',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    }

    return {
      icon: <Wifi className="w-4 h-4 text-green-500" />,
      text: 'Online',
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    };
  };

  const statusInfo = getStatusInfo();

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${statusInfo.bgColor} ${statusInfo.borderColor} border ${className}`}>
        {statusInfo.icon}
        <span className={statusInfo.color}>{statusInfo.text}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Database Status</h3>
        <div className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs ${statusInfo.bgColor} ${statusInfo.borderColor} border`}>
          {statusInfo.icon}
          <span className={statusInfo.color}>{statusInfo.text}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Mode:</span>
          <span className="font-medium">{isOffline ? 'Offline (Local)' : 'Online (Remote)'}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span className="font-medium">{isInitialized ? 'Ready' : 'Initializing...'}</span>
        </div>

        {lastSyncResult && (
          <>
            <div className="flex justify-between">
              <span className="text-gray-600">Last Sync:</span>
              <span className="font-medium">
                {lastSyncResult.success ? 'Success' : 'Failed'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Records Synced:</span>
              <span className="font-medium">{lastSyncResult.totalRecords}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Duration:</span>
              <span className="font-medium">{lastSyncResult.duration}ms</span>
            </div>

            {lastSyncResult.errors.length > 0 && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                <div className="flex items-center gap-1 text-red-700 font-medium mb-1">
                  <AlertCircle className="w-3 h-3" />
                  Sync Errors
                </div>
                <ul className="text-red-600 space-y-1">
                  {lastSyncResult.errors.slice(0, 3).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {lastSyncResult.errors.length > 3 && (
                    <li>• ...and {lastSyncResult.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </>
        )}

        {isOffline && (
          <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            <div className="flex items-center gap-1 font-medium mb-1">
              <HardDrive className="w-3 h-3" />
              Offline Mode Active
            </div>
            <div>Data is stored locally. Changes will sync when online.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseStatusIndicator;
