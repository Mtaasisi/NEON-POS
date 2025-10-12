// Supabase error handler utility

export interface DatabaseError {
  message: string;
  code?: string;
  details?: any;
}

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

export const isAuthError = (error: any): boolean => {
  return error?.code === 'PGRST301' || error?.message?.includes('JWT');
};

export const isConnectionError = (error: any): boolean => {
  return error?.message?.includes('connection') || error?.message?.includes('network');
};

// Type alias for error handler
export type SupabaseErrorHandler = typeof handleSupabaseError;

// Safe query wrapper that handles errors
export const safeQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: DatabaseError | null }> => {
  try {
    const { data, error } = await queryFn();
    if (error) {
      return { data: null, error: handleSupabaseError(error) };
    }
    return { data, error: null };
  } catch (err) {
    return { data: null, error: handleSupabaseError(err) };
  }
};

export default handleSupabaseError;

