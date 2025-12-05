/**
 * Campaign Saving Utility
 * Handles incremental saving of campaigns to database
 */

import whatsappAdvancedService from '../../../services/whatsappAdvancedService';
import type { WhatsAppCampaign } from '../../../types/whatsapp-advanced';

interface CampaignSaveData {
  name: string;
  message: string;
  messageType: string;
  selectedRecipients: string[];
  sentPhones: string[];
  bulkProgress: {
    current: number;
    total: number;
    success: number;
    failed: number;
  };
  failedMessages: Array<{phone: string, name: string, error: string}>;
  campaignStartTime: number | null;
  settings: Record<string, any>;
  conversations: Array<{phone: string, customer_name?: string}>;
}

let currentCampaignId: string | null = null;
let lastSaveTime = 0;
const SAVE_INTERVAL = 20000; // Save every 20 seconds or every 10 messages

/**
 * Create campaign in database when it starts
 */
export async function createCampaignInDB(data: CampaignSaveData): Promise<string | null> {
  try {
    const recipientsData = data.selectedRecipients.map(phone => {
      const conv = data.conversations.find(c => c.phone === phone);
      return {
        phone,
        name: conv?.customer_name || 'Unknown',
        sent: data.sentPhones.includes(phone),
        success: data.sentPhones.includes(phone),
        error: data.failedMessages.find(f => f.phone === phone)?.error || null
      };
    });

    const campaign = await whatsappAdvancedService.campaign.create({
      name: data.name || `Campaign ${new Date().toLocaleDateString()}`,
      message: data.message,
      message_type: data.messageType,
      status: 'active', // Will be updated to 'completed' or 'failed' later
      total_recipients: data.selectedRecipients.length,
      sent_count: data.bulkProgress.current,
      success_count: data.bulkProgress.success,
      failed_count: data.bulkProgress.failed,
      replied_count: 0,
      recipients_data: recipientsData,
      started_at: data.campaignStartTime ? new Date(data.campaignStartTime).toISOString() : new Date().toISOString(),
      completed_at: null,
      duration_seconds: data.campaignStartTime ? Math.floor((Date.now() - data.campaignStartTime) / 1000) : 0,
      settings: data.settings
    });

    currentCampaignId = campaign.id;
    console.log(`✅ Campaign created in DB with ID: ${campaign.id}`);
    return campaign.id;
  } catch (error) {
    console.error('❌ Failed to create campaign in DB:', error);
    return null;
  }
}

/**
 * Update campaign progress incrementally
 */
export async function updateCampaignProgress(
  campaignId: string | null,
  data: CampaignSaveData
): Promise<void> {
  if (!campaignId) return;

  const now = Date.now();
  const timeSinceLastSave = now - lastSaveTime;
  const messagesSinceLastSave = data.bulkProgress.current - (lastSaveTime > 0 ? Math.floor(lastSaveTime / 1000) : 0);

  // Save if 20 seconds passed OR 10 messages sent
  if (timeSinceLastSave < SAVE_INTERVAL && messagesSinceLastSave < 10) {
    return; // Skip this save
  }

  try {
    const recipientsData = data.selectedRecipients.map(phone => {
      const conv = data.conversations.find(c => c.phone === phone);
      return {
        phone,
        name: conv?.customer_name || 'Unknown',
        sent: data.sentPhones.includes(phone),
        success: data.sentPhones.includes(phone),
        error: data.failedMessages.find(f => f.phone === phone)?.error || null
      };
    });

    await whatsappAdvancedService.campaign.update(campaignId, {
      sent_count: data.bulkProgress.current,
      success_count: data.bulkProgress.success,
      failed_count: data.bulkProgress.failed,
      recipients_data: recipientsData,
      duration_seconds: data.campaignStartTime ? Math.floor((Date.now() - data.campaignStartTime) / 1000) : 0
    });

    lastSaveTime = now;
    console.log(`💾 Campaign progress saved (${data.bulkProgress.current}/${data.bulkProgress.total})`);
  } catch (error) {
    console.error('❌ Failed to update campaign progress:', error);
  }
}

/**
 * Finalize campaign when it completes
 */
export async function finalizeCampaign(
  campaignId: string | null,
  data: CampaignSaveData,
  isSuccess: boolean
): Promise<void> {
  if (!campaignId) {
    // If no campaign ID, create one now
    await createCampaignInDB(data);
    return;
  }

  try {
    const recipientsData = data.selectedRecipients.map(phone => {
      const conv = data.conversations.find(c => c.phone === phone);
      return {
        phone,
        name: conv?.customer_name || 'Unknown',
        sent: data.sentPhones.includes(phone),
        success: data.sentPhones.includes(phone),
        error: data.failedMessages.find(f => f.phone === phone)?.error || null
      };
    });

    const campaignDuration = data.campaignStartTime 
      ? Math.floor((Date.now() - data.campaignStartTime) / 1000) 
      : 0;

    await whatsappAdvancedService.campaign.update(campaignId, {
      status: isSuccess ? 'completed' : 'failed',
      sent_count: data.bulkProgress.current,
      success_count: data.bulkProgress.success,
      failed_count: data.bulkProgress.failed,
      recipients_data: recipientsData,
      completed_at: new Date().toISOString(),
      duration_seconds: campaignDuration
    });

    console.log(`✅ Campaign finalized in DB: ${isSuccess ? 'completed' : 'failed'}`);
    currentCampaignId = null;
    lastSaveTime = 0;
  } catch (error) {
    console.error('❌ Failed to finalize campaign:', error);
  }
}

/**
 * Get current campaign ID
 */
export function getCurrentCampaignId(): string | null {
  return currentCampaignId;
}

/**
 * Reset campaign tracking
 */
export function resetCampaignTracking(): void {
  currentCampaignId = null;
  lastSaveTime = 0;
}
