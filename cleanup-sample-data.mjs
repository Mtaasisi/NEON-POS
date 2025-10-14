#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function cleanup() {
  try {
    console.log('🗑️  Cleaning up old sample data...\n');
    
    const parts = ['DELETE FROM payment_transactions WHERE reference LIKE \'SAMPLE-%\' RETURNING id'];
    parts.raw = parts;
    const result = await sql(parts);
    const rows = result?.rows || result || [];
    
    console.log(`✅ Deleted ${rows.length} old sample records\n`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

cleanup();

