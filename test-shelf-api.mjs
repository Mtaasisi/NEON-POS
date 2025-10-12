#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

console.log('\n🧪 TESTING SHELF API...\n');

let DATABASE_URL;
try {
  if (existsSync('database-config.json')) {
    const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
    DATABASE_URL = config.connectionString || config.url;
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
  }
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function testShelfAPI() {
  try {
    console.log('📋 Test 1: Fetch Storage Rooms');
    const rooms = await sql`
      SELECT * FROM lats_store_rooms
      WHERE is_active = true
      ORDER BY code
    `;
    console.log(`✅ Found ${rooms.length} storage rooms`);
    if (rooms.length > 0) {
      console.table(rooms.map(r => ({
        id: r.id.substring(0, 8) + '...',
        name: r.name,
        code: r.code
      })));
    }
    console.log('');

    console.log('📋 Test 2: Fetch Shelves');
    const shelves = await sql`
      SELECT * FROM lats_store_shelves
      WHERE is_active = true
      ORDER BY code
    `;
    console.log(`✅ Found ${shelves.length} shelves`);
    if (shelves.length > 0) {
      console.table(shelves.map(s => ({
        id: s.id.substring(0, 8) + '...',
        name: s.name,
        code: s.code,
        room_id: s.storage_room_id ? s.storage_room_id.substring(0, 8) + '...' : 'N/A'
      })));
    }
    console.log('');

    console.log('📋 Test 3: Check RLS Policies');
    const rlsRooms = await sql`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname IN ('lats_store_rooms', 'lats_store_shelves')
    `;
    console.table(rlsRooms.map(r => ({
      table: r.relname,
      rls_enabled: r.relrowsecurity
    })));
    console.log('');

    console.log('📋 Test 4: Simulate Frontend Query (with JOINs)');
    const joinedData = await sql`
      SELECT 
        sr.id as room_id,
        sr.name as room_name,
        sr.code as room_code,
        COUNT(ss.id) as shelf_count
      FROM lats_store_rooms sr
      LEFT JOIN lats_store_shelves ss ON sr.id = ss.storage_room_id AND ss.is_active = true
      WHERE sr.is_active = true
      GROUP BY sr.id, sr.name, sr.code
      ORDER BY sr.code
    `;
    console.log('✅ Rooms with shelf counts:');
    console.table(joinedData);
    console.log('');

    console.log('📋 Test 5: Check Products with Storage Assignment');
    const productsWithStorage = await sql`
      SELECT 
        p.id,
        p.name,
        p.storage_room_id,
        p.store_shelf_id,
        sr.name as room_name,
        ss.code as shelf_code
      FROM lats_products p
      LEFT JOIN lats_store_rooms sr ON p.storage_room_id = sr.id
      LEFT JOIN lats_store_shelves ss ON p.store_shelf_id = ss.id
      WHERE p.is_active = true
      LIMIT 5
    `;
    console.log('✅ Sample products with storage:');
    console.table(productsWithStorage.map(p => ({
      name: p.name,
      room: p.room_name || 'Not assigned',
      shelf: p.shelf_code || 'Not assigned'
    })));
    console.log('');

    // Test Summary
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  📊 API TEST RESULTS                                       ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  Storage Rooms: ${String(rooms.length).padEnd(44)} ║`);
    console.log(`║  Shelves: ${String(shelves.length).padEnd(50)} ║`);
    console.log(`║  Data accessible: ${rooms.length > 0 && shelves.length > 0 ? '✅ YES' : '❌ NO'}${' '.repeat(38)} ║`);
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    if (rooms.length === 0 || shelves.length === 0) {
      console.log('⚠️  ISSUE DETECTED:');
      if (rooms.length === 0) console.log('   - No storage rooms found');
      if (shelves.length === 0) console.log('   - No shelves found');
      console.log('');
      console.log('💡 SOLUTION: Run the storage setup script');
      console.log('   File: FIX-STORAGE-AND-CATEGORIES-TABLES.sql\n');
    } else {
      console.log('✅ Storage/Shelf API is working correctly!');
      console.log('');
      console.log('💡 If frontend is not showing data, check:');
      console.log('   1. Browser console for API errors');
      console.log('   2. Network tab for failed requests');
      console.log('   3. Component imports (storageRoomApi, storeShelfApi)');
      console.log('   4. Supabase client authentication\n');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testShelfAPI();

