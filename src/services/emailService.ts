/**
 * Email Service
 * 
 * Handles all email communications using SendGrid
 * Supports templates, attachments, and delivery tracking
 */

import sgMail from '@sendgrid/mail';
import { supabase } from '../lib/supabase';

// Initialize SendGrid
const SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY;
const FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || 'noreply@dukani.site';
const FROM_NAME = import.meta.env.VITE_FROM_NAME || 'NEON POS';

// Only warn once about missing SendGrid configuration
let hasWarnedAboutSendGrid = false;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else if (!hasWarnedAboutSendGrid) {
  console.warn('⚠️ SendGrid API key not configured. Email sending will be disabled.');
  hasWarnedAboutSendGrid = true;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    content: string; // Base64 encoded
    filename: string;
    type?: string;
    disposition?: 'attachment' | 'inline';
  }>;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  sendAt?: number; // Unix timestamp for scheduled sending
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private static instance: EmailService;
  private queue: Array<{ options: EmailOptions; retries: number }> = [];
  private isProcessing = false;
  private maxRetries = 3;

  private constructor() {
    // Process queue periodically
    setInterval(() => this.processQueue(), 10000); // Every 10 seconds
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    if (!SENDGRID_API_KEY) {
      console.error('❌ [Email] SendGrid API key not configured');
      return {
        success: false,
        error: 'Email service not configured'
      };
    }

    try {
      const msg: any = {
        to: options.to,
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME
        },
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo,
        attachments: options.attachments,
        sendAt: options.sendAt
      };

      // Use template if provided
      if (options.templateId) {
        msg.templateId = options.templateId;
        msg.dynamicTemplateData = options.templateData || {};
      }

      const [response] = await sgMail.send(msg);

      // Log to database
      await this.logEmail({
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        status: 'sent',
        message_id: response.headers['x-message-id'] || undefined,
        provider_response: JSON.stringify(response)
      });

      console.log('✅ [Email] Sent successfully');
      return {
        success: true,
        messageId: response.headers['x-message-id']
      };
    } catch (error: any) {
      console.error('❌ [Email] Send failed:', error);

      // Log failure
      await this.logEmail({
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        status: 'failed',
        error_message: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email with automatic retry on failure
   */
  async sendWithRetry(options: EmailOptions): Promise<EmailResult> {
    const result = await this.send(options);
    
    if (!result.success && this.maxRetries > 0) {
      this.queue.push({ options, retries: 0 });
    }
    
    return result;
  }

  /**
   * Process email queue
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const item = this.queue.shift();
    if (!item) {
      this.isProcessing = false;
      return;
    }

    const result = await this.send(item.options);

    if (!result.success && item.retries < this.maxRetries) {
      // Re-queue with incremented retry count
      this.queue.push({
        options: item.options,
        retries: item.retries + 1
      });
      console.log(`⏳ [Email] Retry ${item.retries + 1}/${this.maxRetries} for ${item.options.to}`);
    }

    this.isProcessing = false;
  }

  /**
   * Log email to database for tracking
   */
  private async logEmail(data: {
    to: string;
    subject: string;
    status: 'sent' | 'failed' | 'queued';
    message_id?: string;
    error_message?: string;
    provider_response?: string;
  }): Promise<void> {
    try {
      const userId = localStorage.getItem('userId');
      const branchId = localStorage.getItem('selectedBranch');

      await supabase.from('email_logs').insert({
        ...data,
        user_id: userId,
        branch_id: branchId,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [Email] Failed to log email:', error);
    }
  }

  /**
   * Send receipt email
   */
  async sendReceipt(options: {
    to: string;
    customerName: string;
    saleId: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    paymentMethod: string;
  }): Promise<EmailResult> {
    const html = this.generateReceiptHTML(options);

    return this.sendWithRetry({
      to: options.to,
      subject: `Receipt for Order #${options.saleId}`,
      html
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcome(options: {
    to: string;
    name: string;
    temporaryPassword?: string;
  }): Promise<EmailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to NEON POS!</h2>
        <p>Hello ${options.name},</p>
        <p>Your account has been created successfully.</p>
        ${options.temporaryPassword ? `
          <p>Your temporary password is: <strong>${options.temporaryPassword}</strong></p>
          <p>Please change it after your first login.</p>
        ` : ''}
        <p>Best regards,<br>NEON POS Team</p>
      </div>
    `;

    return this.sendWithRetry({
      to: options.to,
      subject: 'Welcome to NEON POS',
      html
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(options: {
    to: string;
    name: string;
    resetLink: string;
  }): Promise<EmailResult> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${options.name},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${options.resetLink}" 
             style="background-color: #4F46E5; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>NEON POS Team</p>
      </div>
    `;

    return this.sendWithRetry({
      to: options.to,
      subject: 'Password Reset Request',
      html
    });
  }

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(options: {
    to: string | string[];
    products: Array<{ name: string; currentStock: number; minStock: number }>;
  }): Promise<EmailResult> {
    const productList = options.products
      .map(p => `<li>${p.name}: ${p.currentStock} units (Min: ${p.minStock})</li>`)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>⚠️ Low Stock Alert</h2>
        <p>The following products are running low on stock:</p>
        <ul>${productList}</ul>
        <p>Please reorder soon to avoid stockouts.</p>
        <p>Best regards,<br>NEON POS System</p>
      </div>
    `;

    return this.sendWithRetry({
      to: options.to,
      subject: '⚠️ Low Stock Alert',
      html
    });
  }

  /**
   * Generate receipt HTML
   */
  private generateReceiptHTML(options: {
    customerName: string;
    saleId: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    paymentMethod: string;
  }): string {
    const itemsHTML = options.items
      .map(
        item => `
        <tr>
          <td>${item.name}</td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">TZS ${item.price.toLocaleString()}</td>
          <td style="text-align: right;">TZS ${(item.quantity * item.price).toLocaleString()}</td>
        </tr>
      `
      )
      .join('');

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center; color: #4F46E5;">NEON POS</h1>
        <h2 style="text-align: center;">Receipt</h2>
        <p><strong>Order ID:</strong> ${options.saleId}</p>
        <p><strong>Customer:</strong> ${options.customerName}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
              <th style="padding: 10px; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #000; font-weight: bold;">
              <td colspan="3" style="padding: 10px; text-align: right;">Total:</td>
              <td style="padding: 10px; text-align: right;">TZS ${options.total.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        
        <p><strong>Payment Method:</strong> ${options.paymentMethod}</p>
        <p style="text-align: center; margin-top: 30px; color: #666;">
          Thank you for your business!
        </p>
      </div>
    `;
  }
}

export const emailService = EmailService.getInstance();

export default emailService;
