#!/usr/bin/env node

/**
 * Automatic Customer Creation Fix Verification
 * Checks database state and generates a detailed report
 */

import postgres from 'postgres';
import { writeFileSync } from 'fs';

console.log('🔍 Starting automatic verification...\n');

const databaseUrl = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
  ssl: 'require',
});

const results = {
  timestamp: new Date().toISOString(),
  checks: [],
  passed: 0,
  failed: 0,
  warnings: 0
};

function addCheck(name, status, message, details = null) {
  const check = { name, status, message, details };
  results.checks.push(check);
  
  if (status === 'PASS') results.passed++;
  else if (status === 'FAIL') results.failed++;
  else if (status === 'WARN') results.warnings++;
  
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${name}: ${message}`);
  if (details) console.log(`   ${details}`);
}

async function verify() {
  try {
    console.log('📡 Connecting to database...\n');
    await sql`SELECT 1`;
    addCheck('Database Connection', 'PASS', 'Connected successfully');

    console.log('\n📋 Checking customers table...\n');
    
    // Check if customers table exists
    const customersExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customers'
      ) as exists
    `;
    
    if (customersExists[0].exists) {
      addCheck('Customers Table', 'PASS', 'Table exists');
      
      // Check all required columns
      const columns = await sql`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'customers'
        ORDER BY ordinal_position
      `;
      
      addCheck('Customers Columns', 'PASS', `Found ${columns.length} columns`);
      
      // Check specific required columns
      const requiredColumns = [
        'id', 'name', 'phone', 'email', 'loyalty_level', 
        'color_tag', 'points', 'total_spent', 'is_active',
        'whatsapp', 'created_by', 'referrals', 'referred_by',
        'joined_date', 'created_at', 'updated_at'
      ];
      
      const columnNames = columns.map(c => c.column_name);
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      
      if (missingColumns.length === 0) {
        addCheck('Required Columns', 'PASS', 'All required columns present');
      } else {
        addCheck('Required Columns', 'FAIL', `Missing: ${missingColumns.join(', ')}`);
      }
      
      // Check referrals column type
      const referralsCol = columns.find(c => c.column_name === 'referrals');
      if (referralsCol) {
        if (referralsCol.data_type === 'jsonb') {
          addCheck('Referrals Column Type', 'PASS', 'Correct type (JSONB)');
        } else {
          addCheck('Referrals Column Type', 'FAIL', `Wrong type: ${referralsCol.data_type}`);
        }
      }
      
      // Check default values
      const checkDefaults = {
        'loyalty_level': 'bronze',
        'color_tag': 'new',
        'points': '0',
        'total_spent': '0',
        'is_active': 'true'
      };
      
      let defaultsCorrect = 0;
      for (const [colName, expectedDefault] of Object.entries(checkDefaults)) {
        const col = columns.find(c => c.column_name === colName);
        if (col && col.column_default && col.column_default.includes(expectedDefault)) {
          defaultsCorrect++;
        }
      }
      
      if (defaultsCorrect === Object.keys(checkDefaults).length) {
        addCheck('Default Values', 'PASS', 'All defaults set correctly');
      } else {
        addCheck('Default Values', 'WARN', `${defaultsCorrect}/${Object.keys(checkDefaults).length} defaults correct`);
      }
      
    } else {
      addCheck('Customers Table', 'FAIL', 'Table does not exist');
    }

    console.log('\n📝 Checking customer_notes table...\n');
    
    // Check customer_notes table
    const notesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customer_notes'
      ) as exists
    `;
    
    if (notesExists[0].exists) {
      addCheck('Customer_notes Table', 'PASS', 'Table exists');
      
      const notesColumns = await sql`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'customer_notes'
        ORDER BY ordinal_position
      `;
      
      // Check if id column exists
      const hasId = notesColumns.some(c => c.column_name === 'id');
      if (hasId) {
        addCheck('Customer_notes ID Column', 'PASS', 'ID column exists');
      } else {
        addCheck('Customer_notes ID Column', 'FAIL', 'ID column missing');
      }
      
      // Check primary key
      const hasPK = await sql`
        SELECT EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'customer_notes_pkey' OR 
                (conrelid = 'customer_notes'::regclass AND contype = 'p')
        ) as exists
      `;
      
      if (hasPK[0].exists) {
        addCheck('Customer_notes Primary Key', 'PASS', 'Primary key exists');
      } else {
        addCheck('Customer_notes Primary Key', 'FAIL', 'Primary key missing');
      }
      
    } else {
      addCheck('Customer_notes Table', 'FAIL', 'Table does not exist');
    }

    console.log('\n🔓 Checking RLS status...\n');
    
    // Check RLS status
    const rlsStatus = await sql`
      SELECT 
        c.relname as table_name,
        c.relrowsecurity as rls_enabled
      FROM pg_class c
      WHERE c.relname IN ('customers', 'customer_notes')
    `;
    
    for (const table of rlsStatus) {
      if (table.rls_enabled) {
        addCheck(`RLS on ${table.table_name}`, 'WARN', 'RLS is enabled (may block inserts)');
      } else {
        addCheck(`RLS on ${table.table_name}`, 'PASS', 'RLS is disabled');
      }
    }

    console.log('\n🧪 Running live insert test...\n');
    
    // Test actual customer insert
    try {
      const testId = crypto.randomUUID();
      const testPhone = `TEST_${Math.floor(Math.random() * 1000000)}`;
      
      await sql`
        INSERT INTO customers (
          id, name, phone, email, loyalty_level, color_tag, 
          points, total_spent, is_active
        ) VALUES (
          ${testId}, 
          'Test Customer - Auto Verify', 
          ${testPhone}, 
          '', 
          'bronze', 
          'new', 
          10, 
          0, 
          true
        )
      `;
      
      addCheck('Customer Insert Test', 'PASS', 'Successfully inserted test customer');
      
      // Test note insert
      const noteId = crypto.randomUUID();
      await sql`
        INSERT INTO customer_notes (
          id, customer_id, note, created_at
        ) VALUES (
          ${noteId}, ${testId}, 'Test note', NOW()
        )
      `;
      
      addCheck('Customer Note Insert Test', 'PASS', 'Successfully inserted test note');
      
      // Clean up
      await sql`DELETE FROM customer_notes WHERE id = ${noteId}`;
      await sql`DELETE FROM customers WHERE id = ${testId}`;
      
      addCheck('Test Cleanup', 'PASS', 'Test data cleaned up');
      
    } catch (error) {
      addCheck('Customer Insert Test', 'FAIL', `Insert failed: ${error.message}`);
    }

    console.log('\n📊 Checking existing customers...\n');
    
    // Count existing customers
    const customerCount = await sql`SELECT COUNT(*) as count FROM customers`;
    addCheck('Existing Customers', 'PASS', `Found ${customerCount[0].count} customers in database`);

    // Generate report
    console.log('\n' + '═'.repeat(70));
    console.log('📊 VERIFICATION REPORT');
    console.log('═'.repeat(70));
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`Total Checks: ${results.checks.length}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log('═'.repeat(70));

    if (results.failed === 0) {
      console.log('\n🎉 ALL CHECKS PASSED! Customer creation is working perfectly!');
      console.log('\n✨ You can now create customers without any issues.\n');
    } else {
      console.log('\n⚠️  Some checks failed. Review the details above.');
      console.log('💡 Run the fix script again: node fix-with-correct-url.mjs\n');
    }

    // Generate HTML report
    const htmlReport = generateHTMLReport(results);
    writeFileSync('verification-report.html', htmlReport);
    console.log('📄 Detailed HTML report saved: verification-report.html');
    
    // Generate JSON report
    writeFileSync('verification-report.json', JSON.stringify(results, null, 2));
    console.log('📄 JSON report saved: verification-report.json\n');

    await sql.end();
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    await sql.end();
    process.exit(1);
  }
}

function generateHTMLReport(results) {
  const passRate = ((results.passed / results.checks.length) * 100).toFixed(1);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Creation Fix - Verification Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .stat-card .number {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }
        .stat-card .label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .stat-card.passed .number { color: #28a745; }
        .stat-card.failed .number { color: #dc3545; }
        .stat-card.warnings .number { color: #ffc107; }
        .stat-card.total .number { color: #667eea; }
        .checks {
            padding: 30px;
        }
        .check-item {
            padding: 20px;
            margin-bottom: 15px;
            border-radius: 10px;
            border-left: 5px solid;
            background: #f8f9fa;
            transition: transform 0.2s;
        }
        .check-item:hover { transform: translateX(5px); }
        .check-item.pass { border-color: #28a745; background: #d4edda; }
        .check-item.fail { border-color: #dc3545; background: #f8d7da; }
        .check-item.warn { border-color: #ffc107; background: #fff3cd; }
        .check-header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
        }
        .check-icon {
            font-size: 1.5em;
            margin-right: 15px;
        }
        .check-name {
            font-weight: bold;
            font-size: 1.1em;
            flex: 1;
        }
        .check-status {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .check-status.pass { background: #28a745; color: white; }
        .check-status.fail { background: #dc3545; color: white; }
        .check-status.warn { background: #ffc107; color: black; }
        .check-message {
            color: #495057;
            margin-left: 40px;
        }
        .footer {
            padding: 30px;
            text-align: center;
            background: #f8f9fa;
            color: #6c757d;
        }
        .success-banner {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 30px;
            text-align: center;
            font-size: 1.3em;
            font-weight: bold;
        }
        .progress-bar {
            width: 100%;
            height: 30px;
            background: #e9ecef;
            border-radius: 15px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            transition: width 1s ease;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Verification Report</h1>
            <p>Customer Creation Fix - Automatic Check</p>
            <p style="font-size: 0.9em; margin-top: 10px;">${new Date(results.timestamp).toLocaleString()}</p>
        </div>
        
        ${results.failed === 0 ? `
        <div class="success-banner">
            ✨ All Checks Passed! Customer Creation is Working Perfectly! ✨
        </div>
        ` : ''}
        
        <div class="stats">
            <div class="stat-card total">
                <div class="label">Total Checks</div>
                <div class="number">${results.checks.length}</div>
            </div>
            <div class="stat-card passed">
                <div class="label">Passed</div>
                <div class="number">${results.passed}</div>
            </div>
            <div class="stat-card failed">
                <div class="label">Failed</div>
                <div class="number">${results.failed}</div>
            </div>
            <div class="stat-card warnings">
                <div class="label">Warnings</div>
                <div class="number">${results.warnings}</div>
            </div>
        </div>
        
        <div style="padding: 0 30px;">
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${passRate}%">
                    ${passRate}% Pass Rate
                </div>
            </div>
        </div>
        
        <div class="checks">
            <h2 style="margin-bottom: 20px; color: #495057;">📋 Detailed Checks</h2>
            ${results.checks.map(check => `
                <div class="check-item ${check.status.toLowerCase()}">
                    <div class="check-header">
                        <div class="check-icon">
                            ${check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️'}
                        </div>
                        <div class="check-name">${check.name}</div>
                        <div class="check-status ${check.status.toLowerCase()}">${check.status}</div>
                    </div>
                    <div class="check-message">${check.message}</div>
                    ${check.details ? `<div class="check-message" style="margin-top: 5px; font-size: 0.9em; opacity: 0.8;">${check.details}</div>` : ''}
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>Generated automatically by verification script</p>
            <p style="margin-top: 10px;">Database: ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech</p>
        </div>
    </div>
</body>
</html>`;
}

// Run verification
verify();



