#!/usr/bin/env node

/**
 * JWT Token Generator for PostgREST
 * 
 * This script generates JWT tokens for use with PostgREST authentication.
 * You need to install jsonwebtoken: npm install jsonwebtoken
 */

const jwt = require('jsonwebtoken');

// IMPORTANT: Change this to match your JWT secret in docker-compose.yml
const JWT_SECRET = '8PG+blJpq9fIXhiTR12QDvGr7W2fOH0lPOqblKTotDY=';

// Role to use (should match your database role)
const ROLE = 'neondb_owner';

// Generate tokens
console.log('🔐 JWT Token Generator for PostgREST\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Anonymous/Public token (for frontend use)
const anonToken = jwt.sign(
  { role: ROLE },
  JWT_SECRET,
  { expiresIn: '10y' } // Token valid for 10 years
);

console.log('✅ Anon/Public Token (use as VITE_SUPABASE_ANON_KEY):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(anonToken);
console.log('\n');

// Service role token (for backend/admin use)
const serviceToken = jwt.sign(
  { role: ROLE },
  JWT_SECRET,
  { expiresIn: '10y' }
);

console.log('🔧 Service Role Token (for backend scripts):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(serviceToken);
console.log('\n');

// User token example (with user ID)
const userToken = jwt.sign(
  { 
    role: ROLE,
    user_id: 'example-user-123'
  },
  JWT_SECRET,
  { expiresIn: '7d' } // Token valid for 7 days
);

console.log('👤 Example User Token (7 days expiration):');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(userToken);
console.log('\n');

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('📝 Next Steps:\n');
console.log('1. Copy the Anon/Public Token');
console.log('2. Add it to your .env file as VITE_SUPABASE_ANON_KEY');
console.log('3. Set VITE_SUPABASE_URL=http://localhost:3000');
console.log('4. Restart your development server\n');

console.log('⚠️  SECURITY WARNING:');
console.log('   Change the JWT_SECRET in both this file and docker-compose.yml');
console.log('   to a secure random string before deploying to production!\n');
console.log('   Generate one with: openssl rand -base64 32\n');

