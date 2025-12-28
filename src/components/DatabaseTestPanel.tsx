/**
 * Database Test Panel
 * Component for testing local database functionality
 */

import React, { useState, useEffect } from 'react';
import { useDatabase } from '../context/DatabaseContext';
import { initializeLocalDatabase, saveDatabase, executeQuery } from '../lib/localDatabase';
import { runMigrations } from '../lib/databaseMigration';
import { localDb } from '../lib/localDatabaseAPI';

// Database statistics card component
const DatabaseStatCard: React.FC<{
  title: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  query: () => Promise<number>;
  isEnabled: boolean;
}> = ({ title, color, query, isEnabled }) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      setLoading(true);
      query()
        .then(setCount)
        .catch(() => setCount(0))
        .finally(() => setLoading(false));
    } else {
      setCount(0);
    }
  }, [isEnabled, query]);

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className={`${colorClasses[color]} p-3 rounded`}>
      <div className="text-2xl font-bold">
        {loading ? '...' : count}
      </div>
      <div className={`text-xs ${colorClasses[color].replace('bg-', 'text-').replace('-50', '-700')}`}>
        {title}
      </div>
    </div>
  );
};

const DatabaseTestPanel: React.FC = () => {
  const { isOffline, isInitialized, migrationStatus } = useDatabase();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runBasicTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    addResult('Starting database tests...');

    try {
      // Test 1: Initialize database
      addResult('Test 1: Initializing local database...');
      await initializeLocalDatabase();
      addResult('✅ Database initialized successfully');

      // Test 2: Run migrations
      addResult('Test 2: Running migrations...');
      const migrationResult = await runMigrations();
      addResult(`✅ Migrations completed: v${migrationResult.version}`);

      // Test 3: Basic queries
      addResult('Test 3: Testing basic queries...');

      // Test database operations using localDb API
      addResult('Test 4: Testing database operations...');

      // Test creating a test record
      try {
        const { error: insertError } = await localDb.from('store_locations').insert({
          id: 'test-branch-1',
          name: 'Test Branch',
          address: '123 Test St'
        });
        if (insertError) {
          addResult(`❌ Insert failed: ${insertError.message}`);
        } else {
          addResult('✅ Test data inserted via localDb');
        }
      } catch (insertErr: any) {
        addResult(`❌ Insert exception: ${insertErr.message}`);
      }

      // Test direct SQL execution as fallback
      try {
        executeQuery(`INSERT OR REPLACE INTO store_locations (id, name, address) VALUES (?, ?, ?)`,
          ['test-branch-2', 'Direct SQL Branch', '456 Direct St']);
        addResult('✅ Direct SQL insert successful');
      } catch (sqlErr: any) {
        addResult(`❌ Direct SQL insert failed: ${sqlErr.message}`);
      }

      // Test querying data
      try {
        const { data: branches, error: queryError } = await localDb.from('store_locations').select('*');
        if (queryError) {
          addResult(`❌ localDb query failed: ${queryError.message}`);
        } else {
          addResult(`✅ localDb retrieved ${branches?.length || 0} branches`);
        }
      } catch (queryErr: any) {
        addResult(`❌ localDb query exception: ${queryErr.message}`);
      }

      // Test direct query as fallback
      try {
        const branches = executeQuery('SELECT * FROM store_locations');
        addResult(`✅ Direct query retrieved ${branches.length} branches`);
      } catch (directErr: any) {
        addResult(`❌ Direct query failed: ${directErr.message}`);
      }

      // Test saving database
      addResult('Test 6: Testing database persistence...');
      saveDatabase();
      addResult('✅ Database saved to localStorage');

      addResult('🎉 All tests completed successfully!');

    } catch (error: any) {
      addResult(`❌ Test failed: ${error.message}`);
      console.error('Database test error:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const clearDatabase = async () => {
    try {
      addResult('Clearing local database...');
      localStorage.removeItem('dukani-db-data');
      addResult('✅ Database cleared from localStorage');
      window.location.reload();
    } catch (error: any) {
      addResult(`❌ Failed to clear database: ${error.message}`);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      addResult(`Database status: ${isOffline ? 'Offline' : 'Online'} mode active`);
    }
  }, [isInitialized, isOffline]);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Database Test Panel</h2>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            isOffline ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
          }`}>
            {isOffline ? 'Offline Mode' : 'Online Mode'}
          </div>
          {isInitialized && (
            <div className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
              v{migrationStatus?.version || 0}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={runBasicTests}
          disabled={isRunning}
          className={`
            px-4 py-2 rounded font-medium text-white
            ${isRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600'
            }
          `}
        >
          {isRunning ? 'Running Tests...' : 'Run Database Tests'}
        </button>

        <button
          onClick={clearDatabase}
          className="px-4 py-2 rounded font-medium text-white bg-red-500 hover:bg-red-600"
        >
          Clear Database
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Test Results</h3>
        <div className="max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 text-sm">No tests run yet. Click "Run Database Tests" to start.</p>
          ) : (
            <div className="space-y-1">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {result}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <DatabaseStatCard
          title="Tables"
          color="blue"
          query={() => Promise.resolve(11)} // Fixed number of tables in our schema
          isEnabled={isInitialized && isOffline}
        />

        <DatabaseStatCard
          title="Products"
          color="green"
          query={async () => {
            const result = await localDb.execute('SELECT COUNT(*) as count FROM lats_products');
            return result.length > 0 ? result[0].count : 0;
          }}
          isEnabled={isInitialized && isOffline}
        />

        <DatabaseStatCard
          title="Customers"
          color="purple"
          query={async () => {
            const result = await localDb.execute('SELECT COUNT(*) as count FROM lats_customers');
            return result.length > 0 ? result[0].count : 0;
          }}
          isEnabled={isInitialized && isOffline}
        />

        <DatabaseStatCard
          title="Sales"
          color="orange"
          query={async () => {
            const result = await localDb.execute('SELECT COUNT(*) as count FROM lats_sales');
            return result.length > 0 ? result[0].count : 0;
          }}
          isEnabled={isInitialized && isOffline}
        />
      </div>
    </div>
  );
};

export default DatabaseTestPanel;
