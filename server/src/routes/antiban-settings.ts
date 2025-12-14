import express from 'express';
import mysql from 'mysql2/promise';

const router = express.Router();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lats_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

/**
 * GET /api/antiban-settings
 * Get anti-ban settings for current user (or default)
 */
router.get('/', async (req, res) => {
  console.log('📥 [API] GET /api/antiban-settings');
  
  try {
    const userId = req.query.user_id || null;
    console.log(`🔍 [QUERY] Fetching settings for user_id: ${userId || 'default'}`);
    
    const [rows] = await pool.query(
      `SELECT * FROM whatsapp_antiban_settings 
       WHERE user_id <=> ? 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    const settings = (rows as any[])[0];
    
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
    console.log(`📊 [DATA] Delays: ${minDelay}-${maxDelay}s, Batch: ${batchSize}, Limits: ${maxPerHour}/hr, ${dailyLimit}/day`);
    
    // Use INSERT ... ON DUPLICATE KEY UPDATE for upsert behavior
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        use_personalization = VALUES(use_personalization),
        random_delay = VALUES(random_delay),
        min_delay = VALUES(min_delay),
        max_delay = VALUES(max_delay),
        use_presence = VALUES(use_presence),
        batch_size = VALUES(batch_size),
        batch_delay = VALUES(batch_delay),
        max_per_hour = VALUES(max_per_hour),
        daily_limit = VALUES(daily_limit),
        skip_recently_contacted = VALUES(skip_recently_contacted),
        respect_quiet_hours = VALUES(respect_quiet_hours),
        use_invisible_chars = VALUES(use_invisible_chars),
        use_emoji_variation = VALUES(use_emoji_variation),
        vary_length = VALUES(vary_length),
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
    const userId = req.query.user_id || null;
    console.log(`🔄 [RESET] Resetting settings for user_id: ${userId || 'default'}`);
    
    await pool.query(
      'DELETE FROM whatsapp_antiban_settings WHERE user_id <=> ?',
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

