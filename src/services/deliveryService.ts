import { supabase } from '../lib/supabaseClient';

export interface DeliveryStatus {
  id: string;
  status: 'pending' | 'confirmed' | 'assigned' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned' | 'cancelled';
  trackingNumber: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  assignedDriverName?: string;
  driverPhone?: string;
  statusHistory: Array<{
    status: string;
    timestamp: string;
    notes?: string;
  }>;
}

export interface CustomerNotification {
  id: string;
  deliveryId: string;
  type: 'delivery_confirmed' | 'driver_assigned' | 'out_for_delivery' | 'delivered' | 'delivery_delayed' | 'delivery_failed';
  channel: 'sms' | 'email' | 'whatsapp';
  message: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: string;
}

class DeliveryService {
  // Update delivery status and send notifications
  async updateDeliveryStatus(
    deliveryId: string,
    newStatus: string,
    notes?: string,
    driverId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🚚 Updating delivery ${deliveryId} to status: ${newStatus}`);

      // Get current delivery info
      const { data: delivery, error: fetchError } = await supabase
        .from('lats_delivery_orders')
        .select('*')
        .eq('id', deliveryId)
        .single();

      if (fetchError) {
        console.error('❌ Failed to fetch delivery:', fetchError);
        return { success: false, error: 'Delivery not found' };
      }

      // Update delivery status using the database function
      const { data, error } = await supabase.rpc('update_delivery_status', {
        delivery_order_id: deliveryId,
        new_status: newStatus,
        changed_by: null, // Will use current user
        notes: notes
      });

      if (error) {
        console.error('❌ Failed to update delivery status:', error);
        return { success: false, error: 'Failed to update delivery status' };
      }

      // If driver is assigned, update driver info
      if (driverId && (newStatus === 'assigned' || newStatus === 'picked_up')) {
        const { data: driver, error: driverError } = await supabase
          .from('lats_delivery_drivers')
          .select('name, phone')
          .eq('id', driverId)
          .single();

        if (!driverError && driver) {
          await supabase
            .from('lats_delivery_orders')
            .update({
              assigned_driver_id: driverId,
              assigned_driver_name: driver.name,
              driver_phone: driver.phone,
              assigned_at: new Date().toISOString()
            })
            .eq('id', deliveryId);
        }
      }

      // Send customer notification based on status
      await this.sendCustomerNotification(deliveryId, newStatus, delivery.customer_id);

      console.log(`✅ Delivery ${deliveryId} status updated to ${newStatus}`);
      return { success: true };

    } catch (error) {
      console.error('❌ Error updating delivery status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send customer notification
  private async sendCustomerNotification(
    deliveryId: string,
    status: string,
    customerId?: string
  ): Promise<void> {
    try {
      if (!customerId) {
        console.log('⚠️ No customer ID for delivery notifications');
        return;
      }

      // Get delivery details
      const { data: delivery, error: deliveryError } = await supabase
        .from('lats_delivery_orders')
        .select('tracking_number, assigned_driver_name, delivery_method')
        .eq('id', deliveryId)
        .single();

      if (deliveryError) {
        console.warn('⚠️ Could not fetch delivery details for notification');
        return;
      }

      let message = '';
      let notificationType: CustomerNotification['type'] = 'delivery_confirmed';

      switch (status) {
        case 'confirmed':
          message = `Your delivery has been confirmed! Tracking: ${delivery.tracking_number}`;
          notificationType = 'delivery_confirmed';
          break;
        case 'assigned':
          message = `Driver ${delivery.assigned_driver_name || 'assigned'} will deliver your order. Tracking: ${delivery.tracking_number}`;
          notificationType = 'driver_assigned';
          break;
        case 'out_for_delivery':
          message = `Your order is out for delivery! Tracking: ${delivery.tracking_number}`;
          notificationType = 'out_for_delivery';
          break;
        case 'delivered':
          message = `Your order has been delivered successfully! Tracking: ${delivery.tracking_number}`;
          notificationType = 'delivered';
          break;
        case 'failed':
          message = `Delivery attempt failed. We will retry or contact you. Tracking: ${delivery.tracking_number}`;
          notificationType = 'delivery_failed';
          break;
        default:
          return; // Don't send notifications for other status changes
      }

      // Insert notification record
      const { error: notificationError } = await supabase
        .from('lats_customer_notifications')
        .insert([{
          delivery_order_id: deliveryId,
          customer_id: customerId,
          notification_type: notificationType,
          channel: 'sms', // Default to SMS, can be configured
          message: message,
          status: 'pending'
        }]);

      if (notificationError) {
        console.error('❌ Failed to create notification record:', notificationError);
      } else {
        console.log(`✅ Customer notification queued: ${notificationType}`);
      }

    } catch (error) {
      console.error('❌ Error sending customer notification:', error);
    }
  }

  // Get delivery status and tracking information
  async getDeliveryStatus(deliveryId: string): Promise<{ success: boolean; delivery?: DeliveryStatus; error?: string }> {
    try {
      // Get delivery order
      const { data: delivery, error: deliveryError } = await supabase
        .from('lats_delivery_orders')
        .select('*')
        .eq('id', deliveryId)
        .single();

      if (deliveryError) {
        return { success: false, error: 'Delivery not found' };
      }

      // Get status history
      const { data: history, error: historyError } = await supabase
        .from('lats_delivery_status_history')
        .select('*')
        .eq('delivery_order_id', deliveryId)
        .order('created_at', { ascending: true });

      const statusHistory = history?.map(h => ({
        status: h.new_status,
        timestamp: h.created_at,
        notes: h.notes
      })) || [];

      const deliveryStatus: DeliveryStatus = {
        id: delivery.id,
        status: delivery.status,
        trackingNumber: delivery.tracking_number,
        estimatedDeliveryTime: delivery.estimated_delivery_time,
        actualDeliveryTime: delivery.actual_delivery_time,
        assignedDriverName: delivery.assigned_driver_name,
        driverPhone: delivery.driver_phone,
        statusHistory: statusHistory
      };

      return { success: true, delivery: deliveryStatus };

    } catch (error) {
      console.error('❌ Error fetching delivery status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get deliveries for a customer
  async getCustomerDeliveries(customerId: string): Promise<{ success: boolean; deliveries?: any[]; error?: string }> {
    try {
      // Get deliveries for this customer
      const { data: deliveries, error } = await supabase
        .from('lats_delivery_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [DeliveryService] Customer deliveries query error:', error);
        return { success: false, error: `Database error: ${error.message}` };
      }

      if (!deliveries || deliveries.length === 0) {
        console.log(`ℹ️ [DeliveryService] No deliveries found for customer ${customerId}`);
        return { success: true, deliveries: [] };
      }

      // Enrich with sales data
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (delivery) => {
          const enriched = { ...delivery };

          if (delivery.sale_id) {
            try {
              const { data: sale } = await supabase
                .from('lats_sales')
                .select('sale_number, total_amount, created_at')
                .eq('id', delivery.sale_id)
                .single();

              if (sale) {
                enriched.sale = sale;
              }
            } catch (err) {
              console.warn(`⚠️ [DeliveryService] Could not load sale ${delivery.sale_id}:`, err);
            }
          }

          return enriched;
        })
      );

      console.log(`✅ [DeliveryService] Loaded ${enrichedDeliveries.length} deliveries for customer ${customerId}`);
      return { success: true, deliveries: enrichedDeliveries };

    } catch (error) {
      console.error('❌ Error fetching customer deliveries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get deliveries for a branch (for management)
  async getBranchDeliveries(branchId: string, status?: string): Promise<{ success: boolean; deliveries?: any[]; error?: string }> {
    try {
      // First get the delivery orders
      let query = supabase
        .from('lats_delivery_orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Note: Temporarily removed branch_id filter to debug
      // .eq('branch_id', branchId)

      if (status) {
        query = query.eq('status', status);
      }

      const { data: deliveries, error: deliveriesError } = await query;

      // Filter by branch_id in memory for now
      let filteredDeliveries = deliveries;
      if (branchId) {
        filteredDeliveries = deliveries?.filter(delivery => delivery.branch_id === branchId) || [];
      }

      if (deliveriesError) {
        console.error('❌ [DeliveryService] Deliveries query error:', deliveriesError);
        return { success: false, error: `Database error: ${deliveriesError.message}` };
      }

      if (!deliveries || deliveries.length === 0) {
        console.log(`ℹ️ [DeliveryService] No deliveries found for branch ${branchId}`);
        return { success: true, deliveries: [] };
      }

      // Now enrich with customer and sales data
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (delivery) => {
          const enriched = { ...delivery };

          // Add customer data
          if (delivery.customer_id) {
            try {
              const { data: customer } = await supabase
                .from('lats_customers')
                .select('name, phone')
                .eq('id', delivery.customer_id)
                .single();

              if (customer) {
                enriched.customer = customer;
              }
            } catch (err) {
              console.warn(`⚠️ [DeliveryService] Could not load customer ${delivery.customer_id}:`, err);
            }
          }

          // Add sales data
          if (delivery.sale_id) {
            try {
              const { data: sale } = await supabase
                .from('lats_sales')
                .select('sale_number, total_amount')
                .eq('id', delivery.sale_id)
                .single();

              if (sale) {
                enriched.sale = sale;
              }
            } catch (err) {
              console.warn(`⚠️ [DeliveryService] Could not load sale ${delivery.sale_id}:`, err);
            }
          }

          return enriched;
        })
      );

      console.log(`✅ [DeliveryService] Loaded ${enrichedDeliveries.length} deliveries for branch ${branchId}`);
      console.log('📋 [DeliveryService] Sample delivery data:', enrichedDeliveries.slice(0, 2));

      return { success: true, deliveries: enrichedDeliveries };

    } catch (error) {
      console.error('❌ Error fetching branch deliveries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create delivery from an existing sale
  async createFromSale(saleId: string, deliveryData: any, branchId?: string): Promise<{ success: boolean; delivery?: any; error?: string }> {
    try {
      console.log('🚚 [DeliveryService] Creating delivery from sale:', saleId);
      console.log('🔍 [DeliveryService] Sale ID type:', typeof saleId, 'length:', saleId?.length);

      // First, fetch the sale details to get customer and sale information
      const { data: sale, error: saleError } = await supabase
        .from('lats_sales')
        .select(`
          id,
          customer_id,
          customer_name,
          customer_phone,
          customer_email,
          total_amount,
          subtotal,
          tax,
          discount
        `)
        .eq('id', saleId)
        .single();

      // If sale found, fetch the items separately
      let saleItems = [];
      if (sale && !saleError) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('lats_sale_items')
          .select('product_name, quantity, unit_price, total_price')
          .eq('sale_id', saleId);

        if (!itemsError && itemsData) {
          saleItems = itemsData;
        }
      }

      // Add items to sale object
      if (sale) {
        sale.items = saleItems;
      }

      console.log('🔍 [DeliveryService] Sale query result:', {
        hasData: !!sale,
        hasError: !!saleError,
        errorMessage: saleError?.message,
        saleId: sale?.id
      });

      if (saleError || !sale) {
        console.error('❌ [DeliveryService] Failed to fetch sale:', {
          saleId,
          error: saleError,
          errorCode: saleError?.code,
          errorDetails: saleError?.details
        });
        return { success: false, error: 'Sale not found' };
      }

      console.log('✅ [DeliveryService] Fetched sale data:', {
        saleId: sale.id,
        customerId: sale.customer_id,
        total: sale.total_amount,
        itemCount: sale.items?.length || 0
      });

      // Check if delivery already exists for this sale
      const { data: existingDelivery, error: deliveryCheckError } = await supabase
        .from('lats_delivery_orders')
        .select('id, tracking_number, status')
        .eq('sale_id', saleId)
        .single();

      if (existingDelivery && !deliveryCheckError) {
        console.error('❌ [DeliveryService] Delivery already exists for sale:', {
          saleId,
          existingDeliveryId: existingDelivery.id,
          trackingNumber: existingDelivery.tracking_number,
          status: existingDelivery.status
        });
        return {
          success: false,
          error: `A delivery already exists for this sale (Tracking: ${existingDelivery.tracking_number}, Status: ${existingDelivery.status})`
        };
      }

      // Get current user and use provided branch
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      // Prepare delivery data with sale information
      const deliveryInsertData = {
        sale_id: saleId,
        customer_id: sale.customer_id,
        delivery_method: deliveryData.deliveryMethod,
        delivery_address: deliveryData.deliveryAddress || '',
        delivery_phone: deliveryData.deliveryPhone || sale.customer_phone || '',
        delivery_time: deliveryData.deliveryTime || 'ASAP',
        delivery_notes: deliveryData.deliveryNotes || '',
        delivery_fee: deliveryData.deliveryFee || 0,
        branch_id: branchId || '00000000-0000-0000-0000-000000000001',

        // Financial information from sale
        subtotal: sale.subtotal || sale.total_amount || 0,
        tax_amount: sale.tax || 0,
        discount_amount: sale.discount || 0,
        total_amount: (sale.subtotal || sale.total_amount || 0) + (deliveryData.deliveryFee || 0),

        // Method-specific fields
        ...(deliveryData.deliveryMethod === 'boda' && {
          boda_destination: deliveryData.bodaDestination,
          boda_price: deliveryData.bodaPrice || deliveryData.deliveryFee
        }),
        ...(deliveryData.deliveryMethod === 'bus' && {
          bus_name: deliveryData.busName,
          bus_contacts: deliveryData.busContacts,
          arrival_date: deliveryData.arrivalDate,
          bus_office_location: deliveryData.busOfficeLocation,
          bus_destination: deliveryData.busDestination
        }),
        ...(deliveryData.deliveryMethod === 'air' && {
          flight_name: deliveryData.flightName,
          flight_arrival_time: deliveryData.flightArrivalTime,
          air_office_location: deliveryData.airOfficeLocation,
          air_destination: deliveryData.airDestination
        }),

        created_by: user?.id,
        created_by_name: user?.email || 'System'
      };

      console.log('📦 [DeliveryService] Prepared delivery data:', deliveryInsertData);

      const { data: deliveryOrder, error: deliveryError } = await supabase
        .from('lats_delivery_orders')
        .insert([deliveryInsertData])
        .select('id, tracking_number')
        .single();

      if (deliveryError) {
        console.error('❌ [DeliveryService] Delivery creation failed:', deliveryError);
        return { success: false, error: deliveryError.message };
      }

      console.log('✅ [DeliveryService] Delivery created successfully:', {
        deliveryId: deliveryOrder.id,
        trackingNumber: deliveryOrder.tracking_number,
        saleId: saleId
      });

      // Update delivery status to confirmed
      await this.updateDeliveryStatus(deliveryOrder.id, 'confirmed', user?.id, 'Delivery created from sale');

      return {
        success: true,
        delivery: {
          ...deliveryInsertData,
          id: deliveryOrder.id,
          tracking_number: deliveryOrder.tracking_number,
          status: 'confirmed'
        }
      };

    } catch (error) {
      console.error('💥 [DeliveryService] Exception creating delivery from sale:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Create a test delivery for debugging
  async createTestDelivery(branchId: string): Promise<{ success: boolean; delivery?: any; error?: string }> {
    try {
      console.log('🧪 [DeliveryService] Creating test delivery for branch:', branchId);

      const testDelivery = {
        branch_id: branchId,
        delivery_method: 'boda',
        delivery_address: 'Test Address 123',
        delivery_phone: '+255712345678',
        delivery_time: 'ASAP',
        delivery_notes: 'Test delivery for debugging',
        delivery_fee: 5000,
        subtotal: 25000,
        tax_amount: 4500,
        total_amount: 29500,
        status: 'pending'
      };

      const { data, error } = await supabase
        .from('lats_delivery_orders')
        .insert(testDelivery)
        .select()
        .single();

      if (error) {
        console.error('❌ [DeliveryService] Failed to create test delivery:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ [DeliveryService] Test delivery created:', data);
      return { success: true, delivery: data };
    } catch (error) {
      console.error('💥 [DeliveryService] Exception creating test delivery:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Assign driver to delivery
  async assignDriver(deliveryId: string, driverId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: driver, error: driverError } = await supabase
        .from('lats_delivery_drivers')
        .select('name, phone')
        .eq('id', driverId)
        .single();

      if (driverError) {
        return { success: false, error: 'Driver not found' };
      }

      const { error: updateError } = await supabase
        .from('lats_delivery_orders')
        .update({
          assigned_driver_id: driverId,
          assigned_driver_name: driver.name,
          driver_phone: driver.phone,
          assigned_at: new Date().toISOString()
        })
        .eq('id', deliveryId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      // Update status to assigned
      await this.updateDeliveryStatus(deliveryId, 'assigned', `Assigned to driver: ${driver.name}`);

      return { success: true };

    } catch (error) {
      console.error('❌ Error assigning driver:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get available drivers
  async getAvailableDrivers(branchId: string): Promise<{ success: boolean; drivers?: any[]; error?: string }> {
    try {
      const { data: drivers, error } = await supabase
        .from('lats_delivery_drivers')
        .select('*')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, drivers: drivers || [] };

    } catch (error) {
      console.error('❌ Error fetching available drivers:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Process pending customer notifications (to be called by a cron job or scheduled task)
  async processPendingNotifications(): Promise<{ success: boolean; processed?: number; error?: string }> {
    try {
      // Get pending notifications
      const { data: notifications, error: fetchError } = await supabase
        .from('lats_customer_notifications')
        .select('*')
        .eq('status', 'pending')
        .limit(50); // Process in batches

      if (fetchError) {
        return { success: false, error: fetchError.message };
      }

      if (!notifications || notifications.length === 0) {
        return { success: true, processed: 0 };
      }

      let processed = 0;

      for (const notification of notifications) {
        try {
          // Send notification based on channel
          let sendResult = false;

          switch (notification.channel) {
            case 'sms':
              sendResult = await this.sendSMS(notification);
              break;
            case 'email':
              sendResult = await this.sendEmail(notification);
              break;
            case 'whatsapp':
              sendResult = await this.sendWhatsApp(notification);
              break;
          }

          // Update notification status
          const { error: updateError } = await supabase
            .from('lats_customer_notifications')
            .update({
              status: sendResult ? 'sent' : 'failed',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);

          if (!updateError) {
            processed++;
          }

        } catch (notificationError) {
          console.error(`❌ Failed to process notification ${notification.id}:`, notificationError);

          // Mark as failed
          await supabase
            .from('lats_customer_notifications')
            .update({
              status: 'failed',
              sent_at: new Date().toISOString()
            })
            .eq('id', notification.id);
        }
      }

      return { success: true, processed };

    } catch (error) {
      console.error('❌ Error processing pending notifications:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Placeholder methods for sending notifications (to be implemented based on available services)
  private async sendSMS(notification: any): Promise<boolean> {
    console.log(`📱 Would send SMS to customer: ${notification.message}`);
    // TODO: Integrate with SMS service (Twilio, Africa's Talking, etc.)
    return true; // Simulate success
  }

  private async sendEmail(notification: any): Promise<boolean> {
    console.log(`📧 Would send email to customer: ${notification.message}`);
    // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
    return true; // Simulate success
  }

  private async sendWhatsApp(notification: any): Promise<boolean> {
    console.log(`💬 Would send WhatsApp to customer: ${notification.message}`);
    // TODO: Integrate with WhatsApp Business API
    return true; // Simulate success
  }
}

export const deliveryService = new DeliveryService();