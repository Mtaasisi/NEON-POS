#!/usr/bin/env node

/**
 * Fix Unrecognized Categories
 * 
 * This script finds all products with categories that don't exist
 * in the lats_categories table and either:
 * 1. Maps them to existing categories by name match
 * 2. Assigns them to "Uncategorized" if no match found
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.production') });

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Error: SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY not found in environment');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Normalize category name for matching
 */
function normalizeCategoryName(name) {
  if (!name) return '';
  return name.trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Find best matching category
 */
function findBestMatch(categoryName, categories) {
  if (!categoryName) return null;
  
  const normalized = normalizeCategoryName(categoryName);
  
  // Exact match
  for (const cat of categories) {
    if (normalizeCategoryName(cat.name) === normalized) {
      return cat;
    }
  }
  
  // Partial match (contains)
  for (const cat of categories) {
    const catNormalized = normalizeCategoryName(cat.name);
    if (normalized.includes(catNormalized) || catNormalized.includes(normalized)) {
      return cat;
    }
  }
  
  // Special mappings
  const mappings = {
    'iphone': 'iPhones',
    'ipad': 'iPad',
    'smartphone': 'Smartphones',
    'tablet': 'Tablets',
    'android tablet': 'Android Tablets',
    'laptop': 'Laptop',
    'macbook': 'MacBook',
    'monitor': 'Monitors',
    'tv': 'TVs',
    'speaker': 'Bluetooth Speakers',
    'soundbar': 'Soundbars',
    'charger': 'Chargers',
    'keyboard': 'Keyboards',
    'accessory': 'Accessories',
    'accessories': 'Accessories',
    'accsesories': 'Accessories', // Fix typo
    'spare part': 'Spare Parts',
    'computer': 'Computers',
    'audio': 'Audio & Sound',
  };
  
  for (const [key, mappedName] of Object.entries(mappings)) {
    if (normalized.includes(key)) {
      const matched = categories.find(c => 
        normalizeCategoryName(c.name) === normalizeCategoryName(mappedName)
      );
      if (matched) return matched;
    }
  }
  
  return null;
}

/**
 * Get Uncategorized category ID
 */
async function getUncategorizedCategoryId() {
  const { data, error } = await supabase
    .from('lats_categories')
    .select('id')
    .eq('name', 'Uncategorized')
    .maybeSingle();
  
  if (error) {
    console.error('Error fetching Uncategorized category:', error);
    return null;
  }
  
  if (!data) {
    console.error('❌ Uncategorized category not found!');
    return null;
  }
  
  return data.id;
}

/**
 * Main function to fix unrecognized categories
 */
async function fixUnrecognizedCategories() {
  console.log('🔍 Finding products with unrecognized categories...\n');
  
  try {
    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('lats_categories')
      .select('id, name')
      .eq('is_active', true);
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
      process.exit(1);
    }
    
    console.log(`✅ Found ${categories.length} active categories\n`);
    
    // Get Uncategorized category ID
    const uncategorizedId = await getUncategorizedCategoryId();
    if (!uncategorizedId) {
      console.error('❌ Cannot proceed without Uncategorized category');
      process.exit(1);
    }
    
    console.log(`📍 Uncategorized category ID: ${uncategorizedId}\n`);
    
    // Get all products
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('id, name, category, category_id');
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      process.exit(1);
    }
    
    console.log(`📦 Found ${products.length} products\n`);
    
    // Find products with unrecognized categories
    const unrecognized = [];
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const categoryNameMap = new Map(categories.map(c => [normalizeCategoryName(c.name), c]));
    
    for (const product of products) {
      let needsUpdate = false;
      let newCategoryId = null;
      let reason = '';
      
      // Check if category_id exists and is valid
      if (product.category_id) {
        if (!categoryMap.has(product.category_id)) {
          needsUpdate = true;
          reason = `category_id ${product.category_id} not found`;
        }
      }
      
      // Check if category string field exists and can be matched
      if (product.category && product.category.trim()) {
        const categoryName = product.category.trim();
        const normalized = normalizeCategoryName(categoryName);
        
        // Check if it matches an existing category
        if (categoryNameMap.has(normalized)) {
          const matchedCategory = categoryNameMap.get(normalized);
          if (product.category_id !== matchedCategory.id) {
            needsUpdate = true;
            newCategoryId = matchedCategory.id;
            reason = `category "${categoryName}" matches "${matchedCategory.name}"`;
          }
        } else if (!product.category_id || !categoryMap.has(product.category_id)) {
          // Try to find best match
          const bestMatch = findBestMatch(categoryName, categories);
          if (bestMatch) {
            needsUpdate = true;
            newCategoryId = bestMatch.id;
            reason = `category "${categoryName}" mapped to "${bestMatch.name}"`;
          } else {
            needsUpdate = true;
            newCategoryId = uncategorizedId;
            reason = `category "${categoryName}" not found, using Uncategorized`;
          }
        }
      } else if (!product.category_id || !categoryMap.has(product.category_id)) {
        // No category at all
        needsUpdate = true;
        newCategoryId = uncategorizedId;
        reason = 'no category assigned';
      }
      
      if (needsUpdate) {
        unrecognized.push({
          id: product.id,
          name: product.name,
          oldCategory: product.category,
          oldCategoryId: product.category_id,
          newCategoryId: newCategoryId || uncategorizedId,
          reason,
        });
      }
    }
    
    console.log(`⚠️  Found ${unrecognized.length} products with unrecognized categories\n`);
    
    if (unrecognized.length === 0) {
      console.log('✅ All products have valid categories!');
      return;
    }
    
    // Show summary
    const byReason = {};
    for (const item of unrecognized) {
      const key = item.reason.split(' - ')[0];
      byReason[key] = (byReason[key] || 0) + 1;
    }
    
    console.log('📊 Summary:');
    for (const [reason, count] of Object.entries(byReason)) {
      console.log(`   - ${reason}: ${count} products`);
    }
    
    // Show first 10 examples
    console.log('\n📋 Examples (first 10):');
    unrecognized.slice(0, 10).forEach((item, idx) => {
      const oldCat = item.oldCategory || (item.oldCategoryId ? `[ID: ${item.oldCategoryId}]` : 'none');
      const newCat = categories.find(c => c.id === item.newCategoryId)?.name || 'Uncategorized';
      console.log(`   ${idx + 1}. "${item.name}"`);
      console.log(`      Old: ${oldCat} → New: ${newCat}`);
      console.log(`      Reason: ${item.reason}`);
    });
    
    if (unrecognized.length > 10) {
      console.log(`   ... and ${unrecognized.length - 10} more\n`);
    }
    
    // Ask for confirmation (in automated mode, proceed)
    console.log('\n🔄 Updating products...\n');
    
    let updated = 0;
    let errors = 0;
    const batchSize = 50;
    
    for (let i = 0; i < unrecognized.length; i += batchSize) {
      const batch = unrecognized.slice(i, i + batchSize);
      
      for (const item of batch) {
        const updateData = {
          category_id: item.newCategoryId,
          updated_at: new Date().toISOString(),
        };
        
        // Clear the old category string field if it doesn't match
        const newCategoryName = categories.find(c => c.id === item.newCategoryId)?.name;
        if (item.oldCategory && normalizeCategoryName(item.oldCategory) !== normalizeCategoryName(newCategoryName || '')) {
          updateData.category = newCategoryName || null;
        }
        
        const { error: updateError } = await supabase
          .from('lats_products')
          .update(updateData)
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating product "${item.name}":`, updateError.message);
          errors++;
        } else {
          updated++;
          if (updated % 10 === 0) {
            process.stdout.write(`  ✓ Updated ${updated}/${unrecognized.length} products...\r`);
          }
        }
      }
    }
    
    console.log(`\n\n✅ Update completed!`);
    console.log(`   - Updated: ${updated} products`);
    console.log(`   - Errors: ${errors} products`);
    
    // Verify results
    console.log('\n🔍 Verifying results...');
    const { data: remainingProducts, error: verifyError } = await supabase
      .from('lats_products')
      .select('id, category_id')
      .not('category_id', 'is', null);
    
    if (!verifyError) {
      const invalidIds = remainingProducts.filter(p => !categoryMap.has(p.category_id));
      if (invalidIds.length === 0) {
        console.log('✅ All products now have valid category IDs!');
      } else {
        console.log(`⚠️  Warning: ${invalidIds.length} products still have invalid category IDs`);
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the fix
fixUnrecognizedCategories()
  .then(() => {
    console.log('\n✅ Category fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Category fix failed:', error);
    process.exit(1);
  });
