#!/usr/bin/env node

/**
 * Restore Categories with Parent-Child Hierarchy
 * 
 * This script restores all categories found in backups and organizes them
 * into a logical parent-child hierarchy structure.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
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
 * Category hierarchy structure
 * Organized into logical parent-child relationships
 */
const CATEGORY_HIERARCHY = {
  // Root level: Electronics
  'Electronics': {
    description: 'All electronic devices and components',
    children: {
      // Mobile Devices branch
      'Mobile Devices': {
        description: 'Portable mobile devices',
        children: {
          'Smartphones': { description: 'Smartphone devices' },
          'iPhones': { description: 'Apple iPhone devices' },
          'Tablets': { description: 'Tablet devices' },
          'Android Tablets': { description: 'Android-based tablets' },
          'iPad': { description: 'Apple iPad devices' },
        }
      },
      // Computers branch
      'Computers': {
        description: 'Computer systems and components',
        children: {
          'Laptop': { description: 'Laptop computers' },
          'MacBook': { description: 'Apple MacBook laptops' },
          'CPU': { description: 'Central processing units' },
        }
      },
      // Audio branch
      'Audio & Sound': {
        description: 'Audio equipment and sound systems',
        children: {
          'Audio Accessories': { description: 'Audio-related accessories' },
          'Bluetooth Speakers': { description: 'Wireless Bluetooth speakers' },
          'Soundbars': { description: 'Soundbar speakers' },
        }
      },
      // Display branch
      'Display': {
        description: 'Display and monitor devices',
        children: {
          'Monitors': { description: 'Computer monitors' },
          'TVs': { description: 'Television sets' },
        }
      },
      // Accessories branch
      'Accessories': {
        description: 'General electronic accessories',
        children: {
          'Chargers': { description: 'Charging cables and adapters' },
          'Computer Accessories': { description: 'Accessories for computers' },
          'Laptop Accessories': { description: 'Accessories for laptops' },
          'Keyboards': { description: 'Keyboard devices' },
        }
      },
      // Handle "Accsesories" typo - merge with Accessories or create as separate
      'Accsesories': {
        description: 'Accessories (typo variant - consider merging with Accessories)',
        children: {}
      },
      // Parts branch
      'Parts & Components': {
        description: 'Spare parts and components',
        children: {
          'Spare Parts': { description: 'Replacement parts and components' },
        }
      },
    }
  },
  // Root level: General
  'General': {
    description: 'General and uncategorized items',
    children: {
      'Uncategorized': { description: 'Items without a specific category' },
    }
  }
};

/**
 * Flatten hierarchy into a list with parent references
 */
function flattenHierarchy(hierarchy, parentName = null, result = [], sortOrder = 0) {
  for (const [name, config] of Object.entries(hierarchy)) {
    if (typeof config === 'object' && config !== null && 'description' in config) {
      // This is a category with potential children
      const category = {
        name,
        description: config.description || null,
        parent: parentName,
        sortOrder: sortOrder++,
      };
      result.push(category);
      
      // Process children if they exist
      if (config.children) {
        flattenHierarchy(config.children, name, result, sortOrder);
      }
    } else {
      // This is a simple category definition
      result.push({
        name,
        description: config || null,
        parent: parentName,
        sortOrder: sortOrder++,
      });
    }
  }
  return result;
}

/**
 * Get or create a category and return its ID
 */
async function getOrCreateCategory(categoryData, parentIdMap, branchId) {
  const { name, description, parent, sortOrder } = categoryData;
  
  // Check if category already exists
  const { data: existing } = await supabase
    .from('lats_categories')
    .select('id, name')
    .eq('name', name)
    .maybeSingle();
  
  if (existing) {
    console.log(`  ✓ Category "${name}" already exists (ID: ${existing.id})`);
    
    // Update parent_id if needed
    const expectedParentId = parent ? parentIdMap.get(parent) : null;
    if (existing.parent_id !== expectedParentId) {
      const { error: updateError } = await supabase
        .from('lats_categories')
        .update({
          parent_id: expectedParentId,
          description: description || existing.description,
          sort_order: sortOrder,
          is_shared: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      
      if (updateError) {
        console.error(`  ⚠️  Error updating category "${name}":`, updateError.message);
      } else {
        console.log(`  ↻ Updated parent relationship for "${name}"`);
      }
    }
    
    return existing.id;
  }
  
  // Create new category
  const parentId = parent ? parentIdMap.get(parent) : null;
  
  const { data: newCategory, error } = await supabase
    .from('lats_categories')
    .insert({
      name,
      description,
      parent_id: parentId,
      branch_id: branchId,
      is_shared: true,
      is_active: true,
      sort_order: sortOrder,
      metadata: {},
    })
    .select('id')
    .single();
  
  if (error) {
    console.error(`  ❌ Error creating category "${name}":`, error.message);
    return null;
  }
  
  console.log(`  ✓ Created category "${name}" (ID: ${newCategory.id})`);
  return newCategory.id;
}

/**
 * Get default branch ID
 */
async function getDefaultBranchId() {
  // Try to get main branch first
  const { data: mainBranch } = await supabase
    .from('store_locations')
    .select('id')
    .eq('is_active', true)
    .eq('is_main', true)
    .maybeSingle();
  
  if (mainBranch) {
    return mainBranch.id;
  }
  
  // Get first active branch
  const { data: firstBranch } = await supabase
    .from('store_locations')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  
  if (firstBranch) {
    return firstBranch.id;
  }
  
  // Use the branch ID from the backup if available
  return '24cd45b8-1ce1-486a-b055-29d169c3a8ea';
}

/**
 * Main restoration function
 */
async function restoreCategories() {
  console.log('🚀 Starting category restoration with hierarchy...\n');
  
  try {
    // Get default branch ID
    const branchId = await getDefaultBranchId();
    console.log(`📍 Using branch ID: ${branchId}\n`);
    
    // Flatten hierarchy
    const categories = flattenHierarchy(CATEGORY_HIERARCHY);
    console.log(`📋 Found ${categories.length} categories to restore\n`);
    
    // Create parent ID map
    const parentIdMap = new Map();
    const processed = new Set();
    
    // Process categories level by level
    console.log('📦 Creating categories...');
    
    let maxIterations = 20; // Prevent infinite loops
    let remaining = [...categories];
    
    while (remaining.length > 0 && maxIterations > 0) {
      const toProcess = [];
      
      for (const category of remaining) {
        // Can process if no parent or parent already processed
        if (!category.parent || parentIdMap.has(category.parent)) {
          toProcess.push(category);
        }
      }
      
      if (toProcess.length === 0) {
        // No more categories can be processed
        break;
      }
      
      for (const category of toProcess) {
        const id = await getOrCreateCategory(category, parentIdMap, branchId);
        if (id) {
          parentIdMap.set(category.name, id);
          processed.add(category.name);
        }
      }
      
      // Update remaining list
      remaining = categories.filter(c => !processed.has(c.name));
      maxIterations--;
    }
    
    if (remaining.length > 0) {
      console.log(`\n⚠️  Warning: ${remaining.length} categories could not be created (missing parents):`);
      remaining.forEach(c => console.log(`  - ${c.name} (parent: ${c.parent})`));
    }
    
    // Verify restoration
    console.log('\n🔍 Verifying restoration...');
    const { data: allCategories, error: fetchError } = await supabase
      .from('lats_categories')
      .select('id, name, parent_id, description, is_shared')
      .order('sort_order', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching categories:', fetchError.message);
      return;
    }
    
    console.log(`\n✅ Successfully restored ${allCategories.length} categories\n`);
    
    // Display hierarchy
    console.log('📊 Category Hierarchy:');
    const rootCategories = allCategories.filter(c => !c.parent_id);
    for (const root of rootCategories) {
      displayCategoryTree(root, allCategories, 0);
    }
    
    // Display categories without parent
    const orphaned = allCategories.filter(c => c.parent_id && !allCategories.find(p => p.id === c.parent_id));
    if (orphaned.length > 0) {
      console.log('\n⚠️  Orphaned categories (parent not found):');
      orphaned.forEach(c => console.log(`  - ${c.name}`));
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

/**
 * Display category tree recursively
 */
function displayCategoryTree(category, allCategories, indent = 0) {
  const prefix = '  '.repeat(indent);
  const parentInfo = category.parent_id ? ` (parent: ${allCategories.find(c => c.id === category.parent_id)?.name || 'unknown'})` : '';
  console.log(`${prefix}${indent === 0 ? '📁' : '  └─'} ${category.name}${parentInfo}`);
  
  const children = allCategories.filter(c => c.parent_id === category.id);
  for (const child of children) {
    displayCategoryTree(child, allCategories, indent + 1);
  }
}

// Run the restoration
restoreCategories()
  .then(() => {
    console.log('\n✅ Category restoration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Category restoration failed:', error);
    process.exit(1);
  });
