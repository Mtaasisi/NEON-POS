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
import neonMigrationRouter from './routes/neon-migration.mjs';
import multer from 'multer';
import FormData from 'form-data';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3001;

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
  // Fallback URLs based on environment
  // Use production database when NODE_ENV is production
  if (process.env.NODE_ENV === 'production') {
    DATABASE_URL = 'postgresql://neondb_owner:npg_vABqUKk73tEW@ep-young-firefly-adlvuhdv-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  } else {
    DATABASE_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  }
}

const sql = neon(DATABASE_URL);

const dbEnvironment = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'DEVELOPMENT';
const dbHost = DATABASE_URL.match(/@([^/]+)/)?.[1] || 'unknown';

console.log('🚀 Starting Backend API Server...');
console.log(`📡 Database: ${dbEnvironment} (${dbHost})`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend API is running' });
});

// Mount Neon migration routes
app.use('/api/neon', neonMigrationRouter);

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// WhatsApp media upload proxy endpoint (fixes CORS issues)
app.post('/api/whatsapp/upload-media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const apiKey = req.headers.authorization?.replace('Bearer ', '');
    
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'API key required' });
    }
    
    // Import form-data package for Node.js multipart/form-data
    const FormDataNode = (await import('form-data')).default;
    
    // Create form data for wasenderapi using the Node.js form-data package
    const formData = new FormDataNode();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: req.file.size
    });
    
    console.log(`📤 Proxying media upload to WasenderAPI: ${req.file.originalname}`);
    console.log(`📋 File size: ${(req.file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📋 MIME type: ${req.file.mimetype}`);
    console.log(`📋 API Key: ${apiKey.substring(0, 10)}...`);
    
    // Forward to wasenderapi.com
    // Note: Only include Authorization header, let form-data set its own headers
    const response = await fetch('https://wasenderapi.com/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders() // This correctly includes Content-Type with boundary
      },
      body: formData
    });
    
    console.log(`📡 WasenderAPI Response Status: ${response.status} ${response.statusText}`);
    
    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await response.text();
    console.log(`📡 WasenderAPI Response Body:`, responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON:', e.message);
      throw new Error(`Invalid response from WasenderAPI: ${responseText.substring(0, 200)}`);
    }
    
    if (!response.ok) {
      console.error('❌ WasenderAPI error response:', data);
      throw new Error(data.message || data.error || `Upload failed with status ${response.status}`);
    }
    
    console.log('✅ Media uploaded successfully:', data.url || data.data?.url);
    res.json(data);
  } catch (error) {
    console.error('❌ WasenderAPI upload error:', error.message);
    console.error('❌ Full error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
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

