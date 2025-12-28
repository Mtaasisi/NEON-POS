import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// PostgreSQL connection configuration for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL (Neon)');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

/**
 * GET /api/antiban-settings
 * Get anti-ban settings for current user (or default)
 */
router.get('/', async (req, res) => {
  console.log('📥 [API] GET /api/antiban-settings');
  
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;
    console.log(`🔍 [QUERY] Fetching settings for user_id: ${userId || 'default'}`);
    
    const result = await pool.query(
      `SELECT setting_value_json as settings, updated_at
       FROM settings
       WHERE scope = 'user'
         AND category = 'whatsapp'
         AND setting_key = 'antiban_settings'
         AND (user_id IS NOT DISTINCT FROM $1 OR user_id IS NULL)
       ORDER BY updated_at DESC
       LIMIT 1`,
      [userId]
    );

    const settingsRow = result.rows[0];
    const settings = settingsRow ? (typeof settingsRow.settings === 'string' ? JSON.parse(settingsRow.settings) : settingsRow.settings) : null;
    
    if (!settings) {
      console.log('⚠️ [WARNING] No settings found, returning defaults');
      // Return default settings
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

    // Settings are already in the correct format from JSON
    res.json({
      ...settings,
      updatedAt: settingsRow.updated_at
    });
  } catch (error) {
    console.error('❌ [ERROR] Failed to fetch settings:', error);
    res.status(500).json({ 
      error: 'Failed to fetch anti-ban settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/antiban-settings
 * Save anti-ban settings for current user
 */
router.post('/', async (req, res) => {
  console.log('📤 [API] POST /api/antiban-settings');
  
  try {
    const userId = req.body.user_id ? parseInt(req.body.user_id) : null;
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
    console.log(`📊 [DATA] Delays: ${minDelay}-${maxDelay}s, Batch: ${batchSize}, Limits: ${maxPerHour}/hr, ${dailyLimit}/day`);
    
    // Prepare settings object for JSON storage
    const settingsData = {
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
    };

    // Use INSERT ... ON CONFLICT for upsert behavior (PostgreSQL)
    await pool.query(
      `INSERT INTO settings (
        scope,
        category,
        setting_key,
        setting_value_json,
        user_id,
        updated_at
      ) VALUES ('user', 'whatsapp', 'antiban_settings', $1, $2, NOW())
      ON CONFLICT (scope, category, setting_key, user_id) DO UPDATE SET
        setting_value_json = $1,
        updated_at = NOW()`,
      [
        JSON.stringify(settingsData),
        userId
      ]
    );
    
    console.log('✅ [SUCCESS] Settings saved to database');
    
    res.json({ 
      success: true,
      message: 'Anti-ban settings saved successfully'
    });
  } catch (error) {
    console.error('❌ [ERROR] Failed to save settings:', error);
    res.status(500).json({ 
      error: 'Failed to save anti-ban settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/antiban-settings
 * Reset to default settings for current user
 */
router.delete('/', async (req, res) => {
  console.log('🗑️ [API] DELETE /api/antiban-settings');
  
  try {
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;
    console.log(`🔄 [RESET] Resetting settings for user_id: ${userId || 'default'}`);
    
    await pool.query(
      `DELETE FROM settings
       WHERE scope = 'user'
         AND category = 'whatsapp'
         AND setting_key = 'antiban_settings'
         AND (user_id IS NOT DISTINCT FROM $1 OR user_id IS NULL)`,
      [userId]
    );
    
    console.log('✅ [SUCCESS] Settings reset to defaults');
    
    res.json({ 
      success: true,
      message: 'Settings reset to defaults'
    });
  } catch (error) {
    console.error('❌ [ERROR] Failed to reset settings:', error);
    res.status(500).json({ 
      error: 'Failed to reset settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

