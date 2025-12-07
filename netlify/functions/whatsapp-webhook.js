/**
 * Netlify Serverless Function - WhatsApp Webhook Handler
 * Receives WhatsApp events from WasenderAPI
 * Stores in Neon PostgreSQL DEVELOPMENT database (direct connection)
 * 
 * Database: Development (ep-icy-mouse-adshjg5n-pooler)
 * Can be overridden by setting DATABASE_URL environment variable in Netlify
 * 
 * URL: https://your-site.netlify.app/.netlify/functions/whatsapp-webhook
 */

const { Pool } = require('pg');

// Database connection configuration
const getDatabaseConfig = () => {
  // PRODUCTION DATABASE - Supabase PostgreSQL (default)
  // Priority: 1. DATABASE_URL env var (if set in Netlify), 2. Production Supabase database (default)
  const productionDbUrl = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';
  
  // Fallback to old Neon database if needed (for backward compatibility)
  const fallbackDbUrl = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';
  
  // Check for environment variable override (allows Netlify env vars to override)
  const dbUrl = process.env.DATABASE_URL || productionDbUrl;
  
  // Log which database is being used (mask password for security)
  const dbUrlMasked = dbUrl.replace(/:[^:@]+@/, ':****@');
  const envUsed = process.env.DATABASE_URL ? 'environment variable' : 'development database (default)';
  const urlMatch = dbUrl.match(/@([^/]+)/);
  const dbHost = urlMatch ? urlMatch[1] : 'unknown';
  
  console.log('🔌 Database Connection:', dbUrlMasked);
  console.log(`🔌 Using: ${envUsed}`);
  console.log(`🔌 Database Host: ${dbHost}`);
  console.log('🔌 Environment: PRODUCTION (Supabase)');
  
  // Determine SSL requirements based on database type
  const isSupabase = dbUrl.includes('supabase.com');
  const isNeon = dbUrl.includes('neon.tech');
  
  return {
    connectionString: dbUrl,
    ssl: isSupabase ? {
      rejectUnauthorized: false,
      require: true
    } : isNeon ? {
      rejectUnauthorized: false
    } : {
      rejectUnauthorized: false
    },
    max: 1, // Limit connections for serverless
    min: 0, // Don't keep idle connections
    idleTimeoutMillis: 10000, // Close idle quickly
    connectionTimeoutMillis: 30000, // 30s timeout
    statement_timeout: 20000, // Query timeout
    query_timeout: 20000,
    // Additional options for better reliability
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
  };
};

// Create connection pool (singleton for serverless)
let pool = null;

const resetPool = () => {
  if (pool) {
    try {
      // Don't end the pool, just mark it for recreation
      // Ending the pool closes it permanently
      pool = null;
    } catch (e) {
      pool = null;
    }
  }
};

const getPool = () => {
  // For serverless, check if pool is valid before reusing
  if (pool) {
    // Check if pool is ended or invalid
    try {
      if (pool.ended || pool._ending) {
      console.log('⚠️ Pool was ended, creating new pool...');
        pool = null;
      }
    } catch (e) {
      // If checking pool properties throws, pool is invalid
      console.log('⚠️ Pool check failed, creating new pool...');
      pool = null;
    }
  }
  
  if (!pool) {
    const config = getDatabaseConfig();
    // Use smaller pool for serverless - connections are expensive
    pool = new Pool({
      ...config,
      max: 1, // Single connection for serverless
      min: 0, // Don't keep idle connections
      idleTimeoutMillis: 10000, // Close idle connections quickly
      connectionTimeoutMillis: 20000, // 20s timeout
      allowExitOnIdle: true // Allow process to exit when idle
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('❌ Unexpected pool error:', err);
      // Reset pool on error to force reconnection
      resetPool();
    });
    
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
    let client = null;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
    try {
        // Always get a fresh pool for health check in serverless
        resetPool();
      const dbPool = getPool();
        
      // Get a client from the pool for health check
      client = await dbPool.connect();
      const result = await client.query('SELECT NOW() as current_time');
      client.release();
      
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
          database_host: 'aws-0-eu-north-1.pooler.supabase.com',
          database_name: 'postgres',
          database_type: 'production'
        })
      };
    } catch (error) {
        retryCount++;
        
      if (client) {
        try {
          client.release();
        } catch (e) {
          // Ignore release errors
        }
          client = null;
      }
        
      // Reset pool on error to force recreation
      resetPool();
      
        // If we've exhausted retries, return error status
        if (retryCount > maxRetries) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'healthy',
          service: 'whatsapp-webhook',
          timestamp: new Date().toISOString(),
          database_connected: false,
              error: error.message,
              retries: retryCount
        })
      };
        }
        
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Handle POST request - Webhook event
  if (event.httpMethod === 'POST') {
    // Log incoming request for debugging
    console.log('📥 POST Request Received:', {
      timestamp: new Date().toISOString(),
      hasBody: !!event.body,
      bodyType: typeof event.body,
      bodyLength: event.body ? (typeof event.body === 'string' ? event.body.length : JSON.stringify(event.body).length) : 0,
      headers: {
        'content-type': event.headers['content-type'] || event.headers['Content-Type'] || 'not set',
        'user-agent': event.headers['user-agent'] || event.headers['User-Agent'] || 'not set'
      }
    });

    // Try to parse and log event type immediately
    try {
      const webhookData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      const eventType = webhookData?.event || 'unknown';
      console.log('📨 Event Type Detected:', eventType);
    } catch (parseError) {
      console.warn('⚠️ Could not parse body for logging:', parseError.message);
    }

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
      console.error('❌ Error processing webhook:', {
        message: err.message,
        stack: err.stack,
        bodyPreview: typeof event.body === 'string' ? event.body.substring(0, 200) : JSON.stringify(event.body).substring(0, 200)
      });
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
  let client = null;
  
  try {
    // Get connection with timeout handling
    const pool = getPool();
    console.log('🔌 Attempting database connection...');
    
    // Set a timeout for the connection attempt
    console.log('⏳ Waiting for database connection (max 25s)...');
    const connectionPromise = pool.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 25s')), 25000)
    );
    
    try {
      client = await Promise.race([connectionPromise, timeoutPromise]);
      console.log('✅ Database connection acquired successfully');
    } catch (connError) {
      console.error('❌ Failed to acquire database connection:', {
        message: connError.message,
        code: connError.code,
        errno: connError.errno
      });
      // Reset pool reference to force recreation on next request
      // Don't call pool.end() as it closes the pool permanently
      resetPool();
      throw connError;
    }
    // Parse body - Netlify may pass it as a string
    let webhookData;
    try {
      webhookData = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError.message);
      console.error('❌ Body type:', typeof body);
      console.error('❌ Body preview:', typeof body === 'string' ? body.substring(0, 200) : JSON.stringify(body).substring(0, 200));
      throw new Error(`Invalid JSON body: ${parseError.message}`);
    }

    if (!webhookData) {
      console.error('❌ Webhook data is null or undefined');
      throw new Error('Webhook data is null');
    }

    const eventType = webhookData.event || 'unknown';

    console.log('📨 WhatsApp Webhook Event:', {
      event: eventType,
      timestamp: new Date().toISOString(),
      hasData: !!webhookData.data,
      dataKeys: webhookData.data ? Object.keys(webhookData.data) : []
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
    if (client) {
      try {
        client.release();
        console.log('✅ Database connection released');
      } catch (releaseError) {
        console.error('⚠️ Error releasing connection:', releaseError.message);
      }
    }
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

    // Find customer by phone number (with timeout)
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
      
      // Add query timeout
      const queryPromise = client.query(query, [...phoneVariants, ...phoneVariants]);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Customer lookup timeout')), 5000)
      );
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      
      if (result.rows && result.rows.length > 0) {
        customer = result.rows[0];
        console.log(`👤 Customer found: ${customer.name}`);
      } else {
        console.log(`ℹ️ No customer found for phone: ${cleanPhone}`);
      }
    } catch (err) {
      console.warn('⚠️ Error finding customer (continuing without customer):', err.message);
      // Continue without customer - message will still be stored
    }

    // Store incoming message (with timeout)
    console.log('💾 Storing message in database...');
    const insertQuery = `
      INSERT INTO whatsapp_incoming_messages 
      (message_id, from_phone, customer_id, message_text, message_type, media_url, received_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (message_id) DO NOTHING
    `;
    const insertParams = [
      messageId,
      cleanPhone,
      customer?.id || null,
      messageText.substring(0, 5000),
      messageType,
      message.image || message.video || message.document || message.audio || null,
      timestamp
    ];
    
    const insertPromise = client.query(insertQuery, insertParams);
    const insertTimeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Insert query timeout')), 10000)
    );
    
    const insertResult = await Promise.race([insertPromise, insertTimeout]);

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
