import { Pool } from '@neondatabase/serverless';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const targetPool = new Pool({ connectionString: TARGET_DB });

async function createBranch() {
  console.log('🔧 Creating Branch with Correct Schema\n');
  console.log('📊 Database: aws-0-eu-north-1.pooler.supabase.com\n');

  const branchId = '24cd45b8-1ce1-486a-b055-29d169c3a8ea';

  // 1. Get actual columns
  console.log('1️⃣ Getting lats_branches table structure...');
  const columns = await targetPool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'lats_branches'
    ORDER BY column_name
  `);
  console.log(`   Columns: ${columns.rows.map(c => c.column_name).join(', ')}`);

  // 2. Check if branch exists
  console.log('\n2️⃣ Checking if branch exists...');
  const branchCheck = await targetPool.query(`
    SELECT id, name FROM lats_branches WHERE id = $1
  `, [branchId]);

  if (branchCheck.rows.length === 0) {
    console.log(`   Branch doesn't exist, creating...`);
    
    // Build INSERT with only existing columns
    const requiredColumns = ['id', 'name', 'is_active', 'created_at', 'updated_at'];
    const optionalColumns = ['data_isolation_mode', 'share_suppliers', 'share_products', 
                            'share_customers', 'share_inventory', 'share_categories', 'share_employees'];
    
    const existingColumns = columns.rows.map(c => c.column_name);
    const colsToUse = [...requiredColumns, ...optionalColumns.filter(c => existingColumns.includes(c))];
    
    const values = [
      branchId,
      'Main Branch',
      true,
      'hybrid',
      true, true, true, true, true, true,
      'NOW()',
      'NOW()'
    ];
    
    const placeholders = colsToUse.map((_, i) => `$${i + 1}`).join(', ');
    const columnNames = colsToUse.join(', ');
    
    // Adjust values based on what columns exist
    const finalValues = [branchId, 'Main Branch', true];
    if (existingColumns.includes('data_isolation_mode')) finalValues.push('hybrid');
    if (existingColumns.includes('share_suppliers')) finalValues.push(true);
    if (existingColumns.includes('share_products')) finalValues.push(true);
    if (existingColumns.includes('share_customers')) finalValues.push(true);
    if (existingColumns.includes('share_inventory')) finalValues.push(true);
    if (existingColumns.includes('share_categories')) finalValues.push(true);
    if (existingColumns.includes('share_employees')) finalValues.push(true);
    finalValues.push('NOW()', 'NOW()');
    
    const finalCols = ['id', 'name', 'is_active'];
    if (existingColumns.includes('data_isolation_mode')) finalCols.push('data_isolation_mode');
    if (existingColumns.includes('share_suppliers')) finalCols.push('share_suppliers');
    if (existingColumns.includes('share_products')) finalCols.push('share_products');
    if (existingColumns.includes('share_customers')) finalCols.push('share_customers');
    if (existingColumns.includes('share_inventory')) finalCols.push('share_inventory');
    if (existingColumns.includes('share_categories')) finalCols.push('share_categories');
    if (existingColumns.includes('share_employees')) finalCols.push('share_employees');
    finalCols.push('created_at', 'updated_at');
    
    const finalPlaceholders = finalCols.map((_, i) => `$${i + 1}`).join(', ');
    
    try {
      await targetPool.query(`
        INSERT INTO lats_branches (${finalCols.join(', ')})
        VALUES (${finalPlaceholders})
      `, finalValues);
      console.log(`   ✅ Created branch: Main Branch`);
    } catch (error) {
      console.error(`   ❌ Error creating branch:`, error.message);
    }
  } else {
    console.log(`   ✅ Branch exists: ${branchCheck.rows[0].name}`);
    
    // Update isolation settings
    const updateCols = [];
    const updateValues = [];
    let paramCount = 1;
    
    if (existingColumns.includes('data_isolation_mode')) {
      updateCols.push(`data_isolation_mode = $${paramCount++}`);
      updateValues.push('hybrid');
    }
    if (existingColumns.includes('share_suppliers')) {
      updateCols.push(`share_suppliers = $${paramCount++}`);
      updateValues.push(true);
    }
    if (existingColumns.includes('share_products')) {
      updateCols.push(`share_products = $${paramCount++}`);
      updateValues.push(true);
    }
    if (existingColumns.includes('share_customers')) {
      updateCols.push(`share_customers = $${paramCount++}`);
      updateValues.push(true);
    }
    if (existingColumns.includes('share_inventory')) {
      updateCols.push(`share_inventory = $${paramCount++}`);
      updateValues.push(true);
    }
    if (existingColumns.includes('share_categories')) {
      updateCols.push(`share_categories = $${paramCount++}`);
      updateValues.push(true);
    }
    if (existingColumns.includes('share_employees')) {
      updateCols.push(`share_employees = $${paramCount++}`);
      updateValues.push(true);
    }
    
    if (existingColumns.includes('updated_at')) {
      updateCols.push(`updated_at = NOW()`);
    }
    
    if (updateCols.length > 0) {
      updateValues.push(branchId);
      await targetPool.query(`
        UPDATE lats_branches
        SET ${updateCols.join(', ')}
        WHERE id = $${paramCount}
      `, updateValues);
      console.log(`   ✅ Updated branch isolation settings`);
    }
  }

  // 3. Verify
  console.log('\n3️⃣ Verifying branch...');
  const branch = await targetPool.query(`
    SELECT * FROM lats_branches WHERE id = $1
  `, [branchId]);

  if (branch.rows.length > 0) {
    const b = branch.rows[0];
    console.log(`   ✅ Branch: ${b.name || 'Unknown'}`);
    console.log(`   Active: ${b.is_active}`);
    if (b.data_isolation_mode) console.log(`   Isolation mode: ${b.data_isolation_mode}`);
    if (b.share_suppliers !== undefined) console.log(`   Share suppliers: ${b.share_suppliers}`);
  }

  await targetPool.end();
  console.log('\n✅ Done!');
}

createBranch().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});

