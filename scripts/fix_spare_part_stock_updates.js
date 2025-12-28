/**
 * FIX SPARE PART STOCK UPDATE BUG
 * Ensures stock updates only affect the current branch, not all branches
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

class SparePartStockFixer {
  constructor() {
    this.sql = postgres(DATABASE_URL);
  }

  async analyzeCurrentIssue() {
    console.log('🔍 Analyzing the spare part stock update issue...');

    // Get some sample data to understand the problem
    const sampleVariants = await this.sql`
      SELECT sp.name as spare_part_name, spv.name as variant_name,
             spv.quantity, spv.branch_id, sl.name as branch_name
      FROM lats_spare_part_variants spv
      JOIN lats_spare_parts sp ON spv.spare_part_id = sp.id
      JOIN store_locations sl ON spv.branch_id = sl.id
      ORDER BY sp.name, spv.branch_id
      LIMIT 10
    `;

    console.log('📋 Sample variants across branches:');
    sampleVariants.forEach(v => {
      console.log(`  ${v.spare_part_name} -> ${v.variant_name} (${v.branch_name}): ${v.quantity} units`);
    });

    // Check if we have variants in multiple branches for same spare part
    const multiBranchParts = await this.sql`
      SELECT sp.name, COUNT(DISTINCT spv.branch_id) as branch_count, SUM(spv.quantity) as total_stock
      FROM lats_spare_parts sp
      JOIN lats_spare_part_variants spv ON sp.id = spv.spare_part_id
      GROUP BY sp.id, sp.name
      HAVING COUNT(DISTINCT spv.branch_id) > 1
      ORDER BY branch_count DESC
    `;

    console.log('\n🏪 Spare parts with variants in multiple branches:');
    multiBranchParts.forEach(p => {
      console.log(`  ${p.name}: ${p.branch_count} branches, ${p.total_stock} total units`);
    });

    return {
      sampleVariants,
      multiBranchParts,
      hasIssue: multiBranchParts.length > 0
    };
  }

  async testStockUpdateBug() {
    console.log('🧪 Testing the stock update bug...');

    // Get current branch from localStorage simulation (we'll assume Arusha for testing)
    const currentBranchId = '00000000-0000-0000-0000-000000000001'; // Arusha

    // Find a spare part with variants in multiple branches
    const testPart = await this.sql`
      SELECT sp.id, sp.name, COUNT(DISTINCT spv.branch_id) as branch_count
      FROM lats_spare_parts sp
      JOIN lats_spare_part_variants spv ON sp.id = spv.spare_part_id
      GROUP BY sp.id, sp.name
      HAVING COUNT(DISTINCT spv.branch_id) > 1
      LIMIT 1
    `;

    if (testPart.length === 0) {
      console.log('⚠️ No spare parts with multi-branch variants found for testing');
      return null;
    }

    const partId = testPart[0].id;
    console.log(`📦 Testing with: ${testPart[0].name}`);

    // Get stock before "update"
    const stockBefore = await this.sql`
      SELECT sl.name as branch, spv.quantity
      FROM lats_spare_part_variants spv
      JOIN store_locations sl ON spv.branch_id = sl.id
      WHERE spv.spare_part_id = ${partId}
      ORDER BY sl.name
    `;

    console.log('📊 Stock BEFORE simulated update:');
    stockBefore.forEach(s => console.log(`  ${s.branch}: ${s.quantity} units`));

    // Simulate the current buggy behavior: delete ALL variants for the spare part
    console.log('\n🚨 SIMULATING BUGGY UPDATE (deletes all variants, not just current branch)...');

    // This is what the current code does (WRONG):
    // DELETE FROM lats_spare_part_variants WHERE spare_part_id = partId

    // Instead, let's simulate what SHOULD happen (RIGHT):
    // DELETE FROM lats_spare_part_variants WHERE spare_part_id = partId AND branch_id = currentBranchId

    console.log(`❌ BUG: Would delete variants from ALL branches (not just ${currentBranchId})`);
    console.log(`✅ FIX: Should only delete variants from current branch (${currentBranchId})`);

    // Get what would be deleted by the bug
    const variantsThatWouldBeDeleted = await this.sql`
      SELECT sl.name as branch, spv.quantity, spv.branch_id
      FROM lats_spare_part_variants spv
      JOIN store_locations sl ON spv.branch_id = sl.id
      WHERE spv.spare_part_id = ${partId}
      AND spv.branch_id != ${currentBranchId}
    `;

    console.log('\n💥 VICTIMS OF THE BUG (variants that would be wrongly deleted):');
    variantsThatWouldBeDeleted.forEach(v => {
      console.log(`  ❌ ${v.branch} branch: ${v.quantity} units LOST!`);
    });

    const totalLostStock = variantsThatWouldBeDeleted.reduce((sum, v) => sum + v.quantity, 0);
    console.log(`\\n📉 TOTAL STOCK LOST: ${totalLostStock} units across ${variantsThatWouldBeDeleted.length} other branches`);

    return {
      partId,
      currentBranchId,
      stockBefore,
      variantsThatWouldBeDeleted,
      totalLostStock
    };
  }

  async createFixedUpdateFunction() {
    console.log('🔧 Creating database function for safe branch-aware stock updates...');

    // Drop existing function if it exists
    await this.sql`DROP FUNCTION IF EXISTS update_spare_part_variants_branch_aware(UUID, UUID, JSONB)`;

    // Create the fixed function
    await this.sql.unsafe(`
      CREATE OR REPLACE FUNCTION update_spare_part_variants_branch_aware(
        p_spare_part_id UUID,
        p_branch_id UUID,
        p_variants_data JSONB
      ) RETURNS TABLE (
        deleted_count INTEGER,
        inserted_count INTEGER,
        affected_branches TEXT[]
      ) AS $$
      DECLARE
        v_deleted_count INTEGER := 0;
        v_inserted_count INTEGER := 0;
        v_affected_branches TEXT[] := ARRAY[]::TEXT[];
        v_variant_record JSONB;
      BEGIN
        -- Only delete variants from the CURRENT branch (not all branches!)
        DELETE FROM lats_spare_part_variants
        WHERE spare_part_id = p_spare_part_id
        AND branch_id = p_branch_id;  -- 🔒 CRITICAL: Only current branch!

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

        -- Track affected branches
        v_affected_branches := ARRAY[p_branch_id::TEXT];

        -- Insert new variants ONLY for the current branch
        FOR v_variant_record IN SELECT * FROM jsonb_array_elements(p_variants_data)
        LOOP
          INSERT INTO lats_spare_part_variants (
            spare_part_id,
            branch_id,  -- 🔒 CRITICAL: Set to current branch only!
            name,
            sku,
            cost_price,
            selling_price,
            quantity,
            min_quantity,
            attributes,
            image_url,
            is_active
          ) VALUES (
            p_spare_part_id,
            p_branch_id,  -- 🔒 Only current branch!
            v_variant_record->>'name',
            v_variant_record->>'sku',
            (v_variant_record->>'cost_price')::NUMERIC,
            (v_variant_record->>'selling_price')::NUMERIC,
            (v_variant_record->>'quantity')::INTEGER,
            (v_variant_record->>'min_quantity')::INTEGER,
            (v_variant_record->>'attributes')::JSONB,
            v_variant_record->>'image_url',
            COALESCE((v_variant_record->>'is_active')::BOOLEAN, true)
          );

          v_inserted_count := v_inserted_count + 1;
        END LOOP;

        RETURN QUERY SELECT v_deleted_count, v_inserted_count, v_affected_branches;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Safe branch-aware update function created');
  }

  async updateSparePartsApiToUseFixedFunction() {
    console.log('🔧 Updating spare parts API to use the fixed function...');

    // This is documentation of what needs to be changed in the codebase
    console.log('📋 CODE CHANGES REQUIRED:');
    console.log('');
    console.log('1. In src/features/lats/lib/sparePartsApi.ts, updateSparePartWithVariants function:');
    console.log('   - Replace the variant delete/insert logic with call to update_spare_part_variants_branch_aware()');
    console.log('');
    console.log('2. Current buggy code (lines ~1897-1900 and ~1978-1981):');
    console.log('   ```typescript');
    console.log('   // WRONG: Deletes from ALL branches');
    console.log('   const { error: deleteError } = await supabase');
    console.log('     .from(\'lats_spare_part_variants\')');
    console.log('     .delete()');
    console.log('     .eq(\'spare_part_id\', id); // ❌ No branch filter!');
    console.log('   ```');
    console.log('');
    console.log('3. Fixed code should be:');
    console.log('   ```typescript');
    console.log('   // RIGHT: Only affects current branch');
    console.log('   const currentBranchId = localStorage.getItem(\'current_branch_id\');');
    console.log('   const { data: result, error } = await supabase.rpc(');
    console.log('     \'update_spare_part_variants_branch_aware\',');
    console.log('     {');
    console.log('       p_spare_part_id: id,');
    console.log('       p_branch_id: currentBranchId,');
    console.log('       p_variants_data: variants');
    console.log('     }');
    console.log('   );');
    console.log('   ```');

    console.log('\\n✅ API update documentation complete');
  }

  async createEmergencyFixScript() {
    console.log('🛠️ Creating emergency fix script for immediate issue resolution...');

    // Get current branch ID (assuming Arusha for this fix)
    const currentBranchId = '00000000-0000-0000-0000-000000000001'; // Arusha

    // Find spare parts that have lost stock due to the bug
    const affectedParts = await this.sql`
      SELECT
        sp.id,
        sp.name,
        COUNT(spv.id) as variant_count,
        SUM(spv.quantity) as total_stock,
        STRING_AGG(DISTINCT sl.name, ', ') as branches
      FROM lats_spare_parts sp
      LEFT JOIN lats_spare_part_variants spv ON sp.id = spv.spare_part_id
      LEFT JOIN store_locations sl ON spv.branch_id = sl.id
      GROUP BY sp.id, sp.name
      HAVING COUNT(spv.id) = 0 OR SUM(spv.quantity) = 0
      ORDER BY sp.created_at DESC
      LIMIT 5
    `;

    console.log('📋 Spare parts that may have lost stock:');
    affectedParts.forEach(p => {
      console.log(`  • ${p.name}: ${p.variant_count} variants, ${p.total_stock} stock, branches: ${p.branches || 'none'}`);
    });

    if (affectedParts.length > 0) {
      console.log('\\n🔧 These parts may need stock restoration from backups or transfer history.');
      console.log('💡 Recommendation: Check transfer history and restore stock manually if needed.');
    }

    return affectedParts;
  }

  async runComprehensiveStockFix() {
    try {
      console.log('🛠️ COMPREHENSIVE SPARE PART STOCK FIX');
      console.log('=====================================\n');

      // Step 1: Analyze the issue
      const analysis = await this.analyzeCurrentIssue();

      // Step 2: Test the bug
      const bugTest = await this.testStockUpdateBug();

      // Step 3: Create fixed database function
      await this.createFixedUpdateFunction();

      // Step 4: Document API changes needed
      await this.updateSparePartsApiToUseFixedFunction();

      // Step 5: Emergency fix for affected parts
      const affectedParts = await this.createEmergencyFixScript();

      console.log('\n🎉 COMPREHENSIVE STOCK FIX COMPLETED!');
      console.log('====================================');
      console.log('✅ Root cause identified: Stock updates delete from ALL branches');
      console.log('✅ Fixed database function created');
      console.log('✅ API update path documented');
      console.log(`⚠️  ${affectedParts.length} spare parts may need stock restoration`);
      console.log('');
      console.log('🚨 CRITICAL NEXT STEP:');
      console.log('Update src/features/lats/lib/sparePartsApi.ts to use the new function!');
      console.log('Otherwise the bug will continue to affect stock updates.');

      return {
        analysis,
        bugTest,
        affectedParts
      };

    } catch (error) {
      console.error('\n❌ COMPREHENSIVE FIX FAILED:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }

  async close() {
    await this.sql.end();
  }
}

// Run the comprehensive fix
const fixer = new SparePartStockFixer();
fixer.runComprehensiveStockFix()
  .then(result => {
    console.log('\n🏆 STOCK FIX ANALYSIS COMPLETE');
    console.log('Bug identified and fix ready for implementation');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 CRITICAL FAILURE:', error.message);
    process.exit(1);
  });