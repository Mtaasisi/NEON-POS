/**
 * Scheduled Bulk Messages Service
 * 
 * Background service that runs scheduled bulk messages (SMS & WhatsApp)
 * Features:
 * - Cron-based scheduling
 * - Automatic execution of pending messages
 * - Recurring message support
 * - Progress tracking
 * - Error handling and retry logic
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface ScheduledMessage {
  id: string;
  user_id: string;
  name: string;
  message_type: 'sms' | 'whatsapp';
  message_content: string;
  recipients: Array<{ phone: string; name: string; customerId?: string }>;
  total_recipients: number;
  schedule_type: 'once' | 'recurring_daily' | 'recurring_weekly' | 'recurring_monthly' | 'recurring_custom';
  scheduled_for: string;
  timezone: string;
  recurrence_pattern?: any;
  recurrence_end_date?: string;
  execution_mode: 'server' | 'browser';
  auto_execute: boolean;
  settings: any;
  status: 'pending' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  last_executed_at?: string;
  next_execution_at?: string;
  execution_count: number;
  progress: {
    current: number;
    total: number;
    success: number;
    failed: number;
    pending: number;
  };
  failed_recipients: Array<{ phone: string; name: string; error: string }>;
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  view_once?: boolean;
  campaign_id?: string;
}

interface ExecutionResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ phone: string; error: string }>;
}

export class ScheduledMessagesService {
  private supabase: SupabaseClient;
  private isRunning = false;
  private checkInterval = 60000; // Check every 1 minute
  private intervalId?: NodeJS.Timeout;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('📅 Scheduler already running');
      return;
    }

    console.log('📅 Starting Scheduled Messages Service...');
    this.isRunning = true;

    // Run immediately
    this.checkAndExecuteMessages();

    // Then run periodically
    this.intervalId = setInterval(() => {
      this.checkAndExecuteMessages();
    }, this.checkInterval);

    console.log(`✅ Scheduler started (checking every ${this.checkInterval / 1000}s)`);
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.isRunning = false;
    console.log('⏹️  Scheduler stopped');
  }

  /**
   * Set check interval (in milliseconds)
   */
  setCheckInterval(interval: number) {
    this.checkInterval = interval;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Check for messages ready to execute
   */
  private async checkAndExecuteMessages() {
    try {
      console.log('🔍 Checking for scheduled messages...');

      // Get messages ready for execution (server mode only)
      const { data: messages, error } = await this.supabase
        .from('scheduled_bulk_messages')
        .select('*')
        .eq('execution_mode', 'server')
        .eq('auto_execute', true)
        .in('status', ['pending', 'scheduled'])
        .lte('scheduled_for', new Date().toISOString())
        .order('scheduled_for', { ascending: true });

      if (error) {
        console.error('❌ Error fetching scheduled messages:', error);
        return;
      }

      if (!messages || messages.length === 0) {
        console.log('✅ No messages ready for execution');
        return;
      }

      console.log(`📨 Found ${messages.length} message(s) ready for execution`);

      // Execute each message
      for (const message of messages) {
        await this.executeMessage(message as unknown as ScheduledMessage);
      }
    } catch (error) {
      console.error('❌ Error in checkAndExecuteMessages:', error);
    }
  }

  /**
   * Execute a single scheduled message
   */
  async executeMessage(message: ScheduledMessage): Promise<ExecutionResult> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📤 Executing: ${message.name}`);
    console.log(`   Type: ${message.message_type.toUpperCase()}`);
    console.log(`   Recipients: ${message.total_recipients}`);
    console.log(`   Scheduled: ${message.scheduled_for}`);
    console.log(`${'='.repeat(60)}\n`);

    const startTime = Date.now();

    try {
      // Update status to running
      await this.supabase
        .from('scheduled_bulk_messages')
        .update({
          status: 'running',
          started_at: new Date().toISOString()
        })
        .eq('id', message.id);

      // Execute based on message type
      let result: ExecutionResult;
      if (message.message_type === 'sms') {
        result = await this.executeSMS(message);
      } else {
        result = await this.executeWhatsApp(message);
      }

      const duration = Math.floor((Date.now() - startTime) / 1000);

      // Calculate next execution time for recurring messages
      const nextExecution = this.calculateNextExecution(message);

      // Update message status
      const finalStatus = result.success 
        ? (nextExecution ? 'scheduled' : 'completed')
        : 'failed';

      await this.supabase
        .from('scheduled_bulk_messages')
        .update({
          status: finalStatus,
          last_executed_at: new Date().toISOString(),
          next_execution_at: nextExecution,
          execution_count: message.execution_count + 1,
          progress: {
            current: message.total_recipients,
            total: message.total_recipients,
            success: result.sent,
            failed: result.failed,
            pending: 0
          },
          failed_recipients: result.errors,
          completed_at: nextExecution ? undefined : new Date().toISOString(),
          error_message: result.success ? null : result.errors[0]?.error,
          last_error_at: result.success ? null : new Date().toISOString()
        })
        .eq('id', message.id);

      // Log execution history
      await this.supabase
        .from('scheduled_message_executions')
        .insert({
          scheduled_message_id: message.id,
          executed_at: new Date().toISOString(),
          execution_duration: duration,
          total_sent: message.total_recipients,
          success_count: result.sent,
          failed_count: result.failed,
          status: result.failed === 0 ? 'success' : (result.sent > 0 ? 'partial' : 'failed'),
          failed_recipients: result.errors,
          executed_by: 'server'
        });

      console.log(`\n${'='.repeat(60)}`);
      console.log(`✅ Execution completed`);
      console.log(`   Success: ${result.sent}/${message.total_recipients}`);
      console.log(`   Failed: ${result.failed}`);
      console.log(`   Duration: ${duration}s`);
      if (nextExecution) {
        console.log(`   Next execution: ${nextExecution}`);
      }
      console.log(`${'='.repeat(60)}\n`);

      return result;
    } catch (error: any) {
      console.error('❌ Error executing message:', error);

      // Update message with error
      await this.supabase
        .from('scheduled_bulk_messages')
        .update({
          status: 'failed',
          error_message: error.message,
          last_error_at: new Date().toISOString()
        })
        .eq('id', message.id);

      return {
        success: false,
        sent: 0,
        failed: message.total_recipients,
        errors: [{ phone: 'system', error: error.message }]
      };
    }
  }

  /**
   * Execute SMS bulk send
   */
  private async executeSMS(message: ScheduledMessage): Promise<ExecutionResult> {
    console.log('📱 Executing SMS bulk send...');
    
    const result: ExecutionResult = {
      success: true,
      sent: 0,
      failed: 0,
      errors: []
    };

    try {
      // Import SMS service (you might need to adjust the path)
      const { default: smsService } = await import('../../../src/services/smsService');

      // Send to each recipient
      for (const recipient of message.recipients) {
        try {
          // Personalize message
          const personalizedMessage = message.message_content
            .replace(/\{name\}/gi, recipient.name)
            .replace(/\{phone\}/gi, recipient.phone)
            .replace(/\{date\}/gi, new Date().toLocaleDateString())
            .replace(/\{time\}/gi, new Date().toLocaleTimeString());

          const sendResult = await smsService.sendSMS(recipient.phone, personalizedMessage);

          if (sendResult.success) {
            result.sent++;
          } else {
            result.failed++;
            result.errors.push({
              phone: recipient.phone,
              error: sendResult.error || 'Unknown error'
            });
          }

          // Small delay to avoid rate limiting
          await this.delay(message.settings?.min_delay || 1000);
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            phone: recipient.phone,
            error: error.message
          });
        }
      }

      result.success = result.sent > 0;
      return result;
    } catch (error: any) {
      console.error('❌ SMS execution error:', error);
      return {
        success: false,
        sent: 0,
        failed: message.total_recipients,
        errors: [{ phone: 'system', error: error.message }]
      };
    }
  }

  /**
   * Execute WhatsApp bulk send
   */
  private async executeWhatsApp(message: ScheduledMessage): Promise<ExecutionResult> {
    console.log('💬 Executing WhatsApp bulk send...');
    
    const result: ExecutionResult = {
      success: true,
      sent: 0,
      failed: 0,
      errors: []
    };

    try {
      // Import WhatsApp service
      const { default: whatsappService } = await import('../../../src/services/whatsappService');

      const settings = message.settings || {};
      const minDelay = settings.min_delay || 3000;
      const maxDelay = settings.max_delay || 8000;
      const randomDelay = settings.random_delay !== false;

      // Send to each recipient
      for (let i = 0; i < message.recipients.length; i++) {
        const recipient = message.recipients[i];
        
        try {
          // Personalize message
          let personalizedMessage = message.message_content
            .replace(/\{name\}/gi, recipient.name)
            .replace(/\{phone\}/gi, recipient.phone)
            .replace(/\{date\}/gi, new Date().toLocaleDateString())
            .replace(/\{time\}/gi, new Date().toLocaleTimeString());

          console.log(`[${i + 1}/${message.recipients.length}] Sending to: ${recipient.name} (${recipient.phone})`);

          // Prepare options
          const options: any = {};
          if (message.media_url) {
            options.media_url = message.media_url;
            options.message_type = message.media_type;
            options.caption = personalizedMessage;
            if (message.view_once) {
              options.viewOnce = true;
            }
          }

          const sendResult = await whatsappService.sendMessage(
            recipient.phone,
            personalizedMessage,
            options
          );

          if (sendResult.success) {
            result.sent++;
            console.log(`   ✅ SUCCESS`);
          } else {
            result.failed++;
            result.errors.push({
              phone: recipient.phone,
              error: sendResult.error || 'Unknown error'
            });
            console.log(`   ❌ FAILED: ${sendResult.error}`);
          }

          // Random delay between messages (anti-ban)
          if (i < message.recipients.length - 1) {
            const delay = randomDelay
              ? Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
              : minDelay;
            await this.delay(delay);
          }
        } catch (error: any) {
          result.failed++;
          result.errors.push({
            phone: recipient.phone,
            error: error.message
          });
          console.log(`   ❌ ERROR: ${error.message}`);
        }
      }

      result.success = result.sent > 0;
      return result;
    } catch (error: any) {
      console.error('❌ WhatsApp execution error:', error);
      return {
        success: false,
        sent: 0,
        failed: message.total_recipients,
        errors: [{ phone: 'system', error: error.message }]
      };
    }
  }

  /**
   * Calculate next execution time for recurring messages
   */
  private calculateNextExecution(message: ScheduledMessage): string | null {
    if (message.schedule_type === 'once') {
      return null;
    }

    const baseTime = new Date(message.scheduled_for);
    let nextTime: Date;

    switch (message.schedule_type) {
      case 'recurring_daily':
        nextTime = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);
        break;

      case 'recurring_weekly':
        nextTime = new Date(baseTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;

      case 'recurring_monthly':
        nextTime = new Date(baseTime);
        nextTime.setMonth(nextTime.getMonth() + 1);
        break;

      case 'recurring_custom':
        if (message.recurrence_pattern?.interval) {
          const intervalMs = this.parseInterval(message.recurrence_pattern.interval);
          nextTime = new Date(baseTime.getTime() + intervalMs);
        } else {
          return null;
        }
        break;

      default:
        return null;
    }

    // Check if we've reached the end date
    if (message.recurrence_end_date) {
      const endDate = new Date(message.recurrence_end_date);
      if (nextTime > endDate) {
        return null;
      }
    }

    return nextTime.toISOString();
  }

  /**
   * Parse interval string to milliseconds
   */
  private parseInterval(interval: string): number {
    const match = interval.match(/^(\d+)\s*(day|days|hour|hours|minute|minutes)$/i);
    if (!match) {
      throw new Error(`Invalid interval format: ${interval}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'minute':
      case 'minutes':
        return value * 60 * 1000;
      case 'hour':
      case 'hours':
        return value * 60 * 60 * 1000;
      case 'day':
      case 'days':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown interval unit: ${unit}`);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual execution trigger (for testing or manual runs)
   */
  async executeById(messageId: string): Promise<ExecutionResult> {
    const { data: message, error } = await this.supabase
      .from('scheduled_bulk_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (error || !message) {
      throw new Error('Message not found');
    }

    return this.executeMessage(message as unknown as ScheduledMessage);
  }

  /**
   * Pause a scheduled message
   */
  async pauseMessage(messageId: string) {
    const { error } = await this.supabase
      .from('scheduled_bulk_messages')
      .update({ status: 'paused' })
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to pause message: ${error.message}`);
    }

    console.log(`⏸️  Paused message: ${messageId}`);
  }

  /**
   * Resume a paused message
   */
  async resumeMessage(messageId: string) {
    const { error } = await this.supabase
      .from('scheduled_bulk_messages')
      .update({ status: 'scheduled' })
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to resume message: ${error.message}`);
    }

    console.log(`▶️  Resumed message: ${messageId}`);
  }

  /**
   * Cancel a scheduled message
   */
  async cancelMessage(messageId: string) {
    const { error } = await this.supabase
      .from('scheduled_bulk_messages')
      .update({ status: 'cancelled' })
      .eq('id', messageId);

    if (error) {
      throw new Error(`Failed to cancel message: ${error.message}`);
    }

    console.log(`🚫 Cancelled message: ${messageId}`);
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      checkIntervalSeconds: this.checkInterval / 1000
    };
  }
}

// Singleton instance
let schedulerInstance: ScheduledMessagesService | null = null;

/**
 * Get or create scheduler instance
 */
export function getScheduler(supabaseUrl?: string, supabaseKey?: string): ScheduledMessagesService {
  if (!schedulerInstance) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials required to create scheduler');
    }
    schedulerInstance = new ScheduledMessagesService(supabaseUrl, supabaseKey);
  }
  return schedulerInstance;
}

/**
 * Initialize and start the scheduler
 */
export function initScheduler(supabaseUrl: string, supabaseKey: string) {
  const scheduler = getScheduler(supabaseUrl, supabaseKey);
  scheduler.start();
  return scheduler;
}

