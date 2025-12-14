#!/usr/bin/env node

/**
 * IMEI VALIDATION RUNNER
 * =====================
 * This script runs the comprehensive IMEI validation SQL script
 * and displays the results in a user-friendly format.
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config();

// Configure Neon
neonConfig.disableWarningInBrowsers = true;

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: Database URL not found!');
  console.error('   Set VITE_DATABASE_URL or DATABASE_URL in .env file');
  process.exit(1);
}

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  🔍 IMEI VALIDATION SYSTEM');
console.log('═══════════════════════════════════════════════════════');
console.log('');

const sql = neon(DATABASE_URL);

async function runValidation() {
  try {
    // Test connection first
    console.log('📡 Testing database connection...');
    await sql`SELECT 1`;
    console.log('✅ Connected to database\n');

    // Read SQL file
    console.log('📄 Reading validation script...');
    const sqlFilePath = join(__dirname, 'validate-all-imeis-complete.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');
    console.log('✅ SQL script loaded\n');

    console.log('⚙️  Running IMEI validation...');
    console.log('   (This may take a few moments)\n');

    // Execute the SQL script
    // Note: We need to execute it in parts since some statements need to be separate
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let stepCount = 0;
    for (const statement of statements) {
      if (statement.trim()) {
        stepCount++;
        try {
          await sql.unsafe(statement);
        } catch (error) {
          // Some errors are expected (like table already exists)
          if (!error.message.includes('already exists')) {
            console.warn(`⚠️  Warning at step ${stepCount}: ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Validation script executed successfully!\n');

    // Now get the summary report
    console.log('═══════════════════════════════════════════════════════');
    console.log('  📊 IMEI VALIDATION RESULTS');
    console.log('═══════════════════════════════════════════════════════\n');

    const summary = await sql`
      SELECT 
        imei_status,
        COUNT(*) as idadi,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as asilimia
      FROM imei_validation
      GROUP BY imei_status
      ORDER BY COUNT(*) DESC
    `;

    if (summary && summary.length > 0) {
      const total = summary.reduce((sum, row) => sum + parseInt(row.idadi), 0);
      
      console.log(`Total IMEIs: ${total}\n`);
      
      for (const row of summary) {
        const emoji = {
          'valid': '✅',
          'invalid': '❌',
          'empty': '⚠️',
          'duplicate': '🔁'
        }[row.imei_status] || '📌';
        
        const label = row.imei_status.toUpperCase().padEnd(12);
        const count = String(row.idadi).padStart(6);
        const percent = String(row.asilimia) + '%';
        
        console.log(`${emoji} ${label}: ${count} (${percent})`);
      }

      // Calculate health score
      const validCount = summary.find(r => r.imei_status === 'valid')?.idadi || 0;
      const healthScore = ((validCount / total) * 100).toFixed(2);

      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log(`  🏆 IMEI HEALTH SCORE: ${healthScore}%`);
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

      // Show invalid IMEIs if any
      const invalidCount = summary.reduce((sum, row) => {
        if (row.imei_status !== 'valid') {
          return sum + parseInt(row.idadi);
        }
        return sum;
      }, 0);

      if (invalidCount > 0) {
        console.log('📋 INVALID IMEIs DETAILS:\n');
        
        const invalidIMEIs = await sql`
          SELECT 
            v.variant_attributes->>'imei' as imei,
            p.name as product_name,
            v.variant_name,
            iv.imei_status,
            iv.validation_reason
          FROM lats_product_variants v
          LEFT JOIN lats_products p ON p.id = v.product_id
          LEFT JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
          WHERE (iv.imei_status != 'valid' OR iv.imei_status IS NULL)
            AND v.variant_attributes->>'imei' IS NOT NULL
          ORDER BY iv.imei_status, v.created_at DESC
          LIMIT 10
        `;

        for (const item of invalidIMEIs) {
          console.log(`   IMEI: ${item.imei || 'N/A'}`);
          console.log(`   Product: ${item.product_name}`);
          console.log(`   Status: ${item.imei_status}`);
          console.log(`   Reason: ${item.validation_reason}`);
          console.log('   ─────────────────────────────────────');
        }

        if (invalidIMEIs.length === 10) {
          console.log(`   ... and ${invalidCount - 10} more\n`);
        }
      }

      // Show what was created
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  ✨ RESOURCES CREATED');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('📋 Tables:');
      console.log('   • imei_validation - Tracking table for all IMEIs');
      console.log('');
      console.log('👁️  Views:');
      console.log('   • v_imei_validation_status - Complete IMEI status view');
      console.log('');
      console.log('🔧 Functions:');
      console.log('   • validate_single_imei(TEXT) - Validate individual IMEI');
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  💡 USAGE EXAMPLES');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');
      console.log('-- Validate single IMEI:');
      console.log("SELECT * FROM validate_single_imei('123456789012345');");
      console.log('');
      console.log('-- View all IMEI validation status:');
      console.log('SELECT * FROM v_imei_validation_status;');
      console.log('');
      console.log('-- Get only invalid IMEIs:');
      console.log("SELECT * FROM v_imei_validation_status WHERE imei_status != 'valid';");
      console.log('');
      console.log('-- Get duplicate IMEIs:');
      console.log("SELECT * FROM imei_validation WHERE imei_status = 'duplicate';");
      console.log('');
      console.log('═══════════════════════════════════════════════════════');
      console.log('  ✅ VALIDATION COMPLETE!');
      console.log('═══════════════════════════════════════════════════════');
      console.log('');

    } else {
      console.log('ℹ️  No IMEIs found in the system.');
    }

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR: Validation failed!\n');
    console.error('Error details:', error.message);
    console.error('');
    
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Ensure database is accessible');
    console.error('   2. Check if validate-all-imeis-complete.sql exists');
    console.error('   3. Verify database permissions');
    console.error('   4. Check Neon dashboard for database status');
    console.error('');
    
    process.exit(1);
  }
}

// Run the validation
runValidation();
