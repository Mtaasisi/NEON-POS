#!/usr/bin/env node

/**
 * Restore all 199 products from SQL backup
 * This script parses the SQL file and inserts products one by one to ensure all are imported
 */

import { Pool } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env.production') });

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const SQL_FILE = path.join(__dirname, 'PROD BACKUP', 'lats_products_2025-12-07_01-43-50.sql');

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Parse SQL INSERT statement to extract product rows
 */
function parseProductRows(sqlContent) {
  const products = [];
  
  // Find all INSERT statements
  const insertMatches = sqlContent.matchAll(/INSERT INTO\s+lats_products\s*\(([^)]+)\)\s*VALUES\s*([^;]+);/gis);
  
  for (const match of insertMatches) {
    const columns = match[1].split(',').map(c => c.trim());
    const valuesSection = match[2].trim();
    
    // Split by ), to get individual rows (but be careful with nested parentheses in JSON)
    const rows = [];
    let currentRow = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = null;
    
    for (let i = 0; i < valuesSection.length; i++) {
      const char = valuesSection[i];
      const nextChar = valuesSection[i + 1];
      
      if (!inQuotes && char === '(') {
        depth++;
        if (depth === 1) {
          currentRow = '';
          continue;
        }
      } else if (!inQuotes && char === ')') {
        depth--;
        if (depth === 0) {
          rows.push(currentRow);
          currentRow = '';
          // Skip comma and whitespace after closing paren
          i++;
          while (i < valuesSection.length && (valuesSection[i] === ',' || valuesSection[i].match(/\s/))) {
            i++;
          }
          i--; // Adjust for loop increment
          continue;
        }
      } else if (!inQuotes && (char === "'" || char === '"')) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar && valuesSection[i - 1] !== '\\') {
        inQuotes = false;
        quoteChar = null;
      }
      
      if (depth > 0) {
        currentRow += char;
      }
    }
    
    // Process each row
    for (const row of rows) {
      if (!row.trim()) continue;
      
      // Simple parsing - split by comma but respect quotes and JSON
      const values = [];
      let currentValue = '';
      let inQuotes2 = false;
      let quoteChar2 = null;
      let inJson = false;
      let jsonDepth = 0;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        const nextChar = row[i + 1];
        
        if (!inQuotes2 && !inJson && char === "'" && nextChar === "'") {
          currentValue += "''";
          i++;
          continue;
        }
        
        if (!inQuotes2 && !inJson && (char === "'" || char === '"')) {
          inQuotes2 = true;
          quoteChar2 = char;
          currentValue += char;
          continue;
        }
        
        if (inQuotes2 && char === quoteChar2 && row[i - 1] !== '\\') {
          inQuotes2 = false;
          quoteChar2 = null;
          currentValue += char;
          continue;
        }
        
        if (!inQuotes2 && char === '{') {
          inJson = true;
          jsonDepth = 1;
          currentValue += char;
          continue;
        }
        
        if (inJson) {
          if (char === '{') jsonDepth++;
          if (char === '}') jsonDepth--;
          currentValue += char;
          if (jsonDepth === 0) {
            inJson = false;
          }
          continue;
        }
        
        if (!inQuotes2 && !inJson && char === ',' && (i === 0 || row[i - 1] !== '\\')) {
          values.push(currentValue.trim());
          currentValue = '';
          continue;
        }
        
        currentValue += char;
      }
      
      if (currentValue.trim()) {
        values.push(currentValue.trim());
      }
      
      if (values.length === columns.length) {
        const product = {};
        columns.forEach((col, idx) => {
          let value = values[idx];
          
          // Remove surrounding quotes
          if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1).replace(/''/g, "'");
          }
          
          // Handle NULL
          if (value === 'NULL' || value === 'null') {
            product[col] = null;
          }
          // Handle boolean
          else if (value === 'true' || value === 'false') {
            product[col] = value === 'true';
          }
          // Handle JSON
          else if (value.includes('::jsonb') || value.includes('::json')) {
            const jsonMatch = value.match(/^'(.+)'::jsonb$/);
            if (jsonMatch) {
              try {
                product[col] = JSON.parse(jsonMatch[1]);
              } catch {
                product[col] = jsonMatch[1];
              }
            } else {
              product[col] = value;
            }
          }
          // Handle timestamptz
          else if (value.includes('::timestamptz')) {
            const tsMatch = value.match(/^'(.+)'::timestamptz$/);
            product[col] = tsMatch ? tsMatch[1] : value;
          }
          // Handle numeric
          else if (!isNaN(value) && value !== '') {
            product[col] = parseFloat(value);
          }
          else {
            product[col] = value;
          }
        });
        
        products.push(product);
      }
    }
  }
  
  return products;
}

async function main() {
  try {
    console.log('🚀 Restore Products from SQL Backup');
    console.log('='.repeat(60));
    console.log(`📁 SQL File: ${SQL_FILE}`);
    console.log('='.repeat(60));

    if (!fs.existsSync(SQL_FILE)) {
      console.error(`❌ Error: File not found: ${SQL_FILE}`);
      process.exit(1);
    }

    console.log('\n📖 Reading and parsing SQL file...');
    const sqlContent = fs.readFileSync(SQL_FILE, 'utf8');
    
    // Get Arusha branch ID
    const branchesResult = await pool.query('SELECT id FROM lats_branches WHERE is_active = true LIMIT 1');
    const arushaBranchId = branchesResult.rows[0]?.id || '00000000-0000-0000-0000-000000000001';
    console.log(`📍 Using branch ID: ${arushaBranchId}\n`);

    // Parse products from SQL
    console.log('🔍 Parsing products from SQL...');
    const products = parseProductRows(sqlContent);
    console.log(`✅ Parsed ${products.length} products from SQL file\n`);

    if (products.length === 0) {
      console.error('❌ No products found in SQL file');
      process.exit(1);
    }

    // Replace branch_id in products
    products.forEach(product => {
      if (product.branch_id === '24cd45b8-1ce1-486a-b055-29d169c3a8ea') {
        product.branch_id = arushaBranchId;
      }
      // Ensure all products are active and shared
      product.is_active = true;
      product.is_shared = true;
      product.sharing_mode = 'shared';
    });

    console.log(`⚠️  About to import ${products.length} products`);
    console.log('   Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Import products in batches
    const BATCH_SIZE = 50;
    let imported = 0;
    let errors = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(products.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} products)...`);

      try {
        // Build INSERT query with ON CONFLICT
        const columns = Object.keys(batch[0]);
        const columnList = columns.join(', ');
        
        const values = batch.map((product, idx) => {
          const rowValues = columns.map((col, colIdx) => {
            const paramNum = idx * columns.length + colIdx + 1;
            const value = product[col];
            
            if (value === null || value === undefined) {
              return 'NULL';
            }
            
            if (typeof value === 'object') {
              return `$${paramNum}::jsonb`;
            }
            
            if (col === 'id' || col === 'branch_id' || col === 'category_id' || col === 'supplier_id') {
              return `$${paramNum}::uuid`;
            }
            
            if (col.includes('_at') || col === 'created_at' || col === 'updated_at') {
              return `$${paramNum}::timestamptz`;
            }
            
            if (typeof value === 'boolean') {
              return `$${paramNum}::boolean`;
            }
            
            if (typeof value === 'number') {
              return `$${paramNum}::numeric`;
            }
            
            return `$${paramNum}::text`;
          }).join(', ');
          return `(${rowValues})`;
        }).join(', ');

        const params = batch.flatMap(product => 
          columns.map(col => {
            const value = product[col];
            if (value === null || value === undefined) return null;
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          })
        );

        const updateClauses = columns
          .filter(col => col !== 'id')
          .map(col => `${col} = EXCLUDED.${col}`)
          .join(', ');

        const query = `
          INSERT INTO lats_products (${columnList})
          VALUES ${values}
          ON CONFLICT (id) DO UPDATE SET ${updateClauses}
        `;

        await pool.query(query, params);
        imported += batch.length;
        console.log(`   ✅ Imported ${batch.length} products`);
      } catch (error) {
        console.error(`   ❌ Error in batch ${batchNum}:`, error.message);
        errors += batch.length;
      }
    }

    // Final verification
    console.log('\n' + '='.repeat(60));
    console.log('🔍 VERIFICATION');
    console.log('='.repeat(60));
    
    const finalCount = await pool.query('SELECT COUNT(*) as count FROM lats_products WHERE is_active = true');
    console.log(`Total active products: ${finalCount.rows[0].count}`);

    // Ensure Arusha branch settings
    await pool.query(`
      UPDATE store_locations
      SET 
        data_isolation_mode = 'hybrid',
        share_products = true,
        share_inventory = true,
        updated_at = NOW()
      WHERE id = $1
    `, [arushaBranchId]);

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESTORE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Products imported: ${imported}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📦 Total active products: ${finalCount.rows[0].count}`);
    console.log(`✅ Arusha branch configured to show all products`);
    console.log('='.repeat(60));
    console.log('\n🎉 Restore completed!');
    console.log('💡 Hard refresh your browser to see all products');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
