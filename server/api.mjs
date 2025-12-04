#!/usr/bin/env node

/**
 * 🚀 BACKEND API SERVER FOR NEON DATABASE
 * Proxies database calls so browser can connect
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import neonMigrationRouter from './routes/neon-migration.mjs';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, '../public/uploads/whatsapp-media');
mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads/whatsapp-media', express.static(uploadsDir));

// Get database URL from environment variables or fallback to config file
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && existsSync('database-config.json')) {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  DATABASE_URL = config.connectionString || config.url;
}

if (!DATABASE_URL) {
  // Fallback URLs based on environment
  // Use production database when NODE_ENV is production
  if (process.env.NODE_ENV === 'production') {
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  }
}

const sql = neon(DATABASE_URL);

const dbEnvironment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
const dbHost = DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown';

console.log('🚀 Starting Backend API Server...');
console.log(`📡 Database: ${dbEnvironment} (${dbHost})`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

// Mount Neon migration routes
app.use('/api/neon', neonMigrationRouter);

// Anti-ban Settings Routes
app.get('/api/antiban-settings', async (req, res) => {
  console.log('📥 [API] GET /api/antiban-settings');
  
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id) : null;
    console.log(`🔍 [QUERY] Fetching settings for user_id: ${userId || 'default'}`);
    
    const result = await sql`
      SELECT * FROM whatsapp_antiban_settings 
      WHERE user_id IS NOT DISTINCT FROM ${userId}
      ORDER BY updated_at DESC 
      LIMIT 1
    `;
    
    const settings = result[0];
    
    if (!settings) {
      console.log('⚠️ [WARNING] No settings found, returning defaults');
      return res.json({
        usePersonalization: true,
        randomDelay: true,
        minDelay: 3,
        maxDelay: 8,
        usePresence: false,
        batchSize: 20,
        batchDelay: 60,
        maxPerHour: 30,
        dailyLimit: 100,
        skipRecentlyContacted: true,
        respectQuietHours: true,
        useInvisibleChars: true,
        useEmojiVariation: true,
        varyMessageLength: true
      });
    }
    
    console.log('✅ [SUCCESS] Settings retrieved');
    
    res.json({
      usePersonalization: settings.use_personalization,
      randomDelay: settings.random_delay,
      minDelay: settings.min_delay,
      maxDelay: settings.max_delay,
      usePresence: settings.use_presence,
      batchSize: settings.batch_size,
      batchDelay: settings.batch_delay,
      maxPerHour: settings.max_per_hour,
      dailyLimit: settings.daily_limit,
      skipRecentlyContacted: settings.skip_recently_contacted,
      respectQuietHours: settings.respect_quiet_hours,
      useInvisibleChars: settings.use_invisible_chars,
      useEmojiVariation: settings.use_emoji_variation,
      varyMessageLength: settings.vary_length,
      updatedAt: settings.updated_at
    });
  } catch (error) {
    console.error('❌ Error getting anti-ban settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

app.post('/api/antiban-settings', async (req, res) => {
  console.log('📤 [API] POST /api/antiban-settings');
  
  try {
    const userId = req.body.user_id || null;
    const {
      usePersonalization,
      randomDelay,
      minDelay,
      maxDelay,
      usePresence,
      batchSize,
      batchDelay,
      maxPerHour,
      dailyLimit,
      skipRecentlyContacted,
      respectQuietHours,
      useInvisibleChars,
      useEmojiVariation,
      varyMessageLength
    } = req.body;
    
    console.log(`💾 [SAVE] Saving settings for user_id: ${userId || 'default'}`);
    
    await sql`
      INSERT INTO whatsapp_antiban_settings (
        user_id,
        use_personalization,
        random_delay,
        min_delay,
        max_delay,
        use_presence,
        batch_size,
        batch_delay,
        max_per_hour,
        daily_limit,
        skip_recently_contacted,
        respect_quiet_hours,
        use_invisible_chars,
        use_emoji_variation,
        vary_length
      ) VALUES (
        ${userId},
        ${usePersonalization},
        ${randomDelay},
        ${minDelay},
        ${maxDelay},
        ${usePresence},
        ${batchSize},
        ${batchDelay},
        ${maxPerHour},
        ${dailyLimit},
        ${skipRecentlyContacted},
        ${respectQuietHours},
        ${useInvisibleChars},
        ${useEmojiVariation},
        ${varyMessageLength}
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        use_personalization = EXCLUDED.use_personalization,
        random_delay = EXCLUDED.random_delay,
        min_delay = EXCLUDED.min_delay,
        max_delay = EXCLUDED.max_delay,
        use_presence = EXCLUDED.use_presence,
        batch_size = EXCLUDED.batch_size,
        batch_delay = EXCLUDED.batch_delay,
        max_per_hour = EXCLUDED.max_per_hour,
        daily_limit = EXCLUDED.daily_limit,
        skip_recently_contacted = EXCLUDED.skip_recently_contacted,
        respect_quiet_hours = EXCLUDED.respect_quiet_hours,
        use_invisible_chars = EXCLUDED.use_invisible_chars,
        use_emoji_variation = EXCLUDED.use_emoji_variation,
        vary_length = EXCLUDED.vary_length,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    console.log('✅ [SUCCESS] Settings saved');
    res.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('❌ Error saving anti-ban settings:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// WhatsApp Sessions Routes
app.get('/api/whatsapp-sessions/get-active', async (req, res) => {
  console.log('📥 [API] GET /api/whatsapp-sessions/get-active');
  
  try {
    const userId = req.query.user_id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }
    
    console.log(`🔍 [QUERY] Fetching active session for user_id: ${userId}`);
    
    // Get user's active session preference
    const prefs = await sql`
      SELECT active_session_id, auto_select_session
      FROM user_whatsapp_preferences
      WHERE user_id = ${userId}
    `;
    
    const pref = prefs[0];
    let activeSessionId = null;
    
    if (pref && pref.active_session_id) {
      activeSessionId = pref.active_session_id;
      console.log(`✅ Found user preference for session: ${activeSessionId}`);
    } else if (!pref || pref.auto_select_session) {
      console.log('🔄 Auto-selecting first connected session');
      const autoResult = await sql`
        SELECT id FROM whatsapp_sessions
        WHERE status = 'connected'
        ORDER BY last_connected_at DESC NULLS LAST, created_at DESC
        LIMIT 1
      `;
      
      if (autoResult.length > 0) {
        activeSessionId = autoResult[0].id;
        console.log(`✅ Auto-selected session: ${activeSessionId}`);
      }
    }
    
    if (!activeSessionId) {
      console.log('⚠️ No active session available');
      return res.json({
        success: true,
        active_session: null,
        message: 'No active session available'
      });
    }
    
    // Get full session details
    const sessionResult = await sql`
      SELECT 
        id,
        wasender_session_id,
        name,
        phone_number,
        status,
        account_protection,
        log_messages,
        last_connected_at,
        created_at,
        updated_at
      FROM whatsapp_sessions
      WHERE id = ${activeSessionId}
    `;
    
    const session = sessionResult[0];
    
    if (!session) {
      console.log('⚠️ Active session not found in database');
      return res.json({
        success: true,
        active_session: null,
        message: 'Active session not found'
      });
    }
    
    if (session.status !== 'connected') {
      console.log(`⚠️ Session ${session.name} is not connected (status: ${session.status})`);
      return res.json({
        success: true,
        active_session: session,
        warning: 'Active session is not connected'
      });
    }
    
    console.log(`✅ Active session: ${session.name} (${session.phone_number})`);
    res.json({
      success: true,
      active_session: session
    });
    
  } catch (error) {
    console.error('❌ Error getting active session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

app.get('/api/whatsapp-sessions/check-integration', async (req, res) => {
  console.log('📥 [API] GET /api/whatsapp-sessions/check-integration');
  
  try {
    const result = {
      success: true,
      integration: null,
      database_sessions: [],
      recommendation: ''
    };
    
    // Check integrations table
    const integrationResult = await sql`
      SELECT 
        integration_name,
        is_active,
        api_key,
        api_secret,
        config,
        last_sync
      FROM integrations
      WHERE integration_name = 'WHATSAPP_WASENDER' OR integration_type = 'whatsapp'
    `;
    
    const integration = integrationResult[0];
    
    if (integration) {
      const config = typeof integration.config === 'string' 
        ? JSON.parse(integration.config) 
        : integration.config || {};
      
      const apiKey = integration.api_key || config.api_key || config.bearer_token;
      const sessionId = config.session_id || config.whatsapp_session;
      
      result.integration = {
        enabled: !!integration.is_active,
        has_api_key: !!apiKey,
        has_session_id: !!sessionId,
        session_id: sessionId || null,
        api_key_preview: apiKey ? apiKey.substring(0, 10) + '...' : null,
        last_used_at: integration.last_sync
      };
    }
    
    // Check database sessions table
    const sessionsResult = await sql`
      SELECT 
        id,
        wasender_session_id,
        name,
        phone_number,
        status,
        last_connected_at,
        created_at
      FROM whatsapp_sessions
      ORDER BY last_connected_at DESC NULLS LAST, created_at DESC
    `;
    
    result.database_sessions = sessionsResult;
    result.database_sessions_count = sessionsResult.length;
    result.connected_sessions_count = sessionsResult.filter(s => s.status === 'connected').length;
    
    // Provide recommendation
    if (integration && result.integration.has_session_id && sessionsResult.length === 0) {
      result.recommendation = 'You have credentials in Integrations but no sessions in database. Your messages are being sent using the old integration credentials. Create a session in Session Manager to use the new system.';
      result.status = 'using_integration_credentials';
    } else if (sessionsResult.length > 0 && result.connected_sessions_count > 0) {
      result.recommendation = 'You have connected sessions in database. The system should use these for sending messages.';
      result.status = 'ready_for_database_sessions';
    } else if (sessionsResult.length > 0 && result.connected_sessions_count === 0) {
      result.recommendation = 'You have sessions in database but none are connected. Connect a session to start using the new system.';
      result.status = 'sessions_not_connected';
    } else {
      result.recommendation = 'No sessions configured. Create and connect a session in Session Manager.';
      result.status = 'no_sessions';
    }
    
    console.log(`✅ Status: ${result.status}`);
    res.json(result);
    
  } catch (error) {
    console.error('❌ Error checking integration:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

app.post('/api/whatsapp-sessions/set-active', async (req, res) => {
  console.log('📥 [API] POST /api/whatsapp-sessions/set-active');
  
  try {
    const { user_id, session_id } = req.body;
    
    if (!user_id || !session_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id and session_id are required'
      });
    }
    
    console.log(`💾 Setting active session ${session_id} for user ${user_id}`);
    
    // Verify session exists and is connected
    const sessionResult = await sql`
      SELECT id, name, status FROM whatsapp_sessions WHERE id = ${session_id}
    `;
    
    const session = sessionResult[0];
    
    if (!session) {
      return res.status(400).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    if (session.status !== 'connected') {
      return res.status(400).json({
        success: false,
        error: 'Session is not connected. Please connect the session first.'
      });
    }
    
    // Upsert user preferences
    await sql`
      INSERT INTO user_whatsapp_preferences (user_id, active_session_id, auto_select_session, updated_at)
      VALUES (${user_id}, ${session_id}, false, NOW())
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        active_session_id = ${session_id},
        auto_select_session = false,
        updated_at = NOW()
    `;
    
    console.log(`✅ Active session set to: ${session.name}`);
    res.json({
      success: true,
      message: `Active session set to '${session.name}'`,
      active_session_id: session_id
    });
    
  } catch (error) {
    console.error('❌ Error setting active session:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

app.post('/api/whatsapp-sessions/sync-from-wasender', async (req, res) => {
  console.log('📥 [API] POST /api/whatsapp-sessions/sync-from-wasender');
  
  try {
    // Get Bearer Token from integrations
    const integrationResult = await sql`
      SELECT credentials, config FROM lats_pos_integrations_settings
      WHERE integration_name = 'WHATSAPP_WASENDER' AND is_enabled = true
    `;
    
    if (integrationResult.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp integration not configured. Please configure in Admin Settings.'
      });
    }
    
    const integration = integrationResult[0];
    const credentials = typeof integration.credentials === 'string'
      ? JSON.parse(integration.credentials)
      : integration.credentials || {};
    
    const bearerToken = credentials.api_key || credentials.bearer_token;
    
    if (!bearerToken) {
      return res.status(400).json({
        success: false,
        error: 'Bearer token not found in integration credentials'
      });
    }
    
    console.log('🔑 Bearer token found, fetching sessions from WasenderAPI...');
    
    // Fetch all sessions from WasenderAPI
    const response = await fetch('https://www.wasenderapi.com/api/whatsapp-sessions', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sessions from WasenderAPI: HTTP ${response.status}`);
    }
    
    const apiData = await response.json();
    
    if (!apiData || !apiData.success) {
      throw new Error('Invalid response from WasenderAPI');
    }
    
    const sessions = apiData.data || [];
    let synced = 0;
    const errors = [];
    
    console.log(`📦 Syncing ${sessions.length} session(s) from WasenderAPI...`);
    
    // Sync each session to database
    for (const session of sessions) {
      try {
        const sessionStatus = session.status || 'DISCONNECTED';
        
        // Check if session exists
        const checkResult = await sql`
          SELECT id FROM whatsapp_sessions WHERE wasender_session_id = ${session.id}
        `;
        
        if (checkResult.length > 0) {
          // Update existing session
          await sql`
            UPDATE whatsapp_sessions SET
              name = ${session.name},
              phone_number = ${session.phone_number},
              status = ${sessionStatus},
              account_protection = ${session.account_protection ?? true},
              log_messages = ${session.log_messages ?? true},
              webhook_url = ${session.webhook_url || null},
              webhook_enabled = ${session.webhook_enabled ?? false},
              webhook_events = ${JSON.stringify(session.webhook_events || [])},
              api_key = ${session.api_key || null},
              webhook_secret = ${session.webhook_secret || null},
              session_data = ${JSON.stringify(session)},
              last_connected_at = CASE WHEN ${sessionStatus} = 'connected' THEN NOW() ELSE last_connected_at END,
              updated_at = NOW()
            WHERE wasender_session_id = ${session.id}
          `;
          
          console.log(`  ✅ Updated session: ${session.name}`);
        } else {
          // Insert new session
          const insertResult = await sql`
            INSERT INTO whatsapp_sessions (
              wasender_session_id, name, phone_number, status,
              account_protection, log_messages, webhook_url, webhook_enabled,
              webhook_events, api_key, webhook_secret, session_data,
              last_connected_at
            ) VALUES (
              ${session.id},
              ${session.name},
              ${session.phone_number},
              ${sessionStatus},
              ${session.account_protection ?? true},
              ${session.log_messages ?? true},
              ${session.webhook_url || null},
              ${session.webhook_enabled ?? false},
              ${JSON.stringify(session.webhook_events || [])},
              ${session.api_key || null},
              ${session.webhook_secret || null},
              ${JSON.stringify(session)},
              ${sessionStatus === 'connected' ? new Date().toISOString() : null}
            )
            RETURNING id
          `;
          
          const newSessionId = insertResult[0].id;
          
          // Log the creation
          await sql`
            INSERT INTO whatsapp_session_logs (session_id, event_type, message, metadata)
            VALUES (
              ${newSessionId},
              'session_synced',
              'Session imported from WasenderAPI',
              ${JSON.stringify({ wasender_id: session.id, status: sessionStatus })}
            )
          `;
          
          console.log(`  ✅ Created session: ${session.name}`);
        }
        
        synced++;
      } catch (err) {
        const errorMsg = `Session ${session.id}: ${err.message}`;
        console.error(`  ❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }
    
    console.log(`✅ Sync complete: ${synced}/${sessions.length} sessions synced`);
    res.json({
      success: true,
      message: `Synced ${synced} session(s) from WasenderAPI`,
      synced_count: synced,
      total_sessions: sessions.length,
      errors: errors
    });
    
  } catch (error) {
    console.error('❌ Error syncing sessions:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// WhatsApp media upload proxy endpoint (fixes CORS issues)
app.post('/api/whatsapp/upload-media', upload.single('file'), async (req, res) => {
  try {
    console.log('\n╔═══════════════════════════════════════════════╗');
    console.log('║  📤 WHATSAPP MEDIA UPLOAD - SERVER PROXY     ║');
    console.log('╚═══════════════════════════════════════════════╝');
    console.log('📥 [REQUEST] Received upload request');
    console.log('   Headers:', JSON.stringify(req.headers, null, 2));
    
    if (!req.file) {
      console.error('❌ [ERROR] No file uploaded in request');
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    console.log('📋 [FILE INFO] Parsed file details:');
    console.log('   • Original Name:', req.file.originalname);
    console.log('   • Field Name:', req.file.fieldname);
    console.log('   • MIME Type (from multer):', req.file.mimetype);
    console.log('   • Size:', req.file.size, 'bytes', `(${(req.file.size / 1024 / 1024).toFixed(2)}MB)`);
    console.log('   • Buffer Length:', req.file.buffer.length);
    
    // Fix: If multer incorrectly set mimetype to multipart/form-data, detect from filename
    let actualMimeType = req.file.mimetype;
    
    if (actualMimeType && actualMimeType.includes('multipart/form-data')) {
      console.warn('⚠️  [WARNING] Multer returned multipart/form-data as MIME type!');
      console.log('   Detecting MIME type from filename extension...');
      
      // Detect MIME type from file extension
      const ext = req.file.originalname.split('.').pop().toLowerCase();
      const mimeTypes = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
      
      actualMimeType = mimeTypes[ext] || 'application/octet-stream';
      console.log('   ✅ Detected MIME type:', actualMimeType);
    }
    
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      console.error('❌ [ERROR] No API key provided');
      return res.status(401).json({ success: false, error: 'API key required' });
    }
    
    console.log('🔑 [AUTH] API Key:', apiKey.substring(0, 10) + '...');
    
    // Strategy: Try WasenderAPI upload first, fallback to local hosting if it fails
    let mediaUrl = null;
    let uploadMethod = 'unknown';
    
    // Try WasenderAPI upload first (if they support it)
    try {
      console.log('📦 [RAW BINARY] Preparing file for upload to WasenderAPI');
      console.log('   • Original filename:', req.file.originalname);
      console.log('   • MIME type:', actualMimeType);
      console.log('   • File size:', req.file.size, 'bytes');
      
      console.log('\n🚀 [UPLOAD] Attempting WasenderAPI upload...');
      console.log('   URL: https://wasenderapi.com/api/upload');
      console.log('   Method: POST');
      console.log('   Content-Type:', actualMimeType);
      
      const uploadHeaders = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': actualMimeType,
        'Content-Length': req.file.size.toString()
      };
      
      const response = await fetch('https://wasenderapi.com/api/upload', {
        method: 'POST',
        headers: uploadHeaders,
        body: req.file.buffer
      });
      
      console.log(`📡 [RESPONSE] Status: ${response.status} ${response.statusText}`);
      
      const responseText = await response.text();
      console.log(`📡 [RESPONSE] Body:`, responseText.substring(0, 300));
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        mediaUrl = data.publicUrl || data.url || data.data?.url || data.mediaUrl;
        
        if (mediaUrl) {
          console.log('✅ [SUCCESS] WasenderAPI upload successful');
          console.log('   Media URL:', mediaUrl);
          uploadMethod = 'wasenderapi';
        }
      } else {
        console.warn('⚠️ [WARNING] WasenderAPI upload failed:', response.status, responseText.substring(0, 100));
      }
    } catch (wasenderError) {
      console.warn('⚠️ [WARNING] WasenderAPI upload error:', wasenderError.message);
    }
    
    // Fallback: Save locally and serve publicly
    if (!mediaUrl) {
      console.log('\n💾 [FALLBACK] Saving file locally...');
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 10);
      const ext = req.file.originalname.split('.').pop();
      const safeFilename = `whatsapp-${timestamp}-${randomId}.${ext}`;
      
      // Save to uploads directory
      const uploadsDir = path.join(__dirname, '../public/uploads/whatsapp-media');
      mkdirSync(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, safeFilename);
      writeFileSync(filePath, req.file.buffer);
      
      // Construct public URL
      // Use the request's host for the URL, or fall back to localhost
      const host = req.get('host') || 'localhost:8000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      mediaUrl = `${protocol}://${host}/uploads/whatsapp-media/${safeFilename}`;
      
      console.log('✅ [SUCCESS] File saved locally');
      console.log('   File path:', filePath);
      console.log('   Public URL:', mediaUrl);
      uploadMethod = 'local';
    }
    
    console.log('───────────────────────────────────────────────\n');
    
    res.json({
      success: true,
      url: mediaUrl,
      publicUrl: mediaUrl,
      method: uploadMethod
    });
  } catch (error) {
    console.error('\n❌ [EXCEPTION] Upload proxy error:', error.message);
    console.error('   Error details:', error);
    console.error('   Stack trace:', error.stack);
    console.log('───────────────────────────────────────────────\n');
    
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Generic query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    console.log(`📊 Query: ${query.substring(0, 100)}...`);
    
    // Execute query
    const result = await sql([query]);
    
    res.json({ data: result, error: null });
  } catch (error) {
    console.error('❌ Query error:', error.message);
    res.status(400).json({ 
      data: null, 
      error: {
        message: error.message,
        code: error.code
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ BACKEND API SERVER RUNNING!');
  console.log('='.repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
  console.log(`📊 Query: http://localhost:${PORT}/api/query`);
  console.log('');
  console.log('The frontend can now connect through this API!');
  console.log('='.repeat(50));
});

