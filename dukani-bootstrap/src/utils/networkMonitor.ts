/**
 * Network Status Monitor
 * Provides utilities for monitoring network connectivity and handling network errors
 */

export interface NetworkStatus {
  online: boolean;
  type?: string; // 'wifi', '4g', 'ethernet', etc.
  effectiveType?: string; // '4g', '3g', '2g', 'slow-2g'
  downlink?: number; // Mbps
  rtt?: number; // Round trip time in ms
  saveData?: boolean; // Data saver mode
}

export type NetworkStatusCallback = (status: NetworkStatus) => void;

class NetworkMonitor {
  private listeners: Set<NetworkStatusCallback> = new Set();
  private currentStatus: NetworkStatus = { online: navigator.onLine };
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Check Network Information API if available
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange.bind(this));
        this.updateConnectionInfo(connection);
      }
    }

    // Initial status check
    this.updateStatus();
  }

  private updateConnectionInfo(connection: any) {
    this.currentStatus = {
      ...this.currentStatus,
      type: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData,
    };
  }

  private handleOnline() {
    console.log('🌐 Network connection restored');
    this.reconnectAttempts = 0; // Reset reconnect attempts
    this.updateStatus({ online: true });
    this.notifyListeners();
  }

  private handleOffline() {
    console.warn('🔴 Network connection lost');
    this.updateStatus({ online: false });
    this.notifyListeners();
    this.attemptReconnect();
  }

  private handleConnectionChange() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.updateConnectionInfo(connection);
      this.notifyListeners();
    }
  }

  private updateStatus(partial?: Partial<NetworkStatus>) {
    this.currentStatus = {
      ...this.currentStatus,
      online: navigator.onLine,
      ...partial,
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentStatus);
      } catch (error) {
        console.error('Error in network status listener:', error);
      }
    });
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnect attempts reached. Please check your connection manually.');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    // Check if we're back online
    if (navigator.onLine) {
      this.handleOnline();
    } else {
      this.attemptReconnect();
    }
  }

  /**
   * Subscribe to network status changes
   * @param callback Function to call when network status changes
   * @returns Unsubscribe function
   */
  public subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.add(callback);
    // Immediately call with current status
    callback(this.currentStatus);
    
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get current network status
   */
  public getStatus(): NetworkStatus {
    return { ...this.currentStatus };
  }

  /**
   * Check if currently online
   */
  public isOnline(): boolean {
    return this.currentStatus.online;
  }

  /**
   * Perform a network connectivity test
   * @returns Promise that resolves to true if connection is working
   */
  public async testConnectivity(): Promise<boolean> {
    if (!navigator.onLine) {
      return false;
    }

    try {
      // Try to fetch a small resource from Neon
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://neon.tech/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.warn('Connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Wait for network to become available
   * @param timeout Maximum time to wait in milliseconds
   * @returns Promise that resolves when online or rejects on timeout
   */
  public async waitForConnection(timeout: number = 30000): Promise<void> {
    if (this.isOnline()) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        reject(new Error('Network connection timeout'));
      }, timeout);

      const unsubscribe = this.subscribe((status) => {
        if (status.online) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve();
        }
      });
    });
  }

  /**
   * Get a user-friendly description of current connection quality
   */
  public getConnectionQuality(): string {
    if (!this.currentStatus.online) {
      return 'Offline';
    }

    const effectiveType = this.currentStatus.effectiveType;
    if (!effectiveType) {
      return 'Online';
    }

    switch (effectiveType) {
      case '4g':
        return 'Excellent';
      case '3g':
        return 'Good';
      case '2g':
        return 'Poor';
      case 'slow-2g':
        return 'Very Poor';
      default:
        return 'Online';
    }
  }
}

// Singleton instance
const networkMonitor = new NetworkMonitor();

// Export singleton and class
export { networkMonitor, NetworkMonitor };

/**
 * React hook for using network monitor
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = React.useState<NetworkStatus>(networkMonitor.getStatus());

  React.useEffect(() => {
    const unsubscribe = networkMonitor.subscribe(setStatus);
    return unsubscribe;
  }, []);

  return status;
}

// Add React import for the hook
import React from 'react';

