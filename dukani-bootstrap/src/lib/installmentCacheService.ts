/**
 * Installment Cache Service
 * Implements localStorage caching for faster installment plan loading
 */

interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
  branchId?: string; // Cache per branch
}

const CACHE_VERSION = '1.0';
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

class InstallmentCacheService {
  private static readonly INSTALLMENTS_KEY_PREFIX = 'pos_installments_cache_';
  
  /**
   * Get cache key for a specific branch
   */
  private getCacheKey(branchId?: string): string {
    return `${InstallmentCacheService.INSTALLMENTS_KEY_PREFIX}${branchId || 'default'}`;
  }
  
  /**
   * Save installment plans to localStorage
   */
  saveInstallments(installments: any[], branchId?: string): void {
    try {
      const cached: CachedData<any[]> = {
        data: installments,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        branchId
      };
      localStorage.setItem(this.getCacheKey(branchId), JSON.stringify(cached));
    } catch (error) {
      console.warn('⚠️ [InstallmentCache] Failed to save installments:', error);
    }
  }
  
  /**
   * Get installment plans from localStorage
   */
  getInstallments(branchId?: string): any[] | null {
    try {
      const cached = localStorage.getItem(this.getCacheKey(branchId));
      if (!cached) {
        return null;
      }
      
      const data: CachedData<any[]> = JSON.parse(cached);
      
      // Check version
      if (data.version !== CACHE_VERSION) {
        this.clearInstallments(branchId);
        return null;
      }
      
      // Check if branch matches (if branchId provided)
      if (branchId && data.branchId && data.branchId !== branchId) {
        this.clearInstallments(data.branchId);
        return null;
      }
      
      // Check expiry
      const age = Date.now() - data.timestamp;
      if (age > CACHE_DURATION) {
        this.clearInstallments(branchId);
        return null;
      }
      
      return data.data;
    } catch (error) {
      console.warn('⚠️ [InstallmentCache] Failed to read installments cache:', error);
      return null;
    }
  }
  
  /**
   * Clear installment plans cache for a specific branch
   */
  clearInstallments(branchId?: string): void {
    localStorage.removeItem(this.getCacheKey(branchId));
  }
  
  /**
   * Clear all installment caches
   */
  clearAll(): void {
    // Clear all installment caches
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(InstallmentCacheService.INSTALLMENTS_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
  
  /**
   * Check if cache exists and is valid
   */
  hasValidCache(branchId?: string): boolean {
    return this.getInstallments(branchId) !== null;
  }
}

export const installmentCacheService = new InstallmentCacheService();

