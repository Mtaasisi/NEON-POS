import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorage() {
  console.log('🔧 Setting up WhatsApp Media Storage...\n');
  
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }
    
    console.log(`📦 Found ${buckets.length} buckets:\n`);
    buckets.forEach(bucket => {
      console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });
    
    const whatsappBucket = buckets.find(b => b.name === 'whatsapp-media');
    
    if (!whatsappBucket) {
      console.log('\n📦 Creating whatsapp-media bucket...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('whatsapp-media', {
        public: true,
        fileSizeLimit: 16777216, // 16MB (WhatsApp limit)
        allowedMimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      });
      
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }
      
      console.log('✅ Bucket created successfully!');
    } else {
      console.log('\n✅ whatsapp-media bucket already exists');
    }
    
    // Check if table exists and has data
    console.log('\n📊 Checking database table...');
    const { data: mediaItems, error: queryError, count } = await supabase
      .from('whatsapp_media_library')
      .select('*', { count: 'exact' });
    
    if (queryError) {
      console.error('❌ Error querying table:', queryError);
      
      if (queryError.code === '42P01') {
        console.log('\n⚠️  Table does not exist. Running migration...');
        // The table needs to be created via migration
        console.log('   Run: node apply-whatsapp-advanced-migration.mjs');
      }
    } else {
      console.log(`✅ Table exists with ${count} records`);
      
      if (mediaItems && mediaItems.length > 0) {
        console.log('\nMedia items:');
        mediaItems.forEach((item, i) => {
          console.log(`${i + 1}. ${item.name} (${item.file_type}, ${item.usage_count}x used)`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

setupStorage();

