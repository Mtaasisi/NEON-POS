/**
 * Global Data Store - Centralized cache for all app data
 * Preloads data at login and maintains cache across page switches
 * Eliminates repetitive fetching when switching pages
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Types
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_spent?: number;
  points?: number;
  loyalty_level?: string;
  [key: string]: any;
}

export interface Product {
  id: string;
  name: string;
  sku?: string;
  price?: number;
  stock_quantity?: number;
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  [key: string]: any;
}

export interface Supplier {
  id: string;
  name: string;
  [key: string]: any;
}

export interface Branch {
  id: string;
  name: string;
  [key: string]: any;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  [key: string]: any;
}

export interface Device {
  id: string;
  [key: string]: any;
}

export interface Settings {
  [key: string]: any;
}

export interface Sale {
  id: string;
  [key: string]: any;
}

interface CacheMetadata {
  timestamp: number;
  isStale: boolean;
  lastUpdated: string;
}

interface DataState {
  // Cache data
  customers: Customer[];
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  branches: Branch[];
  users: User[];
  devices: Device[];
  sales: Sale[];
  settings: Settings | null;

  // Cache metadata
  cache: {
    customers: CacheMetadata;
    products: CacheMetadata;
    categories: CacheMetadata;
    suppliers: CacheMetadata;
    branches: CacheMetadata;
    users: CacheMetadata;
    devices: CacheMetadata;
    sales: CacheMetadata;
    settings: CacheMetadata;
  };

  // Loading states
  isPreloading: boolean;
  preloadProgress: number;
  preloadStatus: string;
  isLoaded: boolean;

  // Error handling
  errors: Record<string, string>;

  // Configuration
  CACHE_DURATION: number; // milliseconds
  PRELOAD_BATCH_SIZE: number;

  // Actions
  setCustomers: (customers: Customer[]) => void;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setSuppliers: (suppliers: Supplier[]) => void;
  setBranches: (branches: Branch[]) => void;
  setUsers: (users: User[]) => void;
  setDevices: (devices: Device[]) => void;
  setSales: (sales: Sale[]) => void;
  setSettings: (settings: Settings) => void;

  // Preload actions
  setPreloadProgress: (progress: number, status: string) => void;
  setPreloading: (isPreloading: boolean) => void;
  markAsLoaded: () => void;

  // Cache management
  isCacheValid: (dataType: string) => boolean;
  invalidateCache: (dataType: string) => void;
  invalidateAllCache: () => void;
  updateCacheTimestamp: (dataType: string) => void;

  // Error management
  setError: (dataType: string, error: string) => void;
  clearError: (dataType: string) => void;
  clearAllErrors: () => void;

  // Data getters with cache validation
  getCustomers: () => Customer[];
  getProducts: () => Product[];
  getCategories: () => Category[];
  getSuppliers: () => Supplier[];
  getBranches: () => Branch[];

  // Utility
  clearAllData: () => void;
  getPreloadSummary: () => any;
}

const createCacheMetadata = (): CacheMetadata => ({
  timestamp: Date.now(),
  isStale: false,
  lastUpdated: new Date().toISOString()
});

export const useDataStore = create<DataState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial data
        customers: [],
        products: [],
        categories: [],
        suppliers: [],
        branches: [],
        users: [],
        devices: [],
        sales: [],
        settings: null,

        // Initial cache metadata
        cache: {
          customers: createCacheMetadata(),
          products: createCacheMetadata(),
          categories: createCacheMetadata(),
          suppliers: createCacheMetadata(),
          branches: createCacheMetadata(),
          users: createCacheMetadata(),
          devices: createCacheMetadata(),
          sales: createCacheMetadata(),
          settings: createCacheMetadata(),
        },

        // Initial loading states
        isPreloading: false,
        preloadProgress: 0,
        preloadStatus: 'Not started',
        isLoaded: false,

        // Initial errors
        errors: {},

        // Configuration
        CACHE_DURATION: 15 * 60 * 1000, // 15 minutes
        PRELOAD_BATCH_SIZE: 100,

        // Set data actions
        setCustomers: (customers) => {
          set({ customers });
          get().updateCacheTimestamp('customers');
        },
        
        setProducts: (products) => {
          set({ products });
          get().updateCacheTimestamp('products');
        },
        
        setCategories: (categories) => {
          set({ categories });
          get().updateCacheTimestamp('categories');
        },
        
        setSuppliers: (suppliers) => {
          set({ suppliers });
          get().updateCacheTimestamp('suppliers');
        },
        
        setBranches: (branches) => {
          set({ branches });
          get().updateCacheTimestamp('branches');
        },
        
        setUsers: (users) => {
          set({ users });
          get().updateCacheTimestamp('users');
        },
        
        setDevices: (devices) => {
          set({ devices });
          get().updateCacheTimestamp('devices');
        },
        
        setSales: (sales) => {
          set({ sales });
          get().updateCacheTimestamp('sales');
        },
        
        setSettings: (settings) => {
          set({ settings });
          get().updateCacheTimestamp('settings');
        },

        // Preload actions
        setPreloadProgress: (progress, status) => {
          set({ preloadProgress: progress, preloadStatus: status });
        },

        setPreloading: (isPreloading) => {
          set({ isPreloading });
        },

        markAsLoaded: () => {
          set({ isLoaded: true, isPreloading: false, preloadProgress: 100 });
        },

        // Cache management
        isCacheValid: (dataType: string) => {
          const state = get();
          const cacheData = state.cache[dataType as keyof typeof state.cache];
          
          if (!cacheData || cacheData.isStale) return false;
          
          const age = Date.now() - cacheData.timestamp;
          return age < state.CACHE_DURATION;
        },

        invalidateCache: (dataType: string) => {
          set((state) => ({
            cache: {
              ...state.cache,
              [dataType]: {
                ...state.cache[dataType as keyof typeof state.cache],
                isStale: true
              }
            }
          }));
        },

        invalidateAllCache: () => {
          const state = get();
          const newCache = { ...state.cache };
          
          Object.keys(newCache).forEach(key => {
            newCache[key as keyof typeof newCache] = {
              ...newCache[key as keyof typeof newCache],
              isStale: true
            };
          });
          
          set({ cache: newCache });
        },

        updateCacheTimestamp: (dataType: string) => {
          set((state) => ({
            cache: {
              ...state.cache,
              [dataType]: {
                timestamp: Date.now(),
                isStale: false,
                lastUpdated: new Date().toISOString()
              }
            }
          }));
        },

        // Error management
        setError: (dataType, error) => {
          set((state) => ({
            errors: { ...state.errors, [dataType]: error }
          }));
        },

        clearError: (dataType) => {
          set((state) => {
            const newErrors = { ...state.errors };
            delete newErrors[dataType];
            return { errors: newErrors };
          });
        },

        clearAllErrors: () => {
          set({ errors: {} });
        },

        // Data getters with cache validation
        getCustomers: () => {
          const state = get();
          if (!state.isCacheValid('customers')) {
            console.warn('⚠️ Customers cache is stale');
          }
          return state.customers;
        },

        getProducts: () => {
          const state = get();
          if (!state.isCacheValid('products')) {
            console.warn('⚠️ Products cache is stale');
          }
          return state.products;
        },

        getCategories: () => {
          const state = get();
          if (!state.isCacheValid('categories')) {
            console.warn('⚠️ Categories cache is stale');
          }
          return state.categories;
        },

        getSuppliers: () => {
          const state = get();
          if (!state.isCacheValid('suppliers')) {
            console.warn('⚠️ Suppliers cache is stale');
          }
          return state.suppliers;
        },

        getBranches: () => {
          const state = get();
          if (!state.isCacheValid('branches')) {
            console.warn('⚠️ Branches cache is stale');
          }
          return state.branches;
        },

        // Utility
        clearAllData: () => {
          set({
            customers: [],
            products: [],
            categories: [],
            suppliers: [],
            branches: [],
            users: [],
            devices: [],
            sales: [],
            settings: null,
            isLoaded: false,
            preloadProgress: 0,
            preloadStatus: 'Not started',
            errors: {}
          });
          get().invalidateAllCache();
        },

        getPreloadSummary: () => {
          const state = get();
          return {
            isLoaded: state.isLoaded,
            progress: state.preloadProgress,
            status: state.preloadStatus,
            dataCounts: {
              customers: state.customers.length,
              products: state.products.length,
              categories: state.categories.length,
              suppliers: state.suppliers.length,
              branches: state.branches.length,
              users: state.users.length,
              devices: state.devices.length,
              sales: state.sales.length,
            },
            cacheStatus: Object.keys(state.cache).map(key => ({
              dataType: key,
              valid: state.isCacheValid(key),
              age: Date.now() - state.cache[key as keyof typeof state.cache].timestamp,
              lastUpdated: state.cache[key as keyof typeof state.cache].lastUpdated
            })),
            errors: state.errors
          };
        },
      }),
      {
        name: 'app-data-cache',
        partialize: (state) => ({
          // ⚠️ Don't persist large data arrays to localStorage (quota limit!)
          // Only persist metadata - actual data is in IndexedDB via smartCache
          cache: state.cache,
          isLoaded: state.isLoaded,
        }),
      }
    ),
    { name: 'DataStore' }
  )
);

// Export convenience hooks
export const useCustomersData = () => useDataStore((state) => state.customers);
export const useProductsData = () => useDataStore((state) => state.products);
export const useCategoriesData = () => useDataStore((state) => state.categories);
export const useSuppliersData = () => useDataStore((state) => state.suppliers);
export const useBranchesData = () => useDataStore((state) => state.branches);
export const usePreloadStatus = () => useDataStore((state) => ({
  isPreloading: state.isPreloading,
  progress: state.preloadProgress,
  status: state.preloadStatus,
  isLoaded: state.isLoaded
}));

