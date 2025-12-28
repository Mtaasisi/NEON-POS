import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function runMigrations() {
  try {
    console.log('🚀 Running database migrations...');

    // Create settings table
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scope TEXT NOT NULL,
        category TEXT NOT NULL,
        setting_key TEXT NOT NULL,
        user_id UUID,
        branch_id UUID,
        setting_value_text TEXT,
        setting_value_json JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_scope_category ON settings(scope, category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_user_category ON settings(user_id, category) WHERE user_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at DESC)`;

    // Insert default settings
    await sql`
      INSERT INTO settings (scope, category, setting_key, setting_value_json)
      VALUES ('system', 'whatsapp', 'antiban_settings', '{
        "usePersonalization": true,
        "randomDelay": true,
        "minDelay": 3,
        "maxDelay": 8,
        "varyMessageLength": true,
        "skipRecentlyContacted": true,
        "useInvisibleChars": true,
        "useEmojiVariation": true,
        "batchSize": 20,
        "batchDelay": 60,
        "maxPerHour": 30,
        "dailyLimit": 100,
        "respectQuietHours": true
      }')
      ON CONFLICT (scope, category, setting_key, user_id, branch_id) DO NOTHING
    `;

    console.log('✅ Settings table created successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigrations();
