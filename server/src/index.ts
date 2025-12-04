/**
 * POS Backend API Server
 * Main entry point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import customersRoutes from './routes/customers.js';
import salesRoutes from './routes/sales.js';
import cartRoutes from './routes/cart.js';
import smsRoutes from './routes/sms.js';
import backupRoutes from './routes/backup.js';
import whatsappWebhookRoutes from './routes/whatsapp-webhook.js';
import bulkWhatsAppRoutes from './routes/bulk-whatsapp.js';
import scheduledMessagesRoutes from './routes/scheduled-messages.js';
import antibanSettingsRoutes from './routes/antiban-settings-postgres.js';
import whatsappSessionsRoutes from './routes/whatsapp-sessions.js';
import neonMigrationRouter from '../routes/neon-migration.mjs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
// CORS needs to be BEFORE helmet to work properly
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200,
}));

// Configure helmet with CORS-friendly settings
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
app.use(compression()); // Compress responses
app.use(express.json({ limit: '1gb' })); // Parse JSON (increased for large backup file uploads)
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api', smsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/whatsapp', whatsappWebhookRoutes);
app.use('/api/bulk-whatsapp', bulkWhatsAppRoutes);
app.use('/api/scheduled-messages', scheduledMessagesRoutes);
app.use('/api/antiban-settings', antibanSettingsRoutes);
app.use('/api/whatsapp-sessions', whatsappSessionsRoutes);
app.use('/api/neon', neonMigrationRouter);

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000, http://localhost:5173'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  GET  /health');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/products');
  console.log('  POST /api/cart/add');
  console.log('  POST /api/sales');
  console.log('  POST /api/sms-proxy');
  console.log('  POST /api/backup/restore');
  console.log('  GET  /api/backup/restore/formats');
  console.log('  POST /api/bulk-whatsapp/create');
  console.log('  GET  /api/bulk-whatsapp/status/:id');
  console.log('  GET  /api/scheduled-messages');
  console.log('  POST /api/scheduled-messages');
  console.log('');

  // Initialize scheduled messages service
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (supabaseUrl && supabaseKey) {
    import('./services/scheduledMessagesService.js').then(({ initScheduler }) => {
      const scheduler = initScheduler(supabaseUrl, supabaseKey);
      console.log('📅 Scheduled Messages Service: STARTED');
      console.log(`   Checking every ${scheduler.getStatus().checkIntervalSeconds}s for pending messages`);
    }).catch(err => {
      console.error('❌ Failed to start Scheduled Messages Service:', err.message);
    });
  } else {
    console.log('⚠️  Scheduled Messages Service: DISABLED (missing Supabase config)');
  }
});

export default app;

