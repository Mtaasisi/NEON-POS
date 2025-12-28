/**
 * Floating Offline Mode Toggle
 * A floating action button for switching between online/offline modes
 */

import React, { useState } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { Wifi, WifiOff, HardDrive, Settings, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import OfflineModeToggle from './OfflineModeToggle';

const FloatingOfflineToggle: React.FC = () => {
  const { isOffline, isInitialized, isSyncing, lastSyncResult, syncData } = useDatabase();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSync = async () => {
    await syncData();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2 bg-white rounded-lg shadow-lg border p-4 min-w-64">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Database Mode</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isOffline ? 'bg-orange-500' : 'bg-green-500'}`} />
              <span className="text-sm font-medium">
                {isOffline ? 'Offline Mode' : 'Online Mode'}
              </span>
            </div>

            <OfflineModeToggle variant="switch" />

            {!isOffline && (
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-600">
                  {isSyncing ? 'Syncing data...' : 'Data synchronization'}
                </div>
                <button
                  onClick={handleSync}
                  disabled={isSyncing || !navigator.onLine}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
                    ${isSyncing
                      ? 'bg-blue-100 text-blue-700 cursor-not-allowed'
                      : !navigator.onLine
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }
                  `}
                >
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Syncing</span>
                    </>
                  ) : lastSyncResult?.success ? (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Sync</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3 h-3" />
                      <span>Sync</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {lastSyncResult && (
              <div className="text-xs bg-gray-50 p-2 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">Last Sync:</span>
                  <span className={lastSyncResult.success ? 'text-green-600' : 'text-red-600'}>
                    {lastSyncResult.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <div className="text-gray-600">
                  {lastSyncResult.totalRecords} records, {lastSyncResult.duration}ms
                </div>
              </div>
            )}

            {isOffline && isInitialized && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <HardDrive className="w-3 h-3" />
                  <span>Local SQLite Database</span>
                </div>
                <div>Data is stored locally in your browser</div>
              </div>
            )}

            {!isOffline && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <Wifi className="w-3 h-3" />
                  <span>Remote Database</span>
                </div>
                <div>Data is stored on remote servers</div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-14 h-14 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center
          ${isOffline
            ? 'bg-orange-500 hover:bg-orange-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
          }
          ${isExpanded ? 'scale-110' : 'hover:scale-105'}
        `}
        title={isOffline ? 'Offline Mode Active' : 'Online Mode Active'}
      >
        {isOffline ? (
          <HardDrive className="w-6 h-6" />
        ) : (
          <Wifi className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};

export default FloatingOfflineToggle;
