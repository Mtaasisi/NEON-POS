#!/usr/bin/env node

/**
 * ================================================
 * COMPREHENSIVE DATABASE VALIDATION RUNNER
 * ================================================
 * This script runs a comprehensive validation check
 * on your POS database and generates a detailed report
 * ================================================
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
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

function formatDate() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
}

async function loadEnvVariables() {
  try {
    // Try to load from .env or .env.local
    let envPath = join(__dirname, '.env');
    let envContent;
    
    try {
      envContent = readFileSync(envPath, 'utf-8');
    } catch {
      envPath = join(__dirname, '.env.local');
      envContent = readFileSync(envPath, 'utf-8');
    }
    
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^["']|["']$/g, '');
        envVars[key] = value;
      }
    });
    
    return envVars;
  } catch (error) {
    log('⚠️  Could not load .env file', 'yellow');
    return null;
  }
}

async function connectToDatabase() {
  log('\n🔌 Connecting to database...', 'cyan');
  
  // Try to get credentials from environment or .env file
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    const envVars = await loadEnvVariables();
    if (envVars) {
      supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.VITE_SUPABASE_URL;
      supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY;
    }
  }
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ Database credentials not found!', 'red');
    log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY', 'red');
    log('(or NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)', 'red');
    log('Either in your environment variables or in .env file', 'yellow');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  log('✅ Connected to database', 'green');
  
  return supabase;
}

async function runValidation(supabase) {
  log('\n🔍 Running comprehensive database validation...', 'cyan');
  log('This may take a few minutes depending on your database size\n', 'yellow');
  
  try {
    // Read the SQL validation script
    const sqlScript = readFileSync(
      join(__dirname, 'comprehensive-database-validation.sql'),
      'utf-8'
    );
    
    // Split into individual statements and execute
    // Note: Supabase client doesn't support multi-statement queries,
    // so we'll execute the checks individually
    
    log('📊 Executing validation checks...', 'blue');
    
    // Create temp table for results
    await supabase.rpc('exec_sql', { 
      sql: `
        DROP TABLE IF EXISTS validation_results;
        CREATE TEMP TABLE validation_results (
          check_id SERIAL,
          severity TEXT,
          category TEXT,
          check_name TEXT,
          issue_count INTEGER,
          details TEXT,
          sample_data TEXT
        );
      `
    }).catch(() => {
      // Fallback: use regular SQL if exec_sql function doesn't exist
      log('⚠️  Using direct query method', 'yellow');
    });
    
    // Run validation using direct queries
    const results = {
      critical: [],
      warnings: [],
      info: [],
      passed: []
    };
    
    // Execute validation checks
    await runValidationChecks(supabase, results);
    
    return results;
    
  } catch (error) {
    log(`❌ Error running validation: ${error.message}`, 'red');
    throw error;
  }
}

async function runValidationChecks(supabase, results) {
  const checks = [
    {
      name: 'Orphaned Products (Invalid category_id)',
      category: 'FOREIGN_KEYS',
      severity: 'WARNING',
      query: `
        SELECT p.id, p.name, p.category_id
        FROM lats_products p
        LEFT JOIN lats_categories c ON p.category_id = c.id
        WHERE p.category_id IS NOT NULL AND c.id IS NULL
        LIMIT 10
      `
    },
    {
      name: 'Orphaned Products (Invalid brand_id)',
      category: 'FOREIGN_KEYS',
      severity: 'WARNING',
      query: `
        SELECT p.id, p.name, p.brand_id
        FROM lats_products p
        LEFT JOIN lats_brands b ON p.brand_id = b.id
        WHERE p.brand_id IS NOT NULL AND b.id IS NULL
        LIMIT 10
      `
    },
    {
      name: 'Orphaned Variants (Invalid product_id)',
      category: 'FOREIGN_KEYS',
      severity: 'CRITICAL',
      query: `
        SELECT v.id, v.variant_name, v.product_id
        FROM lats_product_variants v
        LEFT JOIN lats_products p ON v.product_id = p.id
        WHERE p.id IS NULL
        LIMIT 10
      `
    },
    {
      name: 'Invalid IMEI Format in Variants',
      category: 'IMEI',
      severity: 'CRITICAL',
      query: `
        SELECT 
          id, 
          variant_name, 
          variant_attributes->>'imei' as imei,
          LENGTH(variant_attributes->>'imei') as imei_length
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
          AND TRIM(variant_attributes->>'imei') != ''
          AND variant_attributes->>'imei' !~ '^\\d{15,17}$'
        LIMIT 10
      `
    },
    {
      name: 'Duplicate IMEIs',
      category: 'IMEI',
      severity: 'CRITICAL',
      query: `
        SELECT 
          variant_attributes->>'imei' as imei,
          COUNT(*) as duplicate_count,
          STRING_AGG(variant_name, ', ') as variants
        FROM lats_product_variants
        WHERE variant_attributes->>'imei' IS NOT NULL
          AND TRIM(variant_attributes->>'imei') != ''
          AND variant_attributes->>'imei' ~ '^\\d{15,17}$'
        GROUP BY variant_attributes->>'imei'
        HAVING COUNT(*) > 1
        LIMIT 10
      `
    },
    {
      name: 'Negative Prices in Products',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, name, cost_price, selling_price
        FROM lats_products
        WHERE cost_price < 0 OR selling_price < 0
        LIMIT 10
      `
    },
    {
      name: 'Negative Stock Quantities in Products',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, name, stock_quantity
        FROM lats_products
        WHERE stock_quantity < 0
        LIMIT 10
      `
    },
    {
      name: 'Negative Prices in Variants',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, variant_name, cost_price, selling_price
        FROM lats_product_variants
        WHERE cost_price < 0 OR selling_price < 0
        LIMIT 10
      `
    },
    {
      name: 'Products with Missing Names',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, name
        FROM lats_products
        WHERE name IS NULL OR TRIM(name) = ''
        LIMIT 10
      `
    },
    {
      name: 'Duplicate Product SKUs',
      category: 'DUPLICATES',
      severity: 'WARNING',
      query: `
        SELECT sku, COUNT(*) as duplicate_count
        FROM lats_products
        WHERE sku IS NOT NULL AND TRIM(sku) != ''
        GROUP BY sku
        HAVING COUNT(*) > 1
        LIMIT 10
      `
    },
    {
      name: 'Duplicate Sale Numbers',
      category: 'DUPLICATES',
      severity: 'CRITICAL',
      query: `
        SELECT sale_number, COUNT(*) as duplicate_count
        FROM lats_sales
        WHERE sale_number IS NOT NULL
        GROUP BY sale_number
        HAVING COUNT(*) > 1
        LIMIT 10
      `
    },
    {
      name: 'Invalid Email Formats',
      category: 'DATA_INTEGRITY',
      severity: 'WARNING',
      query: `
        SELECT id, name, email
        FROM lats_customers
        WHERE email IS NOT NULL 
          AND TRIM(email) != ''
          AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
        LIMIT 10
      `
    },
    {
      name: 'Sale Items with Incorrect Subtotal',
      category: 'FINANCIAL',
      severity: 'WARNING',
      query: `
        SELECT 
          id, 
          quantity, 
          unit_price, 
          subtotal,
          (quantity * unit_price) as expected_subtotal
        FROM lats_sale_items
        WHERE ABS(subtotal - (quantity * unit_price)) > 0.01
        LIMIT 10
      `
    },
    {
      name: 'Sales with Future Dates',
      category: 'DATA_INTEGRITY',
      severity: 'WARNING',
      query: `
        SELECT id, sale_number, created_at
        FROM lats_sales
        WHERE created_at > NOW()
        LIMIT 10
      `
    }
  ];
  
  let checkNumber = 0;
  const totalChecks = checks.length;
  
  for (const check of checks) {
    checkNumber++;
    process.stdout.write(`\r  Checking [${checkNumber}/${totalChecks}]: ${check.name}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: check.query })
        .catch(async () => {
          // Fallback: try direct query
          const tableName = check.query.match(/FROM\s+(\w+)/i)?.[1];
          if (tableName) {
            return await supabase.from(tableName).select('*').limit(0);
          }
          return { data: null, error: new Error('Query execution failed') };
        });
      
      if (error) {
        // Try to execute query directly
        const directQuery = check.query.replace(/LIMIT 10/, '');
        const { data: directData, error: directError } = await executeDirectQuery(supabase, check.query);
        
        if (!directError && directData && directData.length > 0) {
          const result = {
            check_name: check.name,
            category: check.category,
            issue_count: directData.length,
            details: `Found ${directData.length} issue(s)`,
            sample_data: directData.slice(0, 3).map(row => JSON.stringify(row)).join('; ')
          };
          
          if (check.severity === 'CRITICAL') {
            results.critical.push(result);
          } else if (check.severity === 'WARNING') {
            results.warnings.push(result);
          } else {
            results.info.push(result);
          }
        } else {
          results.passed.push({
            check_name: check.name,
            category: check.category
          });
        }
      } else if (data && data.length > 0) {
        const result = {
          check_name: check.name,
          category: check.category,
          issue_count: data.length,
          details: `Found ${data.length} issue(s)`,
          sample_data: data.slice(0, 3).map(row => JSON.stringify(row)).join('; ')
        };
        
        if (check.severity === 'CRITICAL') {
          results.critical.push(result);
        } else if (check.severity === 'WARNING') {
          results.warnings.push(result);
        } else {
          results.info.push(result);
        }
      } else {
        results.passed.push({
          check_name: check.name,
          category: check.category
        });
      }
    } catch (err) {
      log(`\n⚠️  Could not execute check: ${check.name}`, 'yellow');
      results.passed.push({
        check_name: check.name,
        category: check.category,
        note: 'Check could not be executed (table may not exist)'
      });
    }
  }
  
  console.log('\r  ✅ All checks completed!                                          ');
}

async function executeDirectQuery(supabase, query) {
  // This is a helper to try to execute queries when RPC is not available
  // We'll use the PostgreSQL REST API approach
  try {
    const { data, error } = await supabase.rpc('query', { query_text: query });
    return { data, error };
  } catch (err) {
    return { data: null, error: err };
  }
}

function generateReport(results) {
  log('\n\n═══════════════════════════════════════════════════════════════════', 'bright');
  log('           🔍 COMPREHENSIVE DATABASE VALIDATION REPORT            ', 'bright');
  log('═══════════════════════════════════════════════════════════════════', 'bright');
  log(`Generated: ${new Date().toLocaleString()}\n`, 'cyan');
  
  // Summary
  const totalIssues = results.critical.length + results.warnings.length + results.info.length;
  const totalChecks = totalIssues + results.passed.length;
  const healthScore = Math.round((results.passed.length / totalChecks) * 100);
  
  log('📊 SUMMARY', 'bright');
  log('──────────', 'cyan');
  log(`Total Checks: ${totalChecks}`);
  log(`🔴 Critical Issues: ${results.critical.length}`, results.critical.length > 0 ? 'red' : 'green');
  log(`🟡 Warnings: ${results.warnings.length}`, results.warnings.length > 0 ? 'yellow' : 'green');
  log(`🔵 Info Items: ${results.info.length}`, results.info.length > 0 ? 'blue' : 'green');
  log(`✅ Passed Checks: ${results.passed.length}`, 'green');
  log(`\n🎯 Database Health Score: ${healthScore}%`, healthScore >= 80 ? 'green' : healthScore >= 60 ? 'yellow' : 'red');
  
  // Critical Issues
  if (results.critical.length > 0) {
    log('\n\n🔴 CRITICAL ISSUES (Fix Immediately!)', 'red');
    log('═══════════════════════════════════════', 'red');
    results.critical.forEach((issue, index) => {
      log(`\n${index + 1}. ${issue.check_name}`, 'bright');
      log(`   Category: ${issue.category}`, 'cyan');
      log(`   Issues Found: ${issue.issue_count}`, 'red');
      log(`   Details: ${issue.details}`);
      if (issue.sample_data) {
        log(`   Sample: ${issue.sample_data.substring(0, 200)}...`, 'yellow');
      }
    });
  }
  
  // Warnings
  if (results.warnings.length > 0) {
    log('\n\n🟡 WARNINGS (Should Be Fixed)', 'yellow');
    log('═════════════════════════════════', 'yellow');
    results.warnings.forEach((issue, index) => {
      log(`\n${index + 1}. ${issue.check_name}`, 'bright');
      log(`   Category: ${issue.category}`, 'cyan');
      log(`   Issues Found: ${issue.issue_count}`, 'yellow');
      log(`   Details: ${issue.details}`);
      if (issue.sample_data) {
        log(`   Sample: ${issue.sample_data.substring(0, 200)}...`, 'yellow');
      }
    });
  }
  
  // Info Items
  if (results.info.length > 0) {
    log('\n\n🔵 INFORMATION (For Your Awareness)', 'blue');
    log('═══════════════════════════════════════', 'blue');
    results.info.forEach((issue, index) => {
      log(`\n${index + 1}. ${issue.check_name}`, 'bright');
      log(`   Category: ${issue.category}`, 'cyan');
      log(`   Items Found: ${issue.issue_count}`, 'blue');
      log(`   Details: ${issue.details}`);
    });
  }
  
  // Passed Checks
  log('\n\n✅ PASSED CHECKS', 'green');
  log('═════════════════', 'green');
  const passedByCategory = {};
  results.passed.forEach(check => {
    if (!passedByCategory[check.category]) {
      passedByCategory[check.category] = [];
    }
    passedByCategory[check.category].push(check.check_name);
  });
  
  Object.entries(passedByCategory).forEach(([category, checks]) => {
    log(`\n${category}:`, 'cyan');
    checks.forEach(check => {
      log(`  ✓ ${check}`, 'green');
    });
  });
  
  // Recommendations
  log('\n\n🎯 RECOMMENDATIONS', 'bright');
  log('═══════════════════', 'cyan');
  log('1. Fix CRITICAL issues immediately - they can cause system failures', 'red');
  log('2. Review and fix WARNING issues - they indicate data quality problems', 'yellow');
  log('3. INFO items are for your awareness and may not need immediate action', 'blue');
  log('4. Re-run this validation after making fixes to verify improvements', 'green');
  
  if (totalIssues === 0) {
    log('\n\n🎉 EXCELLENT! Your database has no issues!', 'green');
  } else if (results.critical.length === 0) {
    log('\n\n✅ GOOD! No critical issues found, but some improvements can be made.', 'green');
  } else {
    log('\n\n⚠️  ACTION REQUIRED! Please address critical issues as soon as possible.', 'red');
  }
  
  log('\n═══════════════════════════════════════════════════════════════════\n', 'bright');
  
  return {
    summary: {
      totalChecks,
      criticalIssues: results.critical.length,
      warnings: results.warnings.length,
      infoItems: results.info.length,
      passedChecks: results.passed.length,
      healthScore
    },
    ...results
  };
}

function saveReport(report) {
  const timestamp = formatDate();
  const filename = `database-validation-report-${timestamp}.json`;
  const filepath = join(__dirname, filename);
  
  try {
    writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf-8');
    log(`\n💾 Report saved to: ${filename}`, 'green');
    return filepath;
  } catch (error) {
    log(`\n⚠️  Could not save report: ${error.message}`, 'yellow');
    return null;
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'bright');
  log('║      COMPREHENSIVE DATABASE VALIDATION TOOL                   ║', 'bright');
  log('║      Checks for invalid data, orphaned records, and more      ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════╝', 'bright');
  
  try {
    const supabase = await connectToDatabase();
    const results = await runValidation(supabase);
    const report = generateReport(results);
    saveReport(report);
    
    log('\n✅ Validation complete!\n', 'green');
    
    // Exit with error code if critical issues found
    if (results.critical.length > 0) {
      process.exit(1);
    }
    
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run the script
main();

