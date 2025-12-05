/**
 * Scheduled Campaigns Utility
 * Schedule campaigns to run at specific times
 */

export interface ScheduledCampaign {
  id: string;
  name: string;
  scheduledFor: string; // ISO date string
  timezone: string;
  message: string;
  messageType: string;
  selectedRecipients: string[];
  settings: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'cancelled';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

const SCHEDULED_CAMPAIGNS_KEY = 'whatsapp_scheduled_campaigns';

/**
 * Get all scheduled campaigns
 */
export function getAllScheduled(): ScheduledCampaign[] {
  try {
    const stored = localStorage.getItem(SCHEDULED_CAMPAIGNS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading scheduled campaigns:', error);
    return [];
  }
}

/**
 * Get pending campaigns (ready to run)
 */
export function getPendingCampaigns(): ScheduledCampaign[] {
  const all = getAllScheduled();
  const now = new Date();
  
  return all.filter(campaign => {
    if (campaign.status !== 'pending') return false;
    const scheduledTime = new Date(campaign.scheduledFor);
    return scheduledTime <= now;
  });
}

/**
 * Schedule a new campaign
 */
export function scheduleCampaign(
  name: string,
  scheduledFor: string,
  timezone: string,
  message: string,
  messageType: string,
  selectedRecipients: string[],
  settings: Record<string, any>
): string {
  const campaigns = getAllScheduled();
  const newCampaign: ScheduledCampaign = {
    id: `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    scheduledFor,
    timezone,
    message,
    messageType,
    selectedRecipients,
    settings,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  campaigns.push(newCampaign);
  localStorage.setItem(SCHEDULED_CAMPAIGNS_KEY, JSON.stringify(campaigns));
  return newCampaign.id;
}

/**
 * Update campaign status
 */
export function updateScheduledStatus(
  id: string,
  status: ScheduledCampaign['status'],
  startedAt?: string,
  completedAt?: string
): boolean {
  const campaigns = getAllScheduled();
  const index = campaigns.findIndex(c => c.id === id);
  
  if (index === -1) return false;
  
  campaigns[index] = {
    ...campaigns[index],
    status,
    ...(startedAt && { startedAt }),
    ...(completedAt && { completedAt })
  };
  
  localStorage.setItem(SCHEDULED_CAMPAIGNS_KEY, JSON.stringify(campaigns));
  return true;
}

/**
 * Cancel a scheduled campaign
 */
export function cancelScheduled(id: string): boolean {
  return updateScheduledStatus(id, 'cancelled');
}

/**
 * Delete a scheduled campaign
 */
export function deleteScheduled(id: string): boolean {
  const campaigns = getAllScheduled();
  const filtered = campaigns.filter(c => c.id !== id);
  
  if (filtered.length === campaigns.length) return false;
  
  localStorage.setItem(SCHEDULED_CAMPAIGNS_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Get campaign by ID
 */
export function getScheduledById(id: string): ScheduledCampaign | null {
  const campaigns = getAllScheduled();
  return campaigns.find(c => c.id === id) || null;
}
