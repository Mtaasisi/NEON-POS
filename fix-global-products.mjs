/**
 * FIX GLOBAL PRODUCTS - Set branch_id to null for all products
 *
 * Products should be global entities, not assigned to specific branches.
 * This script fixes products that have been incorrectly assigned to branches.
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

class GlobalProductsFixer {
  constructor() {
    this.sql = postgres(DATABASE_URL);
  }

  async analyzeCurrentState() {
    console.log('🔍 Analyzing current product branch assignments...');

    // Count products with branch_id assigned vs null
    const productStats = await this.sql`
      SELECT
        CASE
          WHEN branch_id IS NULL THEN 'global'
          ELSE 'branch_assigned'
        END as assignment_type,
        COUNT(*) as count
      FROM lats_products
      GROUP BY assignment_type
    `;

    console.log('📊 Product Assignment Analysis:');
    productStats.forEach(stat => {
      console.log(`  ${stat.assignment_type}: ${stat.count} products`);
    });

    // Get details of products assigned to branches
    const branchAssignedProducts = await this.sql`
      SELECT
        p.id,
        p.name,
        p.branch_id,
        sl.name as branch_name
      FROM lats_products p
      LEFT JOIN store_locations sl ON p.branch_id = sl.id
      WHERE p.branch_id IS NOT NULL
      ORDER BY p.created_at
    `;

    if (branchAssignedProducts.length > 0) {
      console.log('\n📋 Products incorrectly assigned to branches:');
      branchAssignedProducts.forEach(product => {
        console.log(`  ${product.name} (ID: ${product.id}) -> ${product.branch_name || 'Unknown Branch'}`);
      });
    }

    return {
      totalProducts: productStats.reduce((sum, stat) => sum + parseInt(stat.count), 0),
      globalProducts: productStats.find(s => s.assignment_type === 'global')?.count || 0,
      branchAssignedProducts: branchAssignedProducts.length,
      details: branchAssignedProducts
    };
  }

  async createBackup() {
    console.log('🔒 Creating backup of current product assignments...');

    // Create a temporary backup table
    await this.sql`DROP TABLE IF EXISTS temp_products_backup`;

    await this.sql`
      CREATE TEMP TABLE temp_products_backup AS
      SELECT id, branch_id, name FROM lats_products
      WHERE branch_id IS NOT NULL
    `;

    const backupCount = await this.sql`SELECT COUNT(*) as count FROM temp_products_backup`;
    console.log(`✅ Backup created: ${backupCount[0].count} product assignments saved`);

    return backupCount[0].count;
  }

  async fixGlobalProducts() {
    console.log('🔧 Fixing products by setting branch_id to null...');

    const result = await this.sql`
      UPDATE lats_products
      SET branch_id = NULL, updated_at = NOW()
      WHERE branch_id IS NOT NULL
      RETURNING id, name, branch_id as old_branch_id
    `;

    console.log(`✅ Fixed ${result.length} products:`);
    result.forEach(product => {
      console.log(`  ${product.name} (ID: ${product.id}) - was assigned to branch ${product.old_branch_id}`);
    });

    return result.length;
  }

  async verifyFix() {
    console.log('🔍 Verifying the fix...');

    const remainingBranchAssigned = await this.sql`
      SELECT COUNT(*) as count FROM lats_products
      WHERE branch_id IS NOT NULL
    `;

    const totalProducts = await this.sql`
      SELECT COUNT(*) as count FROM lats_products
    `;

    const count = parseInt(remainingBranchAssigned[0].count);
    console.log(`📊 Verification Results:`);
    console.log(`  Total products: ${totalProducts[0].count}`);
    console.log(`  Products with branch assignment: ${count}`);
    console.log(`  Count type: ${typeof count}, value: ${count}`);

    // Double-check by getting actual product details
    if (count > 0) {
      const remainingProducts = await this.sql`
        SELECT id, name, branch_id FROM lats_products
        WHERE branch_id IS NOT NULL
      `;
      console.log('📋 Remaining products with branch assignments:');
      remainingProducts.forEach(p => {
        console.log(`  ${p.name} (ID: ${p.id}) - branch: ${p.branch_id}`);
      });
    }

    if (count === 0) {
      console.log('✅ SUCCESS: All products are now global (branch_id = null)');
      return true;
    } else {
      console.log('❌ FAILURE: Some products still have branch assignments');
      return false;
    }
  }

  async rollbackIfNeeded(error) {
    console.log('🚨 Error occurred, attempting rollback...');

    try {
      const backupExists = await this.sql`SELECT COUNT(*) as count FROM temp_products_backup`;

      if (backupExists[0].count > 0) {
        console.log('Restoring from backup...');

        await this.sql`
          UPDATE lats_products
          SET branch_id = temp_products_backup.branch_id, updated_at = NOW()
          FROM temp_products_backup
          WHERE lats_products.id = temp_products_backup.id
        `;

        console.log('✅ Rollback completed');
      } else {
        console.log('⚠️  No backup available for rollback');
      }
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }

    throw error;
  }

  async close() {
    await this.sql.end();
  }

  async runFix() {
    try {
      console.log('🌍 GLOBAL PRODUCTS FIX STARTED');
      console.log('==============================\n');

      // Step 1: Analyze current state
      const analysis = await this.analyzeCurrentState();

      if (analysis.branchAssignedProducts === 0) {
        console.log('ℹ️  No products need fixing - all are already global');
        return { analysis, fixed: 0, success: true };
      }

      // Step 2: Create backup
      const backupCount = await this.createBackup();

      // Step 3: Fix the products
      const fixedCount = await this.fixGlobalProducts();

      // Step 4: Verify the fix
      const success = await this.verifyFix();

      if (success) {
        console.log('\n🎉 GLOBAL PRODUCTS FIX COMPLETED SUCCESSFULLY!');
        console.log('===============================================');
        console.log('✅ All products are now global');
        console.log('✅ Branch isolation data integrity maintained');
        console.log(`📊 Summary: ${fixedCount} products fixed, ${backupCount} assignments backed up`);
      } else {
        throw new Error('Fix verification failed');
      }

      return {
        analysis,
        fixed: fixedCount,
        success: true
      };

    } catch (error) {
      console.error('\n❌ GLOBAL PRODUCTS FIX FAILED:', error.message);
      await this.rollbackIfNeeded(error);
    } finally {
      await this.close();
    }
  }
}

// Run the fix
const fixer = new GlobalProductsFixer();
fixer.runFix()
  .then(result => {
    console.log('\n🏆 FINAL RESULT:', {
      productsFixed: result?.fixed || 0,
      success: result?.success || false
    });
    process.exit(result?.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 CRITICAL ERROR:', error.message);
    process.exit(1);
  });