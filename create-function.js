#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import fs from 'fs';

// Load environment variables
const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ No DATABASE_URL found in environment');
  process.exit(1);
}

async function createFunction() {
  const sql = neon(DATABASE_URL);

  try {
    console.log('🔧 Creating reverse_purchase_order_payment function...');

    // Read the SQL file
    const sqlContent = fs.readFileSync('migrations/add_reverse_purchase_order_payment_function.sql', 'utf8');

    // Split into statements and execute each one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        await sql.unsafe(statement);
      }
    }

    console.log('✅ All statements executed. Verifying function creation...');

    // Verify the function was created
    const result = await sql`SELECT proname FROM pg_proc WHERE proname = 'reverse_purchase_order_payment'`;

    if (result.length > 0) {
      console.log('✅ Function created successfully!');
      console.log('🎉 The undo payment functionality should now work.');
    } else {
      console.error('❌ Function was not created');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error creating function:', error);
    process.exit(1);
  }
}

createFunction();
