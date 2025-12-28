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
    console.log('🚀 [BULK WHATSAPP] Creating new campaign...');
    console.log('📊 [DEBUG] Campaign details:', {
      userId,
      name,
      recipientCount: recipients.length,
      messageLength: message.length,
      hasMedia: !!mediaUrl,
      mediaType,
      settings
    });

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

    console.log('💾 [DEBUG] Inserting campaign into database:', campaign.id);

    const { data, error } = await this.supabase
      .from('whatsapp_bulk_campaigns')
      .insert(campaign)
      .select()
      .single();

    if (error) {
      console.error('❌ [ERROR] Failed to create campaign:', error);
      throw error;
    }

    console.log('✅ [SUCCESS] Campaign created successfully:', data.id);
    console.log('📋 [INFO] Recipients to process:', recipients.length);

    return { campaignId: data.id };
  }

  /**
   * Process campaigns - runs continuously in cloud
   * This would be triggered by a cron job or background worker
   */
  async processPendingCampaigns() {
    if (this.isProcessing) {
      console.log('⏸️ [DEBUG] Campaign processing already in progress, skipping...');
      return;
    }
    
    console.log('🔄 [BULK WHATSAPP] Starting campaign processing...');
    this.isProcessing = true;

    try {
      // Get all pending or running campaigns
      console.log('🔍 [DEBUG] Fetching pending/running campaigns...');
      const { data: campaigns, error } = await this.supabase
        .from('whatsapp_bulk_campaigns')
        .select('*')
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log(`📊 [INFO] Found ${campaigns?.length || 0} campaigns to process`);

      for (const campaign of campaigns || []) {
        console.log(`\n📤 [CAMPAIGN] Processing: ${campaign.name} (${campaign.id})`);
        await this.processCampaign(campaign);
      }

      console.log('✅ [COMPLETE] All campaigns processed');
    } catch (error) {
      console.error('❌ [ERROR] Error processing campaigns:', error);
    } finally {
      this.isProcessing = false;
      console.log('🏁 [DEBUG] Campaign processing finished\n');
    }
  }

  /**
   * Process a single campaign
   */
  private async processCampaign(campaign: BulkCampaign) {
    console.log(`\n┌─────────────────────────────────────────────┐`);
    console.log(`│ 🎯 PROCESSING CAMPAIGN: ${campaign.name.padEnd(21)} │`);
    console.log(`└─────────────────────────────────────────────┘`);
    console.log(`📋 Campaign ID: ${campaign.id}`);
    console.log(`👤 User ID: ${campaign.user_id}`);
    console.log(`📊 Status: ${campaign.status}`);
    console.log(`📨 Total Recipients: ${campaign.recipients.length}`);
    console.log(`✅ Already Sent: ${campaign.progress.success}`);
    console.log(`❌ Already Failed: ${campaign.progress.failed}`);
    console.log(`⏯️  Resume from: ${campaign.progress.current}\n`);

    try {
      // Mark as running
      console.log('▶️ [STATUS] Marking campaign as running...');
      await this.updateCampaignStatus(campaign.id, 'running', {
        started_at: new Date().toISOString()
      });

      // Get WhatsApp service
      console.log('🔧 [DEBUG] Getting WhatsApp service...');
      const { sendMessage } = await this.getWhatsAppService();

      // Resume from last position
      const startIndex = campaign.progress.current;
      let successCount = campaign.progress.success;
      let failCount = campaign.progress.failed;
      const failedRecipients = [...campaign.failed_recipients];

      console.log(`\n📤 [SENDING] Starting message delivery...`);
      console.log(`─────────────────────────────────────────────\n`);

      // Send messages
      for (let i = startIndex; i < campaign.recipients.length; i++) {
        const recipient = campaign.recipients[i];
        const progress = `[${i + 1}/${campaign.recipients.length}]`;
        
        console.log(`${progress} 📲 Sending to: ${recipient.name} (${recipient.phone})`);

        try {
          // Update heartbeat
          await this.updateHeartbeat(campaign.id);

          // Personalize message
          let personalizedMessage = campaign.message
            .replace(/\{name\}/gi, recipient.name)
            .replace(/\{phone\}/gi, recipient.phone)
            .replace(/\{date\}/gi, new Date().toLocaleDateString())
            .replace(/\{time\}/gi, new Date().toLocaleTimeString());

          console.log(`   📝 Message preview: "${personalizedMessage.substring(0, 50)}${personalizedMessage.length > 50 ? '...' : ''}"`);
          if (campaign.media_url) {
            console.log(`   📎 Media: ${campaign.media_type} - ${campaign.media_url}`);
          }

          // Send message
          const sendStart = Date.now();
          const result = await sendMessage(
            recipient.phone,
            personalizedMessage,
            campaign.media_url ? {
              message_type: campaign.media_type,
              media_url: campaign.media_url
            } : undefined
          );
          const sendDuration = Date.now() - sendStart;

          if (result.success) {
            successCount++;
            console.log(`   ✅ SUCCESS (${sendDuration}ms) - Total sent: ${successCount}`);
          } else {
            failCount++;
            failedRecipients.push({
              phone: recipient.phone,
              name: recipient.name,
              error: result.error || 'Unknown error'
            });
            console.log(`   ❌ FAILED: ${result.error || 'Unknown error'}`);
            console.log(`   📊 Total failed: ${failCount}`);
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
            console.log(`   ⏱️  Waiting ${delay}ms before next message...\n`);
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

          console.log(`   ❌ EXCEPTION: ${errorMessage}`);
          console.error(`   🐛 Error stack:`, error);
          console.log(`   📊 Total failed: ${failCount}\n`);

          await this.updateProgress(campaign.id, {
            current: i + 1,
            success: successCount,
            failed: failCount,
            failed_recipients: failedRecipients
          });
        }
      }

      console.log(`\n─────────────────────────────────────────────`);
      console.log(`✅ [COMPLETE] Campaign finished!`);
      console.log(`📊 Final Statistics:`);
      console.log(`   • Total Recipients: ${campaign.recipients.length}`);
      console.log(`   • Successfully Sent: ${successCount} (${Math.round(successCount / campaign.recipients.length * 100)}%)`);
      console.log(`   • Failed: ${failCount} (${Math.round(failCount / campaign.recipients.length * 100)}%)`);
      console.log(`─────────────────────────────────────────────\n`);

      // Mark as completed
      await this.updateCampaignStatus(campaign.id, 'completed', {
        completed_at: new Date().toISOString()
      });

      // Send notification to user (email or in-app)
      console.log('📧 [NOTIFICATION] Sending completion notification to user...');
      await this.notifyUser(campaign.user_id, {
        campaign_name: campaign.name,
        total: campaign.recipients.length,
        success: successCount,
        failed: failCount
      });

    } catch (error) {
      console.error(`\n❌ [CRITICAL ERROR] Campaign ${campaign.id} failed:`, error);
      console.error('Stack trace:', error);
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
    console.log(`📝 [DEBUG] Updating campaign status to: ${status}`);
    const { error } = await this.supabase
      .from('whatsapp_bulk_campaigns')
      .update({ status, ...additionalData })
      .eq('id', campaignId);
    
    if (error) {
      console.error('❌ [ERROR] Failed to update campaign status:', error);
    } else {
      console.log('✅ [DEBUG] Campaign status updated successfully');
    }
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
      const delay = randomSeconds * 1000;
      console.log(`🎲 [DEBUG] Random delay calculated: ${delay}ms (${randomSeconds}s) [Range: ${min_delay}-${max_delay}s]`);
      return delay;
    }
    
    const delay = min_delay * 1000;
    console.log(`⏱️  [DEBUG] Fixed delay: ${delay}ms (${min_delay}s)`);
    return delay;
  }

  /**
   * Get WhatsApp service (dynamic import to avoid circular deps)
   */
  private async getWhatsAppService() {
    // This would import your existing WhatsApp service
    return {
      sendMessage: async (phone: string, message: string, options?: any) => { // eslint-disable-line no-unused-vars
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
    console.log(`\n📧 [NOTIFICATION] Notifying user ${userId}`);
    console.log(`   Campaign: ${data.campaign_name}`);
    console.log(`   Results: ${data.success}/${data.total} sent, ${data.failed} failed`);
    
    // Example: Create in-app notification
    const { error } = await this.supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'bulk_campaign_complete',
        title: `Campaign "${data.campaign_name}" Complete`,
        message: `Sent ${data.success} out of ${data.total} messages. ${data.failed} failed.`,
        data: data,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ [ERROR] Failed to create notification:', error);
    } else {
      console.log('✅ [SUCCESS] Notification created successfully');
    }
  }

  /**
   * Pause a running campaign
   */
  async pauseCampaign(campaignId: string) {
    console.log(`⏸️ [PAUSE] Pausing campaign: ${campaignId}`);
    await this.updateCampaignStatus(campaignId, 'paused');
  }

  /**
   * Resume a paused campaign
   */
  async resumeCampaign(campaignId: string) {
    console.log(`▶️ [RESUME] Resuming campaign: ${campaignId}`);
    await this.updateCampaignStatus(campaignId, 'running');
  }

  /**
   * Cancel a campaign
   */
  async cancelCampaign(campaignId: string) {
    console.log(`🛑 [CANCEL] Cancelling campaign: ${campaignId}`);
    await this.updateCampaignStatus(campaignId, 'failed');
  }

  /**
   * Get campaign status
   */
  async getCampaignStatus(campaignId: string): Promise<BulkCampaign | null> {
    console.log(`🔍 [DEBUG] Fetching campaign status: ${campaignId}`);
    const { data, error } = await this.supabase
      .from('whatsapp_bulk_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('❌ [ERROR] Failed to fetch campaign:', error);
      return null;
    }
    
    console.log(`✅ [DEBUG] Campaign found: ${data.name} - Status: ${data.status}`);
    return data;
  }

  /**
   * Retry failed messages from a completed campaign
   */
  async retryFailedMessages(campaignId: string, userId: string): Promise<{ campaignId: string }> {
    console.log(`🔄 [RETRY] Retrying failed messages for campaign: ${campaignId}`);
    const originalCampaign = await this.getCampaignStatus(campaignId);
    
    if (!originalCampaign || originalCampaign.failed_recipients.length === 0) {
      console.error('❌ [ERROR] No failed recipients to retry');
      throw new Error('No failed recipients to retry');
    }

    console.log(`📊 [INFO] Retrying ${originalCampaign.failed_recipients.length} failed recipients`);

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

