import postgres from 'postgres';
import { config } from 'dotenv';

config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 1
});

async function cleanupDuplicates() {
  try {
    console.log('\n🧹 Cleaning up duplicate media files...\n');
    
    // Find duplicates based on file_name, folder, and file_size
    console.log('🔍 Step 1: Finding duplicates...');
    const duplicates = await sql`
      SELECT 
        file_name,
        folder,
        file_size,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY created_at ASC) as ids,
        ARRAY_AGG(created_at ORDER BY created_at ASC) as created_dates
      FROM whatsapp_media_library
      GROUP BY file_name, folder, file_size
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found! Database is clean.');
      return;
    }
    
    console.log(`\n⚠️  Found ${duplicates.length} sets of duplicate files:\n`);
    
    let totalToDelete = 0;
    
    for (const dup of duplicates) {
      console.log(`📁 "${dup.file_name}" in folder "${dup.folder}"`);
      console.log(`   ${dup.count} copies found (${(dup.file_size / 1024).toFixed(2)} KB each)`);
      console.log(`   Keeping oldest copy (ID: ${dup.ids[0]})`);
      console.log(`   Will delete ${dup.count - 1} duplicate(s)`);
      
      const idsToDelete = dup.ids.slice(1); // Keep first (oldest), delete rest
      totalToDelete += idsToDelete.length;
      
      for (let i = 0; i < idsToDelete.length; i++) {
        console.log(`   - Duplicate ${i + 1}: ${dup.ids[i + 1]} (created: ${dup.created_dates[i + 1]})`);
      }
      console.log('');
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total duplicate sets: ${duplicates.length}`);
    console.log(`   Total records to delete: ${totalToDelete}`);
    console.log(`   Total records to keep: ${duplicates.length}\n`);
    
    // Ask for confirmation (in automated script, we'll just proceed)
    console.log('🗑️  Step 2: Removing duplicates...\n');
    
    for (const dup of duplicates) {
      const idsToDelete = dup.ids.slice(1); // Keep first, delete rest
      
      if (idsToDelete.length > 0) {
        const result = await sql`
          DELETE FROM whatsapp_media_library
          WHERE id = ANY(${idsToDelete})
        `;
        
        console.log(`✅ Deleted ${idsToDelete.length} duplicate(s) of "${dup.file_name}"`);
      }
    }
    
    console.log('\n✅ Cleanup completed successfully!');
    
    // Show final count
    const finalCount = await sql`
      SELECT COUNT(*) as count FROM whatsapp_media_library
    `;
    console.log(`\n📊 Final media library count: ${finalCount[0].count} unique files\n`);
    
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

cleanupDuplicates();

