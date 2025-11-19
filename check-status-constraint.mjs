#!/usr/bin/env node

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.VITE_DATABASE_URL || 
  'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

console.log('🔍 Checking inventory_items status constraint...\n');

// Get constraint definition
const constraints = await sql`
  SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
  FROM pg_constraint
  WHERE conrelid = 'inventory_items'::regclass
    AND contype = 'c'
`;

console.log('Constraints found:\n');
constraints.forEach(c => {
  console.log(`Name: ${c.constraint_name}`);
  console.log(`Definition: ${c.constraint_definition}\n`);
});

// Get current distinct status values
const statuses = await sql`
  SELECT DISTINCT status, COUNT(*) as count
  FROM inventory_items
  GROUP BY status
  ORDER BY count DESC
`;

console.log('\nCurrent status values in use:\n');
statuses.forEach(s => {
  console.log(`  ${s.status}: ${s.count} records`);
});

