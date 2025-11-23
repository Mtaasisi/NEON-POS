import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || process.env.VITE_DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

// Admin user details
const adminEmail = 'admin@pos.com';
const adminPassword = 'admin123456'; // Change this to a secure password
const adminName = 'Admin User';
const adminRole = 'admin';
const defaultBranchId = '00000000-0000-0000-0000-000000000001';

async function ensureBranchExists() {
  try {
    // Check if branch exists
    const checkBranch = await pool.query(
      'SELECT id FROM lats_branches WHERE id = $1',
      [defaultBranchId]
    );

    if (checkBranch.rows.length === 0) {
      console.log('📁 Creating default branch...');
      await pool.query(
        `INSERT INTO lats_branches (id, name, location, is_active, created_at, updated_at)
         VALUES ($1, 'Main Branch', 'Main Location', true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [defaultBranchId]
      );
      console.log('✅ Default branch created');
    } else {
      console.log('✅ Default branch exists');
    }
  } catch (error) {
    console.error('⚠️  Error checking/creating branch:', error.message);
    // Continue anyway - branch might not be required
  }
}

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user in production database...\n');
    console.log(`📊 Database: ${DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown'}\n`);

    // Ensure branch exists first
    await ensureBranchExists();

    // Check if user already exists
    const checkResult = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE email = $1',
      [adminEmail]
    );

    if (checkResult.rows.length > 0) {
      const existingUser = checkResult.rows[0];
      console.log('⚠️  Admin user already exists!');
      console.log('📋 Existing User Details:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.is_active}`);
      
      // Ask if we should update
      console.log('\n🔄 Updating user to ensure admin role and active status...');
      
      const updateResult = await pool.query(
        `UPDATE users 
         SET 
           password = $1,
           full_name = $2,
           role = $3,
           permissions = ARRAY['all'],
           is_active = true,
           updated_at = NOW()
         WHERE email = $4
         RETURNING id, email, full_name, role, is_active, permissions`,
        [adminPassword, adminName, adminRole, adminEmail]
      );

      if (updateResult.rows.length > 0) {
        const updated = updateResult.rows[0];
        console.log('✅ Admin user updated successfully!');
        console.log('📋 Updated User Details:');
        console.log(`   ID: ${updated.id}`);
        console.log(`   Email: ${updated.email}`);
        console.log(`   Full Name: ${updated.full_name}`);
        console.log(`   Role: ${updated.role}`);
        console.log(`   Permissions: ${updated.permissions}`);
        console.log(`   Active: ${updated.is_active}`);
        console.log(`\n🔑 Login Credentials:`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
      }
    } else {
      // Create new admin user
      console.log('🆕 Creating new admin user...');
      
      const userId = randomUUID();
      
      const insertResult = await pool.query(
        `INSERT INTO users (
          id, email, password, full_name, username, role, 
          permissions, is_active, max_devices_allowed, branch_id,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING id, email, full_name, role, is_active, permissions, created_at`,
        [
          userId,
          adminEmail,
          adminPassword,
          adminName,
          adminEmail.split('@')[0], // username from email
          adminRole,
          ['all'], // Full permissions
          true,
          1000, // max_devices_allowed
          defaultBranchId
        ]
      );

      if (insertResult.rows.length > 0) {
        const newUser = insertResult.rows[0];
        console.log('✅ Admin user created successfully!');
        console.log('📋 User Details:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Full Name: ${newUser.full_name}`);
        console.log(`   Role: ${newUser.role}`);
        console.log(`   Permissions: ${newUser.permissions}`);
        console.log(`   Active: ${newUser.is_active}`);
        console.log(`   Created: ${newUser.created_at}`);
        console.log(`\n🔑 Login Credentials:`);
        console.log(`   Email: ${adminEmail}`);
        console.log(`   Password: ${adminPassword}`);
      }
    }

    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

createAdminUser();
