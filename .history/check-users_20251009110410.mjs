#!/usr/bin/env node
import { neon } from '@neondatabase/serverless';

const DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(DATABASE_URL);

console.log('👥 Checking users in database...\n');

try {
  const users = await sql`SELECT email, password, full_name, role, is_active FROM users ORDER BY role`;
  
  console.log('Found ' + users.length + ' users:\n');
  console.log('=' .repeat(80));
  users.forEach(u => {
    console.log(`${u.is_active ? '✅' : '❌'} ${u.email.padEnd(25)} | ${u.password.padEnd(15)} | ${u.full_name?.padEnd(20) || 'N/A'.padEnd(20)} | ${u.role}`);
  });
  console.log('='.repeat(80));
} catch (error) {
  console.error('❌ Error:', error.message);
}

