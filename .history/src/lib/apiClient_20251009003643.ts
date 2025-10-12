// API Client for Backend Communication
// This replaces direct Neon database calls from the browser

const API_URL = 'http://localhost:3001/api';

interface QueryResult {
  data: any[] | null;
  error: { message: string; code?: string } | null;
}

export async function executeQuery(query: string, params: any[] = []): Promise<QueryResult> {
  try {
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, params }),
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    return {
      data: null,
      error: {
        message: error.message || 'Failed to connect to backend API',
      },
    };
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health`);
    const result = await response.json();
    return result.status === 'ok';
  } catch {
    return false;
  }
}

