import dotenv from 'dotenv';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const sql = postgres(DATABASE_URL, { ssl: 'require' });

async function verifyBranchId() {
  console.log('🔍 Verifying branch_id is included in finance_accounts...\n');
  
  try {
    // Check if branch_id column exists
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'finance_accounts' AND column_name = 'branch_id'
    `;
    
    if (columns.length === 0) {
      console.log('⚠️  branch_id column does not exist! Adding it...');
      await sql`
        ALTER TABLE finance_accounts
        ADD COLUMN branch_id UUID REFERENCES store_locations(id)
      `;
      console.log('✅ Added branch_id column');
    } else {
      console.log('✅ branch_id column exists');
    }
    
    // Check if is_shared column exists
    const sharedColumn = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'finance_accounts' AND column_name = 'is_shared'
    `;
    
    if (sharedColumn.length === 0) {
      console.log('⚠️  is_shared column does not exist! Adding it...');
      await sql`
        ALTER TABLE finance_accounts
        ADD COLUMN is_shared BOOLEAN DEFAULT true
      `;
      console.log('✅ Added is_shared column');
    } else {
      console.log('✅ is_shared column exists');
    }
    
    // Check current accounts
    const accounts = await sql`
      SELECT id, name, branch_id, is_shared
      FROM finance_accounts
      ORDER BY created_at DESC
    `;
    
    console.log(`\n📊 Current accounts (${accounts.length}):`);
    accounts.forEach(acc => {
      console.log(`   - ${acc.name}: branch_id=${acc.branch_id || 'NULL'}, is_shared=${acc.is_shared}`);
    });
    
    // Update accounts without branch_id to use default branch
    const defaultBranchId = '00000000-0000-0000-0000-000000000001';
    const updated = await sql`
      UPDATE finance_accounts
      SET 
        branch_id = ${defaultBranchId},
        is_shared = true
      WHERE branch_id IS NULL
      RETURNING id, name
    `;
    
    if (updated.length > 0) {
      console.log(`\n✅ Updated ${updated.length} accounts with default branch_id:`);
      updated.forEach(acc => console.log(`   - ${acc.name}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sql.end();
  }
}

verifyBranchId();
