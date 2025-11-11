/**
 * Preloaded Data Loader
 * 
 * Loads data from bundled JSON files (exported at build time)
 * This provides instant access to all data without any API calls
 */

interface PreloadedData {
  table: string;
  exportedAt: string;
  count: number;
  data: any[];
}

interface PreloadManifest {
  exportedAt: string;
  version: string;
  tables: string[];
  summary: Record<string, any>;
  totalRecords: number;
  totalSize: string;
}

class PreloadedDataLoader {
  private cache: Map<string, any[]> = new Map();
  private manifest: PreloadManifest | null = null;
  private isLoaded: boolean = false;

  /**
   * Load manifest file
   */
  async loadManifest(): Promise<PreloadManifest | null> {
    if (this.manifest) return this.manifest;

    try {
      const response = await fetch('/preload-data/manifest.json');
      if (!response.ok) {
        console.warn('⚠️ [PreloadData] Manifest not found - preloaded data not available');
        return null;
      }

      this.manifest = await response.json();
      console.log('✅ [PreloadData] Manifest loaded:', this.manifest.totalRecords, 'records');
      return this.manifest;
    } catch (error) {
      console.warn('⚠️ [PreloadData] Failed to load manifest:', error);
      return null;
    }
  }

  /**
   * Load data from a specific table
   */
  async loadTable(tableName: string): Promise<any[]> {
    // Check cache first
    if (this.cache.has(tableName)) {
      console.log(`📦 [PreloadData] Using cached ${tableName}`);
      return this.cache.get(tableName)!;
    }

    try {
      console.log(`📥 [PreloadData] Loading ${tableName} from bundle...`);
      const response = await fetch(`/preload-data/${tableName}.json`);
      
      if (!response.ok) {
        console.warn(`⚠️ [PreloadData] ${tableName} not found in bundle`);
        return [];
      }

      const preloadedData: PreloadedData = await response.json();
      
      // Cache the data
      this.cache.set(tableName, preloadedData.data);
      
      console.log(`✅ [PreloadData] Loaded ${preloadedData.count} records from ${tableName}`);
      console.log(`   Exported at: ${new Date(preloadedData.exportedAt).toLocaleString()}`);
      
      return preloadedData.data;
    } catch (error) {
      console.error(`❌ [PreloadData] Failed to load ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Load all preloaded data into IndexedDB cache
   */
  async loadAllIntoCache(): Promise<{
    success: boolean;
    loaded: string[];
    failed: string[];
  }> {
    console.log('🚀 [PreloadData] Loading all preloaded data...');

    const loaded: string[] = [];
    const failed: string[] = [];

    try {
      // Load manifest
      const manifest = await this.loadManifest();
      if (!manifest) {
        console.warn('⚠️ [PreloadData] No manifest found - skipping preload');
        return { success: false, loaded, failed };
      }

      // Import cache manager
      const { smartCache } = await import('./enhancedCacheManager');

      // Load each table and save to IndexedDB
      for (const tableName of manifest.tables) {
        try {
          console.log(`📥 [PreloadData] Processing ${tableName}...`);
          const data = await this.loadTable(tableName);
          
          if (data.length > 0) {
            // Map table names to cache store names
            const storeMapping: Record<string, string> = {
              'lats_products': 'products',
              'lats_customers': 'customers',
              'lats_sales': 'sales',
              'lats_branches': 'branches',
              'lats_categories': 'categories',
              'lats_suppliers': 'suppliers',
              'finance_accounts': 'payment_accounts'
            };

            const storeName = storeMapping[tableName] || tableName;

            // Save to IndexedDB
            const validStores = ['products', 'customers', 'sales', 'branches', 'categories', 'suppliers', 'payment_accounts'];
            if (validStores.includes(storeName)) {
              await smartCache.saveToCache(storeName as any, data);
              console.log(`💾 [PreloadData] Saved ${data.length} ${storeName} to cache`);
            }

            loaded.push(tableName);
          }
        } catch (error) {
          console.error(`❌ [PreloadData] Failed to process ${tableName}:`, error);
          failed.push(tableName);
        }
      }

      this.isLoaded = true;

      console.log('✅ [PreloadData] Preload complete!');
      console.log(`   Loaded: ${loaded.join(', ')}`);
      if (failed.length > 0) {
        console.log(`   Failed: ${failed.join(', ')}`);
      }

      return {
        success: failed.length === 0,
        loaded,
        failed
      };
    } catch (error) {
      console.error('❌ [PreloadData] Fatal error during preload:', error);
      return { success: false, loaded, failed };
    }
  }

  /**
   * Check if preloaded data is available
   */
  async hasPreloadedData(): Promise<boolean> {
    const manifest = await this.loadManifest();
    return manifest !== null && manifest.totalRecords > 0;
  }

  /**
   * Get preload statistics
   */
  async getStats() {
    const manifest = await this.loadManifest();
    return {
      available: manifest !== null,
      manifest,
      isLoaded: this.isLoaded,
      cachedTables: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.isLoaded = false;
    console.log('🗑️ [PreloadData] Cache cleared');
  }
}

// Export singleton instance
export const preloadedDataLoader = new PreloadedDataLoader();

/**
 * Helper function to check if we should use preloaded data
 */
export async function shouldUsePreloadedData(): Promise<boolean> {
  // Always use preloaded data if available
  return await preloadedDataLoader.hasPreloadedData();
}

/**
 * Initialize preloaded data on app start
 */
export async function initializePreloadedData(): Promise<boolean> {
  try {
    console.log('🚀 [PreloadData] Initializing preloaded data...');
    
    // Check if preloaded data exists
    const hasData = await preloadedDataLoader.hasPreloadedData();
    
    if (!hasData) {
      console.log('ℹ️ [PreloadData] No preloaded data available - will fetch from API');
      return false;
    }

    console.log('📦 [PreloadData] Preloaded data detected - loading into cache...');
    
    // Load all data into IndexedDB cache
    const result = await preloadedDataLoader.loadAllIntoCache();
    
    if (result.success) {
      console.log('✅ [PreloadData] All data preloaded successfully!');
      console.log('⚡ [PreloadData] App will load instantly on next launch!');
      return true;
    } else {
      console.warn('⚠️ [PreloadData] Some data failed to preload');
      return false;
    }
  } catch (error) {
    console.error('❌ [PreloadData] Failed to initialize preloaded data:', error);
    return false;
  }
}

