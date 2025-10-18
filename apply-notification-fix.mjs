#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('Please set VITE_DATABASE_URL or DATABASE_URL in your .env file');
  process.exit(1);
}

console.log('🔧 Notification Fix - Automatic Application');
console.log('='.repeat(50));

const sql = neon(DATABASE_URL);

async function applyFix() {
  try {
    console.log('📁 Reading SQL fix file...');
    const sqlFile = join(__dirname, 'FIX-NOTIFICATIONS-TABLE.sql');
    const sqlContent = readFileSync(sqlFile, 'utf-8');
    
    // Split SQL content into statements (simple split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.match(/^SELECT.*as status$/));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        await sql([statement]);
        console.log(`✅ Statement ${i + 1} completed\n`);
      } catch (error) {
        // Some statements might fail if already done, that's okay
        if (error.message?.includes('already exists') || 
            error.message?.includes('does not exist')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already applied)\n`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message, '\n');
        }
      }
    }
    
    // Verify the fix
    console.log('🔍 Verifying notifications table...');
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      ORDER BY ordinal_position
    `;
    
    if (result && result.length > 0) {
      console.log('\n✅ Notifications table structure:');
      result.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      // Check for required fields
      const requiredFields = ['id', 'user_id', 'title', 'message', 'type', 'category', 
                             'priority', 'status', 'created_at', 'action_url', 'icon', 'color'];
      const existingFields = result.map(r => r.column_name);
      const missingFields = requiredFields.filter(f => !existingFields.includes(f));
      
      if (missingFields.length === 0) {
        console.log('\n🎉 SUCCESS! Notifications table has all required fields!');
        console.log('\n📋 Next Steps:');
        console.log('   1. Refresh your browser (Cmd+Shift+R or Ctrl+Shift+R)');
        console.log('   2. Check the notification bell icon in the top bar');
        console.log('   3. Test by creating a notification from another user\n');
        return true;
      } else {
        console.log('\n⚠️  Missing fields:', missingFields.join(', '));
        return false;
      }
    } else {
      console.log('❌ Could not verify notifications table');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Error applying fix:', error.message);
    console.error(error);
    return false;
  }
}

// Run the fix
applyFix().then(success => {
  if (success) {
    console.log('✅ Notification fix completed successfully!');
    process.exit(0);
  } else {
    console.log('❌ Notification fix encountered issues');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

