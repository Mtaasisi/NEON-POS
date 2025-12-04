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

async function checkTables() {
  console.log('🔍 Checking database tables...\n');
  console.log(`Supabase URL: ${supabaseUrl}\n`);
  
  try {
    // Try to query table information
    const { data, error } = await supabase
      .from('whatsapp_media_library')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error querying table:', error);
      
      // Try to check if ANY whatsapp tables exist
      console.log('\n🔍 Checking for any whatsapp tables...');
      const { data: campaigns, error: campaignError } = await supabase
        .from('whatsapp_campaigns')
        .select('count', { count: 'exact', head: true });
      
      if (campaignError) {
        console.error('❌ whatsapp_campaigns also doesn\'t exist:', campaignError.code);
        console.log('\n⚠️  It seems WhatsApp tables have not been created yet.');
        console.log('   The migration might need to be run on the correct database.');
      } else {
        console.log('✅ whatsapp_campaigns exists');
        console.log('   But whatsapp_media_library doesn\'t');
      }
    } else {
      console.log('✅ whatsapp_media_library table exists!');
      console.log(`   Total rows: ${data || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTables();

