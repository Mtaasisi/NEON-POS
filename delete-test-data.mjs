#!/usr/bin/env node

/**
 * Delete Test/Dummy Data
 * Kufuta kabisa test data kutoka inventory_items
 * 
 * ⚠️ WARNING: This will PERMANENTLY DELETE data!
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

console.log('═══════════════════════════════════════════════════════════════');
console.log('⚠️  DELETE TEST DATA');
console.log('═══════════════════════════════════════════════════════════════\n');

async function main() {
  try {
    // Find test data
    console.log('🔍 Inatafuta test/dummy data...\n');
    
    const invalidData = await sql`
      SELECT 
        id,
        imei,
        serial_number,
        status,
        product_id
      FROM inventory_items
      WHERE status = 'damaged'
        AND (
          imei IS NOT NULL 
          AND imei != ''
          AND (
            char_length(imei) < 15
            OR char_length(imei) > 17
            OR imei ~ '[^0-9]'
          )
        )
    `;

    if (invalidData.length === 0) {
      console.log('✅ Hakuna test data iliyo-marked as "damaged"\n');
      rl.close();
      return;
    }

    console.log(`⚠️  IMEPATIKANA: ${invalidData.length} records za test data\n`);
    console.log('Records zitakazofutwa:\n');
    
    invalidData.forEach((item, idx) => {
      console.log(`${idx + 1}. IMEI: "${item.imei}"`);
      console.log(`   ID: ${item.id.substring(0, 20)}...`);
      console.log(`   Status: ${item.status}\n`);
    });

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('⚠️  ONYO MUHIMU!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nHii itafuta KABISA records ${invalidData.length}.`);
    console.log('Hatua hii HAIWEZI kurudishwa!\n');
    
    const answer = await question('Je, unataka kuendelea? (andika "DELETE" ili kuthibitisha): ');

    if (answer.trim() !== 'DELETE') {
      console.log('\n❌ Imesitishwa. Hakuna data imefutwa.\n');
      rl.close();
      return;
    }

    console.log('\n🗑️  Inafuta test data...\n');

    const result = await sql`
      DELETE FROM inventory_items
      WHERE status = 'damaged'
        AND (
          imei IS NOT NULL 
          AND imei != ''
          AND (
            char_length(imei) < 15
            OR char_length(imei) > 17
            OR imei ~ '[^0-9]'
          )
        )
    `;

    console.log(`✅ Imefutwa: ${invalidData.length} records\n`);
    
    // Verify
    const remaining = await sql`
      SELECT COUNT(*) as count
      FROM inventory_items
      WHERE status = 'damaged'
    `;

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 VERIFICATION');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Remaining 'damaged' records: ${remaining[0].count}\n`);
    
    if (remaining[0].count === 0) {
      console.log('✅ Database imesafishwa kabisa!\n');
    } else {
      console.log('ℹ️  Kuna records za "damaged" zilizobaki (zinaweza kuwa legitimate).\n');
    }

    rl.close();
  } catch (error) {
    console.error('\n❌ Kosa:', error);
    rl.close();
    process.exit(1);
  }
}

main();

