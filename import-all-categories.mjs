#!/usr/bin/env node

/**
 * Import All Categories to Database
 * 
 * This script imports all categories found in backups and adds
 * additional common categories that might be useful.
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
 * Complete category hierarchy including all found categories and additional useful ones
 */
const COMPLETE_CATEGORY_HIERARCHY = {
  // Root: Electronics
  'Electronics': {
    description: 'All electronic devices and components',
    children: {
      // Mobile Devices
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
      // Computers
      'Computers': {
        description: 'Computer systems and components',
        children: {
          'Laptop': { description: 'Laptop computers' },
          'MacBook': { description: 'Apple MacBook laptops' },
          'Desktop Computers': { description: 'Desktop computer systems' },
          'CPU': { description: 'Central processing units' },
          'Computer Parts': { description: 'Computer components and parts' },
        }
      },
      // Audio
      'Audio & Sound': {
        description: 'Audio equipment and sound systems',
        children: {
          'Audio Accessories': { description: 'Audio-related accessories' },
          'Bluetooth Speakers': { description: 'Wireless Bluetooth speakers' },
          'Soundbars': { description: 'Soundbar speakers' },
          'Headphones': { description: 'Headphones and earbuds' },
          'Microphones': { description: 'Microphone devices' },
        }
      },
      // Display
      'Display': {
        description: 'Display and monitor devices',
        children: {
          'Monitors': { description: 'Computer monitors' },
          'TVs': { description: 'Television sets' },
          'Projectors': { description: 'Projection devices' },
        }
      },
      // Accessories
      'Accessories': {
        description: 'General electronic accessories',
        children: {
          'Chargers': { description: 'Charging cables and adapters' },
          'Computer Accessories': { description: 'Accessories for computers' },
          'Laptop Accessories': { description: 'Accessories for laptops' },
          'Keyboards': { description: 'Keyboard devices' },
          'Mice': { description: 'Computer mice and pointing devices' },
          'Cables': { description: 'Cables and connectors' },
          'Cases & Covers': { description: 'Protective cases and covers' },
          'Screen Protectors': { description: 'Screen protection films' },
          'Stands & Mounts': { description: 'Stands and mounting accessories' },
        }
      },
      // Parts
      'Parts & Components': {
        description: 'Spare parts and components',
        children: {
          'Spare Parts': { description: 'Replacement parts and components' },
          'Batteries': { description: 'Batteries and power cells' },
          'Screens & Displays': { description: 'Replacement screens and displays' },
          'Cameras': { description: 'Camera modules and components' },
        }
      },
      // Networking
      'Networking': {
        description: 'Network equipment and accessories',
        children: {
          'Routers': { description: 'Network routers' },
          'Modems': { description: 'Modem devices' },
          'Network Accessories': { description: 'Network cables and accessories' },
        }
      },
      // Storage
      'Storage': {
        description: 'Storage devices and media',
        children: {
          'External Hard Drives': { description: 'External hard disk drives' },
          'USB Drives': { description: 'USB flash drives' },
          'Memory Cards': { description: 'SD cards and memory cards' },
          'SSD': { description: 'Solid state drives' },
        }
      },
    }
  },
  // Root: Services
  'Services': {
    description: 'Service offerings and repairs',
    children: {
      'Repair Services': { description: 'Device repair and maintenance' },
      'Screen Repair': { description: 'Screen and display repair' },
      'Battery Replacement': { description: 'Battery replacement services' },
      'Software Services': { description: 'Software installation and setup' },
      'Data Recovery': { description: 'Data recovery services' },
    }
  },
  // Root: General
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
      const category = {
        name,
        description: config.description || null,
        parent: parentName,
        sortOrder: sortOrder++,
      };
      result.push(category);
      
      if (config.children) {
        flattenHierarchy(config.children, name, result, sortOrder);
      }
    } else {
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
    .select('id, name, parent_id, description')
    .eq('name', name)
    .maybeSingle();
  
  if (existing) {
    const expectedParentId = parent ? parentIdMap.get(parent) : null;
    
    // Update if parent or description changed
    if (existing.parent_id !== expectedParentId || 
        (description && existing.description !== description)) {
      const updateData = {
        parent_id: expectedParentId,
        is_shared: true,
        updated_at: new Date().toISOString(),
      };
      
      if (description) {
        updateData.description = description;
      }
      
      if (sortOrder !== undefined) {
        updateData.sort_order = sortOrder;
      }
      
      const { error: updateError } = await supabase
        .from('lats_categories')
        .update(updateData)
        .eq('id', existing.id);
      
      if (updateError) {
        console.error(`  ⚠️  Error updating category "${name}":`, updateError.message);
      } else {
        console.log(`  ↻ Updated category "${name}"`);
      }
    } else {
      console.log(`  ✓ Category "${name}" already exists`);
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
  
  console.log(`  ✓ Created category "${name}"`);
  return newCategory.id;
}

/**
 * Get default branch ID
 */
async function getDefaultBranchId() {
  const { data: mainBranch } = await supabase
    .from('store_locations')
    .select('id')
    .eq('is_active', true)
    .eq('is_main', true)
    .maybeSingle();
  
  if (mainBranch) {
    return mainBranch.id;
  }
  
  const { data: firstBranch } = await supabase
    .from('store_locations')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  
  if (firstBranch) {
    return firstBranch.id;
  }
  
  return '24cd45b8-1ce1-486a-b055-29d169c3a8ea';
}

/**
 * Main import function
 */
async function importAllCategories() {
  console.log('🚀 Starting complete category import...\n');
  
  try {
    const branchId = await getDefaultBranchId();
    console.log(`📍 Using branch ID: ${branchId}\n`);
    
    const categories = flattenHierarchy(COMPLETE_CATEGORY_HIERARCHY);
    console.log(`📋 Processing ${categories.length} categories\n`);
    
    const parentIdMap = new Map();
    const processed = new Set();
    let maxIterations = 30;
    let remaining = [...categories];
    let created = 0;
    let updated = 0;
    
    console.log('📦 Importing categories...\n');
    
    while (remaining.length > 0 && maxIterations > 0) {
      const toProcess = [];
      
      for (const category of remaining) {
        if (!category.parent || parentIdMap.has(category.parent)) {
          toProcess.push(category);
        }
      }
      
      if (toProcess.length === 0) {
        break;
      }
      
      for (const category of toProcess) {
        const existing = await supabase
          .from('lats_categories')
          .select('id')
          .eq('name', category.name)
          .maybeSingle();
        
        const id = await getOrCreateCategory(category, parentIdMap, branchId);
        if (id) {
          parentIdMap.set(category.name, id);
          processed.add(category.name);
          if (existing) {
            updated++;
          } else {
            created++;
          }
        }
      }
      
      remaining = categories.filter(c => !processed.has(c.name));
      maxIterations--;
    }
    
    if (remaining.length > 0) {
      console.log(`\n⚠️  Warning: ${remaining.length} categories could not be processed:`);
      remaining.forEach(c => console.log(`  - ${c.name} (parent: ${c.parent || 'none'})`));
    }
    
    // Final verification
    console.log('\n🔍 Verifying import...');
    const { data: allCategories, error: fetchError } = await supabase
      .from('lats_categories')
      .select('id, name, parent_id, is_shared, is_active')
      .order('name');
    
    if (fetchError) {
      console.error('❌ Error fetching categories:', fetchError.message);
      return;
    }
    
    console.log(`\n✅ Import completed!`);
    console.log(`   - Created: ${created} categories`);
    console.log(`   - Updated: ${updated} categories`);
    console.log(`   - Total in database: ${allCategories.length} categories`);
    
    // Display summary
    const rootCategories = allCategories.filter(c => !c.parent_id);
    console.log(`\n📊 Root categories: ${rootCategories.length}`);
    rootCategories.forEach(c => console.log(`   - ${c.name}`));
    
    const childCategories = allCategories.filter(c => c.parent_id);
    console.log(`\n📊 Child categories: ${childCategories.length}`);
    
    const shared = allCategories.filter(c => c.is_shared);
    console.log(`\n📊 Shared categories: ${shared.length}/${allCategories.length}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run import
importAllCategories()
  .then(() => {
    console.log('\n✅ Category import completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Category import failed:', error);
    process.exit(1);
  });
