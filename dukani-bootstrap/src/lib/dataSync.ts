/**
 * Data Synchronization Service
 * Syncs data between local SQLite database and remote databases
 */

import { executeQuery, isDatabaseInitialized } from './localDatabase';
import { supabase } from './supabaseClient';

export interface SyncResult {
  success: boolean;
  syncedTables: string[];
  errors: string[];
  totalRecords: number;
  duration: number;
}

export interface SyncOptions {
  tables?: string[];
  direction?: 'local-to-remote' | 'remote-to-local' | 'bidirectional';
  force?: boolean;
  lastSyncTimestamp?: string;
}

// Tables that should be synchronized
const SYNC_TABLES = [
  'lats_products',
  'lats_product_variants',
  'lats_customers',
  'lats_sales',
  'lats_sale_items',
  'store_locations',
  'users'
];

// Sync metadata table
const SYNC_METADATA_TABLE = 'sync_metadata';

export class DataSyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('🌐 Browser is online - data sync available');
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('🔌 Browser is offline - data sync disabled');
    });
  }

  /**
   * Check if sync is possible
   */
  canSync(): boolean {
    return this.isOnline && !this.syncInProgress;
  }

  /**
   * Perform data synchronization
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      syncedTables: [],
      errors: [],
      totalRecords: 0,
      duration: 0
    };

    if (!this.canSync() && !options.force) {
      result.errors.push('Sync not available: offline or sync in progress');
      result.duration = Date.now() - startTime;
      return result;
    }

    if (this.syncInProgress) {
      result.errors.push('Sync already in progress');
      result.duration = Date.now() - startTime;
      return result;
    }

    // Check if local database is initialized for offline sync
    if (!isDatabaseInitialized()) {
      result.errors.push('Local database not initialized. Please wait for database initialization to complete.');
      result.duration = Date.now() - startTime;
      return result;
    }

    this.syncInProgress = true;

    try {
      console.log('🔄 Starting data synchronization...');

      const tablesToSync = options.tables || SYNC_TABLES;
      const direction = options.direction || 'bidirectional';

      // Initialize sync metadata table
      await this.initializeSyncMetadata();

      for (const tableName of tablesToSync) {
        try {
          const tableResult = await this.syncTable(tableName, direction, options.lastSyncTimestamp);
          if (tableResult.success) {
            result.syncedTables.push(tableName);
            result.totalRecords += tableResult.recordsSynced;
            console.log(`✅ Synced ${tableResult.recordsSynced} records for ${tableName}`);
          } else {
            result.errors.push(`${tableName}: ${tableResult.error}`);
          }
        } catch (error: any) {
          result.errors.push(`${tableName}: ${error.message}`);
          console.error(`❌ Failed to sync ${tableName}:`, error);
        }
      }

      result.success = result.errors.length === 0;
      result.duration = Date.now() - startTime;

      // Update last sync timestamp
      if (result.success) {
        await this.updateLastSyncTimestamp();
      }

      console.log(`🔄 Data synchronization ${result.success ? 'completed' : 'failed'} in ${result.duration}ms`);

    } catch (error: any) {
      result.errors.push(`Sync failed: ${error.message}`);
      result.duration = Date.now() - startTime;
      console.error('❌ Data synchronization failed:', error);
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Sync a specific table
   */
  private async syncTable(tableName: string, direction: string, lastSyncTimestamp?: string): Promise<{ success: boolean; recordsSynced: number; error?: string }> {
    const result = { success: false, recordsSynced: 0, error: '' };

    try {
      let localLastSync = lastSyncTimestamp;
      if (!localLastSync) {
        // Get last sync timestamp from metadata
        const metadata = executeQuery(
          'SELECT last_sync FROM sync_metadata WHERE table_name = ?',
          [tableName]
        );
        localLastSync = metadata[0]?.last_sync;
      }

      if (direction === 'local-to-remote' || direction === 'bidirectional') {
        // Sync local changes to remote
        const localChanges = await this.getLocalChanges(tableName, localLastSync);
        if (localChanges.length > 0) {
          const remoteResult = await this.pushToRemote(tableName, localChanges);
          result.recordsSynced += remoteResult.recordsSynced;
        }
      }

      if (direction === 'remote-to-local' || direction === 'bidirectional') {
        // Sync remote changes to local
        const remoteChanges = await this.getRemoteChanges(tableName, localLastSync);
        if (remoteChanges.length > 0) {
          const localResult = await this.pullFromRemote(tableName, remoteChanges);
          result.recordsSynced += localResult.recordsSynced;
        }
      }

      result.success = true;

    } catch (error: any) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Get local changes since last sync
   */
  private async getLocalChanges(tableName: string, since?: string): Promise<any[]> {
    if (!isDatabaseInitialized()) {
      console.warn(`⚠️ Cannot get local changes for ${tableName}: database not initialized`);
      return [];
    }

    let query = `SELECT * FROM ${tableName}`;
    const params: any[] = [];

    if (since) {
      query += ' WHERE updated_at > ?';
      params.push(since);
    }

    return executeQuery(query, params);
  }

  /**
   * Get remote changes since last sync
   */
  private async getRemoteChanges(tableName: string, since?: string): Promise<any[]> {
    try {
      let query = supabase.from(tableName).select('*');

      if (since) {
        query = query.gt('updated_at', since);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.warn(`Failed to get remote changes for ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Push local changes to remote
   */
  private async pushToRemote(tableName: string, changes: any[]): Promise<{ recordsSynced: number }> {
    let synced = 0;

    for (const change of changes) {
      try {
        // Convert local data format to remote format
        const remoteData = this.convertLocalToRemote(tableName, change);

        const { error } = await supabase
          .from(tableName)
          .upsert(remoteData, { onConflict: 'id' });

        if (!error) {
          synced++;
        } else {
          console.warn(`Failed to push ${tableName} record:`, error);
        }
      } catch (error) {
        console.warn(`Failed to push ${tableName} record:`, error);
      }
    }

    return { recordsSynced: synced };
  }

  /**
   * Pull remote changes to local
   */
  private async pullFromRemote(tableName: string, changes: any[]): Promise<{ recordsSynced: number }> {
    let synced = 0;

    for (const change of changes) {
      try {
        // Convert remote data to local format if needed
        const localData = this.convertRemoteToLocal(tableName, change);

        executeQuery(
          `INSERT OR REPLACE INTO ${tableName} (${Object.keys(localData).join(', ')}) VALUES (${Object.keys(localData).map(() => '?').join(', ')})`,
          Object.values(localData)
        );

        synced++;
      } catch (error) {
        console.warn(`Failed to pull ${tableName} record:`, error);
      }
    }

    return { recordsSynced: synced };
  }

  /**
   * Convert remote data format to local format
   */
  private convertRemoteToLocal(tableName: string, remoteData: any): any {
    // Basic conversion - can be extended for specific table requirements
    const localData = { ...remoteData };

    // Convert boolean fields
    Object.keys(localData).forEach(key => {
      if (typeof localData[key] === 'boolean') {
        localData[key] = localData[key] ? 1 : 0;
      }
    });

    return localData;
  }

  /**
   * Convert local data format to remote format
   */
  private convertLocalToRemote(tableName: string, localData: any): any {
    // Basic conversion - can be extended for specific table requirements
    const remoteData = { ...localData };

    // Convert boolean fields (SQLite uses 0/1, PostgreSQL uses true/false)
    Object.keys(remoteData).forEach(key => {
      if (typeof remoteData[key] === 'number' && (remoteData[key] === 0 || remoteData[key] === 1)) {
        // Check if this is likely a boolean field by common naming patterns
        if (key.includes('is_') || key.includes('has_') || key === 'active' || key === 'enabled') {
          remoteData[key] = remoteData[key] === 1;
        }
      }
    });

    // Special handling for lats_products table
    if (tableName === 'lats_products') {
      // Ensure ID is a valid UUID format
      if (remoteData.id && !this.isValidUUID(remoteData.id)) {
        console.warn(`⚠️ Converting invalid product ID ${remoteData.id} to UUID`);
        remoteData.id = crypto.randomUUID();
      }
    }

    return remoteData;
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Initialize sync metadata table
   */
  private async initializeSyncMetadata(): Promise<void> {
    executeQuery(`
      CREATE TABLE IF NOT EXISTS ${SYNC_METADATA_TABLE} (
        table_name TEXT PRIMARY KEY,
        last_sync TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Update last sync timestamp
   */
  private async updateLastSyncTimestamp(): Promise<void> {
    const now = new Date().toISOString();

    for (const tableName of SYNC_TABLES) {
      executeQuery(
        `INSERT OR REPLACE INTO ${SYNC_METADATA_TABLE} (table_name, last_sync, updated_at) VALUES (?, ?, ?)`,
        [tableName, now, now]
      );
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{ tableName: string; lastSync: string | null }[]> {
    try {
      const results = executeQuery(`SELECT table_name, last_sync FROM ${SYNC_METADATA_TABLE}`);
      return results.map(row => ({
        tableName: row.table_name,
        lastSync: row.last_sync
      }));
    } catch (error) {
      console.warn('Failed to get sync status:', error);
      return [];
    }
  }

  /**
   * Force sync all tables
   */
  async forceSyncAll(): Promise<SyncResult> {
    return this.sync({ force: true, direction: 'bidirectional' });
  }

  /**
   * Sync only specific tables
   */
  async syncTables(tableNames: string[]): Promise<SyncResult> {
    return this.sync({ tables: tableNames, direction: 'bidirectional' });
  }
}

// Create singleton instance
export const dataSyncService = new DataSyncService();
