/**
 * WhatsApp Sessions API Routes
 * Handles session management and status checking
 */

import express from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.VITE_DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? {
    rejectUnauthorized: false
  } : false
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err);
});

/**
 * GET /api/whatsapp-sessions/get-active
 * Get active WhatsApp session for user
 */
router.get('/get-active', async (req, res) => {
  console.log('📥 [API] GET /api/whatsapp-sessions/get-active');
  
  try {
    const userId = req.query.user_id as string;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }
    
    console.log(`🔍 [QUERY] Fetching active session for user_id: ${userId}`);
    
    // Get user's active session preference from unified settings table
    const prefsResult = await pool.query(
      `SELECT setting_value_text as active_session_id
       FROM settings
       WHERE scope = 'user'
         AND category = 'whatsapp'
         AND setting_key = 'active_session_id'
         AND user_id = $1`,
      [userId]
    );

    const activeSessionIdFromSettings = prefsResult.rows[0]?.active_session_id;

    // Get auto-select preference
    const autoSelectResult = await pool.query(
      `SELECT setting_value_boolean as auto_select_session
       FROM settings
       WHERE scope = 'user'
         AND category = 'whatsapp'
         AND setting_key = 'auto_select_session'
         AND user_id = $1`,
      [userId]
    );

    const autoSelectSession = autoSelectResult.rows[0]?.auto_select_session ?? true; // Default to true

    const prefs = {
      active_session_id: activeSessionIdFromSettings,
      auto_select_session: autoSelectSession
    };
    let activeSessionId = null;
    
    if (prefs && prefs.active_session_id) {
      // User has a preferred session
      activeSessionId = prefs.active_session_id;
      console.log(`✅ Found user preference for session: ${activeSessionId}`);
    } else if (!prefs || prefs.auto_select_session) {
      // Auto-select first connected session
      console.log('🔄 Auto-selecting first connected session');
      const autoResult = await pool.query(
        `SELECT id FROM whatsapp_sessions
         WHERE status = 'connected'
         ORDER BY last_connected_at DESC NULLS LAST, created_at DESC
         LIMIT 1`
      );
      
      if (autoResult.rows.length > 0) {
        activeSessionId = autoResult.rows[0].id;
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
    const sessionResult = await pool.query(
      `SELECT 
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
       WHERE id = $1`,
      [activeSessionId]
    );
    
    const session = sessionResult.rows[0];
    
    if (!session) {
      console.log('⚠️ Active session not found in database');
      return res.json({
        success: true,
        active_session: null,
        message: 'Active session not found'
      });
    }
    
    // Check if session is still connected
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
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/whatsapp-sessions/check-integration
 * Check WhatsApp integration configuration
 */
router.get('/check-integration', async (req, res) => {
  console.log('📥 [API] GET /api/whatsapp-sessions/check-integration');
  
  try {
    const result: any = {
      success: true,
      integration: null,
      database_sessions: [],
      recommendation: ''
    };
    
    // Check unified settings table for WhatsApp configuration
    const integrationResult = await pool.query(
      `SELECT
        setting_value_boolean as is_active,
        setting_value_text as api_key,
        setting_value_json as config,
        updated_at as last_sync
       FROM settings
       WHERE scope = 'system'
         AND category = 'integrations'
         AND setting_key = 'whatsapp_wasender'
       LIMIT 1`
    );

    const integration = integrationResult.rows[0];
    
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
      
      console.log('📊 Integration found:', {
        enabled: result.integration.enabled,
        has_api_key: result.integration.has_api_key,
        has_session_id: result.integration.has_session_id
      });
    }
    
    // Check database sessions table
    const sessionsResult = await pool.query(
      `SELECT 
        id,
        wasender_session_id,
        name,
        phone_number,
        status,
        last_connected_at,
        created_at
       FROM whatsapp_sessions
       ORDER BY last_connected_at DESC NULLS LAST, created_at DESC`
    );
    
    const sessions = sessionsResult.rows;
    result.database_sessions = sessions;
    result.database_sessions_count = sessions.length;
    result.connected_sessions_count = sessions.filter(s => s.status === 'connected').length;
    
    console.log('📊 Sessions:', {
      total: result.database_sessions_count,
      connected: result.connected_sessions_count
    });
    
    // Provide recommendation
    if (integration && result.integration.has_session_id && sessions.length === 0) {
      result.recommendation = 'You have credentials in Integrations but no sessions in database. Your messages are being sent using the old integration credentials. Create a session in Session Manager to use the new system.';
      result.status = 'using_integration_credentials';
    } else if (sessions.length > 0 && result.connected_sessions_count > 0) {
      result.recommendation = 'You have connected sessions in database. The system should use these for sending messages.';
      result.status = 'ready_for_database_sessions';
    } else if (sessions.length > 0 && result.connected_sessions_count === 0) {
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
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/whatsapp-sessions/set-active
 * Set active WhatsApp session for user
 */
router.post('/set-active', async (req, res) => {
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
    const sessionResult = await pool.query(
      `SELECT id, name, status FROM whatsapp_sessions WHERE id = $1`,
      [session_id]
    );
    
    const session = sessionResult.rows[0];
    
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
    
    // Update active session in unified settings table
    await pool.query(
      `INSERT INTO settings (scope, category, setting_key, setting_value_text, user_id, updated_at)
       VALUES ('user', 'whatsapp', 'active_session_id', $1, $2, NOW())
       ON CONFLICT (scope, category, setting_key, user_id)
       DO UPDATE SET
         setting_value_text = $1,
         updated_at = NOW()`,
      [session_id, user_id]
    );

    // Also set auto_select_session to false
    await pool.query(
      `INSERT INTO settings (scope, category, setting_key, setting_value_boolean, user_id, updated_at)
       VALUES ('user', 'whatsapp', 'auto_select_session', false, $1, NOW())
       ON CONFLICT (scope, category, setting_key, user_id)
       DO UPDATE SET
         setting_value_boolean = false,
         updated_at = NOW()`,
      [user_id]
    );
    
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
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * GET /api/whatsapp-sessions/list
 * Get all WhatsApp sessions from database
 */
router.get('/list', async (req, res) => {
  console.log('📥 [API] GET /api/whatsapp-sessions/list');
  
  try {
    const result = await pool.query(
      `SELECT 
        id,
        wasender_session_id,
        name,
        phone_number,
        status,
        account_protection,
        log_messages,
        webhook_url,
        webhook_enabled,
        webhook_events,
        last_connected_at,
        created_at,
        updated_at
       FROM whatsapp_sessions
       ORDER BY created_at DESC`
    );
    
    // Parse JSON fields and convert booleans
    const sessions = result.rows.map(session => ({
      ...session,
      webhook_events: typeof session.webhook_events === 'string' 
        ? JSON.parse(session.webhook_events || '[]') 
        : session.webhook_events || [],
      account_protection: !!session.account_protection,
      log_messages: !!session.log_messages,
      webhook_enabled: !!session.webhook_enabled
    }));
    
    console.log(`✅ Found ${sessions.length} sessions`);
    res.json({
      success: true,
      data: sessions
    });
    
  } catch (error) {
    console.error('❌ Error listing sessions:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

/**
 * POST /api/whatsapp-sessions/sync-from-wasender
 * Sync all sessions from WasenderAPI to local database
 */
router.post('/sync-from-wasender', async (req, res) => {
  console.log('📥 [API] POST /api/whatsapp-sessions/sync-from-wasender');
  
  try {
    // Get Bearer Token from unified settings
    const integrationResult = await pool.query(
      `SELECT setting_value_json as config, setting_value_boolean as is_active
       FROM settings
       WHERE scope = 'system'
         AND category = 'integrations'
         AND setting_key = 'whatsapp_wasender'`
    );

    if (integrationResult.rows.length === 0 || !integrationResult.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        error: 'WhatsApp integration not configured. Please configure in Admin Settings.'
      });
    }

    const config = typeof integrationResult.rows[0].config === 'string'
      ? JSON.parse(integrationResult.rows[0].config)
      : integrationResult.rows[0].config || {};

    const bearerToken = config.bearer_token || config.api_key;
    
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
    
    const apiData: any = await response.json();
    
    if (!apiData || !apiData.success) {
      throw new Error('Invalid response from WasenderAPI');
    }
    
    const sessions = apiData.data || [];
    let synced = 0;
    const errors: string[] = [];
    
    console.log(`📦 Syncing ${sessions.length} session(s) from WasenderAPI...`);
    
    // Sync each session to database
    for (const session of sessions) {
      try {
        // Check if session exists
        const checkResult = await pool.query(
          'SELECT id FROM whatsapp_sessions WHERE wasender_session_id = $1',
          [session.id]
        );
        
        const existingSession = checkResult.rows[0];
        const sessionStatus = session.status || 'DISCONNECTED';
        
        if (existingSession) {
          // Update existing session
          await pool.query(
            `UPDATE whatsapp_sessions SET
              name = $1,
              phone_number = $2,
              status = $3,
              account_protection = $4,
              log_messages = $5,
              webhook_url = $6,
              webhook_enabled = $7,
              webhook_events = $8,
              api_key = $9,
              webhook_secret = $10,
              session_data = $11,
              last_connected_at = CASE WHEN $12 = 'connected' THEN NOW() ELSE last_connected_at END,
              updated_at = NOW()
             WHERE wasender_session_id = $13`,
            [
              session.name,
              session.phone_number,
              sessionStatus,
              session.account_protection ?? true,
              session.log_messages ?? true,
              session.webhook_url || null,
              session.webhook_enabled ?? false,
              JSON.stringify(session.webhook_events || []),
              session.api_key || null,
              session.webhook_secret || null,
              JSON.stringify(session),
              sessionStatus,
              session.id
            ]
          );
          
          console.log(`  ✅ Updated session: ${session.name}`);
          synced++;
        } else {
          // Insert new session
          const insertResult = await pool.query(
            `INSERT INTO whatsapp_sessions (
              wasender_session_id, name, phone_number, status,
              account_protection, log_messages, webhook_url, webhook_enabled,
              webhook_events, api_key, webhook_secret, session_data,
              last_connected_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id`,
            [
              session.id,
              session.name,
              session.phone_number,
              sessionStatus,
              session.account_protection ?? true,
              session.log_messages ?? true,
              session.webhook_url || null,
              session.webhook_enabled ?? false,
              JSON.stringify(session.webhook_events || []),
              session.api_key || null,
              session.webhook_secret || null,
              JSON.stringify(session),
              sessionStatus === 'connected' ? new Date().toISOString() : null
            ]
          );
          
          const newSessionId = insertResult.rows[0].id;
          
          // Log the creation
          await pool.query(
            `INSERT INTO whatsapp_session_logs (session_id, event_type, message, metadata)
             VALUES ($1, 'session_synced', 'Session imported from WasenderAPI', $2)`,
            [
              newSessionId,
              JSON.stringify({ wasender_id: session.id, status: sessionStatus })
            ]
          );
          
          console.log(`  ✅ Created session: ${session.name}`);
          synced++;
        }
      } catch (err) {
        const errorMsg = `Session ${session.id}: ${err instanceof Error ? err.message : 'Unknown error'}`;
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
      error: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

export default router;

