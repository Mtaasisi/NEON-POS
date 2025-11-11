// Comprehensive error handling utility

import config from '../config/appConfig';

export interface ErrorInfo {
  message: string;
  code?: string;
  timestamp: Date;
  context?: string;
  stack?: string;
  userAgent?: string;
  url?: string;
}

/**
 * Safely extracts error message from any error type
 * Handles cases where error.message is undefined or error is not an Error instance
 */
export function safeGetErrorMessage(error: any): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error && error.message) return error.message;
  if (error?.message) return String(error.message);
  return String(error);
}

/**
 * Safely checks if an error message includes a substring
 * Prevents TypeError when error.message is undefined
 */
export function safeErrorIncludes(error: any, searchString: string): boolean {
  const message = safeGetErrorMessage(error);
  return message.toLowerCase().includes(searchString.toLowerCase());
}

/**
 * Checks if an error is a network error
 */
export function isNetworkError(error: any): boolean {
  return (
    safeErrorIncludes(error, 'network') ||
    safeErrorIncludes(error, 'fetch') ||
    safeErrorIncludes(error, 'timeout') ||
    safeErrorIncludes(error, 'connection') ||
    safeErrorIncludes(error, 'websocket')
  );
}

/**
 * Checks if an error is a permission/authorization error
 */
export function isPermissionError(error: any): boolean {
  return (
    safeErrorIncludes(error, 'permission') ||
    safeErrorIncludes(error, 'unauthorized') ||
    safeErrorIncludes(error, '401') ||
    safeErrorIncludes(error, '403')
  );
}

/**
 * Checks if an error is a not found error
 */
export function isNotFoundError(error: any): boolean {
  return (
    safeErrorIncludes(error, 'not found') ||
    safeErrorIncludes(error, '404') ||
    safeErrorIncludes(error, 'does not exist')
  );
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: ErrorInfo[] = [];
  private maxLogSize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: Error | string | any, context?: string): void {
    const errorInfo: ErrorInfo = {
      message: safeGetErrorMessage(error),
      code: this.extractErrorCode(error),
      timestamp: new Date(),
      context,
      stack: error instanceof Error ? error.stack : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
    };

    this.logError(errorInfo);
    this.notifyUser(errorInfo);
  }

  private extractErrorCode(error: any): string | undefined {
    // Try to get code from error object first
    if (error?.code) {
      return String(error.code);
    }
    
    // Extract error codes from common error patterns in message
    const message = safeGetErrorMessage(error);
    const patterns = [
      /HTTP (\d+)/,
      /status (\d+)/,
      /code (\d+)/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return undefined;
  }

  private logError(errorInfo: ErrorInfo): void {
    this.errorLog.push(errorInfo);

    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Console logging based on config
    if (config.errors.logToConsole) {
      const logLevel = config.development.logLevel;
      
      switch (logLevel) {
        case 'debug':
          console.debug('🐛 Error:', errorInfo);
          break;
        case 'info':
          console.info('ℹ️ Error:', errorInfo.message, errorInfo.context);
          break;
        case 'warn':
          console.warn('⚠️ Error:', errorInfo.message, errorInfo.context);
          break;
        case 'error':
          console.error('❌ Error:', errorInfo.message, errorInfo.context);
          break;
        default:
          console.error('❌ Error:', errorInfo);
      }
    }

    // In production, you might want to send errors to a logging service
    if (config.development.debugMode === false) {
      this.sendToLoggingService(errorInfo);
    }
  }

  private notifyUser(errorInfo: ErrorInfo): void {
    if (!config.errors.showNotifications) return;

    // Handle specific error types
    switch (errorInfo.code) {
      case '431':
        this.showNotification(
          'Image too large',
          'Please compress your image before uploading. Maximum size is 5MB.',
          'warning'
        );
        break;
      
      case '404':
        this.showNotification(
          'Resource not found',
          'The requested resource could not be found.',
          'error'
        );
        break;
      
      case '500':
        this.showNotification(
          'Server error',
          'An internal server error occurred. Please try again later.',
          'error'
        );
        break;
      
      default:
        const msgLower = errorInfo.message.toLowerCase();
        if (msgLower.includes('websocket')) {
          this.showNotification(
            'Connection issue',
            'Real-time updates are temporarily unavailable. Trying to reconnect...',
            'warning'
          );
        } else if (msgLower.includes('network') || msgLower.includes('connection')) {
          this.showNotification(
            'Network error',
            'Please check your internet connection and try again.',
            'error'
          );
        } else {
          this.showNotification(
            'Error occurred',
            errorInfo.message,
            'error'
          );
        }
    }
  }

  private showNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    // You can integrate with your preferred notification library here
    // For now, we'll use a simple browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
      });
    }

    // Also log to console for development
    if (config.development.debugMode) {
      console.log(`📢 ${type.toUpperCase()}: ${title} - ${message}`);
    }
  }

  private sendToLoggingService(errorInfo: ErrorInfo): void {
    // Implement sending to external logging service (e.g., Sentry, LogRocket)
    // This is a placeholder for production error reporting
    try {
      // Example: Send to your backend logging endpoint
      fetch('/api/logs/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorInfo),
      }).catch(() => {
        // Silently fail if logging service is unavailable
      });
    } catch (error) {
      // Silently fail if logging fails
    }
  }

  getErrorLog(): ErrorInfo[] {
    return [...this.errorLog];
  }

  clearErrorLog(): void {
    this.errorLog = [];
  }

  // Specific error handlers
  handleNetworkError(error: Error): void {
    this.handleError(error, 'Network');
  }

  handleWebSocketError(error: Error): void {
    this.handleError(error, 'WebSocket');
  }

  handleImageError(error: Error): void {
    this.handleError(error, 'Image');
  }

  handleApiError(error: Error, endpoint?: string): void {
    this.handleError(error, `API: ${endpoint || 'Unknown'}`);
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance();

// Global error event listeners
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handleError(event.error || new Error(event.message), 'Global');
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handleError(
      new Error(event.reason?.message || 'Unhandled Promise Rejection'),
      'Promise'
    );
  });
}

export default errorHandler;
