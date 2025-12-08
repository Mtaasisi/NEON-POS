import pg from 'pg';
const { Client } = pg;

// Get connection string from command line
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Error: Please provide a database connection string');
  console.error('Usage: node clean-database.mjs "postgresql://postgres:PASSWORD@host:5432/postgres"');
  process.exit(1);
}

// Replace [YOUR_PASSWORD] if present
let dbUrl = connectionString.replace('[YOUR_PASSWORD]', process.env.DB_PASSWORD || '');

if (dbUrl.includes('[YOUR_PASSWORD]')) {
  console.error('❌ Error: Password not provided');
  console.error('Please provide password in connection string or set DB_PASSWORD environment variable');
  process.exit(1);
}

const client = new Client({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function cleanDatabase() {
  console.log('🧹 Starting Database Cleanup\n');
  console.log('⚠️  WARNING: This will DELETE ALL TABLES and DATA!\n');
  console.log('📊 Connecting to database...\n');

  try {
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Get database info
    const dbInfo = await client.query('SELECT current_database() as db, version() as version');
    console.log(`📊 Database: ${dbInfo.rows[0].db}`);
    console.log(`📊 PostgreSQL: ${dbInfo.rows[0].version.split(' ')[0]} ${dbInfo.rows[0].version.split(' ')[1]}\n`);

    // Step 1: Get all tables
    console.log('📋 Step 1: Getting list of all tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const tables = tablesResult.rows.map(r => r.table_name);
    console.log(`   Found ${tables.length} tables\n`);

    if (tables.length === 0) {
      console.log('✅ Database is already clean - no tables found!');
      await client.end();
      return;
    }

    // Step 2: Drop all foreign key constraints first (to avoid dependency issues)
    console.log('🔗 Step 2: Dropping foreign key constraints...');
    const fkResult = await client.query(`
      SELECT 
        tc.table_name,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
    `);
    
    let fkCount = 0;
    for (const fk of fkResult.rows) {
      try {
        await client.query(`ALTER TABLE ${fk.table_name} DROP CONSTRAINT IF EXISTS ${fk.constraint_name} CASCADE`);
        fkCount++;
      } catch (error) {
        console.log(`   ⚠️  Could not drop FK ${fk.constraint_name} on ${fk.table_name}: ${error.message}`);
      }
    }
    console.log(`   ✅ Dropped ${fkCount} foreign key constraints\n`);

    // Step 3: Drop all tables
    console.log('🗑️  Step 3: Dropping all tables...');
    let droppedCount = 0;
    for (const table of tables) {
      try {
        await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        droppedCount++;
        if (droppedCount % 10 === 0) {
          process.stdout.write(`   Progress: ${droppedCount}/${tables.length} tables dropped...\r`);
        }
      } catch (error) {
        console.log(`\n   ⚠️  Could not drop table ${table}: ${error.message}`);
      }
    }
    console.log(`\n   ✅ Dropped ${droppedCount} tables\n`);

    // Step 4: Drop all views
    console.log('👁️  Step 4: Dropping all views...');
    const viewsResult = await client.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    
    let viewsDropped = 0;
    for (const view of viewsResult.rows) {
      try {
        await client.query(`DROP VIEW IF EXISTS ${view.table_name} CASCADE`);
        viewsDropped++;
      } catch (error) {
        console.log(`   ⚠️  Could not drop view ${view.table_name}: ${error.message}`);
      }
    }
    console.log(`   ✅ Dropped ${viewsDropped} views\n`);

    // Step 5: Drop all sequences
    console.log('🔢 Step 5: Dropping all sequences...');
    const sequencesResult = await client.query(`
      SELECT sequence_name 
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);
    
    let sequencesDropped = 0;
    for (const seq of sequencesResult.rows) {
      try {
        await client.query(`DROP SEQUENCE IF EXISTS ${seq.sequence_name} CASCADE`);
        sequencesDropped++;
      } catch (error) {
        console.log(`   ⚠️  Could not drop sequence ${seq.sequence_name}: ${error.message}`);
      }
    }
    console.log(`   ✅ Dropped ${sequencesDropped} sequences\n`);

    // Step 6: Drop all functions
    console.log('⚙️  Step 6: Dropping all functions...');
    const functionsResult = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
    `);
    
    let functionsDropped = 0;
    for (const func of functionsResult.rows) {
      try {
        // Get function signature to drop it properly
        const funcSig = await client.query(`
          SELECT pg_get_function_identity_arguments(oid) as args
          FROM pg_proc
          WHERE proname = $1
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          LIMIT 1
        `, [func.routine_name]);
        
        if (funcSig.rows.length > 0) {
          const args = funcSig.rows[0].args || '';
          await client.query(`DROP FUNCTION IF EXISTS ${func.routine_name}(${args}) CASCADE`);
        } else {
          await client.query(`DROP FUNCTION IF EXISTS ${func.routine_name} CASCADE`);
        }
        functionsDropped++;
      } catch (error) {
        console.log(`   ⚠️  Could not drop function ${func.routine_name}: ${error.message}`);
      }
    }
    console.log(`   ✅ Dropped ${functionsDropped} functions\n`);

    // Step 7: Drop all types (custom types)
    console.log('📝 Step 7: Dropping custom types...');
    const typesResult = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'c'
    `);
    
    let typesDropped = 0;
    for (const type of typesResult.rows) {
      try {
        await client.query(`DROP TYPE IF EXISTS ${type.typname} CASCADE`);
        typesDropped++;
      } catch (error) {
        console.log(`   ⚠️  Could not drop type ${type.typname}: ${error.message}`);
      }
    }
    console.log(`   ✅ Dropped ${typesDropped} custom types\n`);

    // Step 8: Verify database is clean
    console.log('✅ Step 8: Verifying database is clean...');
    const remainingTables = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const remainingViews = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views 
      WHERE table_schema = 'public'
    `);
    
    const remainingSequences = await client.query(`
      SELECT COUNT(*) as count
      FROM information_schema.sequences 
      WHERE sequence_schema = 'public'
    `);

    console.log(`   Tables remaining: ${remainingTables.rows[0].count}`);
    console.log(`   Views remaining: ${remainingViews.rows[0].count}`);
    console.log(`   Sequences remaining: ${remainingSequences.rows[0].count}\n`);

    if (remainingTables.rows[0].count === '0' && 
        remainingViews.rows[0].count === '0' && 
        remainingSequences.rows[0].count === '0') {
      console.log('='.repeat(60));
      console.log('✅ DATABASE CLEANED SUCCESSFULLY!');
      console.log('='.repeat(60));
      console.log('📊 Summary:');
      console.log(`   - Dropped ${droppedCount} tables`);
      console.log(`   - Dropped ${viewsDropped} views`);
      console.log(`   - Dropped ${sequencesDropped} sequences`);
      console.log(`   - Dropped ${functionsDropped} functions`);
      console.log(`   - Dropped ${typesDropped} custom types`);
      console.log(`   - Dropped ${fkCount} foreign key constraints`);
      console.log('\n✨ Database is now clean as new!');
      console.log('='.repeat(60));
    } else {
      console.log('⚠️  Some objects may still remain. Database may not be completely clean.');
    }

    await client.end();
    console.log('\n✅ Cleanup completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    await client.end().catch(() => {});
    process.exit(1);
  }
}

cleanDatabase().catch(error => {
  console.error('❌ Fatal Error:', error);
  process.exit(1);
});
