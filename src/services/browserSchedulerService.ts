/**
 * Browser Scheduler Service
 * 
 * Service for managing the browser-based scheduled messages worker
 */

import { supabase } from '../lib/supabase';

export interface SchedulerStatus {
  isRunning: boolean;
  checkInterval: number;
  checkIntervalSeconds: number;
}

export interface ExecutionResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ phone: string; error: string }>;
}

class BrowserSchedulerService {
  private worker: Worker | null = null;
  private isInitialized = false;
  private listeners: Map<string, Set<Function>> = new Map();

  /**
   * Initialize the scheduler worker
   */
  initialize() {
    if (this.isInitialized) {
      console.log('Browser scheduler already initialized');
      return;
    }

    try {
      // Create worker from public folder
      this.worker = new Worker('/scheduler-worker.js');

      // Set up message handler
      this.worker.onmessage = (event) => {
        const { type, payload } = event.data;
        this.handleWorkerMessage(type, payload);
      };

      // Handle worker errors
      this.worker.onerror = (error) => {
        console.error('Browser scheduler worker error:', error);
        this.emit('error', error);
      };

      this.isInitialized = true;
      console.log('✅ Browser scheduler initialized');
    } catch (error) {
      console.error('Failed to initialize browser scheduler:', error);
      throw error;
    }
  }

  /**
   * Start the scheduler
   */
  start() {
    if (!this.isInitialized) {
      this.initialize();
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration not found');
    }

    this.worker?.postMessage({
      type: 'START',
      payload: {
        supabaseUrl,
        supabaseKey
      }
    });

    console.log('📅 Starting browser scheduler...');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.worker?.postMessage({ type: 'STOP' });
    console.log('⏹️  Stopping browser scheduler...');
  }

  /**
   * Set check interval (in milliseconds)
   */
  setCheckInterval(interval: number) {
    this.worker?.postMessage({
      type: 'SET_INTERVAL',
      payload: { interval }
    });
  }

  /**
   * Manually trigger a check
   */
  checkNow() {
    this.worker?.postMessage({ type: 'CHECK_NOW' });
  }

  /**
   * Execute a specific message by ID
   */
  executeMessage(messageId: string) {
    this.worker?.postMessage({
      type: 'EXECUTE',
      payload: { messageId }
    });
  }

  /**
   * Terminate the worker
   */
  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.isInitialized = false;
    console.log('🔴 Browser scheduler terminated');
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(type: string, payload: any) {
    switch (type) {
      case 'READY':
        console.log('✅ Scheduler worker ready');
        this.emit('ready', payload);
        break;

      case 'STARTED':
        console.log('✅ Scheduler started:', payload.message);
        this.emit('started', payload);
        break;

      case 'STOPPED':
        console.log('⏹️  Scheduler stopped');
        this.emit('stopped', payload);
        break;

      case 'LOG':
        console.log('📅 [Scheduler]:', payload);
        this.emit('log', payload);
        break;

      case 'ERROR':
        console.error('❌ [Scheduler Error]:', payload);
        this.emit('error', payload);
        break;

      case 'EXECUTION_STARTED':
        console.log('📤 Execution started:', payload.messageId);
        this.emit('execution_started', payload);
        break;

      case 'EXECUTION_COMPLETED':
        console.log('✅ Execution completed:', payload);
        this.emit('execution_completed', payload);
        break;

      case 'EXECUTION_FAILED':
        console.error('❌ Execution failed:', payload);
        this.emit('execution_failed', payload);
        break;

      case 'PROGRESS':
        this.emit('progress', payload);
        break;

      default:
        console.log('Unknown worker message:', type, payload);
    }
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data: any) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Check if worker is initialized
   */
  isWorkerInitialized(): boolean {
    return this.isInitialized;
  }
}

// Singleton instance
export const browserScheduler = new BrowserSchedulerService();

// Auto-start if enabled in settings
export async function initBrowserScheduler() {
  try {
    // Check if browser scheduling is enabled in user settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('browser_scheduler_enabled')
      .single();

    if (settings?.browser_scheduler_enabled !== false) {
      browserScheduler.initialize();
      browserScheduler.start();
      console.log('✅ Browser scheduler auto-started');
    }
  } catch (error) {
    console.error('Failed to auto-start browser scheduler:', error);
  }
}

export default browserScheduler;

