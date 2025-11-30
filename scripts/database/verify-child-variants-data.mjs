/**
 * Verify Child Variants Data in Database
 * 
 * This script checks if there are parent/child variants in the database
 * and verifies their IMEI data
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Missing DATABASE_URL');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

console.log('\n🔍 ========================================');
console.log('🔍 CHILD VARIANTS DATA VERIFICATION');
console.log('🔍 ========================================\n');

async function verifyChildVariants() {
  try {
    // Step 1: Check for parent variants
    console.log('📋 STEP 1: Checking for parent variants...');
    const parentVariants = await sql`
      SELECT id, product_id, variant_name, variant_type, is_parent, quantity, selling_price
      FROM lats_product_variants
      WHERE (is_parent = true OR variant_type = 'parent')
        AND is_active = true
      LIMIT 10
    `;

    console.log(`✅ Found ${parentVariants?.length || 0} parent variants\n`);

    if (!parentVariants || parentVariants.length === 0) {
      console.log('⚠️  No parent variants found in database');
      console.log('💡 You may need to create parent variants with child IMEI devices\n');
      return;
    }

    // Display parent variants
    console.log('📦 Parent Variants:');
    console.log('═══════════════════════════════════════');
    parentVariants.forEach((parent, index) => {
      console.log(`${index + 1}. ${parent.variant_name}`);
      console.log(`   ID: ${parent.id}`);
      console.log(`   Type: ${parent.variant_type}`);
      console.log(`   Is Parent: ${parent.is_parent}`);
      console.log(`   Quantity: ${parent.quantity}`);
      console.log(`   Price: TSh ${parent.selling_price?.toLocaleString()}`);
      console.log();
    });

    // Step 2: Check for child variants
    console.log('\n📋 STEP 2: Checking for child variants...');
    
    for (const parent of parentVariants.slice(0, 3)) { // Check first 3 parents
      console.log(`\n🔍 Checking children for: ${parent.variant_name}`);
      console.log('───────────────────────────────────────');
      
      const children = await sql`
        SELECT id, variant_name, variant_type, variant_attributes, attributes, quantity, selling_price, is_active
        FROM lats_product_variants
        WHERE parent_variant_id = ${parent.id}
          AND variant_type = 'imei_child'
          AND is_active = true
      `;

      if (!children || children.length === 0) {
        console.log(`⚠️  No child variants found for parent: ${parent.variant_name}`);
        console.log(`   Parent ID: ${parent.id}`);
        console.log(`   💡 This parent variant needs child IMEI devices\n`);
        continue;
      }

      console.log(`✅ Found ${children.length} child variant(s)`);
      
      children.forEach((child, index) => {
        const imei = child.variant_attributes?.imei || child.attributes?.imei || 'MISSING';
        const serialNumber = child.variant_attributes?.serial_number || child.attributes?.serial_number;
        const condition = child.variant_attributes?.condition || child.attributes?.condition;
        
        console.log(`\n   Child ${index + 1}:`);
        console.log(`   ├─ Name: ${child.variant_name}`);
        console.log(`   ├─ IMEI: ${imei}`);
        if (serialNumber) console.log(`   ├─ Serial: ${serialNumber}`);
        if (condition) console.log(`   ├─ Condition: ${condition}`);
        console.log(`   ├─ Quantity: ${child.quantity}`);
        console.log(`   ├─ Price: TSh ${child.selling_price?.toLocaleString()}`);
        console.log(`   └─ Active: ${child.is_active ? '✅' : '❌'}`);
        
        if (imei === 'MISSING') {
          console.log(`   ⚠️  WARNING: This child variant is missing IMEI!`);
        }
      });
    }

    // Step 3: Summary
    console.log('\n\n📊 ========================================');
    console.log('📊 SUMMARY');
    console.log('📊 ========================================');
    
    let totalChildren = 0;
    let childrenWithIMEI = 0;
    let childrenWithoutIMEI = 0;
    
    for (const parent of parentVariants) {
      const children = await sql`
        SELECT variant_attributes, attributes
        FROM lats_product_variants
        WHERE parent_variant_id = ${parent.id}
          AND variant_type = 'imei_child'
          AND is_active = true
      `;
      
      if (children && children.length > 0) {
        totalChildren += children.length;
        children.forEach(child => {
          const imei = child.variant_attributes?.imei || child.attributes?.imei;
          if (imei) {
            childrenWithIMEI++;
          } else {
            childrenWithoutIMEI++;
          }
        });
      }
    }
    
    console.log(`Total Parent Variants: ${parentVariants.length}`);
    console.log(`Total Child Variants: ${totalChildren}`);
    console.log(`Children with IMEI: ${childrenWithIMEI} ✅`);
    console.log(`Children without IMEI: ${childrenWithoutIMEI} ${childrenWithoutIMEI > 0 ? '⚠️' : ''}`);
    
    if (totalChildren === 0) {
      console.log('\n❌ ISSUE FOUND: No child variants exist!');
      console.log('💡 SOLUTION: Create child variants for parent variants');
      console.log('   - Each parent variant should have child "imei_child" variants');
      console.log('   - Each child should have IMEI in variant_attributes');
    } else if (childrenWithoutIMEI > 0) {
      console.log('\n⚠️  ISSUE FOUND: Some child variants are missing IMEI data!');
      console.log('💡 SOLUTION: Update child variants to include IMEI in variant_attributes');
    } else {
      console.log('\n✅ All child variants have IMEI data!');
      console.log('   The issue might be in the UI display logic');
    }

    // Step 4: Check a specific product structure
    console.log('\n\n📋 STEP 3: Checking product structure...');
    
    if (parentVariants.length > 0) {
      const sampleParent = parentVariants[0];
      const productResult = await sql`
        SELECT id, name
        FROM lats_products
        WHERE id = ${sampleParent.product_id}
        LIMIT 1
      `;
      
      if (productResult && productResult.length > 0) {
        const product = productResult[0];
        console.log(`\n📦 Sample Product: ${product.name}`);
        console.log(`   Product ID: ${product.id}`);
        
        const allVariants = await sql`
          SELECT id, variant_name, variant_type, is_parent, parent_variant_id
          FROM lats_product_variants
          WHERE product_id = ${product.id}
            AND is_active = true
        `;
        
        if (allVariants && allVariants.length > 0) {
          console.log(`   Total Variants: ${allVariants.length}`);
          const parents = allVariants.filter(v => v.is_parent || v.variant_type === 'parent');
          const children = allVariants.filter(v => v.variant_type === 'imei_child');
          console.log(`   - Parent Variants: ${parents.length}`);
          console.log(`   - Child Variants: ${children.length}`);
          
          if (parents.length > 0 && children.length === 0) {
            console.log('\n   ⚠️  This product has parent variants but no children!');
          }
        }
      }
    }

    console.log('\n✅ Verification complete!\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

verifyChildVariants();

