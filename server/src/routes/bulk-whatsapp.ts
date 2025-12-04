/**
 * API Routes for Cloud-Based Bulk WhatsApp Campaigns
 * 
 * Client submits campaign → Server processes in background → Client monitors progress
 * Works even if client disconnects!
 */

import express from 'express';
import BulkWhatsAppQueueService from '../services/bulkWhatsAppQueue.js';

const router = express.Router();

// Initialize queue service (would use env variables in production)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY || '';

let queueService: BulkWhatsAppQueueService | null = null;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials not configured for bulk WhatsApp');
  console.error('   Bulk WhatsApp routes will return 503 Service Unavailable');
} else {
  try {
    queueService = new BulkWhatsAppQueueService(supabaseUrl, supabaseKey);
    console.log('✅ Bulk WhatsApp Queue Service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Bulk WhatsApp Queue Service:', error);
  }
}

/**
 * POST /api/bulk-whatsapp/create
 * Create a new bulk campaign (runs in cloud)
 */
router.post('/create', async (req, res) => {
  try {
    // Check if service is available
    if (!queueService) {
      return res.status(503).json({
        error: 'Service Unavailable',
        details: 'Bulk WhatsApp service is not configured. Please configure Supabase credentials.'
      });
    }

    const {
      userId,
      name,
      message,
      recipients,
      settings,
      mediaUrl,
      mediaType
    } = req.body;

    // Validation
    if (!userId || !message || !recipients || recipients.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: userId, message, recipients'
      });
    }

    // Create campaign
    const { campaignId } = await queueService.createCampaign(
      userId,
      name || `Campaign ${new Date().toLocaleDateString()}`,
      message,
      recipients,
      settings || {},
      mediaUrl,
      mediaType
    );

    res.json({
      success: true,
      campaignId,
      message: 'Campaign created and queued for processing'
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({
      error: 'Failed to create campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bulk-whatsapp/status/:campaignId
 * Get campaign status and progress
 */
router.get('/status/:campaignId', async (req, res) => {
  try {
    // Check if service is available
    if (!queueService) {
      return res.status(503).json({
        error: 'Service Unavailable',
        details: 'Bulk WhatsApp service is not configured. Please configure Supabase credentials.'
      });
    }

    const { campaignId } = req.params;
    
    const campaign = await queueService.getCampaignStatus(campaignId);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        progress: campaign.progress,
        failedRecipients: campaign.failed_recipients,
        createdAt: campaign.created_at,
        startedAt: campaign.started_at,
        completedAt: campaign.completed_at,
        lastHeartbeat: campaign.last_heartbeat
      }
    });
  } catch (error) {
    console.error('Error fetching campaign status:', error);
    res.status(500).json({ error: 'Failed to fetch campaign status' });
  }
});

/**
 * POST /api/bulk-whatsapp/pause/:campaignId
 * Pause a running campaign
 */
router.post('/pause/:campaignId', async (req, res) => {
  try {
    // Check if service is available
    if (!queueService) {
      return res.status(503).json({
        error: 'Service Unavailable',
        details: 'Bulk WhatsApp service is not configured. Please configure Supabase credentials.'
      });
    }

    const { campaignId } = req.params;
    
    await queueService.pauseCampaign(campaignId);
    
    res.json({
      success: true,
      message: 'Campaign paused'
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

/**
 * POST /api/bulk-whatsapp/resume/:campaignId
 * Resume a paused campaign
 */
router.post('/resume/:campaignId', async (req, res) => {
  try {
    // Check if service is available
    if (!queueService) {
      return res.status(503).json({
        error: 'Service Unavailable',
        details: 'Bulk WhatsApp service is not configured. Please configure Supabase credentials.'
      });
    }

    const { campaignId } = req.params;
    
    await queueService.resumeCampaign(campaignId);
    
    res.json({
      success: true,
      message: 'Campaign resumed'
    });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

/**
 * POST /api/bulk-whatsapp/cancel/:campaignId
 * Cancel a campaign
 */
router.post('/cancel/:campaignId', async (req, res) => {
  try {
    // Check if service is available
    if (!queueService) {
      return res.status(503).json({
        error: 'Service Unavailable',
        details: 'Bulk WhatsApp service is not configured. Please configure Supabase credentials.'
      });
    }

    const { campaignId } = req.params;
    
    await queueService.cancelCampaign(campaignId);
    
    res.json({
      success: true,
      message: 'Campaign cancelled'
    });
  } catch (error) {
    console.error('Error cancelling campaign:', error);
    res.status(500).json({ error: 'Failed to cancel campaign' });
  }
});

/**
 * POST /api/bulk-whatsapp/retry/:campaignId
 * Retry failed messages from a completed campaign
 */
router.post('/retry/:campaignId', async (req, res) => {
  try {
    // Check if service is available
    if (!queueService) {
      return res.status(503).json({
        error: 'Service Unavailable',
        details: 'Bulk WhatsApp service is not configured. Please configure Supabase credentials.'
      });
    }

    const { campaignId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const { campaignId: newCampaignId } = await queueService.retryFailedMessages(
      campaignId,
      userId
    );
    
    res.json({
      success: true,
      campaignId: newCampaignId,
      message: 'Retry campaign created'
    });
  } catch (error) {
    console.error('Error retrying campaign:', error);
    res.status(500).json({
      error: 'Failed to retry campaign',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bulk-whatsapp/campaigns/:userId
 * Get all campaigns for a user
 */
router.get('/campaigns/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;
    
    // This would use supabase directly or through the service
    // Simplified example:
    res.json({
      success: true,
      campaigns: []
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

export default router;

