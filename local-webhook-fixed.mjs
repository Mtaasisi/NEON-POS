#!/usr/bin/env node

/**
 * Local WhatsApp Webhook Server - Fixed with direct PostgreSQL
 */

import express from 'express';
import pkg from 'pg';
const { Client } = pkg;

const app = express();
const PORT = 3001;

// Direct PostgreSQL connection to Neon
const DB_URL = 'postgresql://neondb_owner:npg_dMyv1cG4KSOR@ep-icy-mouse-adshjg5n-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check
app.get('/webhook', (req, res) => {
  console.log('📞 Health check');
  res.json({
    status: 'healthy',
    service: 'local-webhook',
    timestamp: new Date().toISOString()
  });
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const client = new Client({ connectionString: DB_URL });
  
  try {
    const data = req.body;
    const event = data.event || 'unknown';
    
    console.log(`\n📨 Event: ${event}`);
    
    // Respond immediately
    res.json({ received: true, event });
    
    // Process message
    if (event === 'messages.received' || event === 'messages.upsert') {
      const msg = data.data || {};
      
      if (!msg.from || !msg.id) {
        console.log('⚠️  Invalid message');
        return;
      }
      
      const phone = msg.from.replace('@s.whatsapp.net', '').replace(/[^\d]/g, '');
      const text = msg.text || msg.caption || '';
      
      console.log(`💬 From: ${phone}`);
      console.log(`   Text: "${text}"`);
      
      // Connect and insert
      await client.connect();
      
      await client.query(`
        INSERT INTO whatsapp_incoming_messages 
        (message_id, from_phone, message_text, message_type, received_at, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (message_id) DO NOTHING
      `, [msg.id, phone, text.substring(0, 5000), msg.type || 'text', msg.timestamp || new Date().toISOString()]);
      
      console.log('✅ Stored in database!');
      
      await client.end();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    try { await client.end(); } catch (e) {}
  }
});

app.listen(PORT, () => {
  console.log('\n🚀 Local Webhook Server (Fixed)');
  console.log('═══════════════════════════════');
  console.log(`✅ Running: http://localhost:${PORT}`);
  console.log(`🌐 Public: https://1428ffc66f2e.ngrok-free.app/webhook`);
  console.log('\n⏰ Waiting for messages...\n');
});

