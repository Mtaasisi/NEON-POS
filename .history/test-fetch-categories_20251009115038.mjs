#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs';
import { neon } from '@neondatabase/serverless';

console.log('\n=====================================');
console.log('🧪 TESTING CATEGORY FETCH IN APP');
console.log('=====================================\n');

// Get database URL (same as your app uses)
let DATABASE_URL;
if (existsSync('database-config.json')) {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  DATABASE_URL = config.connectionString || config.url;
  console.log('✅ Using database-config.json');
} else {
  DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-dry-brook-ad3duuog-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  console.log('✅ Using hardcoded database URL');
}

const sql = neon(DATABASE_URL);

async function testCategoryFetch() {
  try {
    console.log('📡 Fetching categories from Neon database...\n');

    // Simulate the same query your app makes
    const categories = await sql`
      SELECT * FROM lats_categories 
      ORDER BY name
    `;

    console.log(`✅ Successfully fetched ${categories.length} categories!\n`);

    // Show first 10 categories
    console.log('📋 First 10 Categories:');
    console.log('─'.repeat(70));
    categories.slice(0, 10).forEach((cat, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}. ${cat.name.padEnd(30)} (${cat.is_active ? '✓ Active' : '✗ Inactive'})`);
    });

    if (categories.length > 10) {
      console.log(`    ... and ${categories.length - 10} more`);
    }

    console.log('─'.repeat(70));

    // Test filtering active categories
    const activeCategories = categories.filter(cat => cat.is_active === true);
    console.log(`\n✅ Active categories: ${activeCategories.length}/${categories.length}`);

    // Test searching
    const searchTerm = 'phone';
    const searchResults = categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm) ||
      (cat.description && cat.description.toLowerCase().includes(searchTerm))
    );
    console.log(`✅ Search for "${searchTerm}": ${searchResults.length} results`);

    // Show categories with icons
    const withIcons = categories.filter(cat => cat.icon);
    console.log(`✅ Categories with icons: ${withIcons.length}`);

    // Show category colors
    const uniqueColors = new Set(categories.map(c => c.color).filter(Boolean));
    console.log(`✅ Unique colors used: ${uniqueColors.size}`);

    console.log('\n=====================================');
    console.log('✅ CATEGORY FETCH TEST PASSED!');
    console.log('=====================================');
    console.log('\n💡 Your app can now fetch categories using:');
    console.log('   - useCategories() hook');
    console.log('   - useOptimizedCategories() hook');
    console.log('   - categoryService.getCategories()');
    console.log('   - or directly via supabase.from("lats_categories")');
    console.log('');

  } catch (error) {
    console.error('\n❌ CATEGORY FETCH TEST FAILED!');
    console.error('Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

testCategoryFetch();

