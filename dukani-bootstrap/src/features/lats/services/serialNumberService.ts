import { supabase } from '../../../lib/supabaseClient';

/**
 * Serial Number Service
 * Handles operations related to serial numbers and IMEI variants in inventory
 */
class SerialNumberService {
  /**
   * Update an inventory item (IMEI variant)
   * @param itemId - The ID of the IMEI variant to update
   * @param updates - Object containing fields to update
   */
  async updateInventoryItem(itemId: string, updates: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('lats_imei_variants')
        .update(updates)
        .eq('id', itemId);

      if (error) {
        console.error('Error updating inventory item:', error);
        throw new Error(`Failed to update inventory item: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateInventoryItem:', error);
      throw error;
    }
  }

  /**
   * Get an inventory item by ID
   * @param itemId - The ID of the IMEI variant
   */
  async getInventoryItem(itemId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('lats_imei_variants')
        .select('*')
        .eq('id', itemId)
        .single();

      if (error) {
        console.error('Error fetching inventory item:', error);
        throw new Error(`Failed to fetch inventory item: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getInventoryItem:', error);
      throw error;
    }
  }

  /**
   * Get all inventory items for a product
   * @param productId - The product ID
   */
  async getProductInventoryItems(productId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('lats_imei_variants')
        .select('*')
        .eq('product_id', productId);

      if (error) {
        console.error('Error fetching product inventory items:', error);
        throw new Error(`Failed to fetch product inventory items: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getProductInventoryItems:', error);
      throw error;
    }
  }

  /**
   * Update serial number for an inventory item
   * @param itemId - The ID of the IMEI variant
   * @param serialNumber - The new serial number
   */
  async updateSerialNumber(itemId: string, serialNumber: string): Promise<void> {
    await this.updateInventoryItem(itemId, {
      serial_number: serialNumber,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Update IMEI for an inventory item
   * @param itemId - The ID of the IMEI variant
   * @param imei - The new IMEI
   */
  async updateIMEI(itemId: string, imei: string): Promise<void> {
    await this.updateInventoryItem(itemId, {
      imei: imei,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Update location for an inventory item
   * @param itemId - The ID of the IMEI variant
   * @param location - The new location
   * @param shelf - Optional shelf location
   * @param bin - Optional bin location
   */
  async updateLocation(
    itemId: string,
    location: string,
    shelf?: string,
    bin?: string
  ): Promise<void> {
    await this.updateInventoryItem(itemId, {
      location: location || null,
      shelf: shelf || null,
      bin: bin || null,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Update status for an inventory item
   * @param itemId - The ID of the IMEI variant
   * @param status - The new status
   */
  async updateStatus(itemId: string, status: string): Promise<void> {
    await this.updateInventoryItem(itemId, {
      status: status,
      updated_at: new Date().toISOString()
    });
  }
}

// Export singleton instance
export const serialNumberService = new SerialNumberService();

