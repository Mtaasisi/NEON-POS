#!/usr/bin/env node

/**
 * 🚀 BACKEND API SERVER FOR NEON DATABASE
 * Proxies database calls so browser can connect
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { neon } from '@neondatabase/serverless';
import { readFileSync, existsSync } from 'fs';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Get database URL from environment variables or fallback to config file
let DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && existsSync('database-config.json')) {
  const config = JSON.parse(readFileSync('database-config.json', 'utf-8'));
  DATABASE_URL = config.connectionString || config.url;
}

if (!DATABASE_URL) {
  // Fallback to development branch
  DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-damp-fire-adtxvumr-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';
}

const sql = neon(DATABASE_URL);

console.log('🚀 Starting Backend API Server...');
console.log('📡 Database URL configured');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

// Generic query endpoint
app.post('/api/query', async (req, res) => {
  try {
    const { query, params = [] } = req.body;
    
    console.log(`📊 Query: ${query.substring(0, 100)}...`);
    
    // Execute query
    const result = await sql([query]);
    
    res.json({ data: result, error: null });
  } catch (error) {
    console.error('❌ Query error:', error.message);
    res.status(400).json({ 
      data: null, 
      error: {
        message: error.message,
        code: error.code
      }
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('✅ BACKEND API SERVER RUNNING!');
  console.log('='.repeat(50));
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
  console.log(`📊 Query: http://localhost:${PORT}/api/query`);
  console.log('');
  console.log('The frontend can now connect through this API!');
  console.log('='.repeat(50));
});

