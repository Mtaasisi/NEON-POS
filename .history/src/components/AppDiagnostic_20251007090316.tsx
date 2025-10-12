import React, { useEffect, useState } from 'react';

export const AppDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<any>({
    mounted: true,
    timestamp: new Date().toISOString(),
    env: {},
    localStorage: {},
    errors: []
  });

  useEffect(() => {
    const checkDiagnostics = () => {
      const diag: any = {
        mounted: true,
        timestamp: new Date().toISOString(),
        env: {
          NODE_ENV: import.meta.env.MODE,
          DATABASE_URL: import.meta.env.VITE_DATABASE_URL ? 'Set' : 'Missing',
          DEV: import.meta.env.DEV,
        },
        localStorage: {},
        errors: []
      };

      // Check localStorage
      try {
        const session = localStorage.getItem('supabase.auth.session');
        diag.localStorage.hasSession = !!session;
        if (session) {
          try {
            const parsed = JSON.parse(session);
            diag.localStorage.sessionValid = parsed.expires_at > Date.now();
            diag.localStorage.user = parsed.user?.email || 'No email';
          } catch (e) {
            diag.localStorage.sessionParseError = true;
          }
        }
      } catch (e: any) {
        diag.errors.push(`localStorage error: ${e.message}`);
      }

      setDiagnostics(diag);
    };

    checkDiagnostics();

    // Check for errors
    const errorHandler = (event: ErrorEvent) => {
      setDiagnostics((prev: any) => ({
        ...prev,
        errors: [...prev.errors, event.message]
      }));
    };

    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#1a1a2e',
      color: '#eee',
      padding: '20px',
      fontFamily: 'monospace',
      fontSize: '14px',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <h1 style={{ color: '#4ade80' }}>🔍 App Diagnostic</h1>
      <div style={{ marginTop: '20px' }}>
        <h2 style={{ color: '#60a5fa' }}>Status: {diagnostics.mounted ? '✅ Mounted' : '❌ Not Mounted'}</h2>
        <p>Time: {diagnostics.timestamp}</p>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3 style={{ color: '#fbbf24' }}>Environment:</h3>
        <pre style={{ background: '#0f172a', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(diagnostics.env, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3 style={{ color: '#fbbf24' }}>LocalStorage:</h3>
        <pre style={{ background: '#0f172a', padding: '10px', borderRadius: '4px' }}>
          {JSON.stringify(diagnostics.localStorage, null, 2)}
        </pre>
      </div>

      {diagnostics.errors.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#ef4444' }}>Errors:</h3>
          <pre style={{ background: '#7f1d1d', padding: '10px', borderRadius: '4px', color: '#fca5a5' }}>
            {JSON.stringify(diagnostics.errors, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '10px 20px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Go to Login
        </button>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>

      <div style={{ marginTop: '20px', padding: '10px', background: '#0f172a', borderRadius: '4px' }}>
        <p><strong>Next Steps:</strong></p>
        <ol style={{ marginLeft: '20px' }}>
          <li>Check if DATABASE_URL is set in environment</li>
          <li>Try navigating to /login</li>
          <li>Check browser console for errors (F12)</li>
          <li>Verify Neon database is accessible</li>
        </ol>
      </div>
    </div>
  );
};

export default AppDiagnostic;

