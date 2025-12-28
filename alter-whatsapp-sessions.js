import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function alterWhatsAppSessionsTable() {
  try {
    console.log('🔧 Altering whatsapp_sessions table to add missing columns...');

    // Add missing columns
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS wasender_session_id INTEGER`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS phone_number TEXT`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS account_protection BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS log_messages BOOLEAN DEFAULT true`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS webhook_url TEXT`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS webhook_enabled BOOLEAN DEFAULT false`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS webhook_events JSONB`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS api_key TEXT`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS webhook_secret TEXT`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS session_data JSONB`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS user_info JSONB`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS last_connected_at TIMESTAMPTZ`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now()`;
    await sql`ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now()`;

    // Update existing rows with default values
    await sql`UPDATE whatsapp_sessions SET wasender_session_id = id WHERE wasender_session_id IS NULL`;
    await sql`UPDATE whatsapp_sessions SET phone_number = '+255700000000' WHERE phone_number IS NULL`;
    await sql`UPDATE whatsapp_sessions SET status = 'DISCONNECTED' WHERE status IS NULL OR status = ''`;

    // Make wasender_session_id NOT NULL and UNIQUE (after setting values)
    await sql`ALTER TABLE whatsapp_sessions ALTER COLUMN wasender_session_id SET NOT NULL`;
    await sql`ALTER TABLE whatsapp_sessions ALTER COLUMN phone_number SET NOT NULL`;
    await sql`ALTER TABLE whatsapp_sessions ALTER COLUMN status SET DEFAULT 'DISCONNECTED'`;

    // Add unique constraint
    await sql`ALTER TABLE whatsapp_sessions DROP CONSTRAINT IF EXISTS whatsapp_sessions_wasender_session_id_key`;
    await sql`ALTER TABLE whatsapp_sessions ADD CONSTRAINT whatsapp_sessions_wasender_session_id_key UNIQUE (wasender_session_id)`;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_status ON whatsapp_sessions(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(phone_number)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_wasender_id ON whatsapp_sessions(wasender_session_id)`;

    // Create updated_at trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_whatsapp_sessions_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Create trigger
    await sql`
      DROP TRIGGER IF EXISTS trigger_whatsapp_sessions_updated_at ON whatsapp_sessions
    `;
    await sql`
      CREATE TRIGGER trigger_whatsapp_sessions_updated_at
      BEFORE UPDATE ON whatsapp_sessions
      FOR EACH ROW EXECUTE FUNCTION update_whatsapp_sessions_updated_at()
    `;

    console.log('✅ WhatsApp sessions table altered successfully!');
  } catch (error) {
    console.error('❌ Alter table failed:', error);
  }
}

alterWhatsAppSessionsTable();
