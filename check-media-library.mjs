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

async function checkMediaLibrary() {
  try {
    console.log('\n📊 Checking media library records...\n');
    
    // Get all media records
    const media = await sql`
      SELECT 
        id,
        name,
        file_name,
        file_url,
        file_type,
        file_size,
        folder,
        usage_count,
        last_used_at,
        created_at
      FROM whatsapp_media_library
      ORDER BY created_at DESC
    `;
    
    console.log(`Found ${media.length} media item(s):\n`);
    
    media.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   File: ${item.file_name}`);
      console.log(`   Type: ${item.file_type}`);
      console.log(`   Size: ${(item.file_size / 1024).toFixed(2)} KB`);
      console.log(`   Folder: ${item.folder}`);
      console.log(`   Usage Count: ${item.usage_count}`);
      console.log(`   URL: ${item.file_url.substring(0, 80)}...`);
      console.log(`   Created: ${item.created_at}`);
      console.log('');
    });
    
    // Check for duplicates
    const duplicates = await sql`
      SELECT 
        file_name,
        COUNT(*) as count
      FROM whatsapp_media_library
      GROUP BY file_name
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      console.log('\n⚠️  Found duplicate file names:');
      duplicates.forEach(dup => {
        console.log(`   ${dup.file_name}: ${dup.count} copies`);
      });
    } else {
      console.log('\n✅ No duplicate file names found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await sql.end();
  }
}

checkMediaLibrary();
