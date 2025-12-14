import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function setupDefaultBranch() {
  console.log('🔧 Setting up default branch...\n');
  
  try {
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    
    // Check if branch exists
    const existing = await sql`
      SELECT id, name FROM store_locations WHERE id = ${defaultBranchId}
    `;
    
    if (existing.length > 0) {
      console.log('✅ Default branch already exists:', existing[0].name);
      
      // Update to ensure accounts are shared
      await sql`
        UPDATE store_locations
        SET 
          data_isolation_mode = 'shared',
          share_accounts = true,
          is_active = true
        WHERE id = ${defaultBranchId}
      `;
      console.log('✅ Updated branch settings to shared mode');
    } else {
      // Create default branch
      await sql`
        INSERT INTO store_locations (
          id, name, code, address, city, country,
          is_main, is_active,
          data_isolation_mode, share_accounts
        )
        VALUES (
          ${defaultBranchId},
          'Main Branch',
          'MAIN',
          'Main Location',
          'Dar es Salaam',
          'Tanzania',
          true,
          true,
          'shared',
          true
        )
      `;
      console.log('✅ Created default branch with shared accounts');
    }
    
    // Verify
    const branch = await sql`
      SELECT id, name, data_isolation_mode, share_accounts
      FROM store_locations
      WHERE id = ${defaultBranchId}
    `;
    
    console.log('\n📋 Branch Settings:');
    console.log(`   Name: ${branch[0].name}`);
    console.log(`   Isolation Mode: ${branch[0].data_isolation_mode}`);
    console.log(`   Share Accounts: ${branch[0].share_accounts}`);
    
    // Check accounts visibility
    const accounts = await sql`
      SELECT COUNT(*) as count
      FROM finance_accounts
      WHERE is_active = true AND is_payment_method = true
    `;
    
    console.log(`\n💳 Active payment accounts: ${accounts[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Details:', error);
  } finally {
    await sql.end();
  }
}

setupDefaultBranch();
