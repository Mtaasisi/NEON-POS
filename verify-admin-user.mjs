import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.production' });

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function verifyAdminUser() {
  try {
    const result = await pool.query(
      'SELECT id, email, role, is_active, full_name, username, permissions FROM users WHERE email = $1',
      ['care@care.com']
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin User Verified in Database:');
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log('❌ Admin user not found in database');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyAdminUser();

