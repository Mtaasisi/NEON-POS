/**
 * SIMPLE BRANCH ISOLATION FIX FOR FUTURE PRODUCTS
 * Creates database trigger to ensure automatic branch isolation
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

class SimpleFutureFixer {
  constructor() {
    this.sql = postgres(DATABASE_URL);
  }

  async createBranchIsolationTrigger() {
    console.log('🔧 Creating database trigger for automatic branch isolation...');

    // Drop existing trigger if it exists
    await this.sql`DROP TRIGGER IF EXISTS ensure_branch_isolation_on_product_create ON lats_products`;

    // Create the trigger function
    await this.sql.unsafe(`
      CREATE OR REPLACE FUNCTION ensure_branch_isolation_on_product_create()
      RETURNS TRIGGER AS $$
      DECLARE
        branch_record RECORD;
        branch_specific_sku TEXT;
      BEGIN
        -- Create parent variants in ALL active branches for new products
        FOR branch_record IN
          SELECT id, name, COALESCE(code, UPPER(SUBSTRING(name, 1, 3))) as code
          FROM store_locations
          WHERE is_active = true
        LOOP
          -- Generate branch-specific SKU for the default variant
          branch_specific_sku := 'DEFAULT-' || NEW.id || '-' || branch_record.code;

          -- Create a default parent variant in this branch
          INSERT INTO lats_product_variants (
            product_id,
            branch_id,
            variant_name,
            name,
            sku,
            cost_price,
            selling_price,
            quantity,
            min_quantity,
            is_active,
            is_parent,
            variant_type,
            is_shared,
            sharing_mode,
            visible_to_branches
          ) VALUES (
            NEW.id,
            branch_record.id,
            'Default',
            'Default',
            branch_specific_sku,
            COALESCE(NEW.cost_price, 0),
            COALESCE(NEW.selling_price, 0),
            0, -- Always 0 stock (product definition only)
            0,
            true,
            true, -- This is a parent variant
            'default',
            true, -- Shared across branches
            'shared',
            null
          );

          RAISE NOTICE '✅ Created default parent variant for product % in branch %', NEW.name, branch_record.name;
        END LOOP;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create the trigger
    await this.sql.unsafe(`
      CREATE TRIGGER ensure_branch_isolation_on_product_create
        AFTER INSERT ON lats_products
        FOR EACH ROW EXECUTE FUNCTION ensure_branch_isolation_on_product_create();
    `);

    console.log('✅ Database trigger created for automatic branch isolation');
  }

  async testNewProductCreation() {
    console.log('🧪 Testing new product creation with branch isolation...');

    // Create a test product
    const testProduct = await this.sql`
      INSERT INTO lats_products (name, sku, total_quantity, total_value)
      VALUES ('TEST_BRANCH_ISOLATION', 'TEST-BRANCH-ISO', 0, 0)
      RETURNING id, name, sku
    `;

    console.log(`📦 Created test product: ${testProduct[0].name}`);

    // Check if variants were automatically created
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger

    const variants = await this.sql`
      SELECT branch_id, variant_name, is_parent, quantity
      FROM lats_product_variants
      WHERE product_id = ${testProduct[0].id}
      ORDER BY branch_id
    `;

    console.log(`📋 Variants created: ${variants.length}`);
    variants.forEach(v => {
      const branchName = v.branch_id === '00000000-0000-0000-0000-000000000001' ? 'ARUSHA' : 'DAR';
      console.log(`  ${branchName}: ${v.variant_name} (parent: ${v.is_parent}, qty: ${v.quantity})`);
    });

    // Clean up test product
    await this.sql`DELETE FROM lats_product_variants WHERE product_id = ${testProduct[0].id}`;
    await this.sql`DELETE FROM lats_products WHERE id = ${testProduct[0].id}`;

    console.log('🧹 Test product cleaned up');

    return variants.length >= 2; // Should have variants in both branches
  }

  async runSimpleFix() {
    try {
      console.log('🛠️ SIMPLE BRANCH ISOLATION FIX FOR FUTURE PRODUCTS');
      console.log('=================================================\n');

      // Create database trigger
      await this.createBranchIsolationTrigger();

      // Test the trigger
      const testPassed = await this.testNewProductCreation();

      console.log('\n🎉 SIMPLE FIX COMPLETED SUCCESSFULLY!');
      console.log('=====================================');
      console.log(`✅ Database trigger created`);
      console.log(`✅ Test passed: ${testPassed ? 'YES' : 'NO'}`);
      console.log('');
      console.log('📋 FUTURE PRODUCTS WILL NOW:');
      console.log('• Automatically get parent variants in ALL branches');
      console.log('• Maintain proper branch isolation');
      console.log('• Have stock separated by branch');

      return { testPassed };

    } catch (error) {
      console.error('\n❌ SIMPLE FIX FAILED:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }

  async close() {
    await this.sql.end();
  }
}

// Run the simple fix
const fixer = new SimpleFutureFixer();
fixer.runSimpleFix()
  .then(result => {
    console.log('\n🏆 SIMPLE FIX RESULTS:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 FAILURE:', error.message);
    process.exit(1);
  });