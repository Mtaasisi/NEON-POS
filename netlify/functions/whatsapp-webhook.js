/**
 * Netlify Serverless Function - WhatsApp Webhook Handler
 * Receives WhatsApp events from WasenderAPI
 * Stores in Neon PostgreSQL database (direct connection)
 * 
 * URL: https://your-site.netlify.app/.netlify/functions/whatsapp-webhook
 */

const { Pool } = require('pg');

// Database connection configuration
const getDatabaseConfig = () => {
  // Use the specified Neon database connection
  const dbUrl = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  
  // Log which database is being used (mask password for security)
  const dbUrlMasked = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log('🔌 Database Connection:', dbUrlMasked);
  console.log('🔌 Database Host: ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech');
  
  return {
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    },
    max: 1, // Limit connections for serverless
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  };
};

// Create connection pool
let pool = null;

const getPool = () => {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool(config);
    console.log('✅ PostgreSQL connection pool initialized');
  }
  return pool;
};

/**
 * Main handler for Netlify serverless function
 */
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'OK' })
    };
  }

  // Handle GET request - Health check
  if (event.httpMethod === 'GET') {
    try {
      const dbPool = getPool();
      const result = await dbPool.query('SELECT NOW() as current_time');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          service: 'whatsapp-webhook',
          timestamp: new Date().toISOString(),
          environment: 'production',
          message: 'WhatsApp webhook endpoint is active',
          database_connected: true,
          db_time: result.rows[0].current_time,
          database_host: 'ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech',
          database_name: 'neondb'
        })
      };
    } catch (error) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          service: 'whatsapp-webhook',
          timestamp: new Date().toISOString(),
          database_connected: false,
          error: error.message
        })
      };
    }
  }

  // Handle POST request - Webhook event
  if (event.httpMethod === 'POST') {
    // ALWAYS return 200 OK first (required by WasenderAPI)
    const response = {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received: true,
        timestamp: new Date().toISOString()
      })
    };

    // Process webhook asynchronously (don't block response)
    processWebhookAsync(event.body).catch(err => {
      console.error('❌ Error processing webhook:', err.message);
    });

    return response;
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

/**
 * Process webhook events asynchronously
 */
async function processWebhookAsync(body) {
  const client = await getPool().connect();
  
  try {
    const webhookData = typeof body === 'string' ? JSON.parse(body) : body;
    const eventType = webhookData.event || 'unknown';

    console.log('📨 WhatsApp Webhook Event:', {
      event: eventType,
      timestamp: new Date().toISOString()
    });

    switch (eventType) {
      case 'messages.received':
      case 'messages.upsert':
        await handleIncomingMessage(client, webhookData);
        break;

      case 'messages.update':
        await handleMessageStatusUpdate(client, webhookData);
        break;

      case 'messages.reaction':
        await handleMessageReaction(client, webhookData);
        break;

      case 'call.received':
        await handleIncomingCall(client, webhookData);
        break;

      case 'poll.results':
        await handlePollResults(client, webhookData);
        break;

      case 'session.status':
        await handleSessionStatus(client, webhookData);
        break;

      case 'qr.updated':
        await handleQRUpdate(client, webhookData);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${eventType}`);
    }

    console.log(`✅ Event processed successfully: ${eventType}`);

  } catch (error) {
    console.error('❌ Error processing webhook:', {
      message: error.message,
      stack: error.stack
    });

    // Log failed webhook to database if possible
    try {
      await client.query(
        `INSERT INTO webhook_failures (event_type, payload, error_message, created_at)
         VALUES ($1, $2, $3, NOW())`,
        ['unknown', JSON.stringify(body), error.message]
      );
    } catch (logError) {
      console.error('❌ Could not log webhook failure:', logError);
    }
  } finally {
    client.release();
  }
}

/**
 * Handle incoming WhatsApp messages
 */
async function handleIncomingMessage(client, data) {
  try {
    const message = data.data;

    if (!message || !message.from || !message.id) {
      console.warn('⚠️ Invalid message data received');
      return;
    }

    console.log('💬 Incoming Message:', {
      from: message.from.substring(0, 10) + '...',
      messageType: message.type,
      hasText: !!message.text
    });

    // Extract message details
    const from = message.from;
    const messageText = message.text || message.caption || '';
    const messageType = message.type || 'text';
    const messageId = message.id;
    const timestamp = message.timestamp || new Date().toISOString();

    // Clean phone number
    const cleanPhone = from.replace('@s.whatsapp.net', '').replace(/[^\d+]/g, '');

    if (!cleanPhone) {
      console.warn('⚠️ Could not extract phone number');
      return;
    }

    // Find customer by phone number
    let customer = null;
    try {
      const phoneVariants = [
        cleanPhone,
        `+${cleanPhone}`,
        cleanPhone.replace(/^\+/, ''),
        cleanPhone.startsWith('255') ? cleanPhone : `255${cleanPhone.replace(/^0/, '')}`
      ];

      const placeholders = phoneVariants.map((_, i) => `$${i + 1}`).join(',');
      const query = `
        SELECT id, name, phone, whatsapp 
        FROM customers 
        WHERE phone IN (${placeholders}) OR whatsapp IN (${placeholders})
        LIMIT 1
      `;
      
      const result = await client.query(query, [...phoneVariants, ...phoneVariants]);
      
      if (result.rows && result.rows.length > 0) {
        customer = result.rows[0];
        console.log(`👤 Customer found: ${customer.name}`);
      }
    } catch (err) {
      console.warn('⚠️ Error finding customer:', err.message);
    }

    // Store incoming message
    const insertResult = await client.query(
      `INSERT INTO whatsapp_incoming_messages 
       (message_id, from_phone, customer_id, message_text, message_type, media_url, received_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (message_id) DO NOTHING`,
      [
        messageId,
        cleanPhone,
        customer?.id || null,
        messageText.substring(0, 5000),
        messageType,
        message.image || message.video || message.document || message.audio || null,
        timestamp
      ]
    );

    if (insertResult.rowCount === 0) {
      console.log('ℹ️ Duplicate message ignored:', messageId);
      return;
    }

    console.log('✅ Incoming message stored successfully');

    // Also log to customer_communications if customer found
    if (customer) {
      try {
        await client.query(
          `INSERT INTO customer_communications 
           (customer_id, type, message, phone_number, status, sent_at, created_at)
           VALUES ($1, 'whatsapp', $2, $3, 'received', $4, NOW())`,
          [
            customer.id,
            messageText.substring(0, 5000),
            cleanPhone,
            timestamp
          ]
        );

        console.log(`✅ Message linked to customer: ${customer.name}`);
      } catch (err) {
        console.warn('⚠️ Could not log to customer_communications:', err.message);
      }
    }

  } catch (error) {
    console.error('❌ Error handling incoming message:', error.message);
    throw error;
  }
}

/**
 * Handle message status updates
 */
async function handleMessageStatusUpdate(client, data) {
  try {
    const update = data.data;

    if (!update || !update.id) {
      return;
    }

    const messageId = update.id;
    const status = update.status;

    if (!['sent', 'delivered', 'read', 'failed'].includes(status)) {
      return;
    }

    console.log(`📊 Message Status Update: ${messageId.substring(0, 20)}... → ${status}`);

    let query = 'UPDATE whatsapp_logs SET status = $1';
    const params = [status];

    if (status === 'delivered') {
      query += ', delivered_at = NOW()';
    } else if (status === 'read') {
      query += ', read_at = NOW()';
    }

    query += ' WHERE message_id = $2';
    params.push(messageId);

    const result = await client.query(query, params);

    if (result.rowCount === 0) {
      console.log(`ℹ️ Message ${messageId} not found in logs (might be from another system)`);
    } else {
      console.log(`✅ Message status updated to ${status}`);
    }

  } catch (error) {
    console.error('❌ Error handling status update:', error.message);
  }
}

/**
 * Handle message reactions
 */
async function handleMessageReaction(client, data) {
  try {
    const reaction = data.data;

    if (!reaction || !reaction.messageId || !reaction.reaction) {
      return;
    }

    await client.query(
      `INSERT INTO whatsapp_reactions (message_id, from_phone, emoji, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        reaction.messageId,
        reaction.from || 'unknown',
        reaction.reaction
      ]
    );

    console.log('👍 Reaction stored:', reaction.reaction);

  } catch (error) {
    console.error('❌ Error handling reaction:', error.message);
  }
}

/**
 * Handle incoming calls
 */
async function handleIncomingCall(client, data) {
  try {
    const call = data.data;

    if (!call || !call.from) {
      return;
    }

    await client.query(
      `INSERT INTO whatsapp_calls (from_phone, call_type, call_timestamp, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        call.from,
        call.callType || 'voice',
        call.timestamp || new Date().toISOString()
      ]
    );

    console.log('📞 Call logged from:', call.from);

  } catch (error) {
    console.error('❌ Error handling call:', error.message);
  }
}

/**
 * Handle poll results
 */
async function handlePollResults(client, data) {
  try {
    const poll = data.data;

    if (!poll || !poll.pollId || !poll.voter) {
      return;
    }

    await client.query(
      `INSERT INTO whatsapp_poll_results (poll_id, voter_phone, selected_options, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        poll.pollId,
        poll.voter,
        JSON.stringify(poll.selectedOptions || [])
      ]
    );

    console.log('📊 Poll result stored');

  } catch (error) {
    console.error('❌ Error handling poll results:', error.message);
  }
}

/**
 * Handle session status updates
 */
async function handleSessionStatus(client, data) {
  try {
    const status = data.data;

    console.log('📱 Session Status Update:', {
      status: status.status,
      sessionId: status.sessionId
    });

    // You can store this in a sessions table if needed
    // For now, just log it

  } catch (error) {
    console.error('❌ Error handling session status:', error.message);
  }
}

/**
 * Handle QR code updates
 */
async function handleQRUpdate(client, data) {
  try {
    const qr = data.data;

    console.log('📱 QR Code Update:', {
      sessionId: qr.sessionId,
      hasQR: !!qr.qr
    });

    // You can store QR code in database if needed
    // For now, just log it

  } catch (error) {
    console.error('❌ Error handling QR update:', error.message);
  }
}
