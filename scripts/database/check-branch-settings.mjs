import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function checkBranchSettings() {
  console.log('🔍 Checking branch settings...\n');
  
  try {
    const branches = await sql`
      SELECT 
        id,
        name,
        data_isolation_mode,
        share_accounts
      FROM store_locations
      ORDER BY name
    `;
    
    console.log(`📊 Total branches: ${branches.length}\n`);
    
    branches.forEach((branch, idx) => {
      console.log(`${idx + 1}. ${branch.name}`);
      console.log(`   ID: ${branch.id}`);
      console.log(`   Isolation Mode: ${branch.data_isolation_mode || 'NOT SET'}`);
      console.log(`   Share Accounts: ${branch.share_accounts !== null ? branch.share_accounts : 'NOT SET'}`);
      console.log('');
    });
    
    // Check if default branch exists
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    const defaultBranch = branches.find(b => b.id === defaultBranchId);
    
    if (!defaultBranch) {
      console.log('⚠️  Default branch not found! Creating it...');
      await sql`
        INSERT INTO store_locations (id, name, location, data_isolation_mode, share_accounts)
        VALUES (${defaultBranchId}, 'Main Branch', 'Main Location', 'shared', true)
        ON CONFLICT (id) DO NOTHING
      `;
      console.log('✅ Default branch created/updated');
    } else {
      // Ensure share_accounts is set to true for default branch
      if (defaultBranch.share_accounts === false || defaultBranch.data_isolation_mode === 'isolated') {
        console.log('⚠️  Default branch has accounts isolated. Updating to shared...');
        await sql`
          UPDATE store_locations
          SET 
            data_isolation_mode = 'shared',
            share_accounts = true
          WHERE id = ${defaultBranchId}
        `;
        console.log('✅ Default branch updated to shared mode');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

checkBranchSettings();
