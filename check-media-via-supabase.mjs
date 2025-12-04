import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseKey ? '***' : 'missing');
  process.exit(1);
}

async function checkMedia() {
  console.log('🔍 Checking media library via Supabase REST API...\n');
  console.log(`URL: ${supabaseUrl}\n`);
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/whatsapp_media_library?select=*&order=created_at.desc`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error:', response.status, response.statusText);
      console.error('   Details:', error);
      return;
    }
    
    const mediaItems = await response.json();
    console.log(`📊 Total media items: ${mediaItems.length}\n`);
    
    if (mediaItems.length === 0) {
      console.log('✅ No media items found (empty library)');
      return;
    }
    
    // Show all items
    console.log('All media items:');
    mediaItems.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.name}`);
      console.log(`   ID: ${item.id}`);
      console.log(`   File Name: ${item.file_name}`);
      console.log(`   URL: ${item.file_url}`);
      console.log(`   Type: ${item.file_type}`);
      console.log(`   Size: ${item.file_size} bytes`);
      console.log(`   Usage: ${item.usage_count}x`);
      console.log(`   Folder: ${item.folder}`);
      console.log(`   Created: ${item.created_at}`);
    });
    
    // Group by file_name to find duplicates
    const grouped = {};
    for (const item of mediaItems) {
      if (!grouped[item.file_name]) {
        grouped[item.file_name] = [];
      }
      grouped[item.file_name].push(item);
    }
    
    // Find duplicates
    const duplicates = Object.entries(grouped).filter(([name, items]) => items.length > 1);
    
    if (duplicates.length > 0) {
      console.log(`\n\n⚠️  Found ${duplicates.length} duplicate file names:\n`);
      
      for (const [fileName, items] of duplicates) {
        console.log(`\n📁 ${fileName} (${items.length} entries):`);
        items.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}, Usage: ${item.usage_count}x, URL: ${item.file_url.substring(0, 80)}...`);
        });
      }
    } else {
      console.log('\n\n✅ No duplicates found');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkMedia();

