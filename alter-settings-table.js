import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function alterTable() {
  try {
    console.log('🔧 Altering settings table to add missing columns...');

    // Add missing columns
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'system'`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS setting_key TEXT`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS user_id UUID`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS branch_id UUID`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS setting_value_text TEXT`;
    await sql`ALTER TABLE settings ADD COLUMN IF NOT EXISTS setting_value_json JSONB`;

    // Update existing rows to have proper structure
    await sql`
      UPDATE settings
      SET
        scope = 'system',
        category = 'general',
        setting_key = key
      WHERE scope IS NULL AND key IS NOT NULL
    `;

    // Copy values for existing rows
    await sql`
      UPDATE settings
      SET
        setting_value_text = value,
        setting_value_json = CASE
          WHEN value ~ '^[\[{]' THEN value::jsonb
          ELSE NULL
        END
      WHERE setting_value_text IS NULL AND value IS NOT NULL
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_scope_category ON settings(scope, category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_user_category ON settings(user_id, category) WHERE user_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(setting_key)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at DESC)`;

    // Insert default anti-ban settings if not exists
    const existing = await sql`
      SELECT id FROM settings
      WHERE scope = 'system' AND category = 'whatsapp' AND setting_key = 'antiban_settings'
      LIMIT 1
    `;

    if (existing.length === 0) {
      await sql`
        INSERT INTO settings (scope, category, setting_key, setting_value_json, key, value)
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
        }', 'antiban_settings', '{"usePersonalization":true,"randomDelay":true,"minDelay":3,"maxDelay":8,"varyMessageLength":true,"skipRecentlyContacted":true,"useInvisibleChars":true,"useEmojiVariation":true,"batchSize":20,"batchDelay":60,"maxPerHour":30,"dailyLimit":100,"respectQuietHours":true}')
      `;
    }

    console.log('✅ Settings table altered successfully!');
  } catch (error) {
    console.error('❌ Alter table failed:', error);
  }
}

alterTable();
