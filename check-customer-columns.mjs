#!/usr/bin/env node

/**
 * Check which columns actually exist in customers table
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL);

async function checkColumns() {
  try {
    console.log('\n📊 Checking customers table columns...\n');
    
    const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
      ORDER BY ordinal_position
    `;
    
    console.log(`Found ${columns.length} columns:\n`);
    
    const columnNames = columns.map(c => c.column_name);
    
    // Columns that the API is trying to select
    const apiColumns = [
      'id', 'name', 'phone', 'email', 'whatsapp', 'gender', 'city', 'country', 'address',
      'color_tag', 'loyalty_level', 'points', 'total_spent', 'last_visit', 'is_active',
      'referral_source', 'birth_month', 'birth_day', 'birthday', 'initial_notes', 'notes',
      'customer_tag', 'location_description', 'national_id', 'joined_date', 'created_at',
      'updated_at', 'branch_id', 'is_shared', 'created_by_branch_id', 'created_by_branch_name',
      'profile_image', 'whatsapp_opt_out', 'referred_by', 'created_by', 'last_purchase_date',
      'total_purchases', 'total_calls', 'total_call_duration_minutes', 'incoming_calls',
      'outgoing_calls', 'missed_calls', 'avg_call_duration_minutes', 'first_call_date',
      'last_call_date', 'call_loyalty_level', 'total_returns'
    ];
    
    console.log('✅ COLUMNS THAT EXIST:');
    const existingColumns = apiColumns.filter(col => columnNames.includes(col));
    existingColumns.forEach(col => console.log(`   - ${col}`));
    
    console.log(`\n❌ COLUMNS THAT DON'T EXIST (${apiColumns.length - existingColumns.length}):`);
    const missingColumns = apiColumns.filter(col => !columnNames.includes(col));
    missingColumns.forEach(col => console.log(`   - ${col}`));
    
    console.log('\n🔍 ACTUAL DATABASE COLUMNS:');
    columns.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkColumns();

