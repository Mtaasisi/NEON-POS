#!/usr/bin/env node

/**
 * Export Products to CSV Template
 * 
 * This script exports all products from the database to a CSV file
 * that can be used as a template for future imports.
 * 
 * Usage:
 *   node export-products-to-csv.mjs [output-file.csv]
 * 
 * The CSV will include:
 * - Product information (name, SKU, description, etc.)
 * - Category information
 * - Supplier information
 * - Variant details (one row per variant)
 * - All relevant fields for import
 */

import { createClient } from '@supabase/supabase-js';
import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.production') });

// Database configuration
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL || 
  'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 
  'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

// Determine if using Supabase or direct PostgreSQL
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const USE_DIRECT_POSTGRES = !!(DATABASE_URL && (DATABASE_URL.includes('neon.tech') || DATABASE_URL.includes('postgresql://')));

let supabase;
let pool;

// Initialize database connection
if (USE_SUPABASE) {
  console.log('🔗 Using Supabase REST API');
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (USE_DIRECT_POSTGRES) {
  console.log('🔗 Using direct PostgreSQL connection');
  pool = new Pool({ connectionString: DATABASE_URL });
} else {
  console.error('❌ No database connection configured');
  process.exit(1);
}

/**
 * Escape CSV field value
 */
function escapeCsvField(value) {
  if (value === null || value === undefined) return '';
  
  const str = String(value);
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Convert array to CSV-safe string
 */
function arrayToCsvString(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return '';
  return arr.map(item => String(item)).join('; ');
}

/**
 * Convert object to JSON string for CSV
 */
function objectToCsvString(obj) {
  if (!obj || typeof obj !== 'object') return '';
  return JSON.stringify(obj).replace(/"/g, '""');
}

/**
 * Fetch products from database
 */
async function fetchProducts() {
  console.log('📦 Fetching products from database...');
  
  if (USE_SUPABASE) {
    // Fetch products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('*')
      .order('name');
    
    if (productsError) {
      throw new Error(`Failed to fetch products: ${productsError.message}`);
    }
    
    if (!products || products.length === 0) {
      return [];
    }
    
    // Fetch categories
    const categoryIds = [...new Set(products.map(p => p.category_id).filter(Boolean))];
    const { data: categories } = await supabase
      .from('lats_categories')
      .select('*')
      .in('id', categoryIds);
    
    const categoryMap = new Map((categories || []).map(c => [c.id, c]));
    
    // Fetch suppliers
    const supplierIds = [...new Set(products.map(p => p.supplier_id).filter(Boolean))];
    const { data: suppliers } = await supabase
      .from('lats_suppliers')
      .select('*')
      .in('id', supplierIds);
    
    const supplierMap = new Map((suppliers || []).map(s => [s.id, s]));
    
    // Fetch variants
    const productIds = products.map(p => p.id);
    const { data: variants } = await supabase
      .from('lats_product_variants')
      .select('*')
      .in('product_id', productIds);
    
    // Create variant map and parent variant map
    const variantMap = new Map();
    const allVariantIds = (variants || []).map(v => v.id);
    const parentVariantIds = (variants || []).map(v => v.parent_variant_id).filter(Boolean);
    
    // Fetch parent variants if any
    let parentVariants = [];
    if (parentVariantIds.length > 0) {
      const { data: parentVars } = await supabase
        .from('lats_product_variants')
        .select('id, sku, name, variant_name')
        .in('id', parentVariantIds);
      parentVariants = parentVars || [];
    }
    
    const parentVariantMap = new Map(parentVariants.map(pv => [pv.id, pv]));
    
    (variants || []).forEach(v => {
      if (!variantMap.has(v.product_id)) {
        variantMap.set(v.product_id, []);
      }
      variantMap.get(v.product_id).push({
        ...v,
        parent_variant: v.parent_variant_id ? parentVariantMap.get(v.parent_variant_id) : null
      });
    });
    
    // Enrich products with related data
    return products.map(product => ({
      ...product,
      category: categoryMap.get(product.category_id) || null,
      supplier: supplierMap.get(product.supplier_id) || null,
      variants: variantMap.get(product.id) || []
    }));
  } else {
    // Direct PostgreSQL query
    const query = `
      SELECT 
        p.*,
        json_build_object(
          'name', c.name,
          'description', c.description,
          'color', c.color
        ) as category,
        json_build_object(
          'name', s.name,
          'contact_person', s.contact_person,
          'email', s.email,
          'phone', s.phone,
          'address', s.address,
          'website_url', s.website_url,
          'notes', s.notes
        ) as supplier,
        COALESCE(
          json_agg(
            json_build_object(
              'id', v.id,
              'sku', v.sku,
              'name', v.name,
              'variant_name', v.variant_name,
              'barcode', v.barcode,
              'cost_price', v.cost_price,
              'selling_price', v.selling_price,
              'quantity', v.quantity,
              'min_quantity', v.min_quantity,
              'weight', v.weight,
              'dimensions', v.dimensions,
              'variant_type', v.variant_type,
              'is_parent', v.is_parent,
              'parent_variant_id', v.parent_variant_id,
              'variant_attributes', v.variant_attributes,
              'is_active', v.is_active,
              'branch_id', v.branch_id,
              'created_at', v.created_at,
              'updated_at', v.updated_at
            )
          ) FILTER (WHERE v.id IS NOT NULL),
          '[]'::json
        ) as variants
      FROM lats_products p
      LEFT JOIN lats_categories c ON p.category_id = c.id
      LEFT JOIN lats_suppliers s ON p.supplier_id = s.id
      LEFT JOIN lats_product_variants v ON p.id = v.product_id
      GROUP BY p.id, c.id, s.id
      ORDER BY p.name
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => ({
      ...row,
      variants: row.variants || []
    }));
  }
}

/**
 * Convert products to CSV rows
 */
function productsToCsvRows(products) {
  const rows = [];
  
  // CSV Headers - Template format
  const headers = [
    'Product Name',
    'Product SKU',
    'Product Barcode',
    'Description',
    'Short Description',
    'Category Name',
    'Category ID',
    'Supplier Name',
    'Supplier ID',
    'Condition',
    'Is Active',
    'Images (semicolon separated)',
    'Metadata (JSON)',
    'Variant SKU',
    'Variant Name',
    'Variant Barcode',
    'Variant Type',
    'Is Parent Variant',
    'Parent Variant SKU',
    'Cost Price',
    'Selling Price',
    'Quantity',
    'Min Quantity',
    'Weight',
    'Dimensions (JSON)',
    'Variant Attributes (JSON)',
    'IMEI',
    'Serial Number',
    'Variant Is Active',
    'Branch ID',
    'Created At',
    'Updated At'
  ];
  
  rows.push(headers);
  
  // Process each product
  for (const product of products) {
    const category = product.category || {};
    const supplier = product.supplier || {};
    const variants = Array.isArray(product.variants) ? product.variants : [];
    
    // If no variants, create one row with product data only
    if (variants.length === 0) {
      const row = [
        escapeCsvField(product.name || ''),
        escapeCsvField(product.sku || ''),
        escapeCsvField(product.barcode || ''),
        escapeCsvField(product.description || ''),
        escapeCsvField(product.short_description || product.description || ''),
        escapeCsvField(category.name || ''),
        escapeCsvField(product.category_id || ''),
        escapeCsvField(supplier.name || ''),
        escapeCsvField(product.supplier_id || ''),
        escapeCsvField(product.condition || 'new'),
        escapeCsvField(product.is_active ? 'Yes' : 'No'),
        escapeCsvField(arrayToCsvString(product.images || [])),
        escapeCsvField(objectToCsvString(product.metadata || {})),
        '', // Variant SKU
        '', // Variant Name
        '', // Variant Barcode
        '', // Variant Type
        '', // Is Parent
        '', // Parent Variant SKU
        escapeCsvField(product.cost_price || 0),
        escapeCsvField(product.selling_price || product.unit_price || 0),
        escapeCsvField(product.stock_quantity || product.total_quantity || 0),
        escapeCsvField(product.min_stock_level || 0),
        '', // Weight
        '', // Dimensions
        '', // Variant Attributes
        '', // IMEI
        '', // Serial Number
        '', // Variant Is Active
        escapeCsvField(product.branch_id || ''),
        escapeCsvField(product.created_at || ''),
        escapeCsvField(product.updated_at || '')
      ];
      rows.push(row);
    } else {
      // Create one row per variant
      for (const variant of variants) {
        const parentVariant = variant.parent_variant || {};
        const variantAttributes = variant.variant_attributes || {};
        
        const row = [
          escapeCsvField(product.name || ''),
          escapeCsvField(product.sku || ''),
          escapeCsvField(product.barcode || ''),
          escapeCsvField(product.description || ''),
          escapeCsvField(product.short_description || product.description || ''),
          escapeCsvField(category.name || ''),
          escapeCsvField(product.category_id || ''),
          escapeCsvField(supplier.name || ''),
          escapeCsvField(product.supplier_id || ''),
          escapeCsvField(product.condition || 'new'),
          escapeCsvField(product.is_active ? 'Yes' : 'No'),
          escapeCsvField(arrayToCsvString(product.images || [])),
          escapeCsvField(objectToCsvString(product.metadata || {})),
          escapeCsvField(variant.sku || ''),
          escapeCsvField(variant.name || variant.variant_name || ''),
          escapeCsvField(variant.barcode || ''),
          escapeCsvField(variant.variant_type || 'standard'),
          escapeCsvField(variant.is_parent ? 'Yes' : 'No'),
          escapeCsvField(parentVariant.sku || ''),
          escapeCsvField(variant.cost_price || 0),
          escapeCsvField(variant.selling_price || 0),
          escapeCsvField(variant.quantity || 0),
          escapeCsvField(variant.min_quantity || 0),
          escapeCsvField(variant.weight || ''),
          escapeCsvField(objectToCsvString(variant.dimensions || {})),
          escapeCsvField(objectToCsvString(variantAttributes)),
          escapeCsvField(variantAttributes.imei || ''),
          escapeCsvField(variantAttributes.serial_number || ''),
          escapeCsvField(variant.is_active !== false ? 'Yes' : 'No'),
          escapeCsvField(variant.branch_id || product.branch_id || ''),
          escapeCsvField(variant.created_at || product.created_at || ''),
          escapeCsvField(variant.updated_at || product.updated_at || '')
        ];
        rows.push(row);
      }
    }
  }
  
  return rows;
}

/**
 * Write CSV file
 */
function writeCsvFile(rows, outputPath) {
  console.log(`📝 Writing CSV file to: ${outputPath}`);
  
  const csvContent = rows.map(row => row.join(',')).join('\n');
  fs.writeFileSync(outputPath, csvContent, 'utf8');
  
  console.log(`✅ CSV file written successfully!`);
  console.log(`   Total rows: ${rows.length - 1} (excluding header)`);
  console.log(`   Total columns: ${rows[0]?.length || 0}`);
}

/**
 * Main function
 */
async function main() {
  try {
    const outputFile = process.argv[2] || `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    const outputPath = path.isAbsolute(outputFile) ? outputFile : path.join(__dirname, outputFile);
    
    console.log('🚀 Starting product export to CSV...\n');
    
    // Fetch products
    const products = await fetchProducts();
    console.log(`✅ Fetched ${products.length} products\n`);
    
    if (products.length === 0) {
      console.log('⚠️  No products found in database');
      return;
    }
    
    // Convert to CSV rows
    console.log('📊 Converting products to CSV format...');
    const csvRows = productsToCsvRows(products);
    
    // Write CSV file
    writeCsvFile(csvRows, outputPath);
    
    console.log('\n✨ Export completed successfully!');
    console.log(`\n📋 The CSV file can be used as a template for importing products.`);
    console.log(`   File location: ${outputPath}\n`);
    
  } catch (error) {
    console.error('❌ Export failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
main();
