/**
 * CRM Integration Hooks
 * Provides integration points for external CRM systems
 */

export interface CRMContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface CRMCampaign {
  id: string;
  name: string;
  message: string;
  recipients: string[];
  status: 'pending' | 'sending' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
}

export interface CRMIntegration {
  // Contact management
  syncContacts?: (contacts: CRMContact[]) => Promise<void>;
  getContact?: (phone: string) => Promise<CRMContact | null>;
  updateContact?: (phone: string, data: Partial<CRMContact>) => Promise<void>;
  
  // Campaign tracking
  createCampaign?: (campaign: Omit<CRMCampaign, 'id' | 'status' | 'createdAt'>) => Promise<string>;
  updateCampaignStatus?: (campaignId: string, status: CRMCampaign['status'], data?: any) => Promise<void>;
  logMessageSent?: (phone: string, message: string, campaignId?: string) => Promise<void>;
  logMessageReceived?: (phone: string, message: string) => Promise<void>;
  
  // Analytics
  getCampaignStats?: (campaignId: string) => Promise<any>;
  getContactEngagement?: (phone: string) => Promise<any>;
}

// Global CRM integration instance
let crmIntegration: CRMIntegration | null = null;

/**
 * Register a CRM integration
 */
export function registerCRMIntegration(integration: CRMIntegration) {
  crmIntegration = integration;
  console.log('✅ CRM integration registered');
}

/**
 * Get the registered CRM integration
 */
export function getCRMIntegration(): CRMIntegration | null {
  return crmIntegration;
}

/**
 * Sync contacts to CRM
 */
export async function syncContactsToCRM(contacts: CRMContact[]): Promise<void> {
  if (crmIntegration?.syncContacts) {
    try {
      await crmIntegration.syncContacts(contacts);
      console.log(`✅ Synced ${contacts.length} contacts to CRM`);
    } catch (error) {
      console.error('❌ Failed to sync contacts to CRM:', error);
    }
  }
}

/**
 * Get contact from CRM
 */
export async function getContactFromCRM(phone: string): Promise<CRMContact | null> {
  if (crmIntegration?.getContact) {
    try {
      return await crmIntegration.getContact(phone);
    } catch (error) {
      console.error('❌ Failed to get contact from CRM:', error);
    }
  }
  return null;
}

/**
 * Create campaign in CRM
 */
export async function createCampaignInCRM(
  name: string,
  message: string,
  recipients: string[]
): Promise<string | null> {
  if (crmIntegration?.createCampaign) {
    try {
      const campaignId = await crmIntegration.createCampaign({
        name,
        message,
        recipients,
        status: 'pending'
      });
      console.log(`✅ Created campaign in CRM: ${campaignId}`);
      return campaignId;
    } catch (error) {
      console.error('❌ Failed to create campaign in CRM:', error);
    }
  }
  return null;
}

/**
 * Update campaign status in CRM
 */
export async function updateCampaignStatusInCRM(
  campaignId: string,
  status: CRMCampaign['status'],
  data?: any
): Promise<void> {
  if (crmIntegration?.updateCampaignStatus) {
    try {
      await crmIntegration.updateCampaignStatus(campaignId, status, data);
      console.log(`✅ Updated campaign status in CRM: ${campaignId} -> ${status}`);
    } catch (error) {
      console.error('❌ Failed to update campaign status in CRM:', error);
    }
  }
}

/**
 * Log message sent to CRM
 */
export async function logMessageSentToCRM(
  phone: string,
  message: string,
  campaignId?: string
): Promise<void> {
  if (crmIntegration?.logMessageSent) {
    try {
      await crmIntegration.logMessageSent(phone, message, campaignId);
    } catch (error) {
      console.error('❌ Failed to log message to CRM:', error);
    }
  }
}

/**
 * Log message received from CRM
 */
export async function logMessageReceivedFromCRM(
  phone: string,
  message: string
): Promise<void> {
  if (crmIntegration?.logMessageReceived) {
    try {
      await crmIntegration.logMessageReceived(phone, message);
    } catch (error) {
      console.error('❌ Failed to log received message to CRM:', error);
    }
  }
}

/**
 * Get campaign stats from CRM
 */
export async function getCampaignStatsFromCRM(campaignId: string): Promise<any> {
  if (crmIntegration?.getCampaignStats) {
    try {
      return await crmIntegration.getCampaignStats(campaignId);
    } catch (error) {
      console.error('❌ Failed to get campaign stats from CRM:', error);
    }
  }
  return null;
}

/**
 * Get contact engagement from CRM
 */
export async function getContactEngagementFromCRM(phone: string): Promise<any> {
  if (crmIntegration?.getContactEngagement) {
    try {
      return await crmIntegration.getContactEngagement(phone);
    } catch (error) {
      console.error('❌ Failed to get contact engagement from CRM:', error);
    }
  }
  return null;
}
