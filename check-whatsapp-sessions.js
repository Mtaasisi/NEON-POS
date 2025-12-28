import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 'postgresql://neondb_owner:npg_tHAqPdo2x0LR@ep-aged-pond-adays3pg-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function checkTable() {
  try {
    console.log('🔍 Checking current whatsapp_sessions table structure...');

    const result = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'whatsapp_sessions'
      ORDER BY ordinal_position
    `;

    console.log('Current whatsapp_sessions table columns:');
    result.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error checking table:', error);
  }
}

checkTable();
