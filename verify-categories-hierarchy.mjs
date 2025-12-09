#!/usr/bin/env node

/**
 * Verify Categories Hierarchy
 * 
 * This script verifies that all categories have been restored correctly
 * with proper parent-child relationships.
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
 * Display category tree recursively
 */
function displayCategoryTree(category, allCategories, indent = 0, visited = new Set()) {
  if (visited.has(category.id)) {
    console.log('  '.repeat(indent) + '⚠️  CIRCULAR REFERENCE: ' + category.name);
    return;
  }
  visited.add(category.id);
  
  const prefix = '  '.repeat(indent);
  const icon = indent === 0 ? '📁' : '  └─';
  const shared = category.is_shared ? ' (shared)' : '';
  const active = category.is_active ? '' : ' (inactive)';
  console.log(`${prefix}${icon} ${category.name}${shared}${active}`);
  
  if (category.description) {
    console.log(`${prefix}    ${category.description}`);
  }
  
  const children = allCategories.filter(c => c.parent_id === category.id);
  for (const child of children) {
    displayCategoryTree(child, allCategories, indent + 1, new Set(visited));
  }
}

/**
 * Main verification function
 */
async function verifyCategories() {
  console.log('🔍 Verifying category hierarchy...\n');
  
  try {
    const { data: categories, error } = await supabase
      .from('lats_categories')
      .select('id, name, parent_id, description, is_shared, is_active, sort_order')
      .order('sort_order', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching categories:', error.message);
      process.exit(1);
    }
    
    console.log(`✅ Found ${categories.length} categories in database\n`);
    
    // Find root categories
    const rootCategories = categories.filter(c => !c.parent_id);
    console.log(`📊 Root categories (no parent): ${rootCategories.length}`);
    for (const root of rootCategories) {
      console.log(`  - ${root.name}`);
    }
    
    // Find categories with parents
    const childCategories = categories.filter(c => c.parent_id);
    console.log(`\n📊 Child categories (with parent): ${childCategories.length}`);
    
    // Check for orphaned categories (parent doesn't exist)
    const orphaned = childCategories.filter(c => {
      return !categories.find(p => p.id === c.parent_id);
    });
    
    if (orphaned.length > 0) {
      console.log(`\n⚠️  Orphaned categories (parent not found): ${orphaned.length}`);
      orphaned.forEach(c => {
        console.log(`  - ${c.name} (parent_id: ${c.parent_id})`);
      });
    } else {
      console.log('\n✅ No orphaned categories found');
    }
    
    // Check shared status
    const shared = categories.filter(c => c.is_shared);
    const notShared = categories.filter(c => !c.is_shared);
    console.log(`\n📊 Sharing status:`);
    console.log(`  - Shared: ${shared.length}`);
    console.log(`  - Not shared: ${notShared.length}`);
    
    // Display full hierarchy
    console.log('\n📊 Full Category Hierarchy:');
    for (const root of rootCategories) {
      displayCategoryTree(root, categories, 0);
    }
    
    // Statistics
    console.log('\n📊 Statistics:');
    console.log(`  - Total categories: ${categories.length}`);
    console.log(`  - Root categories: ${rootCategories.length}`);
    console.log(`  - Child categories: ${childCategories.length}`);
    console.log(`  - Max depth: ${getMaxDepth(categories)}`);
    console.log(`  - Active categories: ${categories.filter(c => c.is_active).length}`);
    console.log(`  - Inactive categories: ${categories.filter(c => !c.is_active).length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Calculate maximum depth of category tree
 */
function getMaxDepth(categories) {
  function getDepth(categoryId, visited = new Set()) {
    if (visited.has(categoryId)) return 0; // Circular reference
    visited.add(categoryId);
    
    const category = categories.find(c => c.id === categoryId);
    if (!category || !category.parent_id) return 1;
    
    return 1 + getDepth(category.parent_id, visited);
  }
  
  let maxDepth = 0;
  for (const category of categories) {
    const depth = getDepth(category.id);
    maxDepth = Math.max(maxDepth, depth);
  }
  
  return maxDepth;
}

// Run verification
verifyCategories()
  .then(() => {
    console.log('\n✅ Verification completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  });
