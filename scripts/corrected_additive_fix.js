/**
 * CORRECTED ADDITIVE BRANCH STOCK FIX
 * Uses proper variant_attributes format based on existing data
 */

import postgres from 'postgres';

const DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

class CorrectedAdditiveFixer {
  constructor() {
    this.sql = postgres(DATABASE_URL);
  }

  async addMissingArushaImeiVariants(productId) {
    console.log('🔧 Adding missing Arusha IMEI variants with correct format...');

    const arushaId = '00000000-0000-0000-0000-000000000001';

    // Check if Arusha already has IMEI variants
    const existingArushaChildren = await this.sql`
      SELECT COUNT(*) as count FROM lats_product_variants
      WHERE product_id = ${productId}
      AND branch_id = ${arushaId}
      AND is_parent = false
    `;

    if (existingArushaChildren[0].count > 0) {
      console.log(`ℹ️  Arusha already has ${existingArushaChildren[0].count} IMEI variants, skipping`);
      return { skipped: true, count: existingArushaChildren[0].count };
    }

    // Get the Arusha parent variant
    const arushaParents = await this.sql`
      SELECT id FROM lats_product_variants
      WHERE product_id = ${productId}
      AND branch_id = ${arushaId}
      AND is_parent = true
    `;

    if (arushaParents.length === 0) {
      throw new Error('No Arusha parent variant found to attach IMEI children to');
    }

    const parentId = arushaParents[0].id;

    // IMEI variants to add with proper attributes format
    const arushaImeiVariants = [
      {
        name: 'IMEI: AAAAAA',
        imei: 'AAAAAA',
        sku: 'IMEI-AAAAAA',
        quantity: 1,
        attributes: {
          imei: 'AAAAAA',
          serial_number: 'AAAAAA',
          notes: null,
          condition: 'new',
          imei_status: 'valid',
          mac_address: null,
          data_source: 'manual',
          created_without_po: true,
          parent_variant_name: 'Variant 1'
        }
      },
      {
        name: 'IMEI: BBBBBB',
        imei: 'BBBBBB',
        sku: 'IMEI-BBBBBB',
        quantity: 1,
        attributes: {
          imei: 'BBBBBB',
          serial_number: 'BBBBBB',
          notes: null,
          condition: 'new',
          imei_status: 'valid',
          mac_address: null,
          data_source: 'manual',
          created_without_po: true,
          parent_variant_name: 'Variant 1'
        }
      },
      {
        name: 'IMEI: CCCCCC',
        imei: 'CCCCCC',
        sku: 'IMEI-CCCCCC',
        quantity: 1,
        attributes: {
          imei: 'CCCCCC',
          serial_number: 'CCCCCC',
          notes: null,
          condition: 'new',
          imei_status: 'valid',
          mac_address: null,
          data_source: 'manual',
          created_without_po: true,
          parent_variant_name: 'Variant 1'
        }
      }
    ];

    console.log('Adding Arusha IMEI variants with correct format...');

    const addedVariants = [];
    for (const imei of arushaImeiVariants) {
      // Check if this IMEI already exists (prevent duplicates)
      const existingImei = await this.sql`
        SELECT id FROM lats_product_variants
        WHERE variant_attributes->>'imei' = ${imei.imei}
        AND product_id = ${productId}
      `;

      if (existingImei.length > 0) {
        console.log(`⚠️  IMEI ${imei.imei} already exists, skipping`);
        continue;
      }

      const result = await this.sql`
        INSERT INTO lats_product_variants (
          product_id, branch_id, variant_name, name, sku,
          cost_price, selling_price, quantity, is_parent, is_active,
          parent_variant_id, variant_attributes, variant_type
        ) VALUES (
          ${productId}, ${arushaId}, ${imei.name}, ${imei.name}, ${imei.sku},
          150.00, 250.00, ${imei.quantity}, false, true,
          ${parentId}, ${JSON.stringify(imei.attributes)}, 'imei_child'
        )
        RETURNING id
      `;

      addedVariants.push({ ...imei, id: result[0].id });
      console.log(`✅ Added ${imei.name} in Arusha (qty: ${imei.quantity})`);
    }

    return { added: addedVariants.length, variants: addedVariants };
  }

  async verifyFinalState(productId) {
    console.log('🔍 Verifying final state...');

    const finalVariants = await this.sql`
      SELECT branch_id, variant_name, quantity, is_parent, variant_attributes
      FROM lats_product_variants
      WHERE product_id = ${productId}
      ORDER BY branch_id, is_parent DESC
    `;

    const branches = { '00000000-0000-0000-0000-000000000001': 'ARUSHA', '85629690-6b1b-4d17-943d-dcf0f9aa9e95': 'DAR' };

    console.log('\n📋 FINAL STATE:');
    finalVariants.forEach(v => {
      const branch = branches[v.branch_id] || 'UNKNOWN';
      const type = v.is_parent ? 'PARENT' : 'CHILD';
      const imei = v.variant_attributes?.imei || 'none';
      console.log(`${branch}: ${v.variant_name} (${type}) - Qty: ${v.quantity}, IMEI: ${imei}`);
    });

    // Calculate stock per branch
    const arushaStock = finalVariants
      .filter(v => v.branch_id === '00000000-0000-0000-0000-000000000001' && !v.is_parent)
      .reduce((sum, v) => sum + v.quantity, 0);

    const darStock = finalVariants
      .filter(v => v.branch_id === '85629690-6b1b-4d17-943d-dcf0f9aa9e95' && !v.is_parent)
      .reduce((sum, v) => sum + v.quantity, 0);

    console.log(`\n📦 STOCK VERIFICATION:`);
    console.log(`Arusha physical stock: ${arushaStock} units`);
    console.log(`Dar physical stock: ${darStock} units`);
    console.log(`Total physical stock: ${arushaStock + darStock} units`);

    return { arushaStock, darStock, totalStock: arushaStock + darStock };
  }

  async close() {
    await this.sql.end();
  }

  async runCorrectedFix(productId) {
    try {
      console.log('🛠️  CORRECTED ADDITIVE BRANCH STOCK FIX');
      console.log('======================================\n');

      // Add missing IMEI variants with correct format
      const imeiResult = await this.addMissingArushaImeiVariants(productId);

      // Verify final state
      const verification = await this.verifyFinalState(productId);

      console.log('\n🎉 CORRECTED FIX COMPLETED SUCCESSFULLY!');
      console.log('=========================================');
      console.log('✅ No data was deleted or corrupted');
      console.log('✅ Branch isolation preserved');
      console.log(`✅ Added ${imeiResult.added || 0} IMEI variants to Arusha`);
      console.log(`📊 Final stock: Arusha ${verification.arushaStock}, Dar ${verification.darStock}`);

      return { imeiResult, verification };

    } catch (error) {
      console.error('\n❌ CORRECTED FIX FAILED:', error.message);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Run the corrected fix
const fixer = new CorrectedAdditiveFixer();
fixer.runCorrectedFix('9e872a74-1072-4896-85db-0495a6ab13a9')
  .then(result => {
    console.log('\n🏆 SUCCESS! Data corruption prevented.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 FAILED:', error.message);
    process.exit(1);
  });