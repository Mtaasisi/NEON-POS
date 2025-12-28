import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function createWhatsAppSessionsTable() {
  try {
    console.log('🚀 Creating WhatsApp sessions table...');

    // Create whatsapp_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS whatsapp_sessions (
        id SERIAL PRIMARY KEY,
        wasender_session_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        phone_number TEXT NOT NULL,
        status TEXT DEFAULT 'DISCONNECTED' CHECK (status IN ('CONNECTED', 'DISCONNECTED', 'CONNECTING', 'ERROR')),
        account_protection BOOLEAN DEFAULT true,
        log_messages BOOLEAN DEFAULT true,
        webhook_url TEXT,
        webhook_enabled BOOLEAN DEFAULT false,
        webhook_events JSONB,
        api_key TEXT,
        webhook_secret TEXT,
        session_data JSONB,
        user_info JSONB,
        last_connected_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

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

    // Insert a default session for testing
    await sql`
      INSERT INTO whatsapp_sessions (wasender_session_id, name, phone_number, status)
      VALUES (1, 'Default Session', '+255700000000', 'DISCONNECTED')
      ON CONFLICT (wasender_session_id) DO NOTHING
    `;

    console.log('✅ WhatsApp sessions table created successfully!');
  } catch (error) {
    console.error('❌ Failed to create WhatsApp sessions table:', error);
  }
}

createWhatsAppSessionsTable();
