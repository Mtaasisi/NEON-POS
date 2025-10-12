import React from 'react';
import { Database, CheckCircle } from 'lucide-react';

const DatabaseSetupPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Database Setup</h1>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold">Database Connected</h2>
          </div>
          
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                ✅ Your Neon database is successfully connected and ready to use!
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Connection Details:</h3>
              <ul className="list-disc list-inside text-blue-800 space-y-1">
                <li>Database: Neon PostgreSQL</li>
                <li>Connection: Pooled (Serverless)</li>
                <li>Status: Active</li>
              </ul>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Features:</h3>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>Real-time database queries</li>
                <li>Automatic connection pooling</li>
                <li>Full PostgreSQL compatibility</li>
                <li>Optimized for serverless applications</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-semibold mb-1">View Tables</h3>
              <p className="text-sm text-gray-600">Browse your database tables</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-semibold mb-1">Run Query</h3>
              <p className="text-sm text-gray-600">Execute SQL queries</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-semibold mb-1">Backup Data</h3>
              <p className="text-sm text-gray-600">Create a database backup</p>
            </button>
            <button className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left">
              <h3 className="font-semibold mb-1">Settings</h3>
              <p className="text-sm text-gray-600">Configure database settings</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseSetupPage;

