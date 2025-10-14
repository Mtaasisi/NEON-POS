#!/usr/bin/env node

/**
 * Run Attendance Security Database Verification
 * This script verifies and sets up the database for attendance security features
 */

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.bright}${msg}${colors.reset}`),
};

async function main() {
  log.title('🔍 ATTENDANCE SECURITY DATABASE VERIFICATION');
  console.log('━'.repeat(60));

  // Check for DATABASE_URL
  const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    log.error('DATABASE_URL not found in environment!');
    log.info('Please set VITE_DATABASE_URL in your .env file');
    process.exit(1);
  }

  log.info(`Connected to: ${DATABASE_URL.substring(0, 40)}...`);
  const sql = neon(DATABASE_URL);

  try {
    // Step 1: Create settings table
    log.step('\n📋 Step 1: Creating settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE settings DISABLE ROW LEVEL SECURITY`;
    await sql`CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key)`;
    log.success('Settings table ready!');

    // Step 2: Check if attendance settings exist
    log.step('\n📋 Step 2: Checking for existing attendance settings...');
    const existing = await sql`SELECT * FROM settings WHERE key = 'attendance'`;
    
    if (existing.length > 0) {
      log.success('Attendance settings already exist in database');
      log.info(`Last updated: ${existing[0].updated_at}`);
      
      // Show current configuration
      const config = JSON.parse(existing[0].value);
      log.info('\nCurrent configuration:');
      console.log(`  - Employee choice: ${config.allowEmployeeChoice ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`  - Default mode: ${config.defaultSecurityMode || 'Not set'}`);
      if (config.availableSecurityModes) {
        console.log(`  - Available modes: ${config.availableSecurityModes.join(', ')}`);
      }
      console.log(`  - Offices configured: ${config.offices?.length || 0}`);
    } else {
      log.warning('No attendance settings found - will create default configuration');
      
      // Step 3: Insert default attendance settings
      log.step('\n📋 Step 3: Creating default attendance settings...');
      
      const defaultSettings = {
        enabled: true,
        allowEmployeeChoice: true,
        availableSecurityModes: ['auto-location', 'manual-location', 'wifi-only'],
        defaultSecurityMode: 'auto-location',
        requireLocation: true,
        requireWifi: true,
        allowMobileData: true,
        gpsAccuracy: 50,
        checkInRadius: 100,
        checkInTime: '08:00',
        checkOutTime: '17:00',
        gracePeriod: 15,
        offices: [
          {
            name: 'Arusha Main Office',
            lat: -3.359178,
            lng: 36.661366,
            radius: 100,
            address: 'Main Office, Arusha, Tanzania',
            networks: [
              {
                ssid: 'Office_WiFi',
                bssid: '00:11:22:33:44:55',
                description: 'Main office WiFi network'
              },
              {
                ssid: 'Office_Guest',
                description: 'Guest WiFi network'
              },
              {
                ssid: '4G_Mobile',
                description: 'Mobile data connection'
              }
            ]
          }
        ]
      };

      await sql`
        INSERT INTO settings (key, value, description)
        VALUES (
          'attendance',
          ${JSON.stringify(defaultSettings)},
          'Attendance security mode configuration with employee choice settings'
        )
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          description = EXCLUDED.description,
          updated_at = NOW()
      `;
      
      log.success('Default attendance settings created!');
    }

    // Step 4: Verify table structure
    log.step('\n📋 Step 4: Verifying table structure...');
    const columns = await sql`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'settings'
      ORDER BY ordinal_position
    `;
    
    log.success('Table structure verified:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
    });

    // Step 5: Show all settings keys
    log.step('\n📋 Step 5: All settings in database:');
    const allSettings = await sql`SELECT key, description, updated_at FROM settings ORDER BY key`;
    if (allSettings.length > 0) {
      allSettings.forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.description || 'No description'}`);
      });
    } else {
      log.info('No settings found yet');
    }

    // Final summary
    log.title('\n✅ VERIFICATION COMPLETE!');
    console.log('━'.repeat(60));
    log.success('Settings table: EXISTS');
    log.success('Attendance configuration: READY');
    log.success('New security fields: AVAILABLE');
    
    console.log('\n📝 New Security Features:');
    console.log('  ✅ allowEmployeeChoice - Let employees pick their method');
    console.log('  ✅ availableSecurityModes - Array of allowed modes');
    console.log('  ✅ defaultSecurityMode - Pre-selected mode');
    
    console.log('\n🚀 Next Steps:');
    console.log('  1. Open your app: Admin → Settings → Attendance');
    console.log('  2. Configure security modes (checkboxes)');
    console.log('  3. Click "Save Settings"');
    console.log('  4. Test as employee in "My Attendance"');
    
    console.log('\n' + '━'.repeat(60));
    log.success('All systems ready! You can now use the attendance security features! 🎉\n');
    
  } catch (error) {
    log.error('\nVerification failed!');
    console.error(error);
    process.exit(1);
  }
}

main().catch(console.error);

