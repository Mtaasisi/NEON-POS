#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(DATABASE_URL);

async function verifyData() {
  try {
    console.log('🔍 Verifying sample data in database...\n');
    
    // Count total records
    const totalCount = await sql`
      SELECT COUNT(*) as count 
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
    `;
    console.log(`📊 Total sample records: ${totalCount[0].count}`);
    
    // Check by status
    const byStatus = await sql`
      SELECT status, COUNT(*) as count, SUM(amount) as total
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
      GROUP BY status
    `;
    console.log('\n📈 By Status:');
    byStatus.forEach(row => {
      console.log(`   ${row.status}: ${row.count} records (TZS ${Number(row.total).toLocaleString()})`);
    });
    
    // Check by provider
    const byProvider = await sql`
      SELECT provider, COUNT(*) as count
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
      GROUP BY provider
    `;
    console.log('\n💳 By Provider:');
    byProvider.forEach(row => {
      console.log(`   ${row.provider}: ${row.count} records`);
    });
    
    // Check metadata - payment methods
    const sampleRecord = await sql`
      SELECT metadata, created_at, amount, status, provider, customer_name
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
      LIMIT 5
    `;
    console.log('\n📝 Sample Records:');
    sampleRecord.forEach(row => {
      const method = row.metadata?.payment_method || 'unknown';
      console.log(`   ${new Date(row.created_at).toISOString().split('T')[0]} | ${row.status} | ${method} | ${row.provider} | TZS ${Number(row.amount).toLocaleString()}`);
    });
    
    // Check date range
    const dateRange = await sql`
      SELECT 
        MIN(created_at) as earliest,
        MAX(created_at) as latest,
        COUNT(DISTINCT DATE(created_at)) as unique_days
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
    `;
    console.log('\n📅 Date Range:');
    console.log(`   Earliest: ${new Date(dateRange[0].earliest).toISOString().split('T')[0]}`);
    console.log(`   Latest: ${new Date(dateRange[0].latest).toISOString().split('T')[0]}`);
    console.log(`   Unique days: ${dateRange[0].unique_days}`);
    
    // Check hourly distribution
    const byHour = await sql`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `;
    console.log('\n🕐 Hourly Distribution:');
    byHour.forEach(row => {
      console.log(`   ${row.hour}:00 - ${row.count} transactions`);
    });
    
    // Check for metadata structure
    const metadataCheck = await sql`
      SELECT 
        COUNT(*) FILTER (WHERE metadata ? 'payment_method') as has_payment_method,
        COUNT(*) FILTER (WHERE metadata ? 'failure_reason') as has_failure_reason,
        COUNT(*) as total
      FROM payment_transactions 
      WHERE reference LIKE 'SAMPLE-%'
    `;
    console.log('\n🔧 Metadata Check:');
    console.log(`   Records with payment_method: ${metadataCheck[0].has_payment_method}/${metadataCheck[0].total}`);
    console.log(`   Records with failure_reason: ${metadataCheck[0].has_failure_reason}/${metadataCheck[0].total}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

verifyData();

