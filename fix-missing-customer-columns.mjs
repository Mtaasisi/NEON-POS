import { Pool } from '@neondatabase/serverless';

// Source database (Developer)
const SOURCE_DB = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Target database (Production/Supabase)
const TARGET_DB = 'postgresql://postgres.jxhzveborezjhsmzsgbc:%40SMASIKA1010@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';

const sourcePool = new Pool({ connectionString: SOURCE_DB });
const targetPool = new Pool({ connectionString: TARGET_DB });

async function fixMissingCustomerColumns() {
  console.log('🔧 Fixing Missing Customer Columns\n');

  // 1. Check source database for country and location_description columns
  console.log('1️⃣ Checking source database (developer)...');
  try {
    const sourceCols = await sourcePool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('country', 'location_description')
      ORDER BY column_name
    `);

    console.log(`   Found ${sourceCols.rows.length} columns in source:`);
    for (const col of sourceCols.rows) {
      console.log(`   - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 2. Check target database
  console.log('\n2️⃣ Checking target database (production)...');
  try {
    const targetCols = await targetPool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('country', 'location_description')
      ORDER BY column_name
    `);

    console.log(`   Found ${targetCols.rows.length} columns in target:`);
    for (const col of targetCols.rows) {
      console.log(`   - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 3. Get full column definitions from source
  console.log('\n3️⃣ Getting column definitions from source...');
  let countryDef = null;
  let locationDescDef = null;

  try {
    const sourceDefs = await sourcePool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('country', 'location_description')
      ORDER BY column_name
    `);

    for (const col of sourceDefs.rows) {
      if (col.column_name === 'country') {
        countryDef = col;
      } else if (col.column_name === 'location_description') {
        locationDescDef = col;
      }
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 4. Add missing columns to target
  console.log('\n4️⃣ Adding missing columns to production...');

  // Add country column
  if (countryDef) {
    try {
      const check = await targetPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'country'
      `);

      if (check.rows.length === 0) {
        const dataType = countryDef.data_type === 'character varying' 
          ? `VARCHAR(${countryDef.character_maximum_length || 255})`
          : countryDef.data_type.toUpperCase();
        
        const nullable = countryDef.is_nullable === 'YES' ? '' : 'NOT NULL';
        const defaultValue = countryDef.column_default ? `DEFAULT ${countryDef.column_default}` : '';

        const sql = `ALTER TABLE customers ADD COLUMN country ${dataType} ${nullable} ${defaultValue}`.trim();
        console.log(`   Adding country column: ${sql}`);
        
        await targetPool.query(sql);
        console.log(`   ✅ Added country column`);
      } else {
        console.log(`   ✅ country column already exists`);
      }
    } catch (error) {
      console.error(`   ❌ Error adding country:`, error.message);
    }
  } else {
    // Default if not found in source
    try {
      const check = await targetPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'country'
      `);

      if (check.rows.length === 0) {
        await targetPool.query(`ALTER TABLE customers ADD COLUMN country VARCHAR(255)`);
        console.log(`   ✅ Added country column (default VARCHAR(255))`);
      }
    } catch (error) {
      console.error(`   ❌ Error adding country:`, error.message);
    }
  }

  // Add location_description column
  if (locationDescDef) {
    try {
      const check = await targetPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'location_description'
      `);

      if (check.rows.length === 0) {
        const dataType = locationDescDef.data_type === 'character varying' 
          ? `VARCHAR(${locationDescDef.character_maximum_length || 255})`
          : locationDescDef.data_type.toUpperCase();
        
        const nullable = locationDescDef.is_nullable === 'YES' ? '' : 'NOT NULL';
        const defaultValue = locationDescDef.column_default ? `DEFAULT ${locationDescDef.column_default}` : '';

        const sql = `ALTER TABLE customers ADD COLUMN location_description ${dataType} ${nullable} ${defaultValue}`.trim();
        console.log(`   Adding location_description column: ${sql}`);
        
        await targetPool.query(sql);
        console.log(`   ✅ Added location_description column`);
      } else {
        console.log(`   ✅ location_description column already exists`);
      }
    } catch (error) {
      console.error(`   ❌ Error adding location_description:`, error.message);
    }
  } else {
    // Default if not found in source
    try {
      const check = await targetPool.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'customers' AND column_name = 'location_description'
      `);

      if (check.rows.length === 0) {
        await targetPool.query(`ALTER TABLE customers ADD COLUMN location_description TEXT`);
        console.log(`   ✅ Added location_description column (default TEXT)`);
      }
    } catch (error) {
      console.error(`   ❌ Error adding location_description:`, error.message);
    }
  }

  // 5. Check and fix search_customers_fn function
  console.log('\n5️⃣ Checking search_customers_fn function...');
  try {
    const funcDef = await sourcePool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'search_customers_fn'
    `);

    if (funcDef.rows.length > 0) {
      console.log(`   ✅ Found function in source database`);
      // We'll need to recreate it in target if it references country
      const definition = funcDef.rows[0].definition;
      if (definition.includes('c.country')) {
        console.log(`   ⚠️  Function references c.country - will need to update`);
        
        // Get the function from target to see if it exists
        const targetFunc = await targetPool.query(`
          SELECT pg_get_functiondef(oid) as definition
          FROM pg_proc
          WHERE proname = 'search_customers_fn'
        `);

        if (targetFunc.rows.length > 0) {
          console.log(`   ✅ Function exists in target - columns should now work`);
        } else {
          console.log(`   ⚠️  Function doesn't exist in target - may need to create it`);
        }
      }
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  // 6. Verify columns were added
  console.log('\n6️⃣ Verifying columns...');
  try {
    const verify = await targetPool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('country', 'location_description')
      ORDER BY column_name
    `);

    console.log(`   ✅ Found ${verify.rows.length} columns:`);
    for (const col of verify.rows) {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    }
  } catch (error) {
    console.error(`   ❌ Error:`, error.message);
  }

  await sourcePool.end();
  await targetPool.end();
  console.log('\n✅ Done!');
}

fixMissingCustomerColumns().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});


