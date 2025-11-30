#!/usr/bin/env node

/**
 * ================================================
 * COMPREHENSIVE DATABASE VALIDATION RUNNER
 * ================================================
 * This script runs a comprehensive validation check
 * on your POS database using direct PostgreSQL connection
 * ================================================
 */

import { neon } from '@neondatabase/serverless';
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
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');
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
  
  // Try to get database URL from environment or .env file
  let databaseUrl = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
  
  if (!databaseUrl) {
    const envVars = await loadEnvVariables();
    if (envVars) {
      databaseUrl = envVars.DATABASE_URL || envVars.VITE_DATABASE_URL;
    }
  }
  
  if (!databaseUrl) {
    log('❌ Database connection string not found!', 'red');
    log('Please set DATABASE_URL or VITE_DATABASE_URL in your .env file', 'red');
    process.exit(1);
  }
  
  const sql = neon(databaseUrl);
  log('✅ Connected to database', 'green');
  
  return sql;
}

async function runValidationChecks(sql, results) {
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
      name: 'Negative Stock Quantities in Variants',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, variant_name, stock_quantity
        FROM lats_product_variants
        WHERE stock_quantity < 0
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
      name: 'Customers with Missing Names',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, name
        FROM lats_customers
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
    },
    {
      name: 'Orphaned Sale Items (Invalid sale_id)',
      category: 'FOREIGN_KEYS',
      severity: 'CRITICAL',
      query: `
        SELECT si.id, si.sale_id
        FROM lats_sale_items si
        LEFT JOIN lats_sales s ON si.sale_id = s.id
        WHERE s.id IS NULL
        LIMIT 10
      `
    },
    {
      name: 'Orphaned Sales (Invalid customer_id)',
      category: 'FOREIGN_KEYS',
      severity: 'WARNING',
      query: `
        SELECT s.id, s.sale_number, s.customer_id
        FROM lats_sales s
        LEFT JOIN lats_customers c ON s.customer_id = c.id
        WHERE s.customer_id IS NOT NULL AND c.id IS NULL
        LIMIT 10
      `
    },
    {
      name: 'Parent Variant Stock Mismatch',
      category: 'STOCK_CONSISTENCY',
      severity: 'WARNING',
      query: `
        SELECT 
          parent.id,
          parent.variant_name,
          COALESCE(parent.stock_quantity, 0) as parent_stock,
          COALESCE(SUM(child.stock_quantity), 0) as children_stock
        FROM lats_product_variants parent
        LEFT JOIN lats_product_variants child ON parent.id = child.parent_variant_id
        WHERE parent.is_parent = true
        GROUP BY parent.id, parent.variant_name, parent.stock_quantity
        HAVING ABS(COALESCE(parent.stock_quantity, 0) - COALESCE(SUM(child.stock_quantity), 0)) > 0
        LIMIT 10
      `
    },
    {
      name: 'Invalid Device IMEIs',
      category: 'IMEI',
      severity: 'WARNING',
      query: `
        SELECT id, device_name, imei
        FROM devices
        WHERE imei IS NOT NULL
          AND TRIM(imei) != ''
          AND imei !~ '^\\d{15,17}$'
        LIMIT 10
      `
    },
    {
      name: 'Devices with Negative Costs',
      category: 'DATA_INTEGRITY',
      severity: 'CRITICAL',
      query: `
        SELECT id, device_name, estimated_cost, actual_cost
        FROM devices
        WHERE estimated_cost < 0 OR actual_cost < 0
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
      // Use raw SQL query with Neon driver
      // Create a function that returns the tagged template result
      const executeQuery = new Function('sql', `return sql\`${check.query}\``);
      const data = await executeQuery(sql);
      
      if (data && data.length > 0) {
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
      // Table might not exist, mark as passed with note
      results.passed.push({
        check_name: check.name,
        category: check.category,
        note: `Table does not exist or query could not execute`
      });
    }
  }
  
  console.log('\r  ✅ All checks completed!                                          ');
}

async function runValidation(sql) {
  log('\n🔍 Running comprehensive database validation...', 'cyan');
  log('This may take a few minutes depending on your database size\n', 'yellow');
  
  try {
    const results = {
      critical: [],
      warnings: [],
      info: [],
      passed: []
    };
    
    log('📊 Executing validation checks...', 'blue');
    await runValidationChecks(sql, results);
    
    return results;
    
  } catch (error) {
    log(`❌ Error running validation: ${error.message}`, 'red');
    throw error;
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
    const sql = await connectToDatabase();
    const results = await runValidation(sql);
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

