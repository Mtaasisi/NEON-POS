// Application configuration settings
// Import feature toggle service for dynamic feature configuration
import { featureToggleService } from '../services/featureToggleService';

export const APP_CONFIG = {
  // WebSocket Configuration
  websocket: {
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    reconnectInterval: 5000, // 5 seconds
  },

  // Image Configuration
  images: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxWidth: 800,
    maxHeight: 800,
    quality: 0.8,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    // Image loading configuration
    loading: {
      timeout: 10000, // 10 seconds
      retryAttempts: 2,
      useFallbacks: true,
      blockUnreliableUrls: true,
    },
  },

  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'development' ? 'http://localhost:5173' : window.location.origin),
    timeout: 30000, // 30 seconds
    maxRetries: 3,
  },

  // Real-time Configuration
  realtime: {
    enabled: true,
    stockUpdateInterval: 5000, // 5 seconds
    productUpdateInterval: 10000, // 10 seconds
    // Real-time connection settings
    connection: {
      maxRetries: 1, // Reduced to 1 to prevent excessive retries
      retryDelay: 5000, // Increased to 5 seconds
      maxRetryDelay: 15000, // Increased to 15 seconds
      connectionTimeout: 10000, // Increased to 10 seconds
      cooldownPeriod: 30000, // Increased to 30 seconds between connection attempts
      circuitBreakerTimeout: 120000, // 2 minutes circuit breaker timeout
    },
  },

  // Audio Configuration
  audio: {
    enabled: true,
    volume: 0.5,
    sounds: {
      notification: '/sounds/notification.mp3',
      error: '/sounds/error.mp3',
      success: '/sounds/success.mp3',
    },
  },

  // Error Handling
  errors: {
    showNotifications: true,
    logToConsole: true,
    retryOnFailure: true,
  },

  // Development Configuration
  development: {
    debugMode: import.meta.env.MODE === 'development',
    mockData: import.meta.env.VITE_USE_MOCK_DATA === 'true',
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
  },

  // Offline/Database Configuration
  offline: {
    enabled: import.meta.env.VITE_OFFLINE_MODE === 'true',
    autoSync: import.meta.env.VITE_AUTO_SYNC !== 'false',
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
  },

  // HTTP Configuration
  http: {
    maxHeaderSize: 8192, // 8KB max header size to prevent 431 errors
    requestTimeout: 30000, // 30 seconds
    retryAttempts: 3,
  },

  // AI Configuration
  ai: {
    enabled: true, // Enable AI services
    gemini: {
      enabled: true, // Enable Gemini AI
      maxRequestsPerMinute: 2,
      minRequestInterval: 30000, // 30 seconds
      errorCooldown: 120000, // 2 minutes
    },
    fallback: {
      enabled: true, // Always enable fallback responses
    }
  },

  // Feature Toggles Configuration
  features: {
    // Core Features
    loyaltyProgram: true,
    inventoryManagement: true,
    customerPortal: true,
    whatsappIntegration: true,
    paymentProcessing: true,

    // Advanced Features
    aiAssistant: false,
    advancedAnalytics: false,
    bulkOperations: false,
    multiBranch: true,
    barcodeScanning: false,

    // Experimental Features
    arTryOn: false,
    voiceCommands: false,
    predictivePricing: false,
    blockchainTracking: false,

    // Beta Features
    subscriptionBilling: false,
    marketplaceIntegration: false,
    advancedWorkflow: false,
  },
};

// Environment-specific configurations
export const getConfig = () => {
  const env = import.meta.env.MODE || 'development';

  // For now, return static config. Feature toggles will be loaded asynchronously
  const baseConfig = APP_CONFIG;

  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        development: {
          ...APP_CONFIG.development,
          debugMode: false,
          logLevel: 'warn',
        },
        realtime: {
          ...APP_CONFIG.realtime,
          connection: {
            ...APP_CONFIG.realtime.connection,
            maxRetries: 2, // Fewer retries in production
          },
        },
        offline: APP_CONFIG.offline, // Include offline config
      };
    case 'test':
      return {
        ...baseConfig,
        realtime: {
          ...APP_CONFIG.realtime,
          enabled: false, // Disable real-time in tests
        },
        audio: {
          ...APP_CONFIG.audio,
          enabled: false, // Disable audio in tests
        },
        offline: APP_CONFIG.offline, // Include offline config
      };
    default:
      return baseConfig;
  }
};

// Export the config function
export default getConfig;
