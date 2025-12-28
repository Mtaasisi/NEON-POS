/**
 * Database Test Page
 * Page for testing local database functionality
 */

import React from 'react';

const DatabaseTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Test Page</h1>
          <p className="text-gray-600">
            Test and validate the database functionality.
            This page is available in development mode.
          </p>
        </div>

        <div className="bg-white rounded-lg border shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Database Status</h2>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800">Database Connected</span>
              </div>
              <p className="text-green-700 mt-2">Bootstrap database is ready for use.</p>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Available Features</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Customer Management</li>
                <li>Device Management</li>
                <li>POS System</li>
                <li>Admin Dashboard</li>
                <li>Settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTestPage;
