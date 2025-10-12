/**
 * Mobile Money Payment Service (M-Pesa, Tigo Pesa, Airtel Money)
 * - Payment initiation
 * - Status tracking
 * - Callback handling
 * - Reconciliation
 * - Balance checking
 */

import { supabase } from '../lib/supabaseClient';

interface PaymentRequest {
  phone: string;
  amount: number;
  currency?: string;
  accountReference?: string;
  description?: string;
  customerId?: string;
  saleId?: string;
}

interface PaymentResponse {
  success: boolean;
  transactionRef?: string;
  providerRef?: string;
  status?: string;
  error?: string;
}

interface MobileMoneyConfig {
  mpesa?: {
    enabled: boolean;
    businessShortcode: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    callbackUrl: string;
    environment: 'sandbox' | 'production';
  };
  tigoPesa?: {
    enabled: boolean;
    merchantCode: string;
    merchantPin: string;
    apiUrl: string;
    callbackUrl: string;
  };
  airtelMoney?: {
    enabled: boolean;
    merchantCode: string;
    apiKey: string;
    apiUrl: string;
    callbackUrl: string;
  };
}

class MobileMoneyService {
  private config: MobileMoneyConfig | null = null;

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize service
   */
  private async initializeService() {
    try {
      this.config = {
        mpesa: {
          enabled: import.meta.env.VITE_ACCEPT_MPESA === 'true',
          businessShortcode: import.meta.env.VITE_MPESA_BUSINESS_SHORTCODE || '',
          consumerKey: import.meta.env.VITE_MPESA_CONSUMER_KEY || '',
          consumerSecret: import.meta.env.VITE_MPESA_CONSUMER_SECRET || '',
          passkey: import.meta.env.VITE_MPESA_PASSKEY || '',
          callbackUrl: import.meta.env.VITE_MPESA_CALLBACK_URL || '',
          environment: import.meta.env.VITE_MPESA_ENV === 'production' ? 'production' : 'sandbox'
        },
        tigoPesa: {
          enabled: import.meta.env.VITE_ACCEPT_TIGOPESA === 'true',
          merchantCode: import.meta.env.VITE_TIGOPESA_MERCHANT_CODE || '',
          merchantPin: import.meta.env.VITE_TIGOPESA_MERCHANT_PIN || '',
          apiUrl: import.meta.env.VITE_TIGOPESA_API_URL || 'https://api.tigo.co.tz',
          callbackUrl: import.meta.env.VITE_TIGOPESA_CALLBACK_URL || ''
        },
        airtelMoney: {
          enabled: import.meta.env.VITE_ACCEPT_AIRTEL_MONEY === 'true',
          merchantCode: import.meta.env.VITE_AIRTEL_MONEY_MERCHANT_CODE || '',
          apiKey: import.meta.env.VITE_AIRTEL_MONEY_API_KEY || '',
          apiUrl: import.meta.env.VITE_AIRTEL_MONEY_API_URL || 'https://api.airtel.co.tz',
          callbackUrl: import.meta.env.VITE_AIRTEL_MONEY_CALLBACK_URL || ''
        }
      };
    } catch (error) {
      console.error('Failed to initialize Mobile Money service:', error);
    }
  }

  /**
   * Initiate M-Pesa payment
   */
  async initiateMpesaPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (!this.config?.mpesa?.enabled) {
        return { success: false, error: 'M-Pesa not enabled' };
      }

      const cleanPhone = this.cleanPhoneNumber(request.phone);
      const transactionRef = this.generateTransactionRef('MPESA');

      // Log transaction before initiating
      await this.logTransaction({
        transactionRef,
        provider: 'mpesa',
        phone: cleanPhone,
        amount: request.amount,
        currency: request.currency || 'TZS',
        customerId: request.customerId,
        saleId: request.saleId,
        status: 'pending'
      });

      // Get M-Pesa access token
      const accessToken = await this.getMpesaAccessToken();
      
      if (!accessToken) {
        return { success: false, error: 'Failed to get M-Pesa access token' };
      }

      // Initiate STK Push
      const result = await this.mpesaStkPush({
        accessToken,
        phone: cleanPhone,
        amount: request.amount,
        accountReference: request.accountReference || 'Payment',
        transactionRef
      });

      // Update transaction with result
      await this.updateTransaction(transactionRef, {
        provider_ref: result.CheckoutRequestID,
        provider_response: result,
        status: result.ResponseCode === '0' ? 'processing' : 'failed',
        error_message: result.ResponseDescription
      });

      if (result.ResponseCode === '0') {
        return {
          success: true,
          transactionRef,
          providerRef: result.CheckoutRequestID,
          status: 'processing'
        };
      } else {
        return {
          success: false,
          error: result.ResponseDescription
        };
      }
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get M-Pesa access token
   */
  private async getMpesaAccessToken(): Promise<string | null> {
    try {
      const credentials = btoa(
        `${this.config?.mpesa?.consumerKey}:${this.config?.mpesa?.consumerSecret}`
      );

      const apiUrl = this.config?.mpesa?.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

      const response = await fetch(`${apiUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      const data = await response.json();
      return data.access_token || null;
    } catch (error) {
      console.error('Failed to get M-Pesa token:', error);
      return null;
    }
  }

  /**
   * M-Pesa STK Push
   */
  private async mpesaStkPush(params: {
    accessToken: string;
    phone: string;
    amount: number;
    accountReference: string;
    transactionRef: string;
  }): Promise<any> {
    try {
      const timestamp = this.getMpesaTimestamp();
      const password = this.generateMpesaPassword(timestamp);

      const apiUrl = this.config?.mpesa?.environment === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

      const response = await fetch(`${apiUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          BusinessShortCode: this.config?.mpesa?.businessShortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.round(params.amount),
          PartyA: params.phone,
          PartyB: this.config?.mpesa?.businessShortcode,
          PhoneNumber: params.phone,
          CallBackURL: this.config?.mpesa?.callbackUrl,
          AccountReference: params.accountReference,
          TransactionDesc: `Payment ${params.transactionRef}`
        })
      });

      return await response.json();
    } catch (error: any) {
      throw new Error(`M-Pesa STK Push failed: ${error.message}`);
    }
  }

  /**
   * Generate M-Pesa password
   */
  private generateMpesaPassword(timestamp: string): string {
    const str = `${this.config?.mpesa?.businessShortcode}${this.config?.mpesa?.passkey}${timestamp}`;
    return btoa(str);
  }

  /**
   * Get M-Pesa timestamp
   */
  private getMpesaTimestamp(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const second = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(transactionRef: string): Promise<{
    status: string;
    providerRef?: string;
    completedAt?: Date;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('mobile_money_transactions')
        .select('*')
        .eq('transaction_ref', transactionRef)
        .single();

      if (error || !data) {
        return { status: 'not_found', error: 'Transaction not found' };
      }

      return {
        status: data.status,
        providerRef: data.provider_ref,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined
      };
    } catch (error: any) {
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Handle payment callback
   */
  async handlePaymentCallback(payload: any): Promise<boolean> {
    try {
      // Determine provider from callback
      let provider = '';
      let transactionRef = '';
      let status = '';

      if (payload.Body?.stkCallback) {
        // M-Pesa callback
        provider = 'mpesa';
        const callback = payload.Body.stkCallback;
        transactionRef = callback.CheckoutRequestID;
        status = callback.ResultCode === 0 ? 'completed' : 'failed';

        // Find transaction by provider ref
        const { data } = await supabase
          .from('mobile_money_transactions')
          .select('transaction_ref')
          .eq('provider_ref', transactionRef)
          .single();

        if (data) {
          transactionRef = data.transaction_ref;
        }
      }

      // Update transaction
      await this.updateTransaction(transactionRef, {
        status,
        callback_received: true,
        callback_data: payload,
        callback_received_at: new Date(),
        completed_at: status === 'completed' ? new Date() : undefined
      });

      return true;
    } catch (error) {
      console.error('Callback handling error:', error);
      return false;
    }
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(dateRange?: { from: Date; to: Date }): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalAmount: number;
    byProvider: Record<string, any>;
  }> {
    try {
      let query = supabase.from('mobile_money_transactions').select('*');

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.from.toISOString())
          .lte('created_at', dateRange.to.toISOString());
      }

      const { data, error } = await query;

      if (error || !data) {
        return {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          totalAmount: 0,
          byProvider: {}
        };
      }

      const stats = {
        totalTransactions: data.length,
        successfulTransactions: data.filter((t: any) => t.status === 'completed').length,
        failedTransactions: data.filter((t: any) => t.status === 'failed').length,
        totalAmount: data
          .filter((t: any) => t.status === 'completed')
          .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0),
        byProvider: {} as Record<string, any>
      };

      // Group by provider
      data.forEach((transaction: any) => {
        if (!stats.byProvider[transaction.provider]) {
          stats.byProvider[transaction.provider] = {
            count: 0,
            successful: 0,
            failed: 0,
            total: 0
          };
        }
        stats.byProvider[transaction.provider].count++;
        if (transaction.status === 'completed') {
          stats.byProvider[transaction.provider].successful++;
          stats.byProvider[transaction.provider].total += parseFloat(transaction.amount);
        } else if (transaction.status === 'failed') {
          stats.byProvider[transaction.provider].failed++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Get statistics error:', error);
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        totalAmount: 0,
        byProvider: {}
      };
    }
  }

  // ==================== HELPER FUNCTIONS ====================

  /**
   * Clean phone number
   */
  private cleanPhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[^\d]/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '255' + cleaned.substring(1);
    } else if (!cleaned.startsWith('255')) {
      cleaned = '255' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Generate transaction reference
   */
  private generateTransactionRef(provider: string): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${provider}-${timestamp}-${random}`;
  }

  /**
   * Log transaction
   */
  private async logTransaction(data: any): Promise<string> {
    try {
      const { data: txData, error } = await supabase
        .from('mobile_money_transactions')
        .insert({
          transaction_ref: data.transactionRef,
          provider: data.provider,
          phone: data.phone,
          amount: data.amount,
          currency: data.currency,
          customer_id: data.customerId,
          sale_id: data.saleId,
          status: data.status,
          business_shortcode: this.config?.mpesa?.businessShortcode,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return txData.id;
    } catch (error) {
      console.error('Log transaction error:', error);
      return '';
    }
  }

  /**
   * Update transaction
   */
  private async updateTransaction(transactionRef: string, updates: any) {
    try {
      await supabase
        .from('mobile_money_transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('transaction_ref', transactionRef);
    } catch (error) {
      console.error('Update transaction error:', error);
    }
  }
}

// Export singleton instance
export const mobileMoneyService = new MobileMoneyService();
export default mobileMoneyService;

