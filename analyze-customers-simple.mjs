// Simple analysis of customers table columns
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function analyzeCustomersSimple() {
  console.log('🔍 Simple Analysis of Customers Table Columns\n');

  try {
    // Get basic info
    const totalRows = await sql`SELECT COUNT(*) as count FROM customers`;
    const totalCount = totalRows[0].count;
    console.log(`📊 Total customers: ${totalCount}\n`);

    // Get column structure
    const columns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;

    console.log('📋 CUSTOMERS TABLE COLUMNS ANALYSIS:');
    console.log('=====================================\n');

    // Analyze columns for potential issues
    const potentiallyUseless = [];
    const suspiciousColumns = [];
    const duplicateColumns = [];

    const columnNames = columns.map(col => col.column_name);

    for (const col of columns) {
      const reasons = [];
      let riskLevel = 'LOW';

      // Check for suspicious column names
      const suspiciousPatterns = [
        'temp', 'test', 'dummy', 'old_', 'deprecated', 'unused', 'backup_',
        'copy', 'duplicate', 'legacy', 'archive'
      ];

      if (suspiciousPatterns.some(pattern => col.column_name.toLowerCase().includes(pattern))) {
        reasons.push(`Suspicious name pattern: "${col.column_name}"`);
        riskLevel = 'HIGH';
      }

      // Check for potential duplicates
      const duplicatePatterns = [
        { base: 'loyalty_points', duplicate: 'points', reason: 'Duplicate loyalty tracking' },
        { base: 'total_spent', duplicate: 'loyalty_points', reason: 'Both track spending/loyalty' },
        { base: 'notes', duplicate: 'initial_notes', reason: 'Duplicate note fields' },
        { base: 'birthday', duplicate: ['birth_month', 'birth_day'], reason: 'Birthday split across multiple columns' },
        { base: 'created_at', duplicate: 'joined_date', reason: 'Duplicate date tracking' },
        { base: 'branch_id', duplicate: 'preferred_branch_id', reason: 'Multiple branch associations' },
        { base: 'location', duplicate: 'location_description', reason: 'Location information duplication' }
      ];

      for (const dup of duplicatePatterns) {
        if (col.column_name === dup.duplicate ||
            (Array.isArray(dup.duplicate) && dup.duplicate.includes(col.column_name))) {
          if (columnNames.includes(dup.base)) {
            reasons.push(dup.reason);
            riskLevel = 'MEDIUM';
          }
        }
      }

      // Check for over-specialized columns (call tracking)
      const callColumns = [
        'total_calls', 'total_call_duration_minutes', 'incoming_calls',
        'outgoing_calls', 'missed_calls', 'avg_call_duration_minutes',
        'first_call_date', 'last_call_date', 'call_loyalty_level'
      ];

      if (callColumns.includes(col.column_name)) {
        reasons.push('Specialized call tracking - may not be used in all business types');
        riskLevel = 'MEDIUM';
      }

      // Check for branch isolation columns
      const branchColumns = [
        'is_shared', 'preferred_branch_id', 'visible_to_branches',
        'sharing_mode', 'created_by_branch_id', 'created_by_branch_name'
      ];

      if (branchColumns.includes(col.column_name)) {
        reasons.push('Branch isolation feature - may be unused if single branch');
        riskLevel = 'LOW';
      }

      // Check for complex/unused features
      const complexColumns = [
        'referrals', 'whatsapp_opt_out', 'color_tag', 'customer_tag'
      ];

      if (complexColumns.includes(col.column_name)) {
        reasons.push('Advanced feature - may not be implemented/used');
        riskLevel = 'MEDIUM';
      }

      if (reasons.length > 0) {
        const analysis = {
          column: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          default: col.column_default,
          riskLevel,
          reasons
        };

        if (riskLevel === 'HIGH') {
          potentiallyUseless.push(analysis);
        } else {
          suspiciousColumns.push(analysis);
        }
      }
    }

    // Display results
    if (potentiallyUseless.length > 0) {
      console.log('🚨 HIGH RISK - POTENTIALLY USELESS COLUMNS:');
      console.log('============================================\n');

      potentiallyUseless.forEach((col, index) => {
        console.log(`${index + 1}. ${col.column} (${col.type})`);
        console.log(`   Risk: ${col.riskLevel}`);
        col.reasons.forEach(reason => {
          console.log(`   - ${reason}`);
        });
        console.log('');
      });
    }

    if (suspiciousColumns.length > 0) {
      console.log('⚠️  MEDIUM RISK - SUSPICIOUS COLUMNS:');
      console.log('===================================\n');

      suspiciousColumns.forEach((col, index) => {
        console.log(`${potentiallyUseless.length + index + 1}. ${col.column} (${col.type})`);
        console.log(`   Risk: ${col.riskLevel}`);
        col.reasons.forEach(reason => {
          console.log(`   - ${reason}`);
        });
        console.log('');
      });
    }

    console.log('📋 SUMMARY:');
    console.log('===========');
    console.log(`Total columns: ${columns.length}`);
    console.log(`High risk (potentially useless): ${potentiallyUseless.length}`);
    console.log(`Medium risk (suspicious): ${suspiciousColumns.length}`);
    console.log(`Low risk (likely useful): ${columns.length - potentiallyUseless.length - suspiciousColumns.length}`);

    if (potentiallyUseless.length === 0 && suspiciousColumns.length === 0) {
      console.log('\n✅ No obviously problematic columns found!');
    } else {
      console.log('\n⚠️  RECOMMENDATIONS:');
      console.log('===================');
      console.log('1. Check application code for usage of flagged columns');
      console.log('2. Review with team before deleting');
      console.log('3. Consider data backup before any changes');
      console.log('4. Test thoroughly after modifications');

      if (suspiciousColumns.some(col => col.reasons.some(r => r.includes('Branch isolation')))) {
        console.log('5. If single-branch operation, consider removing branch isolation columns');
      }

      if (suspiciousColumns.some(col => col.reasons.some(r => r.includes('call tracking')))) {
        console.log('6. If no call center features, consider removing call tracking columns');
      }
    }

    // Show delete commands for high-risk columns
    if (potentiallyUseless.length > 0) {
      console.log('\n🗑️  DELETE COMMANDS (HIGH RISK ONLY):');
      console.log('=====================================');
      potentiallyUseless.forEach(col => {
        console.log(`ALTER TABLE customers DROP COLUMN IF EXISTS ${col.column};`);
      });
    }

  } catch (error) {
    console.error('❌ Error analyzing customers table:', error);
  }
}

analyzeCustomersSimple().catch(console.error);
