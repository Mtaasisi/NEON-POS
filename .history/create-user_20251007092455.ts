// Quick script to create a user in the Neon database
import { sql } from './src/lib/supabaseClient';

async function createUser() {
  try {
    // User details - modify these as needed
    const email = 'admin@pos.com';
    const password = 'admin123456'; // Change this!
    const fullName = 'Admin User';
    const role = 'admin'; // Options: 'admin', 'manager', 'technician', 'customer-care', 'user'
    
    console.log('Creating user...');
    console.log('Email:', email);
    console.log('Role:', role);
    
    const result = await sql`
      INSERT INTO users (email, password, full_name, role, is_active, created_at, updated_at)
      VALUES (
        ${email},
        ${password},
        ${fullName},
        ${role},
        true,
        NOW(),
        NOW()
      )
      RETURNING id, email, full_name, role, is_active, created_at, updated_at
    `;
    
    if (result && result.length > 0) {
      console.log('✅ User created successfully!');
      console.log('User details:', result[0]);
      return result[0];
    } else {
      console.log('❌ Failed to create user');
      return null;
    }
  } catch (error: any) {
    console.error('❌ Error creating user:', error.message);
    throw error;
  }
}

// Run the function
createUser()
  .then(() => {
    console.log('Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

