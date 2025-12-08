#!/usr/bin/env node

/**
 * Check General Settings Fetching Issue
 * Diagnoses why general settings are not loading
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ SUPABASE_ANON_KEY not found in environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkGeneralSettings() {
  console.log('\n🔍 Checking General Settings Fetching Issue...\n');

  try {
    // 1. Check if table exists
    console.log('📋 Step 1: Checking if table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('lats_pos_general_settings')
      .select('id')
      .limit(1);

    if (tableError) {
      if (tableError.code === '42P01') {
        console.error('❌ Table lats_pos_general_settings does not exist!');
        console.log('\n💡 Solution: Run the migration to create the table');
        return;
      } else {
        console.error('❌ Error accessing table:', tableError);
        console.log('   Code:', tableError.code);
        console.log('   Message:', tableError.message);
        console.log('   Details:', tableError.details);
        console.log('   Hint:', tableError.hint);
      }
    } else {
      console.log('✅ Table exists');
    }

    // 2. Check if there are any records
    console.log('\n📊 Step 2: Checking for existing records...');
    const { data: allRecords, error: allError } = await supabase
      .from('lats_pos_general_settings')
      .select('id, user_id, business_name, theme, currency, created_at')
      .limit(10);

    if (allError) {
      console.error('❌ Error fetching records:', allError);
    } else {
      console.log(`✅ Found ${allRecords?.length || 0} records in table`);
      if (allRecords && allRecords.length > 0) {
        console.log('\n   Sample records:');
        allRecords.forEach((record, index) => {
          console.log(`\n   Record ${index + 1}:`);
          console.log(`     ID: ${record.id}`);
          console.log(`     User ID: ${record.user_id || 'NULL'}`);
          console.log(`     Business Name: ${record.business_name || 'NULL'}`);
          console.log(`     Theme: ${record.theme || 'NULL'}`);
          console.log(`     Currency: ${record.currency || 'NULL'}`);
          console.log(`     Created: ${record.created_at || 'NULL'}`);
        });
      } else {
        console.log('⚠️  No records found in table');
      }
    }

    // 3. Try to get current user (simulate what the app does)
    console.log('\n👤 Step 3: Checking authentication...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.warn('⚠️  Not authenticated (this is OK for testing):', authError.message);
    } else if (user) {
      console.log('✅ Authenticated as user:', user.id);
      console.log('   Email:', user.email);
      
      // 4. Try to fetch settings for this user
      console.log('\n🔍 Step 4: Fetching settings for current user...');
      const { data: userSettings, error: userSettingsError } = await supabase
        .from('lats_pos_general_settings')
        .select('*')
        .eq('user_id', user.id)
        .limit(1);

      if (userSettingsError) {
        console.error('❌ Error fetching user settings:', userSettingsError);
        console.log('   Code:', userSettingsError.code);
        console.log('   Message:', userSettingsError.message);
      } else {
        if (userSettings && userSettings.length > 0) {
          console.log('✅ Found settings for user:', userSettings[0]);
        } else {
          console.log('⚠️  No settings found for current user');
          console.log('   This means default settings will be used');
        }
      }
    } else {
      console.log('ℹ️  No authenticated user (testing without auth)');
    }

    // 5. Check table structure
    console.log('\n📐 Step 5: Checking table structure...');
    const { data: sampleRecord, error: sampleError } = await supabase
      .from('lats_pos_general_settings')
      .select('*')
      .limit(1)
      .single();

    if (sampleError && sampleError.code !== 'PGRST116') {
      console.error('❌ Error checking table structure:', sampleError);
    } else if (sampleRecord) {
      console.log('✅ Table structure OK');
      console.log('   Columns found:', Object.keys(sampleRecord).join(', '));
    } else {
      console.log('ℹ️  No records to check structure (table is empty)');
    }

    // 6. Summary and recommendations
    console.log('\n\n📋 Summary:');
    if (tableError && tableError.code === '42P01') {
      console.log('❌ ISSUE: Table does not exist');
      console.log('\n💡 Solution:');
      console.log('   1. Go to Supabase SQL Editor');
      console.log('   2. Run the migration to create lats_pos_general_settings table');
      console.log('   3. Or check FIX_BUSINESS_INFO_SETTINGS.sql file');
    } else if (allRecords && allRecords.length === 0) {
      console.log('⚠️  ISSUE: Table exists but has no records');
      console.log('\n💡 Solution:');
      console.log('   The app will create a default record when you first access settings');
      console.log('   This is normal behavior');
    } else if (user && (!userSettings || userSettings.length === 0)) {
      console.log('⚠️  ISSUE: No settings found for your user');
      console.log('\n💡 Solution:');
      console.log('   The app should create default settings automatically');
      console.log('   Try opening the settings page and saving once');
    } else {
      console.log('✅ Everything looks OK!');
      console.log('   If settings still not loading, check browser console for errors');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ Error checking general settings:', error);
    process.exit(1);
  }
}

checkGeneralSettings();
