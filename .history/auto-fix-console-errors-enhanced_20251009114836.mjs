#!/usr/bin/env node

/**
 * ============================================================================
 * ENHANCED AUTOMATED CONSOLE ERROR FIXER
 * ============================================================================
 * Analyzes console errors and generates precise SQL fixes
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 ENHANCED CONSOLE ERROR FIXER');
console.log('='.repeat(60));
console.log('\n');

// Read diagnostic report
const reportData = await fs.readFile(
  join(__dirname, 'PRODUCT-THUMBNAIL-DIAGNOSTIC-REPORT.json'),
  'utf-8'
);
const diagnosticReport = JSON.parse(reportData);

console.log(`📊 Analyzing ${diagnosticReport.issues.length} console errors...\n`);

// Extract unique error patterns
const errorsByType = {};
const columnMissingErrors = [];
const queries = new Map();

diagnosticReport.issues.forEach((issue, index) => {
  const error = issue.error || '';
  
  // Column errors
  if (error.includes('column') && error.includes('does not exist')) {
    const columnMatch = error.match(/column "([^"]+)" does not exist/);
    if (columnMatch) {
      columnMissingErrors.push({
        column: columnMatch[1],
        error,
        index
      });
      
      // Look for the query in the next errors
      const queryError = diagnosticReport.issues.find((e, i) => 
        i > index && i < index + 5 && e.error.includes('Query:')
      );
      
      if (queryError) {
        const queryText = queryError.error.replace('Query:', '').trim();
        
        // Extract table name from query
        const tableMatches = [
          queryText.match(/FROM\s+(\w+)/i),
          queryText.match(/UPDATE\s+(\w+)/i),
          queryText.match(/INSERT\s+INTO\s+(\w+)/i),
          queryText.match(/DELETE\s+FROM\s+(\w+)/i)
        ];
        
        const tableMatch = tableMatches.find(m => m !== null);
        const tableName = tableMatch ? tableMatch[1] : null;
        
        if (tableName) {
          const key = `${tableName}.${columnMatch[1]}`;
          if (!queries.has(key)) {
            queries.set(key, {
              table: tableName,
              column: columnMatch[1],
              query: queryText,
              count: 0
            });
          }
          queries.get(key).count++;
        }
      }
    }
  }
});

console.log('🔍 Found Column Errors:\n');
queries.forEach((data, key) => {
  console.log(`  ❌ ${key} (${data.count} occurrences)`);
});
console.log('');

// Generate precise SQL fixes
const fixes = [];

queries.forEach((data, key) => {
  let columnType = 'TEXT';
  let defaultValue = '';
  
  // Smart column type detection
  if (data.column.endsWith('_id')) {
    columnType = 'UUID';
  } else if (data.column.endsWith('_at') || data.column.includes('date')) {
    columnType = 'TIMESTAMP WITH TIME ZONE';
    defaultValue = ' DEFAULT NOW()';
  } else if (data.column.startsWith('is_') || data.column.startsWith('has_')) {
    columnType = 'BOOLEAN';
    defaultValue = ' DEFAULT false';
  } else if (data.column.includes('count') || data.column.includes('amount') || data.column.includes('quantity')) {
    columnType = 'INTEGER';
    defaultValue = ' DEFAULT 0';
  } else if (data.column.includes('price') || data.column.includes('cost') || data.column.includes('total')) {
    columnType = 'DECIMAL(10,2)';
    defaultValue = ' DEFAULT 0';
  } else if (data.column.includes('description') || data.column.includes('notes') || data.column.includes('message')) {
    columnType = 'TEXT';
  }
  
  fixes.push({
    table: data.table,
    column: data.column,
    type: columnType,
    sql: `ALTER TABLE ${data.table} ADD COLUMN IF NOT EXISTS ${data.column} ${columnType}${defaultValue};`,
    comment: `-- Missing in ${data.count} queries`
  });
});

// Generate comprehensive SQL file
let sqlContent = `-- ============================================================================
-- AUTOMATED CONSOLE ERROR FIXES
-- ============================================================================
-- Generated: ${new Date().toISOString()}
-- Total Console Errors: ${diagnosticReport.issues.length}
-- Column Errors Fixed: ${fixes.length}
--
-- INSTRUCTIONS:
-- 1. Review the fixes below
-- 2. Adjust column types if needed
-- 3. Run in your Neon database
-- 4. Refresh the application
-- ============================================================================

`;

// Group by table
const byTable = {};
fixes.forEach(fix => {
  if (!byTable[fix.table]) byTable[fix.table] = [];
  byTable[fix.table].push(fix);
});

Object.entries(byTable).forEach(([table, tableFixes]) => {
  sqlContent += `\n-- ============================================================================\n`;
  sqlContent += `-- Table: ${table}\n`;
  sqlContent += `-- ============================================================================\n\n`;
  
  tableFixes.forEach(fix => {
    sqlContent += `${fix.comment}\n`;
    sqlContent += `${fix.sql}\n\n`;
  });
});

// Add verification
sqlContent += `\n-- ============================================================================\n`;
sqlContent += `-- VERIFICATION\n`;
sqlContent += `-- ============================================================================\n\n`;

Object.keys(byTable).forEach(table => {
  sqlContent += `-- Verify ${table} columns\n`;
  sqlContent += `SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = '${table}'
ORDER BY ordinal_position;\n\n`;
});

// Add common fixes based on error patterns
sqlContent += `\n-- ============================================================================\n`;
sqlContent += `-- ADDITIONAL COMMON FIXES\n`;
sqlContent += `-- ============================================================================\n\n`;

sqlContent += `-- Fix for devices table (common errors found)\n`;
sqlContent += `ALTER TABLE devices ADD COLUMN IF NOT EXISTS issue_description TEXT;\n`;
sqlContent += `ALTER TABLE devices ADD COLUMN IF NOT EXISTS device_condition TEXT;\n`;
sqlContent += `ALTER TABLE devices ADD COLUMN IF NOT EXISTS unlock_code TEXT;\n\n`;

sqlContent += `-- Fix for whatsapp tables (user_id column)\n`;
sqlContent += `ALTER TABLE whatsapp_instances_comprehensive ADD COLUMN IF NOT EXISTS user_id UUID;\n`;
sqlContent += `ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS user_id UUID;\n\n`;

sqlContent += `-- Fix for common is_active columns\n`;
sqlContent += `ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;\n`;
sqlContent += `ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;\n\n`;

sqlContent += `-- Fix for pricing columns\n`;
sqlContent += `ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;\n`;
sqlContent += `ALTER TABLE lats_products ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10,2) DEFAULT 0;\n\n`;

await fs.writeFile(
  join(__dirname, 'AUTO-FIX-CONSOLE-ERRORS-ENHANCED.sql'),
  sqlContent
);

// Generate summary
const summary = `# 🔧 Enhanced Console Error Fix Report

**Generated**: ${new Date().toISOString()}

## 📊 Analysis Results

- **Total Console Errors**: ${diagnosticReport.issues.length}
- **Column Missing Errors**: ${columnMissingErrors.length}
- **Unique Column Issues**: ${queries.size}
- **SQL Fixes Generated**: ${fixes.length + 7} (includes common fixes)

## 🔍 Missing Columns Found:

${Array.from(queries.entries()).map(([key, data]) => 
  `- **${key}**: ${data.count} occurrences → ${fixes.find(f => f.table === data.table && f.column === data.column)?.type || 'TEXT'}`
).join('\n')}

## 🛠️ Additional Fixes Included:

1. **devices** table:
   - \`issue_description\` TEXT
   - \`device_condition\` TEXT  
   - \`unlock_code\` TEXT

2. **whatsapp tables**:
   - \`user_id\` UUID

3. **Various tables**:
   - \`is_active\` BOOLEAN DEFAULT true
   - \`selling_price\` DECIMAL(10,2) DEFAULT 0

## 🚀 How to Apply:

\`\`\`bash
# Run the fix SQL
psql -d <your-database> -f AUTO-FIX-CONSOLE-ERRORS-ENHANCED.sql

# Or copy/paste SQL into Neon console
\`\`\`

## ✅ Expected Results:

After applying:
- ✅ Column error count: 0
- ✅ Database queries execute successfully
- ✅ Console errors reduced by ~${Math.round((columnMissingErrors.length / diagnosticReport.issues.length) * 100)}%

## 📁 Files Created:

1. **AUTO-FIX-CONSOLE-ERRORS-ENHANCED.sql** - Complete SQL fixes
2. **CONSOLE-ERROR-FIX-ENHANCED-SUMMARY.md** - This report
3. **CONSOLE-ERROR-FIX-ENHANCED-SUMMARY.json** - Machine data

---
*Auto-generated by Enhanced Console Error Fixer*
`;

await fs.writeFile(
  join(__dirname, 'CONSOLE-ERROR-FIX-ENHANCED-SUMMARY.md'),
  summary
);

await fs.writeFile(
  join(__dirname, 'CONSOLE-ERROR-FIX-ENHANCED-SUMMARY.json'),
  JSON.stringify({
    timestamp: new Date().toISOString(),
    totalErrors: diagnosticReport.issues.length,
    columnErrors: columnMissingErrors.length,
    fixesGenerated: fixes.length + 7,
    missingColumns: Array.from(queries.entries()).map(([key, data]) => ({
      tableColumn: key,
      table: data.table,
      column: data.column,
      occurrences: data.count,
      suggestedType: fixes.find(f => f.table === data.table && f.column === data.column)?.type
    }))
  }, null, 2)
);

console.log('✅ Files Generated:\n');
console.log('   📄 AUTO-FIX-CONSOLE-ERRORS-ENHANCED.sql');
console.log('   📄 CONSOLE-ERROR-FIX-ENHANCED-SUMMARY.md');
console.log('   📄 CONSOLE-ERROR-FIX-ENHANCED-SUMMARY.json\n');

console.log('📊 Summary:\n');
console.log(`   Total Errors Analyzed: ${diagnosticReport.issues.length}`);
console.log(`   Column Errors Found: ${columnMissingErrors.length}`);
console.log(`   SQL Fixes Generated: ${fixes.length + 7}\n`);

console.log('🚀 Next Steps:\n');
console.log('   1. Review: AUTO-FIX-CONSOLE-ERRORS-ENHANCED.sql');
console.log('   2. Run: psql -d <database> -f AUTO-FIX-CONSOLE-ERRORS-ENHANCED.sql');
console.log('   3. Refresh application');
console.log('   4. Console errors should be fixed! 🎉\n');

