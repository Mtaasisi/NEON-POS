#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

async function testPaymentMethods() {
  const databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });

  try {
    await client.connect();
    console.log(`${colors.green}✅ Connected to database${colors.reset}\n`);

    // 1. Check payment methods as they would be loaded by the app
    console.log(`${colors.blue}📋 Payment Methods (as loaded by app):${colors.reset}\n`);
    
    const result = await client.query(`
      SELECT *
      FROM finance_accounts
      WHERE is_active = true
        AND is_payment_method = true
      ORDER BY name
    `);

    if (result.rows.length === 0) {
      console.log(`${colors.red}❌ No payment methods found!${colors.reset}`);
      console.log('This is why they don\'t show in POS.\n');
    } else {
      console.log(`${colors.green}✅ Found ${result.rows.length} payment methods:${colors.reset}\n`);
      
      result.rows.forEach((method, index) => {
        console.log(`${index + 1}. ${colors.blue}${method.name}${colors.reset}`);
        console.log(`   Type: ${method.type}`);
        console.log(`   Icon: ${method.icon || 'N/A'}`);
        console.log(`   Color: ${method.color || 'N/A'}`);
        console.log(`   Balance: ${method.balance || method.current_balance || 0} ${method.currency}`);
        console.log(`   Active: ${method.is_active ? '✓' : '✗'}`);
        console.log(`   ID: ${method.id}`);
        console.log('');
      });
    }

    // 2. Check for type mismatches
    console.log(`${colors.blue}🔍 Checking for type mismatches:${colors.reset}\n`);
    
    const typeCheck = await client.query(`
      SELECT 
        id,
        name,
        type,
        account_type,
        CASE 
          WHEN type != account_type THEN 'MISMATCH'
          ELSE 'OK'
        END as status
      FROM finance_accounts
      WHERE is_payment_method = true
    `);

    const mismatches = typeCheck.rows.filter(r => r.status === 'MISMATCH');
    if (mismatches.length > 0) {
      console.log(`${colors.yellow}⚠️  Found ${mismatches.length} type mismatches:${colors.reset}`);
      mismatches.forEach(m => {
        console.log(`   - ${m.name}: type='${m.type}' vs account_type='${m.account_type}'`);
      });
      console.log('');
    } else {
      console.log(`${colors.green}✅ All types are consistent${colors.reset}\n`);
    }

    // 3. Check for valid types according to TypeScript interface
    console.log(`${colors.blue}🔍 Validating types against TypeScript interface:${colors.reset}\n`);
    
    const validTypes = ['bank', 'cash', 'mobile_money', 'credit_card', 'savings', 'investment', 'other'];
    const invalidTypes = result.rows.filter(r => !validTypes.includes(r.type));
    
    if (invalidTypes.length > 0) {
      console.log(`${colors.red}❌ Found ${invalidTypes.length} invalid types:${colors.reset}`);
      invalidTypes.forEach(m => {
        console.log(`   - ${m.name}: type='${m.type}' (should be one of: ${validTypes.join(', ')})`);
      });
      console.log('');
    } else {
      console.log(`${colors.green}✅ All types are valid${colors.reset}\n`);
    }

    // 4. Summary
    console.log(`${colors.blue}📊 Summary:${colors.reset}\n`);
    
    const summary = await client.query(`
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN is_payment_method = true THEN 1 END) as payment_methods,
        COUNT(CASE WHEN is_payment_method = true AND is_active = true THEN 1 END) as active_payment_methods,
        COUNT(CASE WHEN is_payment_method = true AND is_active = false THEN 1 END) as inactive_payment_methods
      FROM finance_accounts
    `);

    const s = summary.rows[0];
    console.log(`   Total Accounts: ${s.total_accounts}`);
    console.log(`   Payment Methods: ${s.payment_methods}`);
    console.log(`   Active: ${s.active_payment_methods}`);
    console.log(`   Inactive: ${s.inactive_payment_methods}`);
    console.log('');

    // 5. Test recommendation
    console.log(`${colors.yellow}💡 Recommendation:${colors.reset}\n`);
    if (result.rows.length > 0) {
      console.log(`   ${colors.green}✓ Payment methods are configured correctly${colors.reset}`);
      console.log(`   ${colors.green}✓ They should now appear in the POS payment modal${colors.reset}`);
      console.log(`   ${colors.blue}→ Refresh your browser to see the payment methods${colors.reset}`);
    } else {
      console.log(`   ${colors.red}✗ No payment methods found${colors.reset}`);
      console.log(`   ${colors.yellow}→ Run the setup script to create default payment methods${colors.reset}`);
    }
    console.log('');

    await client.end();
  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
    console.error(error);
    process.exit(1);
  }
}

testPaymentMethods();

