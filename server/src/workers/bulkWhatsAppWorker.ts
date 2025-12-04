/**
 * Background Worker for Processing Bulk WhatsApp Campaigns
 * 
 * Runs continuously in the cloud
 * Processes campaigns independent of client connection
 * Can be deployed as:
 * - Separate Node.js process
 * - Docker container
 * - Serverless function (scheduled)
 * - Cloud service (AWS Lambda, Google Cloud Functions, etc.)
 */

import BulkWhatsAppQueueService from '../services/bulkWhatsAppQueue';

class BulkWhatsAppWorker {
  private queueService: BulkWhatsAppQueueService;
  private isRunning = false;
  private intervalMs = 5000; // Check every 5 seconds

  constructor() {
    this.queueService = new BulkWhatsAppQueueService(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );
  }

  /**
   * Start the worker
   */
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Worker already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Bulk WhatsApp Worker started');
    console.log(`📊 Checking for pending campaigns every ${this.intervalMs / 1000}s`);

    // Process loop
    while (this.isRunning) {
      try {
        await this.queueService.processPendingCampaigns();
      } catch (error) {
        console.error('❌ Worker error:', error);
      }

      // Wait before next check
      await this.sleep(this.intervalMs);
    }
  }

  /**
   * Stop the worker
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Bulk WhatsApp Worker stopped');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  getStatus() {
    return {
      running: this.isRunning,
      intervalMs: this.intervalMs,
      timestamp: new Date().toISOString()
    };
  }
}

// If running as standalone process
if (require.main === module) {
  const worker = new BulkWhatsAppWorker();
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📥 SIGTERM received, stopping worker...');
    worker.stop();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('📥 SIGINT received, stopping worker...');
    worker.stop();
    process.exit(0);
  });
  
  // Start worker
  worker.start().catch(error => {
    console.error('💥 Worker failed to start:', error);
    process.exit(1);
  });
}

export default BulkWhatsAppWorker;

