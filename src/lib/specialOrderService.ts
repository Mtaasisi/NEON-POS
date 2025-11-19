import { supabase } from './supabaseClient';
import {
  SpecialOrder,
  SpecialOrderPayment,
  CreateSpecialOrderInput,
  UpdateSpecialOrderInput,
  RecordSpecialOrderPaymentInput,
  SpecialOrdersStats,
  SpecialOrderStatus
} from '../types/specialOrders';
import { whatsappService } from '../services/whatsappService';

class SpecialOrderService {
  // Generate unique order number
  private async generateOrderNumber(): Promise<string> {
    const { data, error } = await supabase
      .from('customer_special_orders')
      .select('order_number')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching last order number:', error);
      return `SPO-${Date.now().toString().slice(-6)}`;
    }

    if (!data || data.length === 0) {
      return 'SPO-001';
    }

    const lastNumber = data[0].order_number;
    const match = lastNumber.match(/SPO-(\d+)/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `SPO-${nextNumber.toString().padStart(3, '0')}`;
    }

    return `SPO-${Date.now().toString().slice(-6)}`;
  }

  // Create special order
  async createSpecialOrder(
    input: CreateSpecialOrderInput,
    userId: string
  ): Promise<{ success: boolean; order?: SpecialOrder; error?: string }> {
    try {
      const orderNumber = await this.generateOrderNumber();
      const balanceDue = input.total_amount - input.deposit_paid;

      // Start transaction
      const { data: order, error: orderError } = await supabase
        .from('customer_special_orders')
        .insert({
          order_number: orderNumber,
          customer_id: input.customer_id,
          product_name: input.product_name,
          product_description: input.product_description,
          quantity: input.quantity,
          unit_price: input.unit_price,
          total_amount: input.total_amount,
          deposit_paid: input.deposit_paid,
          balance_due: balanceDue,
          expected_arrival_date: input.expected_arrival_date,
          supplier_name: input.supplier_name,
          supplier_reference: input.supplier_reference,
          country_of_origin: input.country_of_origin,
          tracking_number: input.tracking_number,
          notes: input.notes,
          internal_notes: input.internal_notes,
          status: 'deposit_received',
          created_by: userId
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Record initial deposit payment
      if (input.deposit_paid > 0) {
        const { error: paymentError } = await supabase
          .from('special_order_payments')
          .insert({
            special_order_id: order.id,
            customer_id: input.customer_id,
            amount: input.deposit_paid,
            payment_method: input.payment_method,
            account_id: input.account_id,
            reference_number: `${orderNumber}-DEPOSIT`,
            notes: 'Initial deposit',
            created_by: userId
          });

        if (paymentError) {
          console.error('Error recording deposit payment:', paymentError);
        }

        // Update finance account balance
        await this.updateFinanceAccount(input.account_id, input.deposit_paid);
      }

      // Send notification
      await this.sendOrderCreatedNotification(order.id, userId);

      return { success: true, order: order as SpecialOrder };
    } catch (error: any) {
      console.error('Error creating special order:', error);
      return { success: false, error: error.message };
    }
  }

  // Update special order status
  async updateSpecialOrder(
    orderId: string,
    input: UpdateSpecialOrderInput,
    userId: string
  ): Promise<{ success: boolean; order?: SpecialOrder; error?: string }> {
    try {
      const { data: order, error } = await supabase
        .from('customer_special_orders')
        .update({
          ...input,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Send notification based on status change
      if (input.status) {
        await this.sendStatusUpdateNotification(orderId, input.status, userId);
      }

      return { success: true, order: order as SpecialOrder };
    } catch (error: any) {
      console.error('Error updating special order:', error);
      return { success: false, error: error.message };
    }
  }

  // Record payment for special order
  async recordPayment(
    input: RecordSpecialOrderPaymentInput,
    userId: string
  ): Promise<{ success: boolean; payment?: SpecialOrderPayment; error?: string }> {
    try {
      const { data: payment, error: paymentError } = await supabase
        .from('special_order_payments')
        .insert({
          ...input,
          created_by: userId
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update finance account
      await this.updateFinanceAccount(input.account_id, input.amount);

      // Send payment confirmation notification
      await this.sendPaymentReceivedNotification(
        input.special_order_id,
        input.amount,
        userId
      );

      return { success: true, payment: payment as SpecialOrderPayment };
    } catch (error: any) {
      console.error('Error recording payment:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all special orders with customer details
  async getAllSpecialOrders(branchId?: string): Promise<SpecialOrder[]> {
    try {
      let query = supabase
        .from('customer_special_orders')
        .select(`
          *,
          customer:customers(id, name, phone, email),
          payments:special_order_payments!special_order_id(*)
        `)
        .order('created_at', { ascending: false });

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error} = await query;

      if (error) throw error;
      return (data || []) as SpecialOrder[];
    } catch (error) {
      console.error('Error fetching special orders:', error);
      return [];
    }
  }

  // Get special order by ID with payments
  async getSpecialOrderById(orderId: string): Promise<SpecialOrder | null> {
    try {
      const { data, error } = await supabase
        .from('customer_special_orders')
        .select(`
          *,
          customer:customers(id, name, phone, email),
          payments:special_order_payments!special_order_id(*)
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      return data as SpecialOrder;
    } catch (error) {
      console.error('Error fetching special order:', error);
      return null;
    }
  }

  // Get customer's special orders
  async getCustomerSpecialOrders(customerId: string): Promise<SpecialOrder[]> {
    try {
      const { data, error } = await supabase
        .from('customer_special_orders')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as SpecialOrder[];
    } catch (error) {
      console.error('Error fetching customer special orders:', error);
      return [];
    }
  }

  // Get statistics
  async getStatistics(branchId?: string): Promise<SpecialOrdersStats> {
    try {
      let query = supabase
        .from('customer_special_orders')
        .select('*');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const orders = data || [];
      const stats: SpecialOrdersStats = {
        total: orders.length,
        deposit_received: orders.filter(o => o.status === 'deposit_received').length,
        ordered: orders.filter(o => o.status === 'ordered').length,
        in_transit: orders.filter(o => o.status === 'in_transit').length,
        arrived: orders.filter(o => o.status === 'arrived').length,
        ready_for_pickup: orders.filter(o => o.status === 'ready_for_pickup').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        total_value: orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0),
        total_deposits: orders.reduce((sum, o) => sum + Number(o.deposit_paid || 0), 0),
        total_balance_due: orders.reduce((sum, o) => sum + Number(o.balance_due || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('Error calculating statistics:', error);
      return {
        total: 0,
        deposit_received: 0,
        ordered: 0,
        in_transit: 0,
        arrived: 0,
        ready_for_pickup: 0,
        delivered: 0,
        cancelled: 0,
        total_value: 0,
        total_deposits: 0,
        total_balance_due: 0
      };
    }
  }

  // Delete special order
  async deleteSpecialOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('customer_special_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting special order:', error);
      return { success: false, error: error.message };
    }
  }

  // ================================================
  // PRIVATE HELPER METHODS
  // ================================================

  private async updateFinanceAccount(accountId: string, amount: number): Promise<void> {
    try {
      const { data: account, error: fetchError } = await supabase
        .from('finance_accounts')
        .select('balance')
        .eq('id', accountId)
        .single();

      if (fetchError || !account) {
        console.error('Error fetching finance account:', fetchError);
        return;
      }

      const newBalance = Number(account.balance) + amount;

      const { error: updateError } = await supabase
        .from('finance_accounts')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);

      if (updateError) {
        console.error('Error updating finance account:', updateError);
      }
    } catch (error) {
      console.error('Error in updateFinanceAccount:', error);
    }
  }

  // ================================================
  // NOTIFICATION METHODS
  // ================================================

  private async sendOrderCreatedNotification(
    orderId: string,
    userId: string
  ): Promise<void> {
    try {
      const order = await this.getSpecialOrderById(orderId);
      if (!order || !order.customer) return;

      const message = `✅ Special Order Confirmed!\n\nThank you for your order ${order.order_number}!\n\nProduct: ${order.product_name}\nQuantity: ${order.quantity}\nTotal: ${this.formatCurrency(order.total_amount)}\nDeposit Paid: ${this.formatCurrency(order.deposit_paid)}\nBalance: ${this.formatCurrency(order.balance_due)}\n\n${order.expected_arrival_date ? `Expected Arrival: ${this.formatDate(order.expected_arrival_date)}\n` : ''}We'll keep you updated on your order status!`;

      // Send WhatsApp if customer has phone
      if (order.customer.phone) {
        await whatsappService.sendWhatsAppMessage(
          order.customer.phone,
          message,
          order.customer_id
        );
      }

      // Create in-app notification
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'payment',
          category: 'payment',
          title: 'Special Order Created',
          message: `Order ${order.order_number} created for ${order.customer.name}`,
          priority: 'normal',
          status: 'unread',
          metadata: { orderId: order.id, orderNumber: order.order_number }
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error sending order created notification:', error);
    }
  }

  private async sendStatusUpdateNotification(
    orderId: string,
    newStatus: SpecialOrderStatus,
    userId: string
  ): Promise<void> {
    try {
      const order = await this.getSpecialOrderById(orderId);
      if (!order || !order.customer) return;

      const statusMessages: Record<SpecialOrderStatus, string> = {
        deposit_received: '✅ Deposit Received',
        ordered: '📦 Ordered from Supplier',
        in_transit: '🚢 In Transit',
        arrived: '✨ Arrived at Store',
        ready_for_pickup: '🎉 Ready for Pickup',
        delivered: '✅ Delivered',
        cancelled: '❌ Cancelled'
      };

      const detailedMessages: Record<SpecialOrderStatus, string> = {
        deposit_received: `Your deposit of ${this.formatCurrency(order.deposit_paid)} has been received for order ${order.order_number}.`,
        ordered: `Good news! We've ordered your ${order.product_name} from ${order.country_of_origin || 'our supplier'}. ${order.tracking_number ? `Tracking: ${order.tracking_number}` : 'We\'ll update you when it ships.'}`,
        in_transit: `Your ${order.product_name} is on the way! ${order.expected_arrival_date ? `Expected arrival: ${this.formatDate(order.expected_arrival_date)}` : ''}`,
        arrived: `Great news! Your ${order.product_name} has arrived!${order.balance_due > 0 ? `\n\nBalance due: ${this.formatCurrency(order.balance_due)}\nPlease visit us to collect your order.` : '\nReady for pickup!'}`,
        ready_for_pickup: `Your ${order.product_name} is ready for pickup! Please visit our store to collect it.`,
        delivered: `Thank you! Your order ${order.order_number} has been completed. We hope you enjoy your ${order.product_name}!`,
        cancelled: `Your order ${order.order_number} has been cancelled. Please contact us if you have any questions.`
      };

      const title = statusMessages[newStatus];
      const message = `${title}\n\nOrder: ${order.order_number}\nProduct: ${order.product_name}\n\n${detailedMessages[newStatus]}`;

      // Send WhatsApp/SMS
      if (order.customer.phone) {
        await whatsappService.sendWhatsAppMessage(
          order.customer.phone,
          message,
          order.customer_id
        );
      }

      // Create in-app notification
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'system',
          category: 'general',
          title: title,
          message: `Order ${order.order_number} - ${order.product_name}`,
          priority: newStatus === 'arrived' ? 'high' : 'normal',
          status: 'unread',
          metadata: { orderId: order.id, status: newStatus }
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error sending status update notification:', error);
    }
  }

  private async sendPaymentReceivedNotification(
    orderId: string,
    amount: number,
    userId: string
  ): Promise<void> {
    try {
      const order = await this.getSpecialOrderById(orderId);
      if (!order || !order.customer) return;

      const message = `✅ Payment Received!\n\nOrder: ${order.order_number}\nProduct: ${order.product_name}\n\nAmount Paid: ${this.formatCurrency(amount)}\nTotal Paid: ${this.formatCurrency(order.deposit_paid)}\nRemaining Balance: ${this.formatCurrency(order.balance_due)}\n\nThank you for your payment!`;

      // Send WhatsApp/SMS
      if (order.customer.phone) {
        await whatsappService.sendWhatsAppMessage(
          order.customer.phone,
          message,
          order.customer_id
        );
      }

      // Create in-app notification
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'payment',
          category: 'payment',
          title: 'Payment Received',
          message: `${this.formatCurrency(amount)} received for order ${order.order_number}`,
          priority: 'normal',
          status: 'unread',
          metadata: { orderId: order.id, amount }
        });
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    } catch (error) {
      console.error('Error sending payment received notification:', error);
    }
  }

  // ================================================
  // UTILITY METHODS
  // ================================================

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}

export const specialOrderService = new SpecialOrderService();

