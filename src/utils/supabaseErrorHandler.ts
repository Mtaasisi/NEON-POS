// Supabase error handler utility
import { parseError } from './enhancedErrorHandler';

export interface DatabaseError {
  message: string;
  code?: string;
  details?: any;
}

/**
 * @deprecated Use useEnhancedError hook instead for better error handling with fix suggestions
 * This function is kept for backward compatibility
 */
export const handleSupabaseError = (error: any): DatabaseError => {
  if (!error) {
    return { message: 'Unknown error occurred' };
  }

  // Handle Neon/PostgreSQL errors
  if (error.message) {
    return {
      message: error.message,
      code: error.code,
      details: error.details
    };
  }

  return { message: String(error) };
};

/**
 * Enhanced Supabase error handler that provides detailed error information
 * Use this in combination with useEnhancedError hook for best results
 */
export const handleSupabaseErrorEnhanced = (error: any, context?: string) => {
  return parseError(error, context);
};

export const isAuthError = (error: any): boolean => {
  return error?.code === 'PGRST301' || error?.message?.includes('JWT');
};

export const isConnectionError = (error: any): boolean => {
  return error?.message?.includes('connection') || error?.message?.includes('network');
};

// Safe query wrapper that handles errors
export const safeQuery = async function<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallbackFn?: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: DatabaseError | null }> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      // If there's an error and a fallback function is provided, try the fallback
      if (fallbackFn) {
        try {
          const fallbackResult = await fallbackFn();
          if (fallbackResult.error) {
            return { data: null, error: handleSupabaseError(fallbackResult.error) };
          }
          return { data: fallbackResult.data, error: null };
        } catch (fallbackErr) {
          return { data: null, error: handleSupabaseError(fallbackErr) };
        }
      }
      return { data: null, error: handleSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleSupabaseError(err) };
  }
};

// SupabaseErrorHandler utility object with helper methods
export const SupabaseErrorHandler = {
  // Create a fallback query for lats_sales table
  createLatsSalesListFallbackQuery: (supabase: any, limit: number = 100) => {
    return supabase
      .from('lats_sales')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
  },
  
  // Handle errors
  handleError: handleSupabaseError,
  
  // Check if error is auth related
  isAuthError,
  
  // Check if error is connection related
  isConnectionError
};

export default handleSupabaseError;

