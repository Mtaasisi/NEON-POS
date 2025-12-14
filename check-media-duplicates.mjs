import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMediaDuplicates() {
  console.log('🔍 Checking media library for duplicates...\n');
  
  try {
    // Get all media items
    const { data: mediaItems, error } = await supabase
      .from('whatsapp_media_library')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching media:', error);
      return;
    }
    
    console.log(`📊 Total media items: ${mediaItems.length}\n`);
    
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
      console.log(`⚠️  Found ${duplicates.length} duplicate file names:\n`);
      
      for (const [fileName, items] of duplicates) {
        console.log(`\n📁 ${fileName} (${items.length} entries):`);
        items.forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}`);
          console.log(`     Name: ${item.name}`);
          console.log(`     URL: ${item.file_url.substring(0, 80)}...`);
          console.log(`     Usage: ${item.usage_count}x`);
          console.log(`     Folder: ${item.folder}`);
          console.log(`     Created: ${item.created_at}`);
        });
      }
    } else {
      console.log('✅ No duplicates found based on file_name');
    }
    
    // Check for Frame 15667.jpg specifically
    console.log('\n\n🔍 Looking specifically for "Frame 15667.jpg"...\n');
    const frame15667Items = mediaItems.filter(item => 
      item.file_name.includes('Frame 15667') || item.name.includes('Frame 15667')
    );
    
    if (frame15667Items.length > 0) {
      console.log(`Found ${frame15667Items.length} entries for Frame 15667.jpg:\n`);
      frame15667Items.forEach((item, index) => {
        console.log(`Entry ${index + 1}:`);
        console.log(`  ID: ${item.id}`);
        console.log(`  Name: ${item.name}`);
        console.log(`  File Name: ${item.file_name}`);
        console.log(`  URL: ${item.file_url}`);
        console.log(`  Usage: ${item.usage_count}x`);
        console.log(`  Folder: ${item.folder}`);
        console.log(`  Size: ${item.file_size} bytes`);
        console.log(`  Created: ${item.created_at}`);
        console.log('');
      });
      
      // Check if URLs are the same
      const urls = [...new Set(frame15667Items.map(i => i.file_url))];
      if (urls.length < frame15667Items.length) {
        console.log('⚠️  Some entries have the same URL!');
        console.log(`   ${frame15667Items.length} entries but only ${urls.length} unique URLs`);
      }
    } else {
      console.log('No entries found for Frame 15667.jpg');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkMediaDuplicates();

