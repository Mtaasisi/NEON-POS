import React, { useEffect, useState } from 'react';
import { testDatabaseConnection } from '../../../../utils/databaseTest';

const DatabaseConnectionTest: React.FC = () => {
  const [status, setStatus] = useState<{ connected: boolean; message?: string } | null>(null);

  useEffect(() => {
    testDatabaseConnection().then(setStatus);
  }, []);

  if (!status) return (
    <div className="p-4 border rounded-lg bg-white">Testing database connection...</div>
  );

  return (
    <div className={`p-4 border rounded-lg ${status.connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="font-medium">Database Connection</div>
      <div className="text-sm mt-1">{status.connected ? 'Connected' : 'Not Connected'}</div>
      {status.message && <div className="text-xs text-gray-600 mt-1">{status.message}</div>}
    </div>
  );
};

export default DatabaseConnectionTest;


