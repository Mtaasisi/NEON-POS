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

      // ✅ FIX: Also load legacy inventory_items for products that have these parent variants
      // Get product IDs from parent variants
      const { data: parentVariantsWithProducts } = await supabase
        .from('lats_product_variants')
        .select('id, product_id')
        .in('id', allVariantIds);

      const productIds = [...new Set((parentVariantsWithProducts || []).map((p: any) => p.product_id).filter(Boolean))];

      let legacyItems: any[] = [];
      if (productIds.length > 0) {
        // ✅ FIX: Since IMEI and serial_number are synced in database, just query once
        // Query for items that have either field (they're the same value due to trigger)
        const { data: legacyItemsData, error: legacyError } = await supabase
          .from('inventory_items')
          .select('*')
          .in('product_id', productIds)
          .not('serial_number', 'is', null) // serial_number and imei are synced, so this gets all
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .limit(500); // Limit to prevent too many items

        legacyItems = legacyItemsData || [];

        if (legacyError) {
          console.warn('⚠️ Error loading legacy inventory items for cache:', legacyError);
        }
      }

      if ((!allChildren || allChildren.length === 0) && legacyItems.length === 0) {
        console.log('ℹ️  No child variants or legacy items found in database');
        this.lastPreloadTime = now;
        return;
      }

      // ✅ FIX: Create a map of parent variant prices for fallback
      const parentPriceMap = new Map<string, number>();
      products.forEach(product => {
        if (product.variants && Array.isArray(product.variants)) {
          product.variants.forEach((variant: any) => {
            if (variant.id) {
              const parentPrice = variant.sellingPrice ?? variant.selling_price ?? variant.price ?? 0;
              parentPriceMap.set(variant.id, parentPrice);
            }
          });
        }
      });

      // Group children by parent_variant_id and format them
      const newCache = new Map<string, FormattedChildVariant[]>();
      const parentCounts: { [key: string]: number } = {};

      // Process IMEI children from lats_product_variants
      (allChildren || []).forEach((child: any) => {
        const parentId = child.parent_variant_id;
        if (!parentId) return;

        // Format child variant
        // ✅ FIX: IMEI and serial_number are the same (synced by database trigger)
        const identifier = child.variant_attributes?.imei || child.variant_attributes?.serial_number || child.imei || child.serial_number || child.sku || 'N/A';
        const imei = identifier;
        const serialNumber = identifier;
        const condition = child.variant_attributes?.condition || child.condition || 'New';

        // ✅ FIX: Use parent variant's price as fallback if child doesn't have a price
        const childPrice = child.selling_price || child.sellingPrice || child.price;
        const parentPrice = parentPriceMap.get(parentId) || 0;
        const finalPrice = childPrice && childPrice > 0 ? childPrice : parentPrice;

        const formattedChild: FormattedChildVariant = {
          id: child.id,
          name: child.variant_name || `IMEI: ${identifier}`,
          sku: child.sku || identifier,
          quantity: child.quantity || 0,
          sellingPrice: finalPrice,
          price: finalPrice, // Also set price field for compatibility
          imei,
          serialNumber,
          condition,
          variant_attributes: child.variant_attributes,
          is_imei_child: true,
          is_legacy: false,
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

      // ✅ FIX: Process legacy inventory_items and add them to cache
      legacyItems.forEach((item: any) => {
        // Match legacy item to parent variant by variant_id
        const parentId = item.variant_id;
        if (!parentId || !allVariantIds.includes(parentId)) return;

        // ✅ FIX: IMEI and serial_number are the same (synced by database trigger)
        const identifier = item.serial_number || item.imei || 'Unknown';
        const imei = identifier;
        const serialNumber = identifier;
        const condition = item.condition || 'new';

        // ✅ FIX: Use parent variant's price as fallback if legacy item doesn't have a price
        const itemPrice = item.selling_price;
        const parentPrice = parentPriceMap.get(parentId) || 0;
        const finalPrice = itemPrice && itemPrice > 0 ? itemPrice : parentPrice;

        const formattedLegacyChild: FormattedChildVariant = {
          id: item.id,
          name: identifier,
          sku: identifier,
          quantity: 1,
          sellingPrice: finalPrice,
          price: finalPrice, // Also set price field for compatibility
          imei,
          serialNumber,
          condition,
          variant_attributes: {
            serial_number: identifier,
            imei: identifier,
            mac_address: item.mac_address || '',
            condition: condition,
            location: item.location || '',
            status: item.status || 'available'
          },
          is_imei_child: true,
          is_legacy: true,
          variant_type: 'imei_child',
          parent_variant_id: parentId,
          product_id: item.product_id,
          created_at: item.created_at,
        };

        if (!newCache.has(parentId)) {
          newCache.set(parentId, []);
          parentCounts[parentId] = 0;
        }
        newCache.get(parentId)!.push(formattedLegacyChild);
        parentCounts[parentId]++;
      });

      // Update the cache
      this.cache = newCache;
      this.lastPreloadTime = now;

      const loadTime = (performance.now() - startTime).toFixed(2);
      const totalChildren = (allChildren?.length || 0) + legacyItems.length;
      console.log(`✅ [ChildVariantsCache] Preloaded ${totalChildren} children (${allChildren?.length || 0} IMEI + ${legacyItems.length} legacy) for ${newCache.size} parents in ${loadTime}ms`, {
        totalChildren: totalChildren,
        imeiChildren: allChildren?.length || 0,
        legacyItems: legacyItems.length,
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

