import { useCallback } from 'react';
import { useError } from '../context/ErrorContext';
import { parseError } from '../utils/enhancedErrorHandler';

/**
 * Enhanced error handling hook
 * Makes it super easy to handle and display errors anywhere in your app
 */
export const useEnhancedError = () => {
  const errorContext = useError();

  /**
   * Handle any error with automatic parsing and display
   * @param error - The error to handle
   * @param context - Optional context about where the error occurred
   * @param affectedFeature - Optional feature name that was affected
   * @returns The error ID
   */
  const handleError = useCallback((
    error: any,
    context?: string,
    affectedFeature?: string
  ) => {
    const parsedError = parseError(error, context);
    return errorContext.addError({
      ...parsedError,
      affectedFeature,
    });
  }, [errorContext]);

  /**
   * Handle database errors specifically
   */
  const handleDatabaseError = useCallback((
    error: any,
    operation: string,
    tableName?: string
  ) => {
    const context = tableName 
      ? `${operation} on table "${tableName}"`
      : operation;
    return handleError(error, context, 'Database');
  }, [handleError]);

  /**
   * Handle network errors specifically
   */
  const handleNetworkError = useCallback((
    error: any,
    endpoint?: string
  ) => {
    const context = endpoint 
      ? `Network request to ${endpoint}`
      : 'Network request';
    return handleError(error, context, 'Network');
  }, [handleError]);

  /**
   * Handle authentication errors specifically
   */
  const handleAuthError = useCallback((
    error: any,
    action?: string
  ) => {
    const context = action || 'Authentication';
    return handleError(error, context, 'Authentication');
  }, [handleError]);

  /**
   * Handle validation errors specifically
   */
  const handleValidationError = useCallback((
    message: string,
    field?: string
  ) => {
    const context = field ? `Field: ${field}` : undefined;
    return errorContext.addError({
      title: 'Validation Error',
      message,
      type: 'validation',
      severity: 'medium',
      context,
      affectedFeature: 'Form Validation'
    });
  }, [errorContext]);

  /**
   * Wrap an async function with error handling
   * Automatically catches and displays errors
   */
  const withErrorHandling = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): T => {
    return (async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        throw error; // Re-throw so caller can handle if needed
      }
    }) as T;
  }, [handleError]);

  /**
   * Wrap an async function with error handling that doesn't re-throw
   * Returns null on error instead
   */
  const withSafeErrorHandling = useCallback(<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string,
    defaultValue: any = null
  ) => {
    return async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, context);
        return defaultValue;
      }
    };
  }, [handleError]);

  /**
   * Create a custom error with fix suggestions
   */
  const createCustomError = useCallback((config: {
    title: string;
    message: string;
    type?: 'database' | 'network' | 'validation' | 'auth' | 'api' | 'unknown';
    severity?: 'low' | 'medium' | 'high' | 'critical';
    context?: string;
    fixSuggestions?: Array<{
      title: string;
      description: string;
      steps: string[];
      sqlFix?: string;
      autoFixAvailable?: boolean;
      onAutoFix?: () => Promise<void>;
    }>;
  }) => {
    return errorContext.addError({
      type: 'unknown',
      severity: 'medium',
      ...config,
    });
  }, [errorContext]);

  return {
    // Error handling methods
    handleError,
    handleDatabaseError,
    handleNetworkError,
    handleAuthError,
    handleValidationError,
    
    // Advanced methods
    withErrorHandling,
    withSafeErrorHandling,
    createCustomError,
    
    // Error context methods
    ...errorContext,
  };
};

export default useEnhancedError;

