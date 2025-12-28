/**
 * Database Context
 * Manages database connections and switches between local and remote databases
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getConfig } from '../config/appConfig';
import { initializeLocalDatabase, enableAutoSave, disableAutoSave, isDatabaseInitialized } from '../lib/localDatabase';
import { runMigrations, getMigrationStatus } from '../lib/databaseMigration';
import { dataSyncService, SyncResult } from '../lib/dataSync';

interface DatabaseContextType {
  isOffline: boolean;
  isInitialized: boolean;
  migrationStatus: any;
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  toggleOfflineMode: () => void;
  initializeDatabase: () => Promise<void>;
  syncData: () => Promise<SyncResult>;
  forceSyncAll: () => Promise<SyncResult>;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

interface DatabaseProviderProps {
  children: ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [isProviderReady, setIsProviderReady] = useState(false);

  try {
    const config = getConfig();
    const [isOffline, setIsOffline] = useState(config.offline?.enabled || false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<any>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Toggle offline mode
  const toggleOfflineMode = () => {
    const newOfflineMode = !isOffline;
    setIsOffline(newOfflineMode);
    localStorage.setItem('dukani-offline-mode', newOfflineMode.toString());

    if (newOfflineMode) {
      console.log('🔌 Switching to offline mode');
    } else {
      console.log('🌐 Switching to online mode');
    }
  };

  // Initialize database
  const initializeDatabase = async () => {
    try {
      console.log('🗄️ Initializing local database for sync metadata...');
      await initializeLocalDatabase();

      // Run migrations (needed for sync metadata even in online mode)
      const status = await runMigrations();
      setMigrationStatus(status);

      // Enable auto-save
      enableAutoSave();

      setIsInitialized(true);
      console.log('✅ Local database initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize local database:', error);
      setIsInitialized(false);
    }
  };

  // Sync data with remote database
  const syncData = async (): Promise<SyncResult> => {
    if (isOffline || isSyncing) {
      const result: SyncResult = {
        success: false,
        syncedTables: [],
        errors: ['Sync not available in offline mode or sync already in progress'],
        totalRecords: 0,
        duration: 0
      };
      setLastSyncResult(result);
      return result;
    }

    // Ensure database is initialized before syncing
    if (!isDatabaseInitialized()) {
      console.log('🗄️ Database not initialized, initializing before sync...');
      try {
        await initializeDatabase();
        // Wait a bit for initialization to complete
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        const result: SyncResult = {
          success: false,
          syncedTables: [],
          errors: ['Failed to initialize database before sync'],
          totalRecords: 0,
          duration: 0
        };
        setLastSyncResult(result);
        return result;
      }
    }

    setIsSyncing(true);
    try {
      console.log('🔄 Starting data synchronization...');
      const result = await dataSyncService.sync();
      setLastSyncResult(result);
      console.log(`✅ Data sync completed: ${result.totalRecords} records synced`);
      return result;
    } catch (error: any) {
      const result: SyncResult = {
        success: false,
        syncedTables: [],
        errors: [error.message],
        totalRecords: 0,
        duration: 0
      };
      setLastSyncResult(result);
      console.error('❌ Data sync failed:', error);
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  // Force sync all data
  const forceSyncAll = async (): Promise<SyncResult> => {
    if (isOffline || isSyncing) {
      const result: SyncResult = {
        success: false,
        syncedTables: [],
        errors: ['Sync not available in offline mode or sync already in progress'],
        totalRecords: 0,
        duration: 0
      };
      setLastSyncResult(result);
      return result;
    }

    setIsSyncing(true);
    try {
      console.log('🔄 Force syncing all data...');
      const result = await dataSyncService.forceSyncAll();
      setLastSyncResult(result);
      console.log(`✅ Force sync completed: ${result.totalRecords} records synced`);
      return result;
    } catch (error: any) {
      const result: SyncResult = {
        success: false,
        syncedTables: [],
        errors: [error.message],
        totalRecords: 0,
        duration: 0
      };
      setLastSyncResult(result);
      console.error('❌ Force sync failed:', error);
      return result;
    } finally {
      setIsSyncing(false);
    }
  };

  // Initialize on mount
  useEffect(() => {
    // Check localStorage for offline mode preference
    const savedOfflineMode = localStorage.getItem('dukani-offline-mode');
    if (savedOfflineMode !== null) {
      setIsOffline(savedOfflineMode === 'true');
    }

    // Initialize database
    initializeDatabase().then(() => {
      setIsProviderReady(true);
    }).catch(() => {
      setIsProviderReady(true); // Even if init fails, provider is ready
    });

    // Set up periodic sync if auto-sync is enabled
    if (config.offline?.autoSync && !isOffline) {
      const syncInterval = setInterval(() => {
        syncData();
      }, config.offline?.syncInterval || 5 * 60 * 1000);

      return () => clearInterval(syncInterval);
    }
  }, [isOffline]);

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Browser is online');
      if (config.offline?.autoSync) {
        syncData();
      }
    };

    const handleOffline = () => {
      console.log('🔌 Browser is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

    const value: DatabaseContextType = {
      isOffline,
      isInitialized,
      migrationStatus,
      isSyncing,
      lastSyncResult,
      toggleOfflineMode,
      initializeDatabase,
      syncData,
      forceSyncAll
    };

    // Show loading state until provider is ready
    if (!isProviderReady) {
      return (
        <DatabaseContext.Provider value={value}>
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing database...</p>
            </div>
          </div>
        </DatabaseContext.Provider>
      );
    }

    return (
      <DatabaseContext.Provider value={value}>
        {children}
      </DatabaseContext.Provider>
    );
  } catch (error) {
    console.error('❌ DatabaseProvider initialization error:', error);
    // Return a fallback provider with default values
    const fallbackValue: DatabaseContextType = {
      isOffline: false,
      isInitialized: false,
      migrationStatus: null,
      isSyncing: false,
      lastSyncResult: null,
      toggleOfflineMode: () => {},
      initializeDatabase: async () => {},
      syncData: async () => ({ success: false, syncedTables: [], errors: ['Provider initialization failed'], totalRecords: 0, duration: 0 }),
      forceSyncAll: async () => ({ success: false, syncedTables: [], errors: ['Provider initialization failed'], totalRecords: 0, duration: 0 })
    };

    return (
      <DatabaseContext.Provider value={fallbackValue}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="text-red-500 mb-2">⚠️</div>
            <p className="text-gray-600">Database initialization failed. Using offline mode.</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      </DatabaseContext.Provider>
    );
  }
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    // During development/hot reloading, context might not be available temporarily
    // Only log warning in production or if this persists
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ useDatabase called outside DatabaseProvider, using fallback values');
    }

    // Return fallback values when context is not available
    return {
      isOffline: false,
      isInitialized: false,
      migrationStatus: null,
      isSyncing: false,
      lastSyncResult: null,
      toggleOfflineMode: () => {},
      initializeDatabase: async () => {},
      syncData: async () => ({ success: false, syncedTables: [], errors: ['DatabaseProvider not available'], totalRecords: 0, duration: 0 }),
      forceSyncAll: async () => ({ success: false, syncedTables: [], errors: ['DatabaseProvider not available'], totalRecords: 0, duration: 0 })
    };
  }
  return context;
};
