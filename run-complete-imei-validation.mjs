#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 * COMPLETE IMEI VALIDATION, CLEANUP & REPORTING SCRIPT
 * ═══════════════════════════════════════════════════════════════
 * Validates all IMEIs in lats_product_variants and generates report
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

const sql = neon(process.env.VITE_DATABASE_URL);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  log('\n' + '═'.repeat(70), 'cyan');
  log(`  ${message}`, 'bright');
  log('═'.repeat(70), 'cyan');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

async function step1_CreateValidationTable() {
  header('HATUA 1: Unda jedwali la imei_validation');
  
  try {
    // Check if table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables 
        WHERE tablename = 'imei_validation'
      ) as exists
    `;
    
    if (tableCheck[0].exists) {
      warning('Jedwali la imei_validation tayari lipo');
      info('Ninafuta data za zamani...');
      await sql`TRUNCATE imei_validation`;
      success('Data za zamani zimefutwa');
    } else {
      info('Ninaunda jedwali jipya...');
      
      // Create table
      await sql`
        CREATE TABLE imei_validation (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          imei TEXT NOT NULL UNIQUE,
          imei_status TEXT NOT NULL CHECK (imei_status IN ('valid', 'invalid', 'duplicate', 'empty')),
          validation_reason TEXT,
          source_table TEXT,
          source_id UUID,
          created_at TIMESTAMPTZ DEFAULT now(),
          updated_at TIMESTAMPTZ DEFAULT now()
        )
      `;
      
      // Create indexes
      await sql`CREATE INDEX idx_imei_validation_status ON imei_validation(imei_status)`;
      await sql`CREATE INDEX idx_imei_validation_imei ON imei_validation(imei)`;
      
      success('Jedwali la imei_validation limeundwa kikamilifu');
    }
    
    return true;
  } catch (err) {
    error(`Kosa la hatua 1: ${err.message}`);
    return false;
  }
}

async function step2_ValidateAndInsertIMEIs() {
  header('HATUA 2: Validate na kujaza IMEIs kutoka lats_product_variants');
  
  try {
    // First, check how many IMEIs we have
    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM lats_product_variants
      WHERE variant_attributes->>'imei' IS NOT NULL
        AND variant_attributes->>'imei' != ''
    `;
    
    const totalIMEIs = parseInt(countResult[0].total);
    info(`Jumla ya IMEIs zinazopatikana: ${totalIMEIs}`);
    
    if (totalIMEIs === 0) {
      warning('Hakuna IMEIs zinazopatikana kwenye lats_product_variants');
      return false;
    }
    
    // Insert and validate IMEIs (using CTE to handle duplicates properly)
    info('Ninavalidate IMEIs...');
    
    const result = await sql`
      WITH unique_imeis AS (
        SELECT DISTINCT ON (variant_attributes->>'imei')
          variant_attributes->>'imei' as imei,
          CASE 
            WHEN variant_attributes->>'imei' IS NULL OR TRIM(variant_attributes->>'imei') = '' THEN 'empty'
            WHEN variant_attributes->>'imei' ~ '^\\d{15}$' THEN 'valid'
            ELSE 'invalid'
          END as imei_status,
          CASE 
            WHEN variant_attributes->>'imei' IS NULL OR TRIM(variant_attributes->>'imei') = '' THEN 'IMEI ni tupu'
            WHEN variant_attributes->>'imei' ~ '^\\d{15}$' THEN 'IMEI halali - 15 digits'
            ELSE 'Format si sahihi au urefu sio 15 digits (urefu: ' || LENGTH(variant_attributes->>'imei') || ')'
          END as validation_reason,
          'lats_product_variants' as source_table,
          id as source_id
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
          AND variant_attributes->>'imei' != ''
        ORDER BY variant_attributes->>'imei', created_at DESC
      )
      INSERT INTO imei_validation (imei, imei_status, validation_reason, source_table, source_id)
      SELECT imei, imei_status, validation_reason, source_table, source_id
      FROM unique_imeis
      ON CONFLICT (imei) DO UPDATE SET
        imei_status = CASE 
          WHEN EXCLUDED.imei_status = 'valid' THEN 'valid'
          ELSE imei_validation.imei_status
        END,
        updated_at = now()
    `;
    
    success(`IMEIs zimevalidatiwa na kujazwa kwenye jedwali`);
    
    return true;
  } catch (err) {
    error(`Kosa la hatua 2: ${err.message}`);
    console.error(err);
    return false;
  }
}

async function step3_FlagDuplicates() {
  header('HATUA 3: Tafuta na flag IMEIs duplicate');
  
  try {
    // Find duplicates
    const duplicates = await sql`
      WITH duplicate_imeis AS (
        SELECT 
          variant_attributes->>'imei' as imei,
          COUNT(*) as count
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
          AND variant_attributes->>'imei' != ''
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
      )
      SELECT imei, count FROM duplicate_imeis
    `;
    
    if (duplicates.length === 0) {
      success('Hakuna IMEIs duplicate zilizopatikana! 🎉');
      return true;
    }
    
    warning(`Nimeona IMEIs duplicate: ${duplicates.length}`);
    
    // Show some duplicates
    console.log('\nMifano ya IMEIs duplicate:');
    duplicates.slice(0, 5).forEach(dup => {
      log(`  📱 IMEI: ${dup.imei} (inaonekana mara ${dup.count})`, 'yellow');
    });
    
    if (duplicates.length > 5) {
      log(`  ... na ${duplicates.length - 5} zaidi`, 'yellow');
    }
    
    // Update duplicates in validation table
    info('\nNina-flag duplicates kwenye imei_validation...');
    
    const updateResult = await sql`
      WITH duplicate_imeis AS (
        SELECT 
          variant_attributes->>'imei' as imei,
          COUNT(*) as count
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
          AND variant_attributes->>'imei' != ''
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
      )
      UPDATE imei_validation
      SET 
        imei_status = 'duplicate',
        validation_reason = 'IMEI duplicate - inaonekana mara ' || d.count || ' kwenye database',
        updated_at = now()
      FROM duplicate_imeis d
      WHERE imei_validation.imei = d.imei
    `;
    
    success('IMEIs duplicate zime-flag kikamilifu');
    
    return true;
  } catch (err) {
    error(`Kosa la hatua 3: ${err.message}`);
    return false;
  }
}

async function step4_GenerateSummaryReport() {
  header('HATUA 4: Ripoti ya Jumla (Summary Report)');
  
  try {
    // Get summary statistics
    const summary = await sql`
      SELECT 
        imei_status,
        COUNT(*) as idadi,
        ROUND((COUNT(*) * 100.0 / SUM(COUNT(*)) OVER()), 2) as asilimia
      FROM imei_validation
      GROUP BY imei_status
      ORDER BY COUNT(*) DESC
    `;
    
    console.log('\n📊 SUMMARY YA IMEI VALIDATION:\n');
    console.log('┌─────────────────┬─────────┬──────────────┐');
    console.log('│ Status          │ Idadi   │ Asilimia (%) │');
    console.log('├─────────────────┼─────────┼──────────────┤');
    
    summary.forEach(row => {
      const status = row.imei_status.padEnd(15);
      const count = String(row.idadi).padStart(7);
      const percent = String(row.asilimia).padStart(12);
      
      let color = 'reset';
      if (row.imei_status === 'valid') color = 'green';
      else if (row.imei_status === 'invalid') color = 'red';
      else if (row.imei_status === 'duplicate') color = 'yellow';
      else if (row.imei_status === 'empty') color = 'magenta';
      
      log(`│ ${status} │ ${count} │ ${percent}% │`, color);
    });
    
    console.log('└─────────────────┴─────────┴──────────────┘\n');
    
    // Get total count
    const total = summary.reduce((sum, row) => sum + parseInt(row.idadi), 0);
    info(`Jumla ya IMEIs zilizochunguzwa: ${total}`);
    
    return summary;
  } catch (err) {
    error(`Kosa la hatua 4: ${err.message}`);
    return null;
  }
}

async function step5_ShowValidIMEIs() {
  header('HATUA 5: IMEIs Halali (Valid IMEIs)');
  
  try {
    const validIMEIs = await sql`
      SELECT 
        v.id,
        v.variant_name,
        v.variant_attributes->>'imei' as imei,
        iv.imei_status,
        iv.validation_reason,
        v.quantity,
        v.is_active
      FROM lats_product_variants v
      INNER JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
      WHERE iv.imei_status = 'valid'
      ORDER BY v.created_at DESC
      LIMIT 10
    `;
    
    if (validIMEIs.length === 0) {
      warning('Hakuna IMEIs halali zilizopatikana');
      return;
    }
    
    info(`Jumla ya IMEIs halali: ${validIMEIs.length} (Ninaonyesha 10 za mwisho)`);
    console.log('\n');
    
    validIMEIs.forEach((item, index) => {
      log(`${index + 1}. ${item.variant_name || 'Unnamed'}`, 'bright');
      log(`   📱 IMEI: ${item.imei}`, 'green');
      log(`   📦 Quantity: ${item.quantity} | Active: ${item.is_active ? '✅' : '❌'}`);
      log(`   🆔 ID: ${item.id}`);
      console.log('');
    });
    
  } catch (err) {
    error(`Kosa la hatua 5: ${err.message}`);
  }
}

async function step6_ShowInvalidIMEIs() {
  header('HATUA 6: IMEIs Si Halali (Invalid IMEIs)');
  
  try {
    const invalidIMEIs = await sql`
      SELECT 
        v.id,
        v.variant_name,
        v.variant_attributes->>'imei' as imei,
        iv.validation_reason,
        v.quantity,
        v.is_active
      FROM lats_product_variants v
      INNER JOIN imei_validation iv ON iv.imei = v.variant_attributes->>'imei'
      WHERE iv.imei_status = 'invalid'
      ORDER BY v.created_at DESC
      LIMIT 10
    `;
    
    if (invalidIMEIs.length === 0) {
      success('Hakuna IMEIs invalid zilizopatikana! 🎉');
      return;
    }
    
    warning(`Nimeona IMEIs invalid: ${invalidIMEIs.length} (Ninaonyesha 10 za mwisho)`);
    console.log('\n');
    
    invalidIMEIs.forEach((item, index) => {
      log(`${index + 1}. ${item.variant_name || 'Unnamed'}`, 'bright');
      log(`   📱 IMEI: ${item.imei}`, 'red');
      log(`   ❌ Sababu: ${item.validation_reason}`, 'yellow');
      log(`   📦 Quantity: ${item.quantity} | Active: ${item.is_active ? '✅' : '❌'}`);
      log(`   🆔 ID: ${item.id}`);
      console.log('');
    });
    
  } catch (err) {
    error(`Kosa la hatua 6: ${err.message}`);
  }
}

async function step7_ShowDuplicateIMEIs() {
  header('HATUA 7: IMEIs Duplicate (Detailed)');
  
  try {
    const duplicateIMEIs = await sql`
      WITH duplicate_imeis AS (
        SELECT 
          variant_attributes->>'imei' as imei,
          COUNT(*) as idadi
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
      )
      SELECT 
        d.imei,
        d.idadi as mara_ngapi,
        array_agg(v.id) as variant_ids,
        array_agg(v.variant_name) as variant_names
      FROM duplicate_imeis d
      INNER JOIN lats_product_variants v ON v.variant_attributes->>'imei' = d.imei
      GROUP BY d.imei, d.idadi
      ORDER BY d.idadi DESC
      LIMIT 10
    `;
    
    if (duplicateIMEIs.length === 0) {
      success('Hakuna IMEIs duplicate zilizopatikana! 🎉');
      return;
    }
    
    warning(`Nimeona IMEIs duplicate: ${duplicateIMEIs.length} (Ninaonyesha 10 za juu)`);
    console.log('\n');
    
    duplicateIMEIs.forEach((item, index) => {
      log(`${index + 1}. IMEI: ${item.imei}`, 'bright');
      log(`   🔁 Inaonekana mara: ${item.mara_ngapi}`, 'yellow');
      log(`   📦 Variant IDs:`, 'cyan');
      item.variant_ids.forEach((id, i) => {
        log(`      ${i + 1}. ${id} - ${item.variant_names[i] || 'Unnamed'}`, 'cyan');
      });
      console.log('');
    });
    
    info('\n💡 PENDEKEZO: Lazima ufute au ubadilishe IMEIs duplicate');
    
  } catch (err) {
    error(`Kosa la hatua 7: ${err.message}`);
  }
}

async function generateFinalReport(summary) {
  header('RIPOTI YA MWISHO (FINAL REPORT)');
  
  const validCount = summary.find(s => s.imei_status === 'valid')?.idadi || 0;
  const invalidCount = summary.find(s => s.imei_status === 'invalid')?.idadi || 0;
  const duplicateCount = summary.find(s => s.imei_status === 'duplicate')?.idadi || 0;
  const emptyCount = summary.find(s => s.imei_status === 'empty')?.idadi || 0;
  const total = validCount + invalidCount + duplicateCount + emptyCount;
  
  console.log('');
  log('╔═══════════════════════════════════════════════════════════════╗', 'cyan');
  log('║               📊 RIPOTI YA IMEI VALIDATION                   ║', 'bright');
  log('╚═══════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  
  log(`✅ Jumla ya IMEIs zilizochunguzwa: ${total}`, 'bright');
  console.log('');
  
  if (validCount > 0) {
    log(`  ✅ Halali (Valid):        ${validCount} (${((validCount/total)*100).toFixed(1)}%)`, 'green');
  }
  
  if (invalidCount > 0) {
    log(`  ❌ Si halali (Invalid):   ${invalidCount} (${((invalidCount/total)*100).toFixed(1)}%)`, 'red');
  }
  
  if (duplicateCount > 0) {
    log(`  🔁 Duplicate:             ${duplicateCount} (${((duplicateCount/total)*100).toFixed(1)}%)`, 'yellow');
  }
  
  if (emptyCount > 0) {
    log(`  ⚪ Tupu (Empty):          ${emptyCount} (${((emptyCount/total)*100).toFixed(1)}%)`, 'magenta');
  }
  
  console.log('');
  log('═'.repeat(70), 'cyan');
  console.log('');
  
  // Health score
  const healthScore = ((validCount / total) * 100).toFixed(1);
  log(`📈 IMEI Database Health Score: ${healthScore}%`, 'bright');
  
  if (healthScore >= 90) {
    success('Bora sana! Database yako ina IMEIs nzuri');
  } else if (healthScore >= 70) {
    warning('Vizuri, lakini kuna IMEIs zinazohitaji kusahihishwa');
  } else {
    error('Kuna tatizo kubwa la IMEIs. Hitaji usafi mkubwa!');
  }
  
  console.log('');
  
  // Recommendations
  if (invalidCount > 0 || duplicateCount > 0) {
    log('💡 MAPENDEKEZO:', 'cyan');
    console.log('');
    
    if (invalidCount > 0) {
      log(`   1. Sahihisha IMEIs ${invalidCount} zilizo invalid`, 'yellow');
      log('      - Hakikisha zina 15 digits', 'reset');
      log('      - Hakikisha zina tarakimu tu (0-9)', 'reset');
    }
    
    if (duplicateCount > 0) {
      log(`   2. Futa au ubadilishe IMEIs ${duplicateCount} zilizo duplicate`, 'yellow');
      log('      - Kila IMEI lazima iwe unique', 'reset');
    }
    
    console.log('');
  }
  
  log('═'.repeat(70), 'cyan');
}

// Main execution
async function main() {
  log('\n');
  log('╔═════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║                                                                     ║', 'bright');
  log('║         🔍 IMEI VALIDATION, CLEANUP & REPORTING TOOL 🔍            ║', 'bright');
  log('║                                                                     ║', 'bright');
  log('╚═════════════════════════════════════════════════════════════════════╝', 'bright');
  
  try {
    // Check database connection
    info('\nNinajaribu kuunganisha na database...');
    await sql`SELECT 1`;
    success('Muunganisho wa database umefanikiwa!\n');
    
    // Execute all steps
    const step1 = await step1_CreateValidationTable();
    if (!step1) {
      throw new Error('Hatua 1 imeshindwa');
    }
    
    const step2 = await step2_ValidateAndInsertIMEIs();
    if (!step2) {
      throw new Error('Hatua 2 imeshindwa');
    }
    
    const step3 = await step3_FlagDuplicates();
    if (!step3) {
      throw new Error('Hatua 3 imeshindwa');
    }
    
    const summary = await step4_GenerateSummaryReport();
    if (!summary) {
      throw new Error('Hatua 4 imeshindwa');
    }
    
    await step5_ShowValidIMEIs();
    await step6_ShowInvalidIMEIs();
    await step7_ShowDuplicateIMEIs();
    
    // Generate final report
    await generateFinalReport(summary);
    
    log('\n');
    success('✅ Kazi imekamilika! IMEI validation imefanyika kikamilifu!');
    log('\n');
    
  } catch (err) {
    console.error('\n');
    error(`❌ KOSA KUBWA: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run the script
main();

