import postgres from 'postgres';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = postgres(process.env.DATABASE_URL || '', {
  ssl: 'require',
  max: 1
});

async function linkCareUserToEmployee() {
  try {
    console.log('🔍 Checking user and employee records for care@care.com...\n');

    // Check user
    const users = await sql`
      SELECT id, email, full_name, role, is_active
      FROM users
      WHERE LOWER(email) = LOWER('care@care.com')
    `;

    if (users.length === 0) {
      console.log('❌ User not found with email care@care.com');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ User found:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   Role: ${user.role}\n`);

    // Check employee
    const employees = await sql`
      SELECT id, email, first_name, last_name, position, department, user_id, status
      FROM employees
      WHERE LOWER(email) = LOWER('care@care.com')
    `;

    if (employees.length === 0) {
      console.log('⚠️  No employee record found with email care@care.com');
      console.log('   You need to create an employee record first.\n');
      process.exit(1);
    }

    const employee = employees[0];
    console.log('✅ Employee found:');
    console.log(`   ID: ${employee.id}`);
    console.log(`   Email: ${employee.email}`);
    console.log(`   Name: ${employee.first_name} ${employee.last_name}`);
    console.log(`   Position: ${employee.position}`);
    console.log(`   Department: ${employee.department}`);
    console.log(`   Current user_id: ${employee.user_id || 'NULL (not linked)'}`);
    console.log(`   Status: ${employee.status}\n`);

    // Check if already linked
    if (employee.user_id === user.id) {
      console.log('ℹ️  User and employee are already linked!');
      await sql.end();
      process.exit(0);
    }

    if (employee.user_id && employee.user_id !== user.id) {
      console.log('⚠️  WARNING: Employee is linked to a different user!');
      console.log(`   Current user_id: ${employee.user_id}`);
      console.log(`   Target user_id: ${user.id}`);
      console.log('   This will overwrite the existing link.\n');
    }

    // Link them
    console.log('🔗 Linking user to employee...');
    const result = await sql`
      UPDATE employees
      SET 
        user_id = ${user.id},
        updated_at = NOW()
      WHERE id = ${employee.id}
      RETURNING id, user_id
    `;

    if (result.length > 0) {
      console.log('✅ Successfully linked user to employee!');
      console.log(`   Employee ID: ${result[0].id}`);
      console.log(`   User ID: ${result[0].user_id}\n`);

      // Verify the link
      const verification = await sql`
        SELECT 
          u.id as user_id,
          u.email as user_email,
          u.full_name as user_name,
          u.role as user_role,
          e.id as employee_id,
          e.email as employee_email,
          e.first_name || ' ' || e.last_name as employee_name,
          e.position,
          e.department
        FROM users u
        JOIN employees e ON e.user_id = u.id
        WHERE u.email = 'care@care.com'
      `;

      if (verification.length > 0) {
        const v = verification[0];
        console.log('✅ Verification successful:');
        console.log(`   User: ${v.user_name} (${v.user_email})`);
        console.log(`   Role: ${v.user_role}`);
        console.log(`   Employee: ${v.employee_name}`);
        console.log(`   Position: ${v.position}`);
        console.log(`   Department: ${v.department}\n`);
        console.log('🎉 User care@care.com can now access employee features like "My Attendance"!');
      }
    } else {
      console.log('❌ Failed to link user to employee');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the fix
linkCareUserToEmployee();













