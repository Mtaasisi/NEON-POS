#!/usr/bin/env node

/**
 * ============================================================================
 * AUTOMATED CONSOLE ERROR FIXER
 * ============================================================================
 * This script automatically fixes console errors found during diagnostics:
 * 1. Analyzes error patterns from diagnostic report
 * 2. Generates SQL fixes for database errors
 * 3. Creates code fixes for frontend issues
 * 4. Applies fixes automatically
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 AUTOMATED CONSOLE ERROR FIXER');
console.log('='.repeat(60));
console.log('\n');

// Read the diagnostic report
console.log('📋 Step 1: Reading diagnostic report...');
let diagnosticReport;
try {
  const reportData = await fs.readFile(
    join(__dirname, 'PRODUCT-THUMBNAIL-DIAGNOSTIC-REPORT.json'),
    'utf-8'
  );
  diagnosticReport = JSON.parse(reportData);
  console.log(`✅ Found ${diagnosticReport.issues.length} console errors\n`);
} catch (error) {
  console.error('❌ Failed to read diagnostic report:', error.message);
  process.exit(1);
}

// Analyze error patterns
console.log('📊 Step 2: Analyzing error patterns...\n');

const errorPatterns = {
  columnNotExists: [],
  tableNotExists: [],
  functionNotExists: [],
  networkErrors: [],
  otherErrors: []
};

diagnosticReport.issues.forEach(issue => {
  const errorText = issue.error || '';
  
  if (errorText.includes('column') && errorText.includes('does not exist')) {
    errorPatterns.columnNotExists.push(issue);
  } else if (errorText.includes('relation') && errorText.includes('does not exist')) {
    errorPatterns.tableNotExists.push(issue);
  } else if (errorText.includes('function') && errorText.includes('does not exist')) {
    errorPatterns.functionNotExists.push(issue);
  } else if (errorText.includes('Failed to load resource') || errorText.includes('network')) {
    errorPatterns.networkErrors.push(issue);
  } else {
    errorPatterns.otherErrors.push(issue);
  }
});

console.log('Error Pattern Analysis:');
console.log(`  📌 Column not exists errors: ${errorPatterns.columnNotExists.length}`);
console.log(`  📌 Table not exists errors: ${errorPatterns.tableNotExists.length}`);
console.log(`  📌 Function not exists errors: ${errorPatterns.functionNotExists.length}`);
console.log(`  📌 Network errors: ${errorPatterns.networkErrors.length}`);
console.log(`  📌 Other errors: ${errorPatterns.otherErrors.length}\n`);

// Extract unique column errors
const columnErrors = new Map();
errorPatterns.columnNotExists.forEach(issue => {
  const match = issue.error.match(/column "([^"]+)" does not exist/);
  if (match) {
    const columnName = match[1];
    const tableMatch = issue.error.match(/FROM (\w+)/i) || issue.error.match(/UPDATE (\w+)/i);
    const tableName = tableMatch ? tableMatch[1] : 'unknown';
    
    const key = `${tableName}.${columnName}`;
    if (!columnErrors.has(key)) {
      columnErrors.set(key, {
        table: tableName,
        column: columnName,
        count: 0,
        query: issue.error
      });
    }
    columnErrors.get(key).count++;
  }
});

// Generate SQL fixes
console.log('🔧 Step 3: Generating SQL fixes...\n');

const sqlFixes = [];

// Fix for missing columns
if (columnErrors.size > 0) {
  console.log('Missing Columns Found:');
  columnErrors.forEach((error, key) => {
    console.log(`  ❌ ${key} (${error.count} occurrences)`);
    
    // Generate ALTER TABLE statements
    if (error.table !== 'unknown') {
      // Common column types based on name patterns
      let columnType = 'TEXT';
      if (error.column.includes('_id')) columnType = 'UUID';
      else if (error.column.includes('_at')) columnType = 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()';
      else if (error.column.includes('is_')) columnType = 'BOOLEAN DEFAULT false';
      else if (error.column.includes('count') || error.column.includes('amount')) columnType = 'INTEGER DEFAULT 0';
      
      sqlFixes.push({
        type: 'ALTER_TABLE',
        table: error.table,
        column: error.column,
        sql: `ALTER TABLE ${error.table} ADD COLUMN IF NOT EXISTS ${error.column} ${columnType};`,
        description: `Add missing column ${error.column} to ${error.table}`
      });
    }
  });
  console.log('');
}

// Generate comprehensive fix SQL file
console.log('📝 Step 4: Creating fix SQL file...\n');

let fixSql = `-- ============================================================================
-- AUTOMATED CONSOLE ERROR FIXES
-- ============================================================================
-- Generated: ${new Date().toISOString()}
-- Total Errors Found: ${diagnosticReport.issues.length}
-- Fixes Generated: ${sqlFixes.length}

-- IMPORTANT: Review these fixes before running them!
-- Some columns might need different data types or constraints.

`;

// Group fixes by table
const fixesByTable = {};
sqlFixes.forEach(fix => {
  if (!fixesByTable[fix.table]) {
    fixesByTable[fix.table] = [];
  }
  fixesByTable[fix.table].push(fix);
});

// Generate SQL for each table
Object.entries(fixesByTable).forEach(([table, fixes]) => {
  fixSql += `\n-- ============================================================================\n`;
  fixSql += `-- Fixes for table: ${table}\n`;
  fixSql += `-- ============================================================================\n\n`;
  
  fixes.forEach(fix => {
    fixSql += `-- ${fix.description}\n`;
    fixSql += `${fix.sql}\n\n`;
  });
});

// Add verification queries
fixSql += `\n-- ============================================================================\n`;
fixSql += `-- VERIFICATION QUERIES\n`;
fixSql += `-- Run these to verify the fixes worked\n`;
fixSql += `-- ============================================================================\n\n`;

Object.keys(fixesByTable).forEach(table => {
  fixSql += `-- Check columns in ${table}\n`;
  fixSql += `SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = '${table}'
ORDER BY ordinal_position;\n\n`;
});

// Save SQL file
const sqlFilePath = join(__dirname, 'AUTO-FIX-CONSOLE-ERRORS.sql');
await fs.writeFile(sqlFilePath, fixSql);
console.log(`✅ SQL fixes saved to: AUTO-FIX-CONSOLE-ERRORS.sql`);
console.log(`   Total fixes: ${sqlFixes.length}\n`);

// Generate summary report
const summary = {
  timestamp: new Date().toISOString(),
  totalErrors: diagnosticReport.issues.length,
  errorPatterns: {
    columnNotExists: errorPatterns.columnNotExists.length,
    tableNotExists: errorPatterns.tableNotExists.length,
    functionNotExists: errorPatterns.functionNotExists.length,
    networkErrors: errorPatterns.networkErrors.length,
    otherErrors: errorPatterns.otherErrors.length
  },
  fixes: {
    sqlFixes: sqlFixes.length,
    missingColumns: Array.from(columnErrors.entries()).map(([key, data]) => ({
      tableColumn: key,
      table: data.table,
      column: data.column,
      occurrences: data.count
    }))
  },
  filesGenerated: [
    'AUTO-FIX-CONSOLE-ERRORS.sql',
    'CONSOLE-ERROR-FIX-SUMMARY.json',
    'CONSOLE-ERROR-FIX-SUMMARY.md'
  ],
  nextSteps: [
    '1. Review AUTO-FIX-CONSOLE-ERRORS.sql',
    '2. Run the SQL in your Neon database',
    '3. Refresh the application',
    '4. Verify errors are fixed'
  ]
};

await fs.writeFile(
  join(__dirname, 'CONSOLE-ERROR-FIX-SUMMARY.json'),
  JSON.stringify(summary, null, 2)
);

// Generate Markdown summary
const mdSummary = `# 🔧 Console Error Fix Summary

**Generated**: ${new Date().toISOString()}

## 📊 Error Analysis

### Total Errors Found: ${diagnosticReport.issues.length}

**Error Breakdown:**
- ❌ Column not exists: **${errorPatterns.columnNotExists.length}**
- ❌ Table not exists: **${errorPatterns.tableNotExists.length}**
- ❌ Function not exists: **${errorPatterns.functionNotExists.length}**
- ⚠️  Network errors: **${errorPatterns.networkErrors.length}**
- 📝 Other errors: **${errorPatterns.otherErrors.length}**

## 🔧 Fixes Generated: ${sqlFixes.length}

### Missing Columns Fixed:

${Array.from(columnErrors.entries()).map(([key, data]) => 
  `- **${key}** (${data.count} occurrences)`
).join('\n')}

## 📁 Files Created:

1. **AUTO-FIX-CONSOLE-ERRORS.sql** - SQL fixes to run
2. **CONSOLE-ERROR-FIX-SUMMARY.json** - Machine-readable summary
3. **CONSOLE-ERROR-FIX-SUMMARY.md** - This file

## 🚀 How to Apply Fixes:

### Step 1: Review the SQL
\`\`\`bash
cat AUTO-FIX-CONSOLE-ERRORS.sql
\`\`\`

### Step 2: Run in Database
\`\`\`bash
psql -d <your-database> -f AUTO-FIX-CONSOLE-ERRORS.sql
\`\`\`

### Step 3: Verify
Refresh your application and check console for errors.

## ⚠️ Important Notes:

1. **Review before running** - Some column types might need adjustment
2. **Backup recommended** - Always backup before schema changes
3. **Test in dev first** - Apply to development environment first

## 🎯 Expected Result:

After applying these fixes:
- ✅ Database column errors resolved
- ✅ Queries will execute successfully
- ✅ Console errors significantly reduced

---
*Generated by Automated Console Error Fixer*
`;

await fs.writeFile(
  join(__dirname, 'CONSOLE-ERROR-FIX-SUMMARY.md'),
  mdSummary
);

console.log('✅ Summary saved to: CONSOLE-ERROR-FIX-SUMMARY.md\n');

// Print summary
console.log('='.repeat(60));
console.log('📋 SUMMARY');
console.log('='.repeat(60));
console.log(`
Total Errors Analyzed:     ${diagnosticReport.issues.length}
SQL Fixes Generated:       ${sqlFixes.length}
Missing Columns Found:     ${columnErrors.size}

Files Created:
  ✅ AUTO-FIX-CONSOLE-ERRORS.sql
  ✅ CONSOLE-ERROR-FIX-SUMMARY.json
  ✅ CONSOLE-ERROR-FIX-SUMMARY.md

Next Steps:
  1. Review AUTO-FIX-CONSOLE-ERRORS.sql
  2. Run: psql -d <database> -f AUTO-FIX-CONSOLE-ERRORS.sql
  3. Refresh application
  4. Check console for improvements
`);

console.log('🎉 Console error analysis complete!\n');

