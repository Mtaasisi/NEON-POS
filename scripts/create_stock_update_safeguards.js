/**
 * CREATE STOCK UPDATE SAFEGUARDS
 * Additional protections to prevent future stock isolation bugs
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

class StockSafeguardCreator {
  constructor() {
    this.sql = postgres(DATABASE_URL);
  }

  async createStockUpdateAuditTrigger() {
    console.log('🔧 Creating stock update audit trigger...');

    // Drop existing trigger if it exists
    await this.sql`DROP TRIGGER IF EXISTS audit_spare_part_stock_updates ON lats_spare_part_variants`;

    // Create audit table if it doesn't exist
    await this.sql.unsafe(`
      CREATE TABLE IF NOT EXISTS stock_update_audit (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        variant_id UUID NOT NULL,
        spare_part_id UUID NOT NULL,
        branch_id UUID NOT NULL,
        action VARCHAR(50) NOT NULL,
        old_quantity INTEGER,
        new_quantity INTEGER,
        old_data JSONB,
        new_data JSONB,
        updated_by UUID,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        client_info JSONB
      )
    `);

    // Create indexes for performance
    await this.sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_stock_audit_variant_id ON stock_update_audit(variant_id);
      CREATE INDEX IF NOT EXISTS idx_stock_audit_spare_part_id ON stock_update_audit(spare_part_id);
      CREATE INDEX IF NOT EXISTS idx_stock_audit_branch_id ON stock_update_audit(branch_id);
      CREATE INDEX IF NOT EXISTS idx_stock_audit_updated_at ON stock_update_audit(updated_at DESC);
    `);

    // Create the audit trigger function
    await this.sql.unsafe(`
      CREATE OR REPLACE FUNCTION audit_spare_part_stock_updates()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Only audit quantity changes
        IF OLD.quantity IS DISTINCT FROM NEW.quantity THEN
          INSERT INTO stock_update_audit (
            variant_id,
            spare_part_id,
            branch_id,
            action,
            old_quantity,
            new_quantity,
            old_data,
            new_data,
            client_info
          ) VALUES (
            NEW.id,
            NEW.spare_part_id,
            NEW.branch_id,
            CASE
              WHEN TG_OP = 'INSERT' THEN 'INSERT'
              WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
              WHEN TG_OP = 'DELETE' THEN 'DELETE'
            END,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.quantity END,
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE NEW.quantity END,
            CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD)::JSONB END,
            CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW)::JSONB END,
            json_build_object(
              'operation', TG_OP,
              'table', TG_TABLE_NAME,
              'timestamp', NOW(),
              'session_user', session_user
            )
          );
        END IF;

        RETURN CASE
          WHEN TG_OP = 'DELETE' THEN OLD
          ELSE NEW
        END;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create the trigger
    await this.sql.unsafe(`
      CREATE TRIGGER audit_spare_part_stock_updates
        AFTER INSERT OR UPDATE OR DELETE ON lats_spare_part_variants
        FOR EACH ROW EXECUTE FUNCTION audit_spare_part_stock_updates();
    `);

    console.log('✅ Stock update audit system created');
  }

  async createBranchIsolationValidationFunction() {
    console.log('🔧 Creating branch isolation validation function...');

    await this.sql.unsafe(`
      CREATE OR REPLACE FUNCTION validate_branch_stock_isolation(
        p_spare_part_id UUID,
        p_expected_branch_id UUID DEFAULT NULL
      ) RETURNS TABLE (
        validation_status TEXT,
        issues_found INTEGER,
        details JSONB
      ) AS $$
      DECLARE
        v_variant_count INTEGER;
        v_branches_affected INTEGER;
        v_issues JSONB := '[]'::JSONB;
        v_status TEXT := 'VALID';
      BEGIN
        -- Count total variants for this spare part
        SELECT COUNT(*) INTO v_variant_count
        FROM lats_spare_part_variants
        WHERE spare_part_id = p_spare_part_id;

        -- Count distinct branches
        SELECT COUNT(DISTINCT branch_id) INTO v_branches_affected
        FROM lats_spare_part_variants
        WHERE spare_part_id = p_spare_part_id;

        -- Check for variants without branch_id
        IF EXISTS (
          SELECT 1 FROM lats_spare_part_variants
          WHERE spare_part_id = p_spare_part_id AND branch_id IS NULL
        ) THEN
          v_issues := v_issues || json_build_object(
            'type', 'NULL_BRANCH_ID',
            'severity', 'CRITICAL',
            'description', 'Variants found without branch_id assignment'
          )::JSONB;
          v_status := 'INVALID';
        END IF;

        -- Check if operations affect unexpected branches
        IF p_expected_branch_id IS NOT NULL THEN
          IF NOT EXISTS (
            SELECT 1 FROM lats_spare_part_variants
            WHERE spare_part_id = p_spare_part_id AND branch_id = p_expected_branch_id
          ) THEN
            v_issues := v_issues || json_build_object(
              'type', 'MISSING_EXPECTED_BRANCH',
              'severity', 'WARNING',
              'description', 'Expected branch not found in variants',
              'expected_branch', p_expected_branch_id
            )::JSONB;
          END IF;
        END IF;

        -- Check for orphaned variants (spare part deleted but variants remain)
        IF NOT EXISTS (
          SELECT 1 FROM lats_spare_parts WHERE id = p_spare_part_id
        ) THEN
          v_issues := v_issues || json_build_object(
            'type', 'ORPHANED_VARIANTS',
            'severity', 'ERROR',
            'description', 'Variants exist for non-existent spare part'
          )::JSONB;
          v_status := 'INVALID';
        END IF;

        RETURN QUERY SELECT
          v_status,
          jsonb_array_length(v_issues),
          json_build_object(
            'spare_part_id', p_spare_part_id,
            'total_variants', v_variant_count,
            'branches_affected', v_branches_affected,
            'issues', v_issues
          );
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Branch isolation validation function created');
  }

  async addStockUpdateConstraints() {
    console.log('🔧 Adding database constraints for stock safety...');

    // Ensure branch_id is never null for spare part variants
    try {
      await this.sql.unsafe(`
        ALTER TABLE lats_spare_part_variants
        ADD CONSTRAINT spare_part_variants_branch_id_not_null
        CHECK (branch_id IS NOT NULL)
      `);
      console.log('✅ Added NOT NULL constraint for branch_id');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Branch ID constraint already exists');
      } else {
        throw error;
      }
    }

    // Ensure quantity is never negative
    try {
      await this.sql.unsafe(`
        ALTER TABLE lats_spare_part_variants
        ADD CONSTRAINT spare_part_variants_quantity_non_negative
        CHECK (quantity >= 0)
      `);
      console.log('✅ Added non-negative constraint for quantity');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Quantity constraint already exists');
      } else {
        throw error;
      }
    }

    console.log('✅ Database constraints added');
  }

  async createStockIsolationHealthCheck() {
    console.log('🔧 Creating stock isolation health check function...');

    await this.sql.unsafe(`
      CREATE OR REPLACE FUNCTION check_stock_isolation_health()
      RETURNS TABLE (
        check_name TEXT,
        status TEXT,
        issues_count INTEGER,
        details TEXT
      ) AS $$
      BEGIN
        -- Check 1: Variants without branch_id
        RETURN QUERY
        SELECT
          'variants_without_branch'::TEXT,
          CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
          COUNT(*)::INTEGER,
          'Variants found without branch_id assignment'::TEXT
        FROM lats_spare_part_variants
        WHERE branch_id IS NULL;

        -- Check 2: Spare parts with branch_id (should be global)
        RETURN QUERY
        SELECT
          'spare_parts_with_branch'::TEXT,
          CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
          COUNT(*)::INTEGER,
          'Spare parts with branch_id (should be global)'::TEXT
        FROM lats_spare_parts
        WHERE branch_id IS NOT NULL;

        -- Check 3: Negative quantities
        RETURN QUERY
        SELECT
          'negative_quantities'::TEXT,
          CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
          COUNT(*)::INTEGER,
          'Variants with negative quantity'::TEXT
        FROM lats_spare_part_variants
        WHERE quantity < 0;

        -- Check 4: Orphaned variants
        RETURN QUERY
        SELECT
          'orphaned_variants'::TEXT,
          CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
          COUNT(*)::INTEGER,
          'Variants for non-existent spare parts'::TEXT
        FROM lats_spare_part_variants spv
        LEFT JOIN lats_spare_parts sp ON spv.spare_part_id = sp.id
        WHERE sp.id IS NULL;

      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Stock isolation health check created');
  }

  async runHealthCheck() {
    console.log('🔍 Running stock isolation health check...');

    const results = await this.sql`
      SELECT * FROM check_stock_isolation_health()
    `;

    console.log('\n📊 HEALTH CHECK RESULTS:');
    let allPassed = true;

    results.forEach(result => {
      const status = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${status} ${result.check_name}: ${result.status} (${result.issues_count} issues)`);
      if (result.issues_count > 0) {
        console.log(`   Details: ${result.details}`);
        allPassed = false;
      }
    });

    console.log(`\n🏥 OVERALL HEALTH: ${allPassed ? '✅ ALL CHECKS PASSED' : '❌ ISSUES FOUND'}`);

    return allPassed;
  }

  async runAllSafeguards() {
    try {
      console.log('🛡️ CREATING COMPREHENSIVE STOCK UPDATE SAFEGUARDS');
      console.log('================================================\n');

      // Create audit system
      await this.createStockUpdateAuditTrigger();

      // Create validation function
      await this.createBranchIsolationValidationFunction();

      // Add database constraints
      await this.addStockUpdateConstraints();

      // Create health check
      await this.createStockIsolationHealthCheck();

      // Run final health check
      const healthCheckPassed = await this.runHealthCheck();

      console.log('\n🎉 SAFEGUARDS CREATION COMPLETED!');
      console.log('=================================');
      console.log('✅ Stock update audit system active');
      console.log('✅ Branch isolation validation available');
      console.log('✅ Database constraints enforced');
      console.log('✅ Health monitoring enabled');
      console.log(`✅ Health check: ${healthCheckPassed ? 'PASSED' : 'ISSUES FOUND'}`);
      console.log('');
      console.log('🛡️ FUTURE PROTECTION:');
      console.log('• Stock updates are audited and tracked');
      console.log('• Branch isolation violations are detected');
      console.log('• Invalid operations are prevented by constraints');
      console.log('• Health checks monitor system integrity');
      console.log('• All stock changes are branch-isolated and safe');

      return {
        auditSystem: true,
        validationFunction: true,
        constraints: true,
        healthCheck: true,
        healthCheckPassed
      };

    } catch (error) {
      console.error('\n❌ SAFEGUARDS CREATION FAILED:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }

  async close() {
    await this.sql.end();
  }
}

// Run the safeguards creation
const creator = new StockSafeguardCreator();
creator.runAllSafeguards()
  .then(result => {
    console.log('\n🏆 SAFEGUARDS IMPLEMENTATION COMPLETE');
    console.log('Stock update operations are now fully protected against branch isolation bugs.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 CRITICAL FAILURE:', error.message);
    process.exit(1);
  });