#!/usr/bin/env node

/**
 * Delete Unrecognized Categories
 * 
 * This script finds and deletes categories that are:
 * 1. Orphaned (parent_id doesn't exist)
 * 2. Have invalid references
 * 3. Don't have required data
 * 4. Not being used by any products
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
 * Find unrecognized categories
 */
async function findUnrecognizedCategories() {
  console.log('🔍 Finding unrecognized categories...\n');
  
  try {
    // Get all categories
    const { data: categories, error: categoriesError } = await supabase
      .from('lats_categories')
      .select('*');
    
    if (categoriesError) {
      console.error('❌ Error fetching categories:', categoriesError);
      process.exit(1);
    }
    
    console.log(`📦 Found ${categories.length} total categories\n`);
    
    // Get all products to check category usage
    const { data: products, error: productsError } = await supabase
      .from('lats_products')
      .select('category_id');
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError);
      process.exit(1);
    }
    
    const usedCategoryIds = new Set(products.map(p => p.category_id).filter(Boolean));
    console.log(`📦 Found ${products.length} products using ${usedCategoryIds.size} categories\n`);
    
    // Build category map
    const categoryMap = new Map(categories.map(c => [c.id, c]));
    
    // Find orphaned categories (parent_id doesn't exist)
    const orphaned = categories.filter(c => {
      if (!c.parent_id) return false;
      return !categoryMap.has(c.parent_id);
    });
    
    // Find categories with invalid data
    const invalidData = categories.filter(c => {
      // Check for categories with no name or empty name
      const hasNoName = !c.name || c.name.trim() === '';
      return hasNoName;
    });
    
    // Find unused categories (not used by any products)
    const unused = categories.filter(c => !usedCategoryIds.has(c.id));
    
    // Find categories with circular references (self-referencing)
    const circular = categories.filter(c => c.parent_id === c.id);
    
    // Find typo categories (like "Accsesories" instead of "Accessories")
    const typoCategories = categories.filter(c => {
      const name = c.name.toLowerCase();
      // Known typos
      if (name === 'accsesories') return true;
      // Add more typo patterns if needed
      return false;
    });
    
    // Find unused leaf categories (categories with no children AND no products)
    // These are safe to delete as they're not part of the hierarchy structure
    const childrenMap = new Map();
    categories.forEach(c => {
      if (c.parent_id) {
        if (!childrenMap.has(c.parent_id)) {
          childrenMap.set(c.parent_id, []);
        }
        childrenMap.get(c.parent_id).push(c);
      }
    });
    
    const unusedLeafCategories = categories.filter(c => {
      // Must be unused by products
      if (usedCategoryIds.has(c.id)) return false;
      // Must have no children
      if (childrenMap.has(c.id) && childrenMap.get(c.id).length > 0) return false;
      return true;
    });
    
    // Combine all unrecognized categories
    const unrecognized = [
      ...orphaned,
      ...invalidData.filter(c => !orphaned.includes(c)),
      ...circular.filter(c => !orphaned.includes(c) && !invalidData.includes(c)),
      ...typoCategories.filter(c => !orphaned.includes(c) && !invalidData.includes(c) && !circular.includes(c))
    ];
    
    // Remove duplicates
    const uniqueUnrecognized = Array.from(
      new Map(unrecognized.map(c => [c.id, c])).values()
    );
    
    console.log('📊 Analysis Results:\n');
    console.log(`  - Orphaned categories (parent_id doesn't exist): ${orphaned.length}`);
    console.log(`  - Categories with invalid/missing data: ${invalidData.length}`);
    console.log(`  - Categories with circular references: ${circular.length}`);
    console.log(`  - Typo categories (like "Accsesories"): ${typoCategories.length}`);
    console.log(`  - Unused leaf categories (no children, no products): ${unusedLeafCategories.length}`);
    console.log(`  - Total unused categories (not used by products): ${unused.length}`);
    console.log(`  - Total unrecognized categories: ${uniqueUnrecognized.length}\n`);
    
    // Always return unusedLeafCategories even if no unrecognized categories
    if (uniqueUnrecognized.length === 0) {
      if (unusedLeafCategories.length > 0) {
        console.log('✅ No unrecognized categories found, but unused leaf categories are available.');
      } else {
        console.log('✅ No unrecognized categories found!');
      }
      return { unrecognized: [], unused, unusedLeafCategories, typoCategories: [] };
    }
    
    // Show examples
    console.log('📋 Examples of unrecognized categories (first 10):\n');
    uniqueUnrecognized.slice(0, 10).forEach((category, idx) => {
      let reason = 'Unknown';
      if (orphaned.includes(category)) reason = 'Orphaned (parent not found)';
      else if (invalidData.includes(category)) reason = 'Invalid/missing data';
      else if (circular.includes(category)) reason = 'Circular reference';
      else if (typoCategories.includes(category)) reason = 'Typo category';
      
      const isUsed = usedCategoryIds.has(category.id);
      const parent = category.parent_id ? categoryMap.get(category.parent_id) : null;
      
      console.log(`  ${idx + 1}. ID: ${category.id}`);
      console.log(`     Name: ${category.name || 'N/A'}`);
      console.log(`     Parent ID: ${category.parent_id || 'None'}`);
      console.log(`     Parent Name: ${parent?.name || 'N/A'}`);
      console.log(`     Used by products: ${isUsed ? 'Yes' : 'No'}`);
      console.log(`     Reason: ${reason}`);
      console.log('');
    });
    
    if (uniqueUnrecognized.length > 10) {
      console.log(`  ... and ${uniqueUnrecognized.length - 10} more\n`);
    } else {
      if (unusedLeafCategories.length > 0) {
        console.log('📋 Unused leaf categories available (first 10):\n');
        unusedLeafCategories.slice(0, 10).forEach((category, idx) => {
          const parent = categoryMap.get(category.parent_id);
          console.log(`  ${idx + 1}. ${category.name} (parent: ${parent?.name || 'none'})`);
        });
        if (unusedLeafCategories.length > 10) {
          console.log(`  ... and ${unusedLeafCategories.length - 10} more\n`);
        }
      } else {
        console.log('✅ No unrecognized categories found!');
      }
    }
    
    return { unrecognized: uniqueUnrecognized, unused, unusedLeafCategories, typoCategories };
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Delete unrecognized categories
 */
async function deleteUnrecognizedCategories(dryRun = true, includeUnused = false, includeUnusedLeaf = false) {
  const { unrecognized, unused, unusedLeafCategories, typoCategories } = await findUnrecognizedCategories();
  
  let toDelete = [...unrecognized];
  console.log(`\n🔍 Initial toDelete count: ${toDelete.length}`);
  console.log(`   includeUnusedLeaf: ${includeUnusedLeaf}`);
  console.log(`   unusedLeafCategories.length: ${unusedLeafCategories.length}`);
  
  if (includeUnusedLeaf && unusedLeafCategories.length > 0) {
    const toAdd = unusedLeafCategories.filter(c => !toDelete.find(d => d.id === c.id));
    console.log(`   Filtered toAdd count: ${toAdd.length}`);
    toDelete = [...toDelete, ...toAdd];
    console.log(`   Final toDelete count: ${toDelete.length}\n`);
  }
  
  if (includeUnused && unused.length > 0) {
    const toAdd = unused.filter(c => !toDelete.find(d => d.id === c.id));
    toDelete = [...toDelete, ...toAdd];
    console.log(`\n📋 Including ${unused.length} unused categories for deletion\n`);
  }
  
  // Debug: Check why unusedLeafCategories aren't being added
  if (toDelete.length === 0 && includeUnusedLeaf && unusedLeafCategories.length > 0) {
    console.log(`\n🔍 Debug: Found ${unusedLeafCategories.length} unused leaf categories`);
    console.log(`   includeUnusedLeaf flag: ${includeUnusedLeaf}`);
    console.log(`   unusedLeafCategories.length: ${unusedLeafCategories.length}`);
    console.log(`   toDelete.length before adding: ${unrecognized.length}`);
    console.log(`   toDelete.length after adding: ${toDelete.length}`);
  }
  
  if (toDelete.length === 0) {
    if (includeUnusedLeaf && unusedLeafCategories.length > 0) {
      console.log(`\n⚠️  Found ${unusedLeafCategories.length} unused leaf categories, but they were not included.`);
      console.log('This might be a bug. Please check the script logic.\n');
    } else {
      console.log('✅ No categories to delete!');
    }
    return;
  }
  
  // Fetch categories for parent lookup
  const { data: allCategories } = await supabase
    .from('lats_categories')
    .select('id, name');
  
  const categoryMap = new Map(allCategories?.map(c => [c.id, c]) || []);
  
  // Show what will be deleted
  if (includeUnusedLeaf && unusedLeafCategories.length > 0) {
    console.log(`\n📋 Will delete ${unusedLeafCategories.length} unused leaf categories:`);
    unusedLeafCategories.slice(0, 10).forEach(c => {
      const parent = categoryMap.get(c.parent_id);
      console.log(`  - ${c.name} (parent: ${parent?.name || 'none'})`);
    });
    if (unusedLeafCategories.length > 10) {
      console.log(`  ... and ${unusedLeafCategories.length - 10} more`);
    }
    console.log('');
  }
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No categories will be deleted');
    console.log(`\nTo actually delete these ${toDelete.length} categories, run:`);
    console.log(`  node delete-unrecognized-categories.mjs --delete`);
    if (unusedLeafCategories.length > 0 && !includeUnusedLeaf) {
      console.log(`\nNote: There are ${unusedLeafCategories.length} unused leaf categories (safe to delete).`);
      console.log(`To also delete unused leaf categories, run:`);
      console.log(`  node delete-unrecognized-categories.mjs --delete --include-unused-leaf\n`);
    }
    if (typoCategories.length > 0) {
      console.log(`\n⚠️  Found ${typoCategories.length} typo category/categories (e.g., "Accsesories").`);
      console.log(`These will be deleted as part of unrecognized categories.\n`);
    }
    return;
  }
  
  console.log(`\n🗑️  Deleting ${toDelete.length} unrecognized categories...\n`);
  console.log('⚠️  WARNING: This will permanently delete categories!');
  
  // Check for typo categories that are in use - migrate products first
  const typoInUse = toDelete.filter(c => {
    if (!typoCategories.includes(c)) return false;
    return usedCategoryIds.has(c.id);
  });
  
  if (typoInUse.length > 0) {
    console.log('🔄 Migrating products from typo categories to correct categories...\n');
    
    for (const typoCat of typoInUse) {
      // Find the correct category (e.g., "Accsesories" -> "Accessories")
      let correctName = '';
      if (typoCat.name === 'Accsesories') {
        correctName = 'Accessories';
      }
      // Add more typo corrections as needed
      
      if (correctName) {
        const { data: correctCategory } = await supabase
          .from('lats_categories')
          .select('id')
          .eq('name', correctName)
          .maybeSingle();
        
        if (correctCategory) {
          // Migrate products
          const { count } = await supabase
            .from('lats_products')
            .update({ category_id: correctCategory.id })
            .eq('category_id', typoCat.id)
            .select('id', { count: 'exact', head: true });
          
          console.log(`  ✓ Migrated products from "${typoCat.name}" to "${correctName}"`);
        } else {
          console.log(`  ⚠️  Could not find correct category "${correctName}" for "${typoCat.name}"`);
        }
      }
    }
    console.log('');
  }
  
  console.log('⚠️  Products using these categories will have their category_id set to NULL\n');
  
  let deleted = 0;
  let errors = 0;
  const batchSize = 50;
  
  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const categoryIds = batch.map(c => c.id);
    
    const { error } = await supabase
      .from('lats_categories')
      .delete()
      .in('id', categoryIds);
    
    if (error) {
      console.error(`  ❌ Error deleting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += batch.length;
    } else {
      deleted += batch.length;
      process.stdout.write(`  ✓ Deleted ${deleted}/${toDelete.length} categories...\r`);
    }
  }
  
  console.log(`\n\n✅ Deletion completed!`);
  console.log(`   - Deleted: ${deleted} categories`);
  console.log(`   - Errors: ${errors} categories`);
  
  // Verify deletion
  console.log('\n🔍 Verifying deletion...');
  const remaining = await findUnrecognizedCategories();
  if (remaining.unrecognized.length === 0) {
    console.log('✅ All unrecognized categories have been deleted!');
  } else {
    console.log(`⚠️  Warning: ${remaining.unrecognized.length} unrecognized categories still remain`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const shouldDelete = args.includes('--delete') || args.includes('-d');
const includeUnused = args.includes('--include-unused') || args.includes('-u');
const includeUnusedLeaf = args.includes('--include-unused-leaf') || args.includes('-l');

// Run the script
deleteUnrecognizedCategories(!shouldDelete, includeUnused, includeUnusedLeaf)
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
