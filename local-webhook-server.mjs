#!/usr/bin/env node

/**
 * Local WhatsApp Webhook Server for Testing
 * Runs on http://localhost:3001
 * Expose with ngrok for WasenderAPI to reach it
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = 3001;

// Supabase configuration
const SUPABASE_URL = 'https://jxhzveborezjhsmzsgbc.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4aHp2ZWJvcmV6amhzbXpzZ2JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MTE1MjQsImV4cCI6MjA2ODI4NzUyNH0.pIug4PlJ3Q14GxcYilW-u0blByYoyeOfN3q9RNIjgfw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Health check endpoint
app.get('/webhook', (req, res) => {
  console.log('📞 Health check request received');
  res.json({
    status: 'healthy',
    service: 'local-whatsapp-webhook',
    timestamp: new Date().toISOString(),
    port: PORT,
    message: 'Local webhook ready to receive WhatsApp events'
  });
});

// Main webhook endpoint
app.post('/webhook', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const webhookData = req.body;
    const eventType = webhookData.event || 'unknown';
    
    console.log('\n📨 Webhook Event Received:', {
      event: eventType,
      timestamp: new Date().toISOString()
    });
    
    // Immediately respond 200
    res.status(200).json({
      received: true,
      timestamp: new Date().toISOString(),
      event: eventType
    });
    
    // Process webhook
    if (eventType === 'messages.received' || eventType === 'messages.upsert') {
      await handleIncomingMessage(webhookData);
    } else if (eventType === 'messages.update') {
      await handleMessageStatusUpdate(webhookData);
    } else {
      console.log(`ℹ️  Event type: ${eventType} (logged but not processed)`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Processed in ${duration}ms`);
    
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(200).json({ received: true, error: 'logged' });
  }
});

// Handle incoming messages
async function handleIncomingMessage(data) {
  try {
    const message = data.data || {};
    
    console.log('💬 Incoming Message:', {
      from: message.from?.substring(0, 15) + '...',
      type: message.type,
      hasText: !!message.text
    });
    
    if (!message.from || !message.id) {
      console.warn('⚠️  Invalid message data');
      return;
    }
    
    // Clean phone number
    const from = message.from.replace('@s.whatsapp.net', '');
    const cleanPhone = from.replace(/[^\d+]/g, '');
    const messageText = message.text || message.caption || '';
    const messageType = message.type || 'text';
    const messageId = message.id;
    const timestamp = message.timestamp || new Date().toISOString();
    
    console.log(`   Phone: ${cleanPhone}`);
    console.log(`   Text: "${messageText}"`);
    
    // Store in database
    const { data: inserted, error } = await supabase
      .from('whatsapp_incoming_messages')
      .insert({
        message_id: messageId,
        from_phone: cleanPhone,
        message_text: messageText.substring(0, 5000),
        message_type: messageType,
        media_url: message.image || message.video || message.document || message.audio || null,
        received_at: timestamp,
        created_at: new Date().toISOString()
      })
      .select();
    
    if (error) {
      if (error.message?.includes('duplicate')) {
        console.log('ℹ️  Duplicate message (already stored)');
      } else {
        console.error('❌ Database error:', error.message);
      }
    } else {
      console.log('✅ Message stored successfully!');
      console.log(`   ID: ${inserted[0]?.id}`);
      
      // Try to link to customer
      const { data: customer } = await supabase
        .from('customers')
        .select('id, name')
        .or(`phone.eq.${cleanPhone},phone.eq.+${cleanPhone},whatsapp.eq.${cleanPhone}`)
        .limit(1)
        .single();
      
      if (customer) {
        console.log(`✅ Linked to customer: ${customer.name}`);
        
        // Update customer_id
        await supabase
          .from('whatsapp_incoming_messages')
          .update({ customer_id: customer.id })
          .eq('id', inserted[0].id);
      } else {
        console.log(`ℹ️  No customer found for: ${cleanPhone}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error handling message:', error.message);
  }
}

// Handle message status updates
async function handleMessageStatusUpdate(data) {
  try {
    const update = data.data || {};
    const messageId = update.id;
    const status = update.status;
    
    console.log(`📊 Status Update: ${messageId?.substring(0, 20)}... → ${status}`);
    
    if (!messageId || !status) return;
    
    const updateData = { status };
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    } else if (status === 'read') {
      updateData.read_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('whatsapp_logs')
      .update(updateData)
      .eq('message_id', messageId);
    
    if (error) {
      console.error('❌ Update error:', error.message);
    } else {
      console.log(`✅ Status updated to: ${status}`);
    }
    
  } catch (error) {
    console.error('❌ Error updating status:', error.message);
  }
}

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Local WhatsApp Webhook Server');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: development`);
  console.log(`🗄️  Database: Neon PostgreSQL`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  http://localhost:${PORT}/webhook  (health check)`);
  console.log(`  POST http://localhost:${PORT}/webhook  (receive events)`);
  console.log('');
  console.log('🔧 Next steps:');
  console.log('  1. In another terminal, run: ngrok http 3001');
  console.log('  2. Copy the HTTPS URL from ngrok');
  console.log('  3. Configure in WasenderAPI');
  console.log('  4. Send test WhatsApp message');
  console.log('  5. See message appear here!');
  console.log('');
  console.log('⏰ Waiting for webhook events...');
  console.log('');
});

export default app;

