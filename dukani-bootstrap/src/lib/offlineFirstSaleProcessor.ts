/**
 * Offline-First Sale Processor
 * Wraps sale processing to save locally first, then sync to online database
 */

import { saleProcessingService } from './saleProcessingService';
import { offlineSaleSyncService } from '../services/offlineSaleSyncService';
import { toast } from 'react-hot-toast';

interface SaleData {
  customerId?: string | null;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: any[];
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  paymentMethod: any;
  paymentStatus: 'completed' | 'pending' | 'failed';
  soldBy?: string;
  soldAt?: string;
  notes?: string;
}

interface ProcessSaleResult {
  success: boolean;
  sale?: any;
  error?: string;
  isOffline?: boolean;
  offlineSaleId?: string;
}

/**
 * Process sale with offline-first approach
 * Saves locally first for instant response, then syncs to online database in background
 */
export async function processSaleOfflineFirst(saleData: SaleData): Promise<ProcessSaleResult> {
  try {
    // Check if we're online
    const isOnline = navigator.onLine;

    if (isOnline) {
      // Try to process online first (fastest if online)
      try {
        const result = await saleProcessingService.processSale(saleData);
        
        if (result.success) {
          return {
            ...result,
            isOffline: false,
          };
        } else {
          // If online processing fails, fall back to offline
          console.warn('⚠️ [OfflineFirst] Online processing failed, saving locally:', result.error);
        }
      } catch (error) {
        console.warn('⚠️ [OfflineFirst] Online processing error, saving locally:', error);
      }
    }

    // Save locally first (offline-first approach)
    console.log('💾 [OfflineFirst] Saving sale locally...');
    const localResult = await offlineSaleSyncService.saveSaleLocally(saleData);

    if (!localResult.success) {
      return {
        success: false,
        error: localResult.error || 'Failed to save sale locally',
        isOffline: true,
      };
    }

    // If online, try to sync immediately
    if (isOnline) {
      console.log('🔄 [OfflineFirst] Attempting immediate sync...');
      const syncResult = await offlineSaleSyncService.syncSale(localResult.saleId);
      
      if (syncResult.success) {
        // Get the synced sale data (would need to be returned from sync)
        return {
          success: true,
          isOffline: false,
          // Note: We don't have the actual sale object from sync, but it's synced
        };
      } else {
        // Sale is saved locally, will sync later
        console.log('ℹ️ [OfflineFirst] Sale saved locally, will sync later');
        return {
          success: true,
          isOffline: true,
          offlineSaleId: localResult.saleId,
        };
      }
    } else {
      // Offline - sale saved locally, will sync when online
      console.log('📴 [OfflineFirst] Offline mode - sale saved locally');
      return {
        success: true,
        isOffline: true,
        offlineSaleId: localResult.saleId,
      };
    }
  } catch (error) {
    console.error('❌ [OfflineFirst] Error processing sale:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      isOffline: true,
    };
  }
}

/**
 * Check if offline-first mode is enabled
 */
export function isOfflineFirstEnabled(): boolean {
  const metadata = offlineSaleSyncService.getOfflineSales();
  // Consider offline-first enabled if we have any offline sales or if database is downloaded
  const { fullDatabaseDownloadService } = require('../services/fullDatabaseDownloadService');
  return fullDatabaseDownloadService.isDownloaded() || metadata.length > 0;
}

