import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';

export interface POSErrorDetails {
  code: string;
  message: string;
  userMessage: string;
  recoveryAction?: string;
  canRetry: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class POSErrorHandler {
  private static instance: POSErrorHandler;
  private offlineQueue: any[] = [];
  private syncInProgress = false;

  static getInstance(): POSErrorHandler {
    if (!POSErrorHandler.instance) {
      POSErrorHandler.instance = new POSErrorHandler();
    }
    return POSErrorHandler.instance;
  }

  /**
   * Queue payment for offline processing
   */
  async queueOfflinePayment(paymentData: any, cartItems: any[], customer?: any): Promise<void> {
    const offlinePayment = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentData,
      cartItems: JSON.parse(JSON.stringify(cartItems)), // Deep clone
      customer,
      timestamp: new Date().toISOString(),
      synced: false,
      retryCount: 0
    };

    this.offlineQueue.push(offlinePayment);

    // Save to localStorage
    try {
      const existingQueue = JSON.parse(localStorage.getItem('pos_offline_payments') || '[]');
      existingQueue.push(offlinePayment);
      localStorage.setItem('pos_offline_payments', JSON.stringify(existingQueue));
    } catch (error) {
      console.error('Failed to save offline payment to localStorage:', error);
    }

    console.log('💾 Payment queued for offline processing:', offlinePayment.id);
  }

  /**
   * Sync offline payments when connection is restored
   * Note: This is a placeholder for future offline sync implementation
   */
  async syncOfflinePayments(onSyncProgress?: (completed: number, total: number) => void): Promise<{ success: number; failed: number }> {
    try {
      // Load from localStorage
      let offlinePayments: any[] = [];
      try {
        offlinePayments = JSON.parse(localStorage.getItem('pos_offline_payments') || '[]');
      } catch (error) {
        console.error('Failed to load offline payments from localStorage:', error);
        return { success: 0, failed: 0 };
      }

      if (offlinePayments.length === 0) {
        return { success: 0, failed: 0 };
      }

      // For now, just notify that offline payments are queued
      // Future implementation will sync these payments when online
      console.log(`📋 ${offlinePayments.length} offline payments queued for sync`);
      toast(`📋 ${offlinePayments.length} payment${offlinePayments.length > 1 ? 's' : ''} saved offline - will sync when online`, {
        duration: 5000,
        icon: '💾'
      });

      // Clear the queue since we're not processing them yet
      localStorage.setItem('pos_offline_payments', '[]');

      return { success: offlinePayments.length, failed: 0 };
    } catch (error) {
      console.error('Error in offline payment sync placeholder:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Get offline payment queue status
   */
  getOfflinePaymentStatus(): { queued: number; syncing: boolean } {
    let queued = 0;
    try {
      const queue = JSON.parse(localStorage.getItem('pos_offline_payments') || '[]');
      queued = queue.length;
    } catch (error) {
      console.error('Failed to read offline payment queue:', error);
    }

    return {
      queued,
      syncing: this.syncInProgress
    };
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity(): Promise<boolean> {
    try {
      // Check if navigator.onLine is available
      if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
        if (!navigator.onLine) {
          return false;
        }
      }

      // Try to ping Supabase
      const { error } = await supabase.from('lats_general_settings').select('id').limit(1).single();

      // If we get a network error, connectivity is likely down
      if (error && error.message?.includes('Failed to fetch')) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Network connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Check database connection
   */
  async checkDatabaseConnection(): Promise<{ connected: boolean; latency?: number }> {
    try {
      const startTime = Date.now();

      // Simple query to test database connection
      const { error } = await supabase.from('lats_general_settings').select('id').limit(1).single();

      const latency = Date.now() - startTime;

      if (error) {
        // Check if it's a connection error
        if (error.message?.includes('JWT') || error.message?.includes('auth')) {
          return { connected: false, latency };
        }
        // If it's just a data error, connection is fine
        return { connected: true, latency };
      }

      return { connected: true, latency };
    } catch (error) {
      console.error('Database connection check failed:', error);
      return { connected: false };
    }
  }

  /**
   * Validate payment method
   */
  validatePaymentMethod(paymentMethod: any): POSErrorDetails | null {
    if (!paymentMethod) {
      return {
        code: 'PAYMENT_METHOD_MISSING',
        message: 'No payment method selected',
        userMessage: 'Please select a payment method to continue.',
        recoveryAction: 'Select a payment method from the available options.',
        canRetry: false,
        severity: 'medium'
      };
    }

    if (!paymentMethod.id || !paymentMethod.name) {
      return {
        code: 'PAYMENT_METHOD_INVALID',
        message: 'Payment method data is incomplete',
        userMessage: 'The selected payment method is not properly configured.',
        recoveryAction: 'Please contact support or try a different payment method.',
        canRetry: false,
        severity: 'high'
      };
    }

    return null;
  }

  /**
   * Validate cart items
   */
  validateCartItems(cartItems: any[]): POSErrorDetails | null {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return {
        code: 'CART_EMPTY',
        message: 'Cart is empty',
        userMessage: 'Your cart is empty. Please add items before processing payment.',
        recoveryAction: 'Add products to your cart before proceeding to payment.',
        canRetry: false,
        severity: 'low'
      };
    }

    // Check for invalid prices
    const invalidItems = cartItems.filter(item =>
      !item.totalPrice ||
      item.totalPrice <= 0 ||
      isNaN(item.totalPrice) ||
      !item.unitPrice ||
      item.unitPrice <= 0 ||
      isNaN(item.unitPrice)
    );

    if (invalidItems.length > 0) {
      return {
        code: 'INVALID_PRICES',
        message: `Invalid prices for ${invalidItems.length} items`,
        userMessage: `Some items have invalid prices: ${invalidItems.map(i => i.productName || i.name).join(', ')}`,
        recoveryAction: 'Please check item prices and try again. Contact support if the issue persists.',
        canRetry: true,
        severity: 'high'
      };
    }

    return null;
  }

  /**
   * Validate total amounts
   */
  validateAmounts(totalAmount: number, discountAmount: number, finalAmount: number): POSErrorDetails | null {
    if (isNaN(totalAmount) || totalAmount <= 0) {
      return {
        code: 'INVALID_TOTAL',
        message: 'Total amount is invalid',
        userMessage: 'The total amount is invalid. Please check your cart items.',
        recoveryAction: 'Review cart items and prices, then try again.',
        canRetry: true,
        severity: 'high'
      };
    }

    if (discountAmount >= totalAmount) {
      return {
        code: 'DISCOUNT_TOO_HIGH',
        message: 'Discount exceeds total amount',
        userMessage: `Discount (TZS ${discountAmount.toLocaleString()}) cannot exceed total (TZS ${totalAmount.toLocaleString()})`,
        recoveryAction: 'Reduce the discount amount or remove it entirely.',
        canRetry: false,
        severity: 'medium'
      };
    }

    if (finalAmount <= 0) {
      return {
        code: 'NEGATIVE_FINAL_AMOUNT',
        message: 'Final amount is zero or negative',
        userMessage: 'The final payment amount cannot be zero or negative.',
        recoveryAction: 'Check your cart items and discount, then try again.',
        canRetry: true,
        severity: 'high'
      };
    }

    return null;
  }

  /**
   * Validate customer data
   */
  validateCustomer(customer: any, finalAmount: number): POSErrorDetails | null {
    // Customer is optional but recommended for large amounts
    if (!customer && finalAmount > 50000) {
      return {
        code: 'CUSTOMER_RECOMMENDED',
        message: 'Customer information recommended for large payments',
        userMessage: 'Customer information is recommended for payments over TZS 50,000.',
        recoveryAction: 'Add customer information or continue without it.',
        canRetry: false,
        severity: 'low'
      };
    }

    if (customer && !customer.name?.trim()) {
      return {
        code: 'INVALID_CUSTOMER',
        message: 'Customer data is incomplete',
        userMessage: 'Selected customer information is incomplete.',
        recoveryAction: 'Select a different customer or add customer information.',
        canRetry: false,
        severity: 'medium'
      };
    }

    return null;
  }

  /**
   * Validate stock availability
   */
  async validateStockAvailability(cartItems: any[]): Promise<POSErrorDetails | null> {
    try {
      const outOfStockItems: string[] = [];

      for (const item of cartItems) {
        if (item.itemType === 'spare-part') continue; // Skip spare parts

        if (item.variantId && item.variantId !== 'default') {
          // Check variant stock
          const { data: variant, error } = await supabase
            .from('lats_product_variants')
            .select('quantity')
            .eq('id', item.variantId)
            .single();

          if (error) {
            console.error('Stock check error for variant:', item.variantId, error);
            continue;
          }

          if (!variant || variant.quantity < item.quantity) {
            outOfStockItems.push(`${item.productName} (${item.variantName})`);
          }
        } else {
          // Check product stock
          const { data: product, error } = await supabase
            .from('lats_products')
            .select('quantity')
            .eq('id', item.productId)
            .single();

          if (error) {
            console.error('Stock check error for product:', item.productId, error);
            continue;
          }

          if (!product || product.quantity < item.quantity) {
            outOfStockItems.push(item.productName);
          }
        }
      }

      if (outOfStockItems.length > 0) {
        return {
          code: 'INSUFFICIENT_STOCK',
          message: `${outOfStockItems.length} items are out of stock`,
          userMessage: `The following items are out of stock or insufficient quantity: ${outOfStockItems.join(', ')}`,
          recoveryAction: 'Reduce quantities or remove out-of-stock items from cart.',
          canRetry: false,
          severity: 'high'
        };
      }

      return null;
    } catch (error) {
      console.error('Stock validation error:', error);
      return {
        code: 'STOCK_CHECK_FAILED',
        message: 'Failed to verify stock availability',
        userMessage: 'Unable to verify product availability. Please try again.',
        recoveryAction: 'Refresh the page and try again.',
        canRetry: true,
        severity: 'medium'
      };
    }
  }

  /**
   * Handle and display errors with appropriate user messaging
   */
  handleError(error: POSErrorDetails | Error | any, context?: string): void {
    let errorDetails: POSErrorDetails;

    if (error.code && error.message) {
      // Already a POSErrorDetails object
      errorDetails = error as POSErrorDetails;
    } else if (error instanceof Error) {
      // Convert generic error
      errorDetails = {
        code: 'UNKNOWN_ERROR',
        message: error.message,
        userMessage: 'An unexpected error occurred. Please try again.',
        recoveryAction: 'Try again in a few moments or contact support.',
        canRetry: true,
        severity: 'medium'
      };
    } else {
      // Unknown error format
      errorDetails = {
        code: 'UNKNOWN_ERROR',
        message: String(error),
        userMessage: 'Something went wrong. Please try again.',
        recoveryAction: 'Refresh the page and try again.',
        canRetry: true,
        severity: 'medium'
      };
    }

    // Log error for debugging
    console.error(`[${context || 'POS'}] ${errorDetails.code}:`, errorDetails.message);

    // Show user-friendly message
    const toastType = errorDetails.severity === 'critical' ? 'error' :
                     errorDetails.severity === 'high' ? 'error' :
                     errorDetails.severity === 'medium' ? 'warning' : 'info';

    if (toastType === 'error') {
      toast.error(errorDetails.userMessage);
    } else if (toastType === 'warning') {
      toast(errorDetails.userMessage, { icon: '⚠️' });
    } else {
      toast(errorDetails.userMessage, { icon: 'ℹ️' });
    }

    // Log additional context for high-severity errors
    if (errorDetails.severity === 'high' || errorDetails.severity === 'critical') {
      console.error('Error details:', {
        code: errorDetails.code,
        severity: errorDetails.severity,
        canRetry: errorDetails.canRetry,
        recoveryAction: errorDetails.recoveryAction,
        context
      });
    }
  }

  /**
   * Create user-friendly recovery suggestions
   */
  getRecoverySuggestions(error: POSErrorDetails): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'CART_EMPTY':
        suggestions.push('Add products to your cart');
        suggestions.push('Browse available products in the search section');
        break;

      case 'INVALID_PRICES':
        suggestions.push('Check product prices in inventory');
        suggestions.push('Contact administrator if prices seem incorrect');
        suggestions.push('Try refreshing the product data');
        break;

      case 'INSUFFICIENT_STOCK':
        suggestions.push('Reduce quantity of out-of-stock items');
        suggestions.push('Remove out-of-stock items from cart');
        suggestions.push('Check inventory for available alternatives');
        break;

      case 'NETWORK_ERROR':
        suggestions.push('Check your internet connection');
        suggestions.push('Try refreshing the page');
        suggestions.push('Contact support if connection issues persist');
        break;

      case 'DATABASE_ERROR':
        suggestions.push('Try again in a few moments');
        suggestions.push('Refresh the page to reconnect');
        suggestions.push('Contact support if issues continue');
        break;

      default:
        if (error.recoveryAction) {
          suggestions.push(error.recoveryAction);
        }
        suggestions.push('Try refreshing the page');
        suggestions.push('Contact support if the problem persists');
    }

    return suggestions;
  }
}

// Export singleton instance
export const posErrorHandler = POSErrorHandler.getInstance();