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

export default handleSupabaseError;

