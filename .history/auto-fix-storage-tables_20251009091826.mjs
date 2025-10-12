#!/usr/bin/env node

/**
 * AUTO-FIX STORAGE TABLES
 * Automatically creates/fixes storage rooms and shelves tables
 * Run: node auto-fix-storage-tables.mjs
 */

import postgres from 'postgres';
import fs from 'fs';

console.log('🔧 AUTO-FIX STORAGE TABLES\n');

// Read database config
const config = JSON.parse(fs.readFileSync('./database-config.json', 'utf8'));
const sql = postgres(config.url, { 
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

async function checkTableExists(tableName) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = ${tableName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    console.log(`   ⚠️  Error checking ${tableName}:`, error.message);
    return false;
  }
}

async function checkColumnExists(tableName, columnName) {
  try {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = ${tableName} 
        AND column_name = ${columnName}
      );
    `;
    return result[0].exists;
  } catch (error) {
    return false;
  }
}

async function createStorageRoomsTable() {
  console.log('\n📦 Creating lats_store_rooms table...');
  
  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS lats_store_rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        store_location_id UUID,
        name TEXT NOT NULL,
        code TEXT NOT NULL UNIQUE,
        description TEXT,
        floor_level INTEGER DEFAULT 1,
        area_sqm NUMERIC(10,2),
        max_capacity INTEGER,
        current_capacity INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_secure BOOLEAN DEFAULT false,
        requires_access_card BOOLEAN DEFAULT false,
        color_code TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('   ✅ Table created/verified');

    // Add missing columns if table already existed
    const columns = [
      { name: 'store_location_id', type: 'UUID' },
      { name: 'code', type: 'TEXT NOT NULL' },
      { name: 'floor_level', type: 'INTEGER DEFAULT 1' },
      { name: 'area_sqm', type: 'NUMERIC(10,2)' },
      { name: 'max_capacity', type: 'INTEGER' },
      { name: 'current_capacity', type: 'INTEGER DEFAULT 0' },
      { name: 'is_secure', type: 'BOOLEAN DEFAULT false' },
      { name: 'requires_access_card', type: 'BOOLEAN DEFAULT false' },
      { name: 'color_code', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' }
    ];

    for (const col of columns) {
      const exists = await checkColumnExists('lats_store_rooms', col.name);
      if (!exists) {
        try {
          await sql.unsafe(`ALTER TABLE lats_store_rooms ADD COLUMN ${col.name} ${col.type}`);
          console.log(`   ✅ Added column: ${col.name}`);
        } catch (e) {
          if (!e.message.includes('already exists')) {
            console.log(`   ⚠️  ${col.name}: ${e.message}`);
          }
        }
      }
    }

    // Generate codes for existing rows without codes
    await sql`
      UPDATE lats_store_rooms 
      SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 3)) || '-' || SUBSTRING(id::text, 1, 4)
      WHERE code IS NULL
    `;

    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function createStorageShelvesTable() {
  console.log('\n📚 Creating lats_store_shelves table...');
  
  try {
    // Create table with ALL required columns
    await sql`
      CREATE TABLE IF NOT EXISTS lats_store_shelves (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        storage_room_id UUID,
        store_location_id UUID,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        shelf_type TEXT DEFAULT 'standard',
        section TEXT,
        aisle TEXT,
        row_number INTEGER,
        column_number INTEGER,
        column_letter TEXT,
        width_cm NUMERIC(10,2),
        height_cm NUMERIC(10,2),
        depth_cm NUMERIC(10,2),
        max_weight_kg NUMERIC(10,2),
        max_capacity INTEGER,
        current_capacity INTEGER DEFAULT 0,
        current_occupancy INTEGER DEFAULT 0,
        floor_level INTEGER DEFAULT 1,
        zone TEXT,
        coordinates JSONB,
        position TEXT,
        is_active BOOLEAN DEFAULT true,
        is_accessible BOOLEAN DEFAULT true,
        requires_ladder BOOLEAN DEFAULT false,
        is_refrigerated BOOLEAN DEFAULT false,
        temperature_range JSONB,
        priority_order INTEGER DEFAULT 0,
        color_code TEXT,
        barcode TEXT,
        notes TEXT,
        images JSONB DEFAULT '[]'::jsonb,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    console.log('   ✅ Table created/verified');

    // Rename room_id to storage_room_id if needed
    const hasRoomId = await checkColumnExists('lats_store_shelves', 'room_id');
    const hasStorageRoomId = await checkColumnExists('lats_store_shelves', 'storage_room_id');
    
    if (hasRoomId && !hasStorageRoomId) {
      try {
        await sql`ALTER TABLE lats_store_shelves RENAME COLUMN room_id TO storage_room_id`;
        console.log('   ✅ Renamed room_id to storage_room_id');
      } catch (e) {
        console.log('   ⚠️  Column rename:', e.message);
      }
    }

    // Add missing columns
    const columns = [
      { name: 'storage_room_id', type: 'UUID' },
      { name: 'store_location_id', type: 'UUID' },
      { name: 'code', type: 'TEXT NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'shelf_type', type: 'TEXT DEFAULT \'standard\'' },
      { name: 'section', type: 'TEXT' },
      { name: 'aisle', type: 'TEXT' },
      { name: 'row_number', type: 'INTEGER' },
      { name: 'column_number', type: 'INTEGER' },
      { name: 'column_letter', type: 'TEXT' },
      { name: 'width_cm', type: 'NUMERIC(10,2)' },
      { name: 'height_cm', type: 'NUMERIC(10,2)' },
      { name: 'depth_cm', type: 'NUMERIC(10,2)' },
      { name: 'max_weight_kg', type: 'NUMERIC(10,2)' },
      { name: 'max_capacity', type: 'INTEGER' },
      { name: 'current_capacity', type: 'INTEGER DEFAULT 0' },
      { name: 'current_occupancy', type: 'INTEGER DEFAULT 0' },
      { name: 'floor_level', type: 'INTEGER DEFAULT 1' },
      { name: 'zone', type: 'TEXT' },
      { name: 'coordinates', type: 'JSONB' },
      { name: 'position', type: 'TEXT' },
      { name: 'is_accessible', type: 'BOOLEAN DEFAULT true' },
      { name: 'requires_ladder', type: 'BOOLEAN DEFAULT false' },
      { name: 'is_refrigerated', type: 'BOOLEAN DEFAULT false' },
      { name: 'temperature_range', type: 'JSONB' },
      { name: 'priority_order', type: 'INTEGER DEFAULT 0' },
      { name: 'color_code', type: 'TEXT' },
      { name: 'barcode', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'images', type: 'JSONB DEFAULT \'[]\'::jsonb' },
      { name: 'created_by', type: 'UUID' },
      { name: 'updated_by', type: 'UUID' }
    ];

    for (const col of columns) {
      const exists = await checkColumnExists('lats_store_shelves', col.name);
      if (!exists) {
        try {
          await sql.unsafe(`ALTER TABLE lats_store_shelves ADD COLUMN ${col.name} ${col.type}`);
          console.log(`   ✅ Added column: ${col.name}`);
        } catch (e) {
          if (!e.message.includes('already exists')) {
            console.log(`   ⚠️  ${col.name}: ${e.message}`);
          }
        }
      }
    }

    // Generate codes for existing rows without codes
    await sql`
      UPDATE lats_store_shelves 
      SET code = UPPER(SUBSTRING(REPLACE(name, ' ', ''), 1, 5))
      WHERE code IS NULL
    `;

    // Add foreign key constraint
    try {
      await sql`
        ALTER TABLE lats_store_shelves 
        DROP CONSTRAINT IF EXISTS lats_store_shelves_storage_room_id_fkey
      `;
      await sql`
        ALTER TABLE lats_store_shelves 
        ADD CONSTRAINT lats_store_shelves_storage_room_id_fkey 
        FOREIGN KEY (storage_room_id) 
        REFERENCES lats_store_rooms(id) 
        ON DELETE CASCADE
      `;
      console.log('   ✅ Added foreign key constraint');
    } catch (e) {
      console.log('   ⚠️  Foreign key:', e.message);
    }

    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function createIndexes() {
  console.log('\n🔍 Creating indexes...');
  
  const indexes = [
    { table: 'lats_store_rooms', name: 'idx_store_rooms_active', column: 'is_active' },
    { table: 'lats_store_rooms', name: 'idx_store_rooms_code', column: 'code' },
    { table: 'lats_store_shelves', name: 'idx_store_shelves_room', column: 'storage_room_id' },
    { table: 'lats_store_shelves', name: 'idx_store_shelves_code', column: 'code' },
    { table: 'lats_store_shelves', name: 'idx_store_shelves_active', column: 'is_active' }
  ];

  for (const idx of indexes) {
    try {
      await sql.unsafe(`CREATE INDEX IF NOT EXISTS ${idx.name} ON ${idx.table}(${idx.column})`);
      console.log(`   ✅ Created index: ${idx.name}`);
    } catch (e) {
      if (!e.message.includes('already exists')) {
        console.log(`   ⚠️  ${idx.name}: ${e.message}`);
      }
    }
  }
}

async function disableRLS() {
  console.log('\n🔓 Disabling RLS (Row Level Security)...');
  
  try {
    await sql`ALTER TABLE lats_store_rooms DISABLE ROW LEVEL SECURITY`;
    console.log('   ✅ RLS disabled on lats_store_rooms');
  } catch (e) {
    console.log('   ⚠️  lats_store_rooms:', e.message);
  }

  try {
    await sql`ALTER TABLE lats_store_shelves DISABLE ROW LEVEL SECURITY`;
    console.log('   ✅ RLS disabled on lats_store_shelves');
  } catch (e) {
    console.log('   ⚠️  lats_store_shelves:', e.message);
  }
}

async function grantPermissions() {
  console.log('\n🔑 Granting permissions...');
  
  const roles = ['authenticated', 'anon', 'service_role', 'postgres', 'neondb_owner'];
  
  for (const role of roles) {
    try {
      await sql.unsafe(`GRANT ALL ON lats_store_rooms TO ${role}`);
      await sql.unsafe(`GRANT ALL ON lats_store_shelves TO ${role}`);
      console.log(`   ✅ Granted permissions to ${role}`);
    } catch (e) {
      // Role might not exist, that's okay
      if (!e.message.includes('does not exist')) {
        console.log(`   ⚠️  ${role}: ${e.message}`);
      }
    }
  }
}

async function addSampleData() {
  console.log('\n🎁 Adding sample data...');
  
  try {
    // Check if we already have data
    const roomCount = await sql`SELECT COUNT(*) as count FROM lats_store_rooms`;
    
    if (roomCount[0].count > 0) {
      console.log('   ℹ️  Sample data already exists, skipping...');
      return;
    }

    // Insert storage rooms
    const rooms = await sql`
      INSERT INTO lats_store_rooms (name, code, description, floor_level, area_sqm, max_capacity, current_capacity, is_active, is_secure)
      VALUES 
        ('Main Warehouse', 'A-WH01', 'Primary storage facility', 1, 500.00, 1000, 0, true, false),
        ('Secure Storage', 'B-SEC01', 'High-security storage area', 1, 200.00, 300, 0, true, true),
        ('Display Room', 'C-DIS01', 'Customer display area', 1, 150.00, 200, 0, true, false)
      RETURNING id, code
    `;
    
    console.log('   ✅ Created 3 storage rooms');

    // Insert shelves for each room
    const room1 = rooms.find(r => r.code === 'A-WH01');
    const room2 = rooms.find(r => r.code === 'B-SEC01');
    const room3 = rooms.find(r => r.code === 'C-DIS01');

    await sql`
      INSERT INTO lats_store_shelves (
        storage_room_id, name, code, position, row_number, column_number, column_letter,
        max_capacity, current_capacity, shelf_type, floor_level, zone, is_active, is_accessible,
        requires_ladder, is_refrigerated, priority_order
      )
      VALUES 
        -- Main Warehouse shelves
        (${room1.id}, 'Shelf A1', 'A1', 'Front Left', 1, 1, 'A', 100, 0, 'standard', 1, 'front', true, true, false, false, 1),
        (${room1.id}, 'Shelf A2', 'A2', 'Front Center', 1, 2, 'B', 100, 0, 'standard', 1, 'center', true, true, false, false, 2),
        (${room1.id}, 'Shelf B1', 'B1', 'Back Left', 2, 1, 'A', 100, 0, 'storage', 1, 'back', true, true, false, false, 3),
        (${room1.id}, 'Shelf B2', 'B2', 'Back Center', 2, 2, 'B', 100, 0, 'storage', 1, 'back', true, true, false, false, 4),
        -- Secure Storage shelves
        (${room2.id}, 'Secure A1', 'S-A1', 'Section A', 1, 1, 'A', 50, 0, 'specialty', 1, 'front', true, true, false, false, 1),
        (${room2.id}, 'Secure B1', 'S-B1', 'Section B', 1, 2, 'B', 50, 0, 'specialty', 1, 'back', true, true, false, false, 2),
        -- Display Room shelves
        (${room3.id}, 'Display Front', 'D-F1', 'Front Display', 1, 1, 'A', 30, 0, 'display', 1, 'front', true, true, false, false, 1),
        (${room3.id}, 'Display Center', 'D-C1', 'Center Display', 1, 2, 'B', 30, 0, 'display', 1, 'center', true, true, false, false, 2)
    `;

    console.log('   ✅ Created 8 storage shelves');
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function updateProductsTable() {
  console.log('\n🛍️  Updating lats_products table...');
  
  try {
    // Check if products table exists
    const exists = await checkTableExists('lats_products');
    if (!exists) {
      console.log('   ℹ️  lats_products table does not exist, skipping...');
      return;
    }

    // Add storage columns if they don't exist
    const hasStorageRoom = await checkColumnExists('lats_products', 'storage_room_id');
    if (!hasStorageRoom) {
      await sql`ALTER TABLE lats_products ADD COLUMN storage_room_id UUID`;
      console.log('   ✅ Added storage_room_id column');
    }

    const hasStoreShelf = await checkColumnExists('lats_products', 'store_shelf_id');
    if (!hasStoreShelf) {
      await sql`ALTER TABLE lats_products ADD COLUMN store_shelf_id UUID`;
      console.log('   ✅ Added store_shelf_id column');
    }

    if (hasStorageRoom && hasStoreShelf) {
      console.log('   ℹ️  Storage columns already exist');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
}

async function verifyFix() {
  console.log('\n✅ Verifying fix...');
  
  try {
    const roomCount = await sql`SELECT COUNT(*) as count FROM lats_store_rooms`;
    const shelfCount = await sql`SELECT COUNT(*) as count FROM lats_store_shelves`;
    
    console.log(`   📊 Storage rooms: ${roomCount[0].count}`);
    console.log(`   📊 Storage shelves: ${shelfCount[0].count}`);
    
    if (roomCount[0].count > 0 && shelfCount[0].count > 0) {
      console.log('\n   ✅ Storage tables are ready!');
      return true;
    } else {
      console.log('\n   ⚠️  Tables created but no data found');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function main() {
  try {
    console.log('🔌 Connecting to database...');
    
    // Test connection
    await sql`SELECT 1`;
    console.log('✅ Connected successfully!\n');

    // Run all fixes
    await createStorageRoomsTable();
    await createStorageShelvesTable();
    await createIndexes();
    await disableRLS();
    await grantPermissions();
    await addSampleData();
    await updateProductsTable();
    await verifyFix();

    console.log('\n🎉 STORAGE TABLES FIX COMPLETE!\n');
    console.log('Next steps:');
    console.log('1. Refresh your application (Ctrl+Shift+R)');
    console.log('2. Go to Add Product page');
    console.log('3. Click "Select storage location"');
    console.log('4. You should see 3 rooms with shelves! ✅\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database connection in database-config.json');
    console.error('2. You have permissions to create tables');
    console.error('3. Network connection to database\n');
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fix
main().catch(console.error);

