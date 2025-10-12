#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();
const sql = neon(process.env.VITE_DATABASE_URL!);

async function checkAdminUser() {
  console.log('🔍 Checking Admin User...\n');
  
  // Check users table
  console.log('📋 Users Table:');
  const users = await sql`SELECT * FROM users WHERE email = 'admin@pos.com'`;
  console.log(JSON.stringify(users, null, 2));
  
  // Check auth_users table
  console.log('\n📋 Auth_Users Table:');
  const authUsers = await sql`SELECT * FROM auth_users WHERE email = 'admin@pos.com'`;
  console.log(JSON.stringify(authUsers, null, 2));
  
  console.log('\n✅ Done');
}

checkAdminUser().catch(console.error);

