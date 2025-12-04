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
      `SELECT * FROM whatsapp_antiban_settings 
       WHERE user_id IS NOT DISTINCT FROM $1
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    const settings = result.rows[0];
    
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
    
    // Transform database fields to camelCase for frontend
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
    
    // Use INSERT ... ON CONFLICT for upsert behavior (PostgreSQL)
    await pool.query(
      `INSERT INTO whatsapp_antiban_settings (
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (user_id) DO UPDATE SET
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
        updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
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
      'DELETE FROM whatsapp_antiban_settings WHERE user_id IS NOT DISTINCT FROM $1',
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

