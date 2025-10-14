#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function main() {
  try {
    console.log('🗑️  Cleaning up old sample data...\n');
    
    // Delete old sample data
    const result = await sql\`
      DELETE FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
      RETURNING id
    \`;
    
    console.log(\`✅ Deleted \${result.length} old sample records\n\`);
    
    console.log('📝 Re-inserting fresh sample data...\n');
    
    // Run the insertion script
    const { stdout, stderr } = await execAsync('node auto-insert-sample-payments.mjs');
    
    console.log(stdout);
    if (stderr) console.error(stderr);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
