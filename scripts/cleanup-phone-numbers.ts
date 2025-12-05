/**
 * Phone Number Cleanup Script
 * 
 * This script cleans up phone numbers in the database to ensure they're in the correct
 * format for WhatsApp API (international format without +, spaces, or special chars)
 * 
 * Usage: tsx scripts/cleanup-phone-numbers.ts [--dry-run] [--country-code=255]
 */

import { createClient } from '@supabase/supabase-js';
import { cleanPhoneNumber, getValidationSummary, type PhoneValidationResult } from '../src/utils/phoneNumberCleaner';

// Get command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const countryCodeArg = args.find(arg => arg.startsWith('--country-code='));
const defaultCountryCode = countryCodeArg ? countryCodeArg.split('=')[1] : '255';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TableConfig {
  table: string;
  phoneColumn: string;
  displayName: string;
}

const TABLES_TO_CLEAN: TableConfig[] = [
  {
    table: 'whatsapp_incoming_messages',
    phoneColumn: 'from_phone',
    displayName: 'WhatsApp Incoming Messages'
  },
  {
    table: 'whatsapp_logs',
    phoneColumn: 'recipient_phone',
    displayName: 'WhatsApp Logs'
  },
  {
    table: 'customers',
    phoneColumn: 'whatsapp',
    displayName: 'Customers (WhatsApp)'
  },
  {
    table: 'customers',
    phoneColumn: 'phone',
    displayName: 'Customers (Phone)'
  }
];

async function cleanPhoneNumbersInTable(config: TableConfig): Promise<void> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📋 Processing: ${config.displayName}`);
  console.log(`   Table: ${config.table}`);
  console.log(`   Phone Column: ${config.phoneColumn}`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    // Fetch all records with phone numbers
    const { data: records, error } = await supabase
      .from(config.table)
      .select(`id, ${config.phoneColumn}`)
      .not(config.phoneColumn, 'is', null);
    
    if (error) {
      console.error(`❌ Error fetching records: ${error.message}`);
      return;
    }
    
    if (!records || records.length === 0) {
      console.log('ℹ️  No records found with phone numbers');
      return;
    }
    
    console.log(`📊 Found ${records.length} records with phone numbers\n`);
    
    // Clean and validate phone numbers
    const results: Array<{
      id: string;
      original: string;
      validation: PhoneValidationResult;
    }> = [];
    
    for (const record of records) {
      const phone = record[config.phoneColumn];
      if (!phone) continue;
      
      const validation = cleanPhoneNumber(phone, defaultCountryCode);
      results.push({
        id: record.id,
        original: phone,
        validation
      });
    }
    
    // Get summary
    const summary = getValidationSummary(results.map(r => r.validation));
    
    console.log('📈 VALIDATION RESULTS:');
    console.log(`   ✅ Valid: ${summary.valid}/${summary.total} (${Math.round(summary.valid/summary.total*100)}%)`);
    console.log(`   ❌ Invalid: ${summary.invalid}/${summary.total} (${Math.round(summary.invalid/summary.total*100)}%)`);
    
    // Show invalid phone numbers
    if (summary.invalidPhones.length > 0) {
      console.log(`\n❌ INVALID PHONE NUMBERS (${summary.invalidPhones.length}):`);
      summary.invalidPhones.slice(0, 10).forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.phone} - ${item.error}`);
      });
      if (summary.invalidPhones.length > 10) {
        console.log(`   ... and ${summary.invalidPhones.length - 10} more`);
      }
    }
    
    // Find records that need updates (where cleaned != original)
    const recordsToUpdate = results.filter(r => 
      r.validation.isValid && r.validation.cleaned !== r.original
    );
    
    if (recordsToUpdate.length === 0) {
      console.log('\n✅ All valid phone numbers are already in correct format');
      return;
    }
    
    console.log(`\n🔧 UPDATES NEEDED: ${recordsToUpdate.length} records`);
    console.log('\nSample updates:');
    recordsToUpdate.slice(0, 5).forEach((item, idx) => {
      console.log(`   ${idx + 1}. "${item.original}" → "${item.validation.cleaned}"`);
    });
    if (recordsToUpdate.length > 5) {
      console.log(`   ... and ${recordsToUpdate.length - 5} more`);
    }
    
    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made');
      console.log('   Run without --dry-run to apply changes');
      return;
    }
    
    // Apply updates
    console.log('\n🔄 Applying updates...');
    let updated = 0;
    let failed = 0;
    
    for (const item of recordsToUpdate) {
      const { error } = await supabase
        .from(config.table)
        .update({ [config.phoneColumn]: item.validation.cleaned })
        .eq('id', item.id);
      
      if (error) {
        console.error(`   ❌ Failed to update ${item.original}: ${error.message}`);
        failed++;
      } else {
        updated++;
        if (updated % 50 === 0) {
          console.log(`   ✓ Updated ${updated}/${recordsToUpdate.length}...`);
        }
      }
    }
    
    console.log(`\n✅ Update complete!`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Failed: ${failed}`);
    
  } catch (error) {
    console.error(`❌ Unexpected error: ${error}`);
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║            📞 PHONE NUMBER CLEANUP UTILITY                    ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log(`\nConfiguration:`);
  console.log(`   Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`);
  console.log(`   Default Country Code: ${defaultCountryCode}`);
  console.log(`   Tables to process: ${TABLES_TO_CLEAN.length}`);
  
  // Process each table
  for (const table of TABLES_TO_CLEAN) {
    await cleanPhoneNumbersInTable(table);
  }
  
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    🎉 CLEANUP COMPLETE                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  
  if (isDryRun) {
    console.log('💡 TIP: Run without --dry-run to apply changes to the database\n');
  }
}

// Run the script
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
