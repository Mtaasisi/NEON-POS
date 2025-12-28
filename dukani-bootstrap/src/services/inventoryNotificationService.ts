/**
 * Inventory WhatsApp Notification Service
 * Sends WhatsApp notifications when inventory items are low on stock
 */

import { supabase } from '../lib/supabaseClient';
import whatsappService from './whatsappService';
import { getInventorySettings } from '../lib/inventorySettingsApi';
import { smartNotificationService } from './smartNotificationService';

interface LowStockItem {
  productId: string;
  variantId: string;
  productName: string;
  variantName?: string;
  currentStock: number;
  minStock: number;
  alertLevel: 'out-of-stock' | 'critical' | 'low';
}

interface NotificationRecipient {
  phone: string;
  name?: string;
}

class InventoryNotificationService {
  private lastNotificationTime: Map<string, number> = new Map();
  private readonly NOTIFICATION_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown per product

  /**
   * Check if a product variant is low on stock
   */
  private async checkLowStock(variantId: string): Promise<LowStockItem | null> {
    try {
      const { data: variant, error } = await supabase
        .from('lats_product_variants')
        .select(`
          id,
          product_id,
          quantity,
          min_quantity,
          name,
          products!product_id (
            id,
            name
          )
        `)
        .eq('id', variantId)
        .single();

      if (error || !variant) {
        return null;
      }

      const quantity = Number(variant.quantity) || 0;
      const minQuantity = Number(variant.min_quantity) || 0;
      const product = (variant.products as any) || {};

      if (quantity === 0) {
        return {
          productId: variant.product_id,
          variantId: variant.id,
          productName: product.name || 'Unknown Product',
          variantName: variant.name,
          currentStock: quantity,
          minStock: minQuantity,
          alertLevel: 'out-of-stock'
        };
      } else if (minQuantity > 0 && quantity <= minQuantity * 0.25) {
        return {
          productId: variant.product_id,
          variantId: variant.id,
          productName: product.name || 'Unknown Product',
          variantName: variant.name,
          currentStock: quantity,
          minStock: minQuantity,
          alertLevel: 'critical'
        };
      } else if (minQuantity > 0 && quantity <= minQuantity) {
        return {
          productId: variant.product_id,
          variantId: variant.id,
          productName: product.name || 'Unknown Product',
          variantName: variant.name,
          currentStock: quantity,
          minStock: minQuantity,
          alertLevel: 'low'
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking low stock:', error);
      return null;
    }
  }

  /**
   * Get notification recipients from settings
   */
  private async getNotificationRecipients(): Promise<NotificationRecipient[]> {
    try {
      // Try to get from new WhatsApp automation settings first
      const { data: automationSettings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('category', 'whatsapp_automation')
        .eq('setting_key', 'notification_phones')
        .single();

      if (automationSettings?.setting_value) {
        try {
          const phones = JSON.parse(automationSettings.setting_value);
          if (Array.isArray(phones) && phones.length > 0) {
            return phones.map((phone: string) => ({ phone }));
          }
        } catch (e) {
          console.warn('Error parsing automation phone numbers:', e);
        }
      }

      // Fallback: Try old inventory settings
      const { data: inventorySettings } = await supabase
        .from('admin_settings')
        .select('setting_value')
        .eq('category', 'inventory')
        .eq('setting_key', 'low_stock_notification_phones')
        .single();

      if (inventorySettings?.setting_value) {
        try {
          const phones = JSON.parse(inventorySettings.setting_value);
          if (Array.isArray(phones) && phones.length > 0) {
            return phones.map((phone: string | { phone: string; name?: string }) => 
              typeof phone === 'string' ? { phone } : { phone: phone.phone, name: phone.name }
            );
          }
        } catch (e) {
          console.warn('Error parsing inventory phone numbers:', e);
        }
      }

      // Fallback: Get from business info
      const { data: businessInfo } = await supabase
        .from('business_info')
        .select('phone, whatsapp')
        .single();

      const recipients: NotificationRecipient[] = [];
      if (businessInfo?.phone) {
        recipients.push({ phone: businessInfo.phone, name: 'Business' });
      }
      if (businessInfo?.whatsapp && businessInfo.whatsapp !== businessInfo.phone) {
        recipients.push({ phone: businessInfo.whatsapp, name: 'Business WhatsApp' });
      }

      // Fallback: Get admin users
      if (recipients.length === 0) {
        const { data: admins } = await supabase
          .from('users')
          .select('phone')
          .eq('role', 'admin')
          .limit(3);

        if (admins) {
          admins.forEach(admin => {
            if (admin.phone) {
              recipients.push({ phone: admin.phone, name: 'Admin' });
            }
          });
        }
      }

      return recipients;
    } catch (error) {
      console.error('Error getting notification recipients:', error);
      return [];
    }
  }

  /**
   * Format message for low stock alert
   */
  private formatMessage(item: LowStockItem): string {
    const variantText = item.variantName ? ` (${item.variantName})` : '';
    const emoji = item.alertLevel === 'out-of-stock' ? '🔴' : item.alertLevel === 'critical' ? '🟠' : '🟡';
    
    let message = `${emoji} *Low Stock Alert*\n\n`;
    message += `*Product:* ${item.productName}${variantText}\n`;
    message += `*Current Stock:* ${item.currentStock}\n`;
    message += `*Minimum Stock:* ${item.minStock}\n`;
    
    if (item.alertLevel === 'out-of-stock') {
      message += `\n⚠️ *OUT OF STOCK* - Immediate restocking required!`;
    } else if (item.alertLevel === 'critical') {
      message += `\n⚠️ *CRITICAL* - Stock is very low!`;
    } else {
      message += `\n⚠️ *LOW STOCK* - Consider restocking soon.`;
    }
    
    return message;
  }

  /**
   * Check if notification should be sent (cooldown check)
   */
  private shouldSendNotification(variantId: string): boolean {
    const lastSent = this.lastNotificationTime.get(variantId);
    if (!lastSent) {
      return true;
    }
    
    const timeSinceLastNotification = Date.now() - lastSent;
    return timeSinceLastNotification >= this.NOTIFICATION_COOLDOWN;
  }

  /**
   * Send WhatsApp notification for low stock item
   */
  async sendLowStockNotification(variantId: string): Promise<{ success: boolean; sent?: number; error?: string }> {
    try {
      // Check automation settings first (new system)
      const { data: automationData } = await supabase
        .from('admin_settings')
        .select('setting_key, setting_value')
        .eq('category', 'whatsapp_automation')
        .in('setting_key', ['inventory_low_stock_notifications', 'inventory_out_of_stock_notifications']);

      const automationMap = new Map(
        (automationData || []).map(a => [a.setting_key, a.setting_value === 'true'])
      );

      const lowStockEnabled = automationMap.get('inventory_low_stock_notifications') ?? false;
      const outOfStockEnabled = automationMap.get('inventory_out_of_stock_notifications') ?? false;

      // Fallback to inventory settings for backward compatibility
      const inventorySettings = await getInventorySettings();
      const notificationsEnabled = automationMap.size > 0 
        ? (lowStockEnabled || outOfStockEnabled)
        : inventorySettings.whatsapp_notifications;
      
      if (!notificationsEnabled) {
        console.log('📱 WhatsApp notifications disabled');
        return { success: false, error: 'WhatsApp notifications disabled' };
      }

      // Check cooldown
      if (!this.shouldSendNotification(variantId)) {
        console.log(`📱 Notification cooldown active for variant ${variantId}`);
        return { success: false, error: 'Cooldown active' };
      }

      // Check if item is low on stock
      const lowStockItem = await this.checkLowStock(variantId);
      
      if (!lowStockItem) {
        return { success: false, error: 'Item not low on stock' };
      }

      // Check alert level settings
      const useAutomationSettings = automationMap.size > 0;
      const outOfStockAllowed = useAutomationSettings 
        ? outOfStockEnabled 
        : inventorySettings.out_of_stock_alerts;
      const lowStockAllowed = useAutomationSettings 
        ? lowStockEnabled 
        : inventorySettings.low_stock_alerts;

      if (lowStockItem.alertLevel === 'out-of-stock' && !outOfStockAllowed) {
        return { success: false, error: 'Out of stock alerts disabled' };
      }
      
      if ((lowStockItem.alertLevel === 'low' || lowStockItem.alertLevel === 'critical') && !lowStockAllowed) {
        return { success: false, error: 'Low stock alerts disabled' };
      }

      // Get notification recipients
      const recipients = await this.getNotificationRecipients();
      
      if (recipients.length === 0) {
        console.warn('⚠️ No notification recipients found');
        return { success: false, error: 'No recipients configured' };
      }

      // Format message
      const message = this.formatMessage(lowStockItem);

      // Send to all recipients using smart notification service
      let sentCount = 0;
      const errors: string[] = [];

      for (const recipient of recipients) {
        try {
          const result = await smartNotificationService.sendNotification(
            recipient.phone,
            message,
            {
              priority: lowStockItem.alertLevel === 'out-of-stock' ? 'high' : 'normal'
            }
          );

          if (result.success) {
            sentCount++;
            console.log(`✅ Low stock notification sent to ${recipient.phone} via ${result.method}`);
          } else {
            errors.push(`${recipient.phone}: ${result.error}`);
          }
        } catch (error: any) {
          errors.push(`${recipient.phone}: ${error.message}`);
        }
      }

      // Update last notification time
      if (sentCount > 0) {
        this.lastNotificationTime.set(variantId, Date.now());
      }

      if (sentCount === 0) {
        return { 
          success: false, 
          error: `Failed to send to all recipients: ${errors.join(', ')}` 
        };
      }

      return { success: true, sent: sentCount };
    } catch (error: any) {
      console.error('Error sending low stock notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check multiple variants and send notifications for low stock items
   */
  async checkAndNotifyLowStock(variantIds: string[]): Promise<{ checked: number; notified: number; errors: string[] }> {
    const results = {
      checked: variantIds.length,
      notified: 0,
      errors: [] as string[]
    };

    for (const variantId of variantIds) {
      try {
        const result = await this.sendLowStockNotification(variantId);
        if (result.success && result.sent) {
          results.notified++;
        } else if (result.error) {
          results.errors.push(`Variant ${variantId}: ${result.error}`);
        }
      } catch (error: any) {
        results.errors.push(`Variant ${variantId}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Clear cooldown for a variant (useful for testing)
   */
  clearCooldown(variantId: string): void {
    this.lastNotificationTime.delete(variantId);
  }
}

export const inventoryNotificationService = new InventoryNotificationService();
