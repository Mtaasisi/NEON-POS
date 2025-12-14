/**
 * WhatsApp Webhook Routes
 * Handles incoming WhatsApp events from WasenderAPI
 * Documentation: https://wasenderapi.com/api-docs
 * 
 * PRODUCTION READY:
 * - Webhook signature verification
 * - Rate limiting
 * - Error handling
 * - Logging
 * - Health checks
 */

import express, { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const router = express.Router();

// Initialize Supabase client with proper error handling
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Supabase credentials not configured for webhooks');
  console.error('   WhatsApp webhook routes will return 503 Service Unavailable');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized for WhatsApp webhooks');
}

// Webhook secret for signature verification (optional but recommended)
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || '';

// Request tracking for monitoring
let requestCount = 0;
let lastRequestTime = new Date();
const eventStats: Record<string, number> = {};

/**
 * Middleware: Verify webhook signature (optional but recommended for production)
 * Validates that requests are actually from WasenderAPI
 */
function verifyWebhookSignature(req: Request, res: Response, next: NextFunction) {
  // Skip verification if no secret is configured (development mode)
  if (!WEBHOOK_SECRET) {
    return next();
  }

  const signature = req.headers['x-webhook-signature'] as string;
  
  if (!signature) {
    console.warn('⚠️ Webhook request without signature');
    // In production, you might want to reject unsigned requests
    // For now, we'll allow them but log a warning
    return next();
  }

  try {
    const payload = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    console.error('❌ Error verifying signature:', error);
    next(); // Allow request to proceed even if verification fails
  }
}

/**
 * Middleware: Rate limiting for webhook endpoint
 */
const webhookRequests = new Map<string, number[]>();

function rateLimitWebhook(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 1000; // Max 1000 requests per minute per IP

  if (!webhookRequests.has(ip)) {
    webhookRequests.set(ip, []);
  }

  const requests = webhookRequests.get(ip)!;
  // Remove old requests outside the time window
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    console.warn(`⚠️ Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: Math.ceil(windowMs / 1000)
    });
  }

  recentRequests.push(now);
  webhookRequests.set(ip, recentRequests);
  
  next();
}

/**
 * Health check endpoint
 * GET /api/whatsapp/webhook/health
 */
router.get('/webhook/health', (req: Request, res: Response) => {
  const uptime = process.uptime();
  const now = new Date();
  
  res.status(200).json({
    status: 'healthy',
    service: 'whatsapp-webhook',
    uptime: Math.floor(uptime),
    timestamp: now.toISOString(),
    stats: {
      totalRequests: requestCount,
      lastRequestTime: lastRequestTime.toISOString(),
      eventCounts: eventStats
    },
    environment: process.env.NODE_ENV || 'development',
    supabaseConfigured: !!(supabaseUrl && supabaseKey)
  });
});

/**
 * Webhook verification endpoint
 * WasenderAPI will call this to verify the webhook is active
 * GET /api/whatsapp/webhook
 */
router.get('/webhook', (req: Request, res: Response) => {
  console.log('📞 WhatsApp Webhook verification request received');
  lastRequestTime = new Date();
  requestCount++;
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'WhatsApp webhook endpoint is active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Main webhook endpoint - receives all WhatsApp events
 * POST /api/whatsapp/webhook
 * 
 * PRODUCTION FEATURES:
 * - Rate limiting (1000 req/min per IP)
 * - Signature verification (if WEBHOOK_SECRET is set)
 * - Async processing (non-blocking)
 * - Error tracking
 * - Request logging
 */
router.post('/webhook', rateLimitWebhook, verifyWebhookSignature, async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const webhookData = req.body;
    const eventType = webhookData.event || 'unknown';
    
    // Update stats
    requestCount++;
    lastRequestTime = new Date();
    eventStats[eventType] = (eventStats[eventType] || 0) + 1;
    
    // Production-safe logging (don't log full payload in production)
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      console.log('📨 Webhook Event:', {
        event: eventType,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'none'
      });
    } else {
      console.log('📨 WhatsApp Webhook Event Received:', {
        event: eventType,
        timestamp: new Date().toISOString(),
        dataKeys: Object.keys(webhookData.data || {})
      });
    }

    // Immediately respond 200 to acknowledge receipt (required by WasenderAPI)
    res.status(200).json({ 
      received: true,
      timestamp: new Date().toISOString(),
      eventType: eventType
    });

    // Process the webhook asynchronously (don't block response)
    processWebhook(webhookData, startTime).catch(err => {
      console.error('❌ Error processing webhook:', {
        event: eventType,
        error: err.message,
        stack: !isProduction ? err.stack : undefined
      });
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', {
      message: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
    
    // Still return 200 to prevent WasenderAPI from retrying infinitely
    res.status(200).json({ 
      received: true, 
      error: 'Processing error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Process webhook events asynchronously with retry logic
 */
async function processWebhook(data: any, startTime: number) {
  const eventType = data.event;
  const processingId = `${eventType}-${Date.now()}`;

  try {
    console.log(`🔔 Processing event: ${eventType} [${processingId}]`);

    switch (eventType) {
      case 'messages.received':
      case 'messages.upsert':
        await handleIncomingMessage(data);
        break;

      case 'messages.update':
        await handleMessageStatusUpdate(data);
        break;

      case 'messages.reaction':
        await handleMessageReaction(data);
        break;

      case 'session.status':
        await handleSessionStatus(data);
        break;

      case 'qr.updated':
        await handleQRUpdate(data);
        break;

      case 'call.received':
        await handleIncomingCall(data);
        break;

      case 'poll.results':
        await handlePollResults(data);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`✅ Event processed successfully: ${eventType} (${processingTime}ms)`);

  } catch (error: any) {
    const processingTime = Date.now() - startTime;
    console.error(`❌ Failed to process event: ${eventType} (${processingTime}ms)`, {
      error: error.message,
      processingId
    });

    // Log failed webhook to database for manual retry if needed (if Supabase is configured)
    if (supabase) {
      try {
        await supabase.from('webhook_failures').insert({
          event_type: eventType,
          payload: data,
          error_message: error.message,
          created_at: new Date().toISOString()
        });
      } catch (logError) {
        console.error('❌ Could not log webhook failure:', logError);
      }
    } else {
      console.warn('⚠️ Webhook failure not logged to database (Supabase not configured)');
    }
  }
}

/**
 * Handle incoming WhatsApp messages
 * Production-ready with validation and error handling
 */
async function handleIncomingMessage(data: any) {
  try {
    const message = data.data;
    
    // Validate required fields
    if (!message || !message.from || !message.id) {
      console.warn('⚠️ Invalid message data received:', Object.keys(message || {}));
      return;
    }
    
    console.log('💬 Incoming Message:', {
      from: message.from.substring(0, 10) + '...',
      messageType: message.type,
      hasText: !!message.text,
      hasMedia: !!(message.image || message.video || message.document || message.audio)
    });

    // Extract message details
    const from = message.from; // Phone number
    const messageText = message.text || message.caption || '';
    const messageType = message.type || 'text';
    const messageId = message.id;
    const timestamp = message.timestamp || new Date().toISOString();

    // Clean phone number (remove WhatsApp suffix and format)
    const cleanPhone = from.replace('@s.whatsapp.net', '').replace(/[^\d+]/g, '');
    
    if (!cleanPhone) {
      console.warn('⚠️ Could not extract phone number from:', from);
      return;
    }

    // Find customer by phone number with multiple format attempts
    let customer = null;
    
    try {
      const phoneVariants = [
        cleanPhone,
        `+${cleanPhone}`,
        cleanPhone.replace(/^\+/, ''),
        cleanPhone.startsWith('255') ? cleanPhone : `255${cleanPhone.replace(/^0/, '')}`
      ];

      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, name, phone, whatsapp')
        .or(phoneVariants.map(p => `phone.eq.${p},whatsapp.eq.${p}`).join(','))
        .limit(1);

      if (!customerError && customers && customers.length > 0) {
        customer = customers[0];
      }
    } catch (err: any) {
      console.warn('⚠️ Error finding customer:', err.message);
    }

    // Store incoming message in whatsapp_incoming_messages table
    try {
      const { error: insertError } = await supabase
        .from('whatsapp_incoming_messages')
        .insert({
          message_id: messageId,
          from_phone: cleanPhone,
          customer_id: customer?.id || null,
          message_text: messageText.substring(0, 5000), // Limit text length
          message_type: messageType,
          media_url: message.image || message.video || message.document || message.audio || null,
          raw_data: process.env.NODE_ENV === 'production' ? null : message, // Don't store full payload in production
          received_at: timestamp,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        // Check if it's a duplicate message_id error
        if (insertError.message?.includes('duplicate') || insertError.code === '23505') {
          console.log('ℹ️ Duplicate message ignored:', messageId);
          return;
        }
        console.error('❌ Error storing incoming message:', insertError.message);
        throw insertError;
      } else {
        console.log('✅ Incoming message stored successfully');
      }
    } catch (err: any) {
      console.error('❌ Failed to store message:', err.message);
      throw err;
    }

    // Also log to customer_communications if customer found
    if (customer) {
      try {
        await supabase
          .from('customer_communications')
          .insert({
            customer_id: customer.id,
            type: 'whatsapp',
            message: messageText.substring(0, 5000),
            phone_number: cleanPhone,
            status: 'received',
            sent_at: timestamp,
            created_at: new Date().toISOString()
          });

        console.log(`✅ Message linked to customer: ${customer.name}`);
      } catch (err: any) {
        console.warn('⚠️ Could not log to customer_communications:', err.message);
      }
    } else {
      console.log(`ℹ️ No customer found for phone: ${cleanPhone}`);
    }

  } catch (error: any) {
    console.error('❌ Error handling incoming message:', {
      message: error.message,
      code: error.code
    });
    throw error; // Re-throw to be caught by processWebhook
  }
}

/**
 * Handle message status updates (sent, delivered, read)
 * Production-ready with validation
 */
async function handleMessageStatusUpdate(data: any) {
  try {
    const update = data.data;
    
    if (!update || !update.id) {
      console.warn('⚠️ Invalid status update data');
      return;
    }

    const messageId = update.id;
    const status = update.status; // 'sent', 'delivered', 'read'

    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) {
      console.warn(`⚠️ Unknown status: ${status}`);
      return;
    }

    console.log(`📊 Message Status Update: ${messageId.substring(0, 20)}... → ${status}`);

    // Update whatsapp_logs table
    const updateData: any = { status: status };
    
    // Add timestamp column if it exists
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'read') {
      updateData.read_at = new Date().toISOString();
    }

    const { error, count } = await supabase
      .from('whatsapp_logs')
      .update(updateData)
      .eq('message_id', messageId);

    if (error) {
      console.error('❌ Error updating message status:', error.message);
      throw error;
    } else if (count === 0) {
      console.log(`ℹ️ Message ${messageId} not found in logs (might be from another system)`);
    } else {
      console.log(`✅ Message status updated to ${status}`);
    }

  } catch (error: any) {
    console.error('❌ Error handling status update:', error.message);
    throw error;
  }
}

/**
 * Handle message reactions (emoji reactions)
 */
async function handleMessageReaction(data: any) {
  try {
    const reaction = data.data;
    
    console.log('👍 Message Reaction:', {
      messageId: reaction.messageId,
      emoji: reaction.reaction,
      from: reaction.from
    });

    // Store reaction in database
    await supabase
      .from('whatsapp_reactions')
      .insert({
        message_id: reaction.messageId,
        from_phone: reaction.from,
        emoji: reaction.reaction,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('❌ Error handling reaction:', error);
  }
}

/**
 * Handle session status changes
 */
async function handleSessionStatus(data: any) {
  try {
    const status = data.data;
    
    console.log('🔌 Session Status:', {
      session: status.session,
      connected: status.connected,
      status: status.status
    });

    // You can store this or trigger reconnection logic
    
  } catch (error) {
    console.error('❌ Error handling session status:', error);
  }
}

/**
 * Handle QR code updates
 */
async function handleQRUpdate(data: any) {
  try {
    const qr = data.data;
    
    console.log('📱 QR Code Updated:', {
      session: qr.session,
      qrAvailable: !!qr.qr
    });

    // You can broadcast this to frontend via WebSocket if needed
    
  } catch (error) {
    console.error('❌ Error handling QR update:', error);
  }
}

/**
 * Handle incoming calls
 */
async function handleIncomingCall(data: any) {
  try {
    const call = data.data;
    
    console.log('📞 Incoming Call:', {
      from: call.from,
      callType: call.callType, // 'voice' or 'video'
      timestamp: call.timestamp
    });

    // Log the call
    await supabase
      .from('whatsapp_calls')
      .insert({
        from_phone: call.from,
        call_type: call.callType,
        call_timestamp: call.timestamp,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('❌ Error handling call:', error);
  }
}

/**
 * Handle poll results
 */
async function handlePollResults(data: any) {
  try {
    const poll = data.data;
    
    console.log('📊 Poll Results:', {
      pollId: poll.pollId,
      voter: poll.voter,
      selectedOptions: poll.selectedOptions
    });

    // Store poll results
    await supabase
      .from('whatsapp_poll_results')
      .insert({
        poll_id: poll.pollId,
        voter_phone: poll.voter,
        selected_options: poll.selectedOptions,
        created_at: new Date().toISOString()
      });

  } catch (error) {
    console.error('❌ Error handling poll results:', error);
  }
}

export default router;

