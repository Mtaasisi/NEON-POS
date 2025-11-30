import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;
const pool = new Pool({ connectionString: DATABASE_URL });

async function verifyAdmin() {
  try {
    const result = await pool.query(
      `SELECT id, email, full_name, role, is_active, permissions, created_at 
       FROM users 
       WHERE email = 'admin@pos.com'`
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin user verified in production database!\n');
      console.log('📋 User Details:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Full Name: ${user.full_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Permissions: ${JSON.stringify(user.permissions)}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Created: ${user.created_at}`);
    } else {
      console.log('❌ Admin user not found!');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

verifyAdmin();
