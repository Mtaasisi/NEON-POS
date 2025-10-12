#!/usr/bin/env node

import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load database configuration
const dbConfig = JSON.parse(readFileSync(join(__dirname, 'database-config.json'), 'utf-8'));
const sql = postgres(dbConfig.url, {
  ssl: 'require',
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
};

async function importProductsFromBackup() {
  try {
    log.title('🚀 Starting Product Import from Backup (Schema Fixed)');

    // Read the backup file
    const backupPath = '/Users/mtaasisi/Downloads/database-backup-2025-10-01T22-09-09-482Z.json';
    log.info(`Reading backup file: ${backupPath}`);
    
    const backupData = JSON.parse(readFileSync(backupPath, 'utf-8'));
    log.success(`Backup loaded successfully - ${backupData.databaseInfo.totalTables} tables`);

    const stats = {
      categoriesCreated: 0,
      categoriesSkipped: 0,
      suppliersCreated: 0,
      suppliersSkipped: 0,
      productsCreated: 0,
      productsUpdated: 0,
      variantsCreated: 0,
      variantsSkipped: 0,
      errors: 0,
    };

    // Step 1: Import Categories
    log.title('📁 Importing Categories');
    const categories = backupData.tables.lats_categories?.data || [];
    log.info(`Found ${categories.length} categories to import`);

    for (const category of categories) {
      try {
        const existing = await sql`
          SELECT id FROM lats_categories WHERE id = ${category.id}
        `;

        if (existing.length > 0) {
          stats.categoriesSkipped++;
          continue;
        }

        await sql`
          INSERT INTO lats_categories (
            id, name, description, is_active, created_at, updated_at
          ) VALUES (
            ${category.id},
            ${category.name},
            ${category.description || null},
            ${category.is_active ?? true},
            ${category.created_at || new Date().toISOString()},
            ${category.updated_at || new Date().toISOString()}
          )
        `;
        
        stats.categoriesCreated++;
        log.success(`Created category: ${category.name}`);
      } catch (error) {
        stats.errors++;
        log.error(`Failed to import category ${category.name}: ${error.message}`);
      }
    }

    // Step 2: Import Suppliers
    log.title('🏢 Importing Suppliers');
    const suppliers = backupData.tables.lats_suppliers?.data || [];
    log.info(`Found ${suppliers.length} suppliers to import`);

    for (const supplier of suppliers) {
      try {
        const existing = await sql`
          SELECT id FROM lats_suppliers WHERE id = ${supplier.id}
        `;

        if (existing.length > 0) {
          stats.suppliersSkipped++;
          log.warn(`Supplier already exists: ${supplier.name}`);
          continue;
        }

        // Map to current schema (no website column)
        await sql`
          INSERT INTO lats_suppliers (
            id, name, contact_person, email, phone, address, 
            city, country, is_active, notes, created_at, updated_at
          ) VALUES (
            ${supplier.id},
            ${supplier.name},
            ${supplier.contact_person || null},
            ${supplier.email || null},
            ${supplier.phone || null},
            ${supplier.address || null},
            ${supplier.city || null},
            ${supplier.country || null},
            ${supplier.is_active ?? true},
            ${supplier.notes || null},
            ${supplier.created_at || new Date().toISOString()},
            ${supplier.updated_at || new Date().toISOString()}
          )
        `;
        
        stats.suppliersCreated++;
        log.success(`Created supplier: ${supplier.name}`);
      } catch (error) {
        stats.errors++;
        log.error(`Failed to import supplier ${supplier.name}: ${error.message}`);
      }
    }

    // Step 3: Import Products
    log.title('📦 Importing Products');
    const products = backupData.tables.lats_products?.data || [];
    log.info(`Found ${products.length} products to import`);

    for (const product of products) {
      try {
        const existing = await sql`
          SELECT id FROM lats_products WHERE id = ${product.id}
        `;

        // Map backup fields to current schema
        // selling_price -> unit_price
        // stock_quantity exists in both
        const unitPrice = product.selling_price || product.unit_price || 0;
        const costPrice = product.cost_price || 0;
        const stockQuantity = product.stock_quantity || product.total_quantity || 0;

        if (existing.length > 0) {
          await sql`
            UPDATE lats_products SET
              name = ${product.name},
              description = ${product.description || null},
              category_id = ${product.category_id || null},
              supplier_id = ${product.supplier_id || null},
              sku = ${product.sku || null},
              barcode = ${product.barcode || null},
              unit_price = ${unitPrice},
              cost_price = ${costPrice},
              stock_quantity = ${stockQuantity},
              min_stock_level = ${product.min_stock_level || 0},
              is_active = ${product.is_active ?? true},
              brand = ${product.brand || null},
              model = ${product.model || null},
              storage_room_id = ${product.storage_room_id || null},
              store_shelf_id = ${product.store_shelf_id || null},
              updated_at = ${new Date().toISOString()}
            WHERE id = ${product.id}
          `;
          
          stats.productsUpdated++;
          log.info(`Updated product: ${product.name}`);
        } else {
          await sql`
            INSERT INTO lats_products (
              id, name, description, category_id, supplier_id,
              sku, barcode, unit_price, cost_price, stock_quantity,
              min_stock_level, is_active, brand, model,
              storage_room_id, store_shelf_id, created_at, updated_at
            ) VALUES (
              ${product.id},
              ${product.name},
              ${product.description || null},
              ${product.category_id || null},
              ${product.supplier_id || null},
              ${product.sku || null},
              ${product.barcode || null},
              ${unitPrice},
              ${costPrice},
              ${stockQuantity},
              ${product.min_stock_level || 0},
              ${product.is_active ?? true},
              ${product.brand || null},
              ${product.model || null},
              ${product.storage_room_id || null},
              ${product.store_shelf_id || null},
              ${product.created_at || new Date().toISOString()},
              ${new Date().toISOString()}
            )
          `;
          
          stats.productsCreated++;
          log.success(`Created product: ${product.name} (Qty: ${stockQuantity}, Price: ${unitPrice} TZS)`);
        }
      } catch (error) {
        stats.errors++;
        log.error(`Failed to import product ${product.name}: ${error.message}`);
      }
    }

    // Step 4: Import Product Variants
    log.title('🎨 Importing Product Variants');
    const variants = backupData.tables.lats_product_variants?.data || [];
    log.info(`Found ${variants.length} product variants to import`);

    for (const variant of variants) {
      try {
        const existing = await sql`
          SELECT id FROM lats_product_variants WHERE id = ${variant.id}
        `;

        if (existing.length > 0) {
          stats.variantsSkipped++;
          continue;
        }

        // Map backup fields to current schema
        // name -> variant_name
        // stock_quantity -> quantity
        const variantName = variant.name || variant.variant_name || 'Default Variant';
        const quantity = variant.stock_quantity || variant.quantity || 0;
        const unitPrice = variant.selling_price || variant.unit_price || 0;
        const costPrice = variant.cost_price || 0;

        await sql`
          INSERT INTO lats_product_variants (
            id, product_id, variant_name, sku, barcode,
            quantity, min_quantity, unit_price, cost_price,
            is_active, created_at, updated_at
          ) VALUES (
            ${variant.id},
            ${variant.product_id},
            ${variantName},
            ${variant.sku || null},
            ${variant.barcode || null},
            ${quantity},
            ${variant.min_quantity || null},
            ${unitPrice},
            ${costPrice},
            ${variant.is_active ?? true},
            ${variant.created_at || new Date().toISOString()},
            ${variant.updated_at || new Date().toISOString()}
          )
        `;
        
        stats.variantsCreated++;
        log.success(`Created variant: ${variantName}`);
      } catch (error) {
        stats.errors++;
        log.error(`Failed to import variant: ${error.message}`);
      }
    }

    // Final Summary
    log.title('📊 Import Summary');
    console.log(`
${colors.bright}Categories:${colors.reset}
  ✓ Created: ${colors.green}${stats.categoriesCreated}${colors.reset}
  ⊘ Skipped: ${colors.yellow}${stats.categoriesSkipped}${colors.reset}

${colors.bright}Suppliers:${colors.reset}
  ✓ Created: ${colors.green}${stats.suppliersCreated}${colors.reset}
  ⊘ Skipped: ${colors.yellow}${stats.suppliersSkipped}${colors.reset}

${colors.bright}Products:${colors.reset}
  ✓ Created: ${colors.green}${stats.productsCreated}${colors.reset}
  ↻ Updated: ${colors.blue}${stats.productsUpdated}${colors.reset}

${colors.bright}Product Variants:${colors.reset}
  ✓ Created: ${colors.green}${stats.variantsCreated}${colors.reset}
  ⊘ Skipped: ${colors.yellow}${stats.variantsSkipped}${colors.reset}

${colors.bright}Errors:${colors.reset} ${stats.errors > 0 ? colors.red : colors.green}${stats.errors}${colors.reset}
    `);

    if (stats.errors === 0) {
      log.success('🎉 Import completed successfully!');
    } else {
      log.warn(`⚠️  Import completed with ${stats.errors} errors`);
    }

  } catch (error) {
    log.error(`Fatal error during import: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the import
importProductsFromBackup();

