/**
 * Database Test Page
 * Page for testing local database functionality
 */

import React from 'react';
import DatabaseTestPanel from '../components/DatabaseTestPanel';
import DatabaseStatusIndicator from '../components/DatabaseStatusIndicator';

const DatabaseTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Test Page</h1>
          <p className="text-gray-600">
            Test and validate the local SQLite database functionality.
            This page is only available in development mode.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <DatabaseTestPanel />
          </div>
          <div>
            <DatabaseStatusIndicator showDetails={true} />
          </div>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How to Use Offline Mode</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Enable Offline Mode</h3>
              <p>Click the floating database button (🔌/🌐) in the bottom-right corner and toggle to offline mode, or set the environment variable <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">VITE_OFFLINE_MODE=true</code>.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Database Initialization</h3>
              <p>The app will automatically initialize a local SQLite database in your browser's localStorage. Sample data will be loaded for testing.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Data Persistence</h3>
              <p>All data is stored locally in your browser. The database is automatically saved periodically and restored when you reload the page.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">4. Synchronization</h3>
              <p>When you come back online, the app will offer to synchronize your local changes with the remote database.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">5. Switching Back</h3>
              <p>You can switch back to online mode at any time using the floating toggle. Your local data will remain available for future use.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTestPage;
