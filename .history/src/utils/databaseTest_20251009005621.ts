// Minimal stub for testing database connectivity in UI components
export interface DatabaseTestResult {
  connected: boolean;
  message?: string;
}

export async function testDatabaseConnection(): Promise<DatabaseTestResult> {
  try {
    // Basic probe: check if environment has a database URL configured
    const hasDbUrl = !!import.meta.env.VITE_DATABASE_URL;
    return {
      connected: hasDbUrl,
      message: hasDbUrl ? 'Database URL present' : 'VITE_DATABASE_URL missing'
    };
  } catch (e: any) {
    return { connected: false, message: e?.message || 'Unknown error' };
  }
}


