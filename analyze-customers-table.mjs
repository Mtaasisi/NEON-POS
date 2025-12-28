// Script to analyze customers table and identify useless columns
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function analyzeCustomersTable() {
  console.log('🔍 Analyzing customers table structure and data...\n');

  try {
    // Get table structure
    console.log('📋 TABLE STRUCTURE:');
    console.log('==================');

    const columns = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        numeric_precision,
        numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log(`Found ${columns.length} columns in customers table:\n`);

    for (const col of columns) {
      console.log(`${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''}${col.is_nullable === 'YES' ? ' (nullable)' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
    }

    console.log('\n📊 DATA ANALYSIS:');
    console.log('================');

    const totalRows = await sql`SELECT COUNT(*) as count FROM customers`;
    const totalCount = totalRows[0].count;
    console.log(`Total customers: ${totalCount.toLocaleString()}\n`);

    if (totalCount === 0) {
      console.log('❌ No data in customers table - cannot analyze usage patterns');
      return;
    }

    // Analyze each column for null values and data patterns
    console.log('ANALYZING COLUMN USAGE PATTERNS...\n');

    const analysis = [];

    for (const col of columns) {
      const colName = col.column_name;

      try {
        // Count null values - use unsafe() for dynamic column names
        const nullCountQuery = `SELECT COUNT(*) as count FROM customers WHERE "${colName}" IS NULL`;
        const nullCount = await sql.unsafe(nullCountQuery);
        const nullPercentage = ((nullCount[0].count / totalCount) * 100).toFixed(2);

        // Get distinct values count (for smaller datasets)
        let distinctCount = 0;
        let sampleValues = [];

        try {
          if (totalCount <= 10000) { // Only for reasonable dataset sizes
            const distinctQuery = `SELECT COUNT(DISTINCT "${colName}") as count FROM customers WHERE "${colName}" IS NOT NULL`;
            const distinctResult = await sql.unsafe(distinctQuery);
            distinctCount = distinctResult[0].count;

            // Get sample values
            const sampleQuery = `SELECT DISTINCT "${colName}" FROM customers WHERE "${colName}" IS NOT NULL LIMIT 5`;
            const samples = await sql.unsafe(sampleQuery);
            sampleValues = samples.map(s => s[colName]).filter(v => v !== null && v !== undefined);
          }
        } catch (error) {
          // Skip distinct count for problematic columns
          distinctCount = -1;
        }

        analysis.push({
          column: colName,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          nullCount: nullCount[0].count,
          nullPercentage: parseFloat(nullPercentage),
          distinctCount,
          sampleValues,
          potentiallyUseless: false,
          reason: []
        });

      } catch (error) {
        console.log(`❌ Error analyzing column ${colName}: ${error.message}`);
      }
    }

    // Analyze for potentially useless columns
    console.log('POTENTIALLY USELESS COLUMNS ANALYSIS:');
    console.log('=====================================\n');

    const uselessColumns = [];

    for (const col of analysis) {
      const reasons = [];

      // High null percentage (>90%)
      if (col.nullPercentage > 90) {
        reasons.push(`High null percentage: ${col.nullPercentage}%`);
      }

      // All null values
      if (col.nullCount === totalCount) {
        reasons.push('All values are NULL');
      }

      // Low distinct values (but not ID fields)
      if (col.distinctCount === 1 && !col.column.includes('id') && !col.column.includes('created') && !col.column.includes('updated')) {
        reasons.push('Only one distinct value (not counting NULLs)');
      }

      // Check for common useless column names
      const uselessNames = ['temp', 'test', 'dummy', 'old_', 'deprecated', 'unused', 'backup_'];
      if (uselessNames.some(name => col.column.toLowerCase().includes(name))) {
        reasons.push('Column name suggests it\'s temporary/unused');
      }

      // Check for columns that might be duplicates or redundant
      const duplicatePatterns = [
        { pattern: /.*_old$/, reason: 'Old version of another column' },
        { pattern: /.*_backup$/, reason: 'Backup of another column' },
        { pattern: /.*_temp$/, reason: 'Temporary column' },
        { pattern: /.*_copy$/, reason: 'Copy of another column' }
      ];

      for (const pattern of duplicatePatterns) {
        if (pattern.pattern.test(col.column)) {
          reasons.push(pattern.reason);
        }
      }

      if (reasons.length > 0) {
        col.potentiallyUseless = true;
        col.reason = reasons;
        uselessColumns.push(col);
      }
    }

    // Display results
    if (uselessColumns.length === 0) {
      console.log('✅ No obviously useless columns found!');
      console.log('\nHowever, here are columns with high null percentages (>50%):');

      const highNullColumns = analysis.filter(col => col.nullPercentage > 50 && col.nullPercentage < 90);
      if (highNullColumns.length === 0) {
        console.log('None found.');
      } else {
        highNullColumns.forEach(col => {
          console.log(`- ${col.column}: ${col.nullPercentage}% null (${col.nullCount}/${totalCount} rows)`);
        });
      }
    } else {
      console.log(`🚨 Found ${uselessColumns.length} potentially useless columns:\n`);

      uselessColumns.forEach((col, index) => {
        console.log(`${index + 1}. ${col.column} (${col.type})`);
        console.log(`   Reasons:`);
        col.reason.forEach(reason => {
          console.log(`   - ${reason}`);
        });
        console.log(`   Stats: ${col.nullPercentage}% null, ${col.distinctCount >= 0 ? col.distinctCount + ' distinct values' : 'N/A'}`);
        if (col.sampleValues.length > 0) {
          console.log(`   Sample values: ${col.sampleValues.slice(0, 3).join(', ')}${col.sampleValues.length > 3 ? '...' : ''}`);
        }
        console.log('');
      });

      console.log('⚠️  WARNING: Before deleting any columns, please:');
      console.log('   1. Check if they\'re used in application code');
      console.log('   2. Verify with team members');
      console.log('   3. Create a backup of the data');
      console.log('   4. Test thoroughly after deletion\n');

      console.log('🗑️  To delete these columns, run SQL commands like:');
      uselessColumns.forEach(col => {
        console.log(`   ALTER TABLE customers DROP COLUMN IF EXISTS ${col.column};`);
      });
    }

    console.log('\n📈 COLUMN USAGE SUMMARY:');
    console.log('=======================');

    analysis.forEach(col => {
      const usage = col.nullCount === 0 ? 'Fully used' :
                   col.nullPercentage > 80 ? 'Mostly empty' :
                   col.nullPercentage > 50 ? 'Half empty' :
                   col.nullPercentage > 20 ? 'Some nulls' : 'Well used';
      console.log(`${col.column}: ${usage} (${(100 - col.nullPercentage).toFixed(1)}% filled)`);
    });

  } catch (error) {
    console.error('❌ Error analyzing customers table:', error);
  }
}

analyzeCustomersTable().catch(console.error);
