/**
 * Child Variants Cache Service
 * ⚡ Preloads and caches ALL child variants for ALL products
 * This eliminates loading delays when opening variant selection modals
 */

import { supabase } from '../lib/supabaseClient';

interface FormattedChildVariant {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  sellingPrice: number;
  imei: string;
  serialNumber: string;
  condition: string;
  variant_attributes: any;
  is_imei_child: boolean;
  parent_variant_id: string;
  [key: string]: any;
}

class ChildVariantsCacheService {
  private cache: Map<string, FormattedChildVariant[]> = new Map();
  private isPreloading: boolean = false;
  private lastPreloadTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * ⚡ Preload ALL child variants for all products in one query
   * This is called when products are loaded
   */
  async preloadAllChildVariants(products: any[]): Promise<void> {
    // Prevent concurrent preloads
    if (this.isPreloading) {
      console.log('⏳ Child variants already preloading...');
      return;
    }

    // Check if cache is still valid
    const now = Date.now();
    if (this.cache.size > 0 && (now - this.lastPreloadTime) < this.CACHE_DURATION) {
      console.log('⚡ Using cached child variants (still fresh)');
      return;
    }

    try {
      this.isPreloading = true;
      const startTime = performance.now();
      console.log('🚀 [ChildVariantsCache] Starting preload for all products...');

      // Extract all variant IDs from all products
      const allVariantIds: string[] = [];
      products.forEach(product => {
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: any) => {
            if (variant.id) {
              allVariantIds.push(variant.id);
            }
          });
        }
      });

      if (allVariantIds.length === 0) {
        console.log('ℹ️  No product variants found, skipping child preload');
        return;
      }

      console.log(`📊 Found ${allVariantIds.length} variant IDs to check for children`);

      // ⚡ SINGLE QUERY: Get ALL child variants for ALL parent variants at once!
      const { data: allChildren, error } = await supabase
        .from('lats_product_variants')
        .select('*')
        .in('parent_variant_id', allVariantIds)
        .eq('variant_type', 'imei_child')
        .eq('is_active', true)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error preloading child variants:', error);
        return;
      }

      if (!allChildren || allChildren.length === 0) {
        console.log('ℹ️  No child variants found in database');
        this.lastPreloadTime = now;
        return;
      }

      // Group children by parent_variant_id and format them
      const newCache = new Map<string, FormattedChildVariant[]>();
      const parentCounts: { [key: string]: number } = {};

      allChildren.forEach((child: any) => {
        const parentId = child.parent_variant_id;
        if (!parentId) return;

        // Format child variant
        const imei =
          child.variant_attributes?.imei ||
          child.variant_attributes?.IMEI ||
          child.imei ||
          child.sku ||
          'N/A';

        const serialNumber =
          child.variant_attributes?.serial_number ||
          child.variant_attributes?.serialNumber ||
          child.variant_attributes?.serial ||
          child.serial_number ||
          imei;

        const condition =
          child.variant_attributes?.condition || child.condition || 'New';

        const formattedChild: FormattedChildVariant = {
          id: child.id,
          name: child.variant_name || `IMEI: ${imei}`,
          sku: child.sku || imei,
          quantity: child.quantity || 0,
          sellingPrice: child.selling_price || child.sellingPrice || child.price || 0,
          imei: imei,
          serialNumber: serialNumber,
          condition: condition,
          variant_attributes: child.variant_attributes,
          is_imei_child: true,
          parent_variant_id: parentId,
          ...child,
        };

        // Add to parent's children array
        if (!newCache.has(parentId)) {
          newCache.set(parentId, []);
          parentCounts[parentId] = 0;
        }
        newCache.get(parentId)!.push(formattedChild);
        parentCounts[parentId]++;
      });

      // Update the cache
      this.cache = newCache;
      this.lastPreloadTime = now;

      const loadTime = (performance.now() - startTime).toFixed(2);
      console.log(`✅ [ChildVariantsCache] Preloaded ${allChildren.length} children for ${newCache.size} parents in ${loadTime}ms`, {
        totalChildren: allChildren.length,
        parentsWithChildren: newCache.size,
        cacheSize: this.cache.size,
      });

    } catch (error) {
      console.error('❌ Error in preloadAllChildVariants:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Get child variants for a specific parent (instant from cache)
   */
  getChildVariants(parentVariantId: string): FormattedChildVariant[] | null {
    const children = this.cache.get(parentVariantId);
    if (children) {
      console.log(`⚡ Retrieved ${children.length} children for parent ${parentVariantId} from cache`);
    }
    return children || null;
  }

  /**
   * Check if parent has children (instant from cache)
   */
  hasChildren(parentVariantId: string): boolean {
    return this.cache.has(parentVariantId) && (this.cache.get(parentVariantId)?.length || 0) > 0;
  }

  /**
   * Get count of children for a parent (instant from cache)
   */
  getChildCount(parentVariantId: string): number {
    return this.cache.get(parentVariantId)?.length || 0;
  }

  /**
   * Get counts for multiple parents at once
   */
  getChildCounts(parentVariantIds: string[]): { [key: string]: number } {
    const counts: { [key: string]: number } = {};
    parentVariantIds.forEach(id => {
      counts[id] = this.getChildCount(id);
    });
    return counts;
  }

  /**
   * Clear the cache (useful after stock updates)
   */
  clearCache(): void {
    console.log('🗑️  Clearing child variants cache');
    this.cache.clear();
    this.lastPreloadTime = 0;
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    const now = Date.now();
    return this.cache.size > 0 && (now - this.lastPreloadTime) < this.CACHE_DURATION;
  }

  /**
   * Get cache stats for debugging
   */
  getCacheStats() {
    return {
      cachedParents: this.cache.size,
      totalChildren: Array.from(this.cache.values()).reduce((sum, children) => sum + children.length, 0),
      isValid: this.isCacheValid(),
      ageMinutes: ((Date.now() - this.lastPreloadTime) / 60000).toFixed(1),
    };
  }
}

// Singleton instance
export const childVariantsCacheService = new ChildVariantsCacheService();

