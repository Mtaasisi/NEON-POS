/**
 * Sentry Integration for Error Tracking and Performance Monitoring
 * 
 * Provides comprehensive application monitoring, error tracking,
 * and performance profiling.
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_APP_ENV || 'development';
const RELEASE = import.meta.env.VITE_APP_VERSION || '1.0.0';

export const initializeSentry = () => {
  // Only initialize in production or if explicitly enabled
  if (!SENTRY_DSN) {
    console.log('ℹ️ Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: `neon-pos@${RELEASE}`,
    
    // Performance Monitoring
    integrations: [
      new BrowserTracing({
        // Track navigation and routing
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          window.React.useEffect,
          window.React.useLocation,
          window.React.useNavigationType,
          window.React.createRoutesFromChildren,
          window.React.matchRoutes
        ),
      }),
    ],
    
    // Performance monitoring sample rate (0.0 to 1.0)
    // 1.0 = 100% of transactions are sent
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.2 : 1.0,
    
    // Session Replay sample rate
    replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0, // Always capture replays on errors
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension',
      'moz-extension',
      // Network errors (handled separately)
      'NetworkError',
      'Failed to fetch',
      'Load failed',
      // Random plugins/extensions
      '__show__',
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'atomicFindClose',
      // Facebook errors
      'fb_xd_fragment',
      // Chrome errors
      'SecurityError: Blocked a frame with origin',
      // Offline errors (we handle these separately)
      'The operation is insecure'
    ],
    
    // Sanitize data before sending
    beforeSend(event, hint) {
      // Remove sensitive data
      if (event.request) {
        // Remove authorization headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['authorization'];
          delete event.request.headers['Cookie'];
          delete event.request.headers['cookie'];
        }
        
        // Remove sensitive query parameters
        if (event.request.query_string) {
          const sensitiveParams = ['password', 'token', 'api_key', 'secret'];
          sensitiveParams.forEach(param => {
            if (event.request?.query_string) {
              event.request.query_string = event.request.query_string
                .replace(new RegExp(`${param}=[^&]*`, 'gi'), `${param}=REDACTED`);
            }
          });
        }
      }
      
      // Remove sensitive user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      // Add custom context
      if (event.contexts) {
        event.contexts.app = {
          name: 'NEON POS',
          version: RELEASE,
          environment: ENVIRONMENT
        };
      }
      
      return event;
    },
    
    // Configure breadcrumbs
    beforeBreadcrumb(breadcrumb, hint) {
      // Don't log console breadcrumbs in production
      if (breadcrumb.category === 'console' && ENVIRONMENT === 'production') {
        return null;
      }
      
      // Sanitize XHR/fetch breadcrumbs
      if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
        if (breadcrumb.data?.url) {
          // Remove sensitive query parameters from URLs
          const url = new URL(breadcrumb.data.url, window.location.origin);
          const sensitiveParams = ['password', 'token', 'api_key'];
          sensitiveParams.forEach(param => {
            if (url.searchParams.has(param)) {
              url.searchParams.set(param, 'REDACTED');
            }
          });
          breadcrumb.data.url = url.toString();
        }
      }
      
      return breadcrumb;
    }
  });

  console.log('✅ Sentry initialized for error tracking and performance monitoring');
};

/**
 * Set user context for error tracking
 */
export const setSentryUser = (user: {
  id: string;
  username?: string;
  role?: string;
  branch?: string;
}) => {
  Sentry.setUser({
    id: user.id,
    username: user.username,
    role: user.role,
    branch: user.branch
  });
};

/**
 * Clear user context (on logout)
 */
export const clearSentryUser = () => {
  Sentry.setUser(null);
};

/**
 * Add custom context/tags
 */
export const setSentryContext = (context: {
  branch?: string;
  module?: string;
  feature?: string;
  [key: string]: any;
}) => {
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      Sentry.setTag(key, value);
    }
  });
};

/**
 * Manually capture an exception
 */
export const captureException = (
  error: Error,
  context?: {
    level?: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug';
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
) => {
  Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra
  });
};

/**
 * Manually capture a message
 */
export const captureMessage = (
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info'
) => {
  Sentry.captureMessage(message, level);
};

/**
 * Start a new transaction for performance monitoring
 */
export const startTransaction = (name: string, op: string) => {
  return Sentry.startTransaction({
    name,
    op,
    trimEnd: true
  });
};

/**
 * Track page performance
 */
export const trackPageLoad = (pageName: string) => {
  const transaction = startTransaction(`Page Load: ${pageName}`, 'pageload');
  
  // Measure various metrics
  if (performance && performance.getEntriesByType) {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationTiming) {
      transaction.setMeasurement('domContentLoaded', navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart, 'millisecond');
      transaction.setMeasurement('loadComplete', navigationTiming.loadEventEnd - navigationTiming.fetchStart, 'millisecond');
      transaction.setMeasurement('dns', navigationTiming.domainLookupEnd - navigationTiming.domainLookupStart, 'millisecond');
      transaction.setMeasurement('tcp', navigationTiming.connectEnd - navigationTiming.connectStart, 'millisecond');
      transaction.setMeasurement('ttfb', navigationTiming.responseStart - navigationTiming.requestStart, 'millisecond');
    }
  }
  
  transaction.finish();
};

/**
 * Track custom performance metric
 */
export const trackPerformance = async <T>(
  operationName: string,
  fn: () => Promise<T>
): Promise<T> => {
  const transaction = startTransaction(operationName, 'custom');
  
  try {
    const result = await fn();
    transaction.setStatus('ok');
    return result;
  } catch (error) {
    transaction.setStatus('internal_error');
    captureException(error as Error, {
      tags: { operation: operationName }
    });
    throw error;
  } finally {
    transaction.finish();
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
  message: string,
  category: string,
  level: 'fatal' | 'error' | 'warning' | 'log' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000
  });
};

/**
 * Create Error Boundary component
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary;

/**
 * Profiler for React components
 */
export const SentryProfiler = Sentry.Profiler;

/**
 * Check if Sentry is enabled
 */
export const isSentryEnabled = (): boolean => {
  return !!SENTRY_DSN;
};

/**
 * Get current Sentry client
 */
export const getSentryClient = () => {
  return Sentry.getCurrentHub().getClient();
};

/**
 * Flush pending events (useful before app closes)
 */
export const flushSentry = async (timeout: number = 2000): Promise<boolean> => {
  return Sentry.flush(timeout);
};

// Export Sentry for direct access if needed
export { Sentry };

export default {
  initializeSentry,
  setSentryUser,
  clearSentryUser,
  setSentryContext,
  captureException,
  captureMessage,
  startTransaction,
  trackPageLoad,
  trackPerformance,
  addBreadcrumb,
  SentryErrorBoundary,
  SentryProfiler,
  isSentryEnabled,
  getSentryClient,
  flushSentry
};

