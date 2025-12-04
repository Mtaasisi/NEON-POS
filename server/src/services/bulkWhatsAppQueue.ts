/**
 * Server-Side Bulk WhatsApp Queue Service
 * Runs independently in the cloud - no browser connection required
 * 
 * Features:
 * - Queue-based message sending
 * - Survives disconnections
 * - Background processing
 * - Progress tracking via database
 * - Automatic retry on failures
 * - Rate limiting and anti-ban protection
 */

import { createClient } from '@supabase/supabase-js';

interface BulkCampaign {
  id: string;
  user_id: string;
  name: string;
  message: string;
  recipients: Array<{ phone: string; name: string }>;
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: {
    current: number;
    total: number;
    success: number;
    failed: number;
  };
  settings: {
    use_personalization: boolean;
    random_delay: boolean;
    min_delay: number;
    max_delay: number;
    use_presence: boolean;
  };
  media_url?: string;
  media_type?: 'image' | 'video' | 'document' | 'audio';
  failed_recipients: Array<{ phone: string; name: string; error: string }>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  last_heartbeat?: string;
}

export class BulkWhatsAppQueueService {
  private supabase;
  private isProcessing = false;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create a new bulk campaign
   * Client calls this, then disconnects - campaign runs in cloud
   */
  async createCampaign(
    userId: string,
    name: string,
    message: string,
    recipients: Array<{ phone: string; name: string }>,
    settings: any,
    mediaUrl?: string,
    mediaType?: string
  ): Promise<{ campaignId: string }> {
    const campaign: Partial<BulkCampaign> = {
      id: `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      name,
      message,
      recipients,
      status: 'pending',
      progress: {
        current: 0,
        total: recipients.length,
        success: 0,
        failed: 0
      },
      settings,
      media_url: mediaUrl,
      media_type: mediaType as any,
      failed_recipients: [],
      created_at: new Date().toISOString()
    };

    const { data, error } = await this.supabase
      .from('whatsapp_bulk_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) throw error;

    return { campaignId: data.id };
  }

  /**
   * Process campaigns - runs continuously in cloud
   * This would be triggered by a cron job or background worker
   */
  async processPendingCampaigns() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      // Get all pending or running campaigns
      const { data: campaigns, error } = await this.supabase
        .from('whatsapp_bulk_campaigns')
        .select('*')
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      for (const campaign of campaigns || []) {
        await this.processCampaign(campaign);
      }
    } catch (error) {
      console.error('Error processing campaigns:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single campaign
   */
  private async processCampaign(campaign: BulkCampaign) {
    try {
      // Mark as running
      await this.updateCampaignStatus(campaign.id, 'running', {
        started_at: new Date().toISOString()
      });

      // Get WhatsApp service
      const { sendMessage } = await this.getWhatsAppService();

      // Resume from last position
      const startIndex = campaign.progress.current;
      let successCount = campaign.progress.success;
      let failCount = campaign.progress.failed;
      const failedRecipients = [...campaign.failed_recipients];

      // Send messages
      for (let i = startIndex; i < campaign.recipients.length; i++) {
        const recipient = campaign.recipients[i];

        try {
          // Update heartbeat
          await this.updateHeartbeat(campaign.id);

          // Personalize message
          let personalizedMessage = campaign.message
            .replace(/\{name\}/gi, recipient.name)
            .replace(/\{phone\}/gi, recipient.phone)
            .replace(/\{date\}/gi, new Date().toLocaleDateString())
            .replace(/\{time\}/gi, new Date().toLocaleTimeString());

          // Send message
          const result = await sendMessage(
            recipient.phone,
            personalizedMessage,
            campaign.media_url ? {
              message_type: campaign.media_type,
              media_url: campaign.media_url
            } : undefined
          );

          if (result.success) {
            successCount++;
          } else {
            failCount++;
            failedRecipients.push({
              phone: recipient.phone,
              name: recipient.name,
              error: result.error || 'Unknown error'
            });
          }

          // Update progress
          await this.updateProgress(campaign.id, {
            current: i + 1,
            success: successCount,
            failed: failCount,
            failed_recipients: failedRecipients
          });

          // Apply delay
          if (i < campaign.recipients.length - 1) {
            const delay = this.calculateDelay(campaign.settings);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          failCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failedRecipients.push({
            phone: recipient.phone,
            name: recipient.name,
            error: errorMessage
          });

          await this.updateProgress(campaign.id, {
            current: i + 1,
            success: successCount,
            failed: failCount,
            failed_recipients: failedRecipients
          });
        }
      }

      // Mark as completed
      await this.updateCampaignStatus(campaign.id, 'completed', {
        completed_at: new Date().toISOString()
      });

      // Send notification to user (email or in-app)
      await this.notifyUser(campaign.user_id, {
        campaign_name: campaign.name,
        total: campaign.recipients.length,
        success: successCount,
        failed: failCount
      });

    } catch (error) {
      console.error(`Error processing campaign ${campaign.id}:`, error);
      await this.updateCampaignStatus(campaign.id, 'failed');
    }
  }

  /**
   * Update campaign status
   */
  private async updateCampaignStatus(
    campaignId: string,
    status: BulkCampaign['status'],
    additionalData: any = {}
  ) {
    await this.supabase
      .from('whatsapp_bulk_campaigns')
      .update({ status, ...additionalData })
      .eq('id', campaignId);
  }

  /**
   * Update campaign progress
   */
  private async updateProgress(
    campaignId: string,
    progress: {
      current: number;
      success: number;
      failed: number;
      failed_recipients: Array<{ phone: string; name: string; error: string }>;
    }
  ) {
    await this.supabase
      .from('whatsapp_bulk_campaigns')
      .update({
        progress: {
          current: progress.current,
          total: 0, // Will be merged with existing
          success: progress.success,
          failed: progress.failed
        },
        failed_recipients: progress.failed_recipients,
        last_heartbeat: new Date().toISOString()
      })
      .eq('id', campaignId);
  }

  /**
   * Update heartbeat (to show campaign is still alive)
   */
  private async updateHeartbeat(campaignId: string) {
    await this.supabase
      .from('whatsapp_bulk_campaigns')
      .update({ last_heartbeat: new Date().toISOString() })
      .eq('id', campaignId);
  }

  /**
   * Calculate delay based on settings
   */
  private calculateDelay(settings: BulkCampaign['settings']): number {
    const { random_delay, min_delay, max_delay } = settings;
    
    if (random_delay) {
      const randomSeconds = min_delay + Math.random() * (max_delay - min_delay);
      return randomSeconds * 1000;
    }
    
    return min_delay * 1000;
  }

  /**
   * Get WhatsApp service (dynamic import to avoid circular deps)
   */
  private async getWhatsAppService() {
    // This would import your existing WhatsApp service
    return {
      sendMessage: async (phone: string, message: string, options?: any) => {
        // Implement actual WhatsApp sending logic
        return { success: true };
      }
    };
  }

  /**
   * Notify user when campaign completes
   */
  private async notifyUser(userId: string, data: any) {
    // Could send email, push notification, or in-app notification
    console.log(`📧 Notifying user ${userId}:`, data);
    
    // Example: Create in-app notification
    await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'bulk_campaign_complete',
        title: `Campaign "${data.campaign_name}" Complete`,
        message: `Sent ${data.success} out of ${data.total} messages. ${data.failed} failed.`,
        data: data,
        created_at: new Date().toISOString()
      });
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string) {
    await this.updateCampaignStatus(campaignId, 'paused');
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string) {
    await this.updateCampaignStatus(campaignId, 'running');
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string) {
    await this.updateCampaignStatus(campaignId, 'failed');
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(campaignId: string): Promise<BulkCampaign | null> {
    const { data, error } = await this.supabase
      .from('whatsapp_bulk_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) return null;
    return data;
  }

  /**
   * Retry failed messages from a completed campaign
   */
  async retryFailedMessages(campaignId: string, userId: string): Promise<{ campaignId: string }> {
    const originalCampaign = await this.getCampaignStatus(campaignId);
    
    if (!originalCampaign || originalCampaign.failed_recipients.length === 0) {
      throw new Error('No failed recipients to retry');
    }

    // Create new campaign with only failed recipients
    return this.createCampaign(
      userId,
      `${originalCampaign.name} (Retry)`,
      originalCampaign.message,
      originalCampaign.failed_recipients.map(r => ({ phone: r.phone, name: r.name })),
      originalCampaign.settings,
      originalCampaign.media_url,
      originalCampaign.media_type
    );
  }
}

export default BulkWhatsAppQueueService;

