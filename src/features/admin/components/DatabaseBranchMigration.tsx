import React, { useState, useEffect } from 'react';
import { GitBranch, Database, ArrowRight, RefreshCw, Download, Upload, Check, X, AlertTriangle, Info, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';

// Backend API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const NEON_API_BASE_URL = import.meta.env.VITE_NEON_API_URL || 'http://localhost:8000';

interface Branch {
  id: string;
  name: string;
  database_name: string;
  host: string;
  created_at: string;
  updated_at: string;
  current_state: string;
  connection_string?: string;
}

interface TableInfo {
  table_name: string;
  row_count: number;
  size: string;
  selected: boolean;
}

interface SchemaDiff {
  tables_only_in_source: string[];
  tables_only_in_target: string[];
  tables_in_both: string[];
  columns_diff: {
    [table: string]: {
      only_in_source: string[];
      only_in_target: string[];
      type_changes: Array<{
        column: string;
        source_type: string;
        target_type: string;
      }>;
    };
  };
}

const DatabaseBranchMigration: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [schemaDiff, setSchemaDiff] = useState<SchemaDiff | null>(null);
  const [migrationType, setMigrationType] = useState<'schema' | 'data' | 'both' | 'selective-data' | 'schema-selective' | 'schema-missing'>('both');
  const [migrationProgress, setMigrationProgress] = useState<string>('');
  
  // Neon API Configuration
  const [neonApiKey, setNeonApiKey] = useState<string>('');
  const [neonProjectId, setNeonProjectId] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  
  // Direct Connection Strings Mode
  const [useDirectConnection, setUseDirectConnection] = useState(true);
  const [sourceConnectionString, setSourceConnectionString] = useState<string>('');
  const [targetConnectionString, setTargetConnectionString] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('Development');
  const [targetName, setTargetName] = useState<string>('Production');

  useEffect(() => {
    // Load saved Neon credentials
    const savedApiKey = localStorage.getItem('neon_api_key');
    const savedProjectId = localStorage.getItem('neon_project_id');
    const savedSourceConn = localStorage.getItem('source_connection_string');
    const savedTargetConn = localStorage.getItem('target_connection_string');
    const savedSourceName = localStorage.getItem('source_branch_name');
    const savedTargetName = localStorage.getItem('target_branch_name');
    const savedUseDirectConnection = localStorage.getItem('use_direct_connection');
    
    if (savedApiKey) setNeonApiKey(savedApiKey);
    if (savedProjectId) setNeonProjectId(savedProjectId);
    if (savedSourceConn) setSourceConnectionString(savedSourceConn);
    if (savedTargetConn) setTargetConnectionString(savedTargetConn);
    if (savedSourceName) setSourceName(savedSourceName);
    if (savedTargetName) setTargetName(savedTargetName);
    if (savedUseDirectConnection !== null) {
      setUseDirectConnection(savedUseDirectConnection === 'true');
    }
  }, []);

  const saveNeonConfig = () => {
    if (useDirectConnection) {
      localStorage.setItem('source_connection_string', sourceConnectionString);
      localStorage.setItem('target_connection_string', targetConnectionString);
      localStorage.setItem('source_branch_name', sourceName);
      localStorage.setItem('target_branch_name', targetName);
      localStorage.setItem('use_direct_connection', 'true');
      toast.success('Connection strings saved successfully');
      setShowConfig(false);
    } else {
      localStorage.setItem('neon_api_key', neonApiKey);
      localStorage.setItem('neon_project_id', neonProjectId);
      localStorage.setItem('use_direct_connection', 'false');
      toast.success('Neon API configuration saved');
      setShowConfig(false);
      loadBranches();
    }
  };

  const loadBranches = async () => {
    if (!neonApiKey || !neonProjectId) {
      toast.error('Please configure Neon API credentials first');
      setShowConfig(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${NEON_API_BASE_URL}/api/neon/branches?projectId=${neonProjectId}`, {
        headers: {
          'Authorization': `Bearer ${neonApiKey}`
        }
      });

      if (!response.ok) throw new Error('Failed to load branches');

      const data = await response.json();
      setBranches(data.branches || []);
      toast.success(`Loaded ${data.branches?.length || 0} branches`);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast.error('Failed to load branches. Check your API credentials.');
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = async (branchId: string, branchName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the branch "${branchName}"?\n\n⚠️ This action cannot be undone and will permanently delete all data in this branch.`
    );

    if (!confirmed) return;

    setLoading(true);
    try {
      const response = await fetch(`${NEON_API_BASE_URL}/api/neon/branches/${branchId}?projectId=${neonProjectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${neonApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete branch');
      }

      const data = await response.json();
      toast.success(data.message);

      // Refresh branches list
      await loadBranches();
    } catch (error: any) {
      console.error('Error deleting branch:', error);
      toast.error(error.message || 'Failed to delete branch');
    } finally {
      setLoading(false);
    }
  };

  // Check if server is running
  const checkServerStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${NEON_API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      return response.ok;
    } catch (error) {
      console.log('Server health check failed:', error);
      return false;
    }
  };

  // Attempt to start server automatically using server starter service
  const attemptStartServer = async (): Promise<boolean> => {
    try {
      toast.loading('Starting backend server automatically...', { id: 'server-start' });

      // First, check if server starter service is running
      try {
        const starterHealth = await fetch('http://localhost:3002/health', {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });

        if (!starterHealth.ok) {
          throw new Error('Server starter service not available');
        }
      } catch (error) {
        toast.error('Server starter service not running. Please run: npm run server-starter', {
          id: 'server-start',
          duration: 8000
        });
        return false;
      }

      // Server starter is running, request server start
      const response = await fetch('http://localhost:3002/start-server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (result.success) {
        toast.loading('Server starting... please wait', { id: 'server-start' });

        // Wait for server to fully start (up to 15 seconds)
        let attempts = 0;
        const maxAttempts = 15;

        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const isRunning = await checkServerStatus();

          if (isRunning) {
            toast.success('✅ Server started successfully!', { id: 'server-start' });
            return true;
          }

          attempts++;
          if (attempts % 3 === 0) {
            toast.loading(`Still starting server... (${attempts}s)`, { id: 'server-start' });
          }
        }

        toast.error('Server process started but not responding. Please check manually.', { id: 'server-start' });
        return false;

      } else {
        toast.error(`Failed to start server: ${result.message}`, { id: 'server-start' });
        return false;
      }

    } catch (error) {
      console.error('Error starting server:', error);
      toast.error('Failed to start server automatically. Please check server starter service.', { id: 'server-start' });
      return false;
    }
  };

  const loadTables = async () => {
    if (useDirectConnection) {
      if (!sourceConnectionString) {
        toast.error('Please enter source connection string');
        return;
      }
    } else {
      if (!sourceBranch) {
        toast.error('Please select a source branch');
        return;
      }
    }

    setLoading(true);

    // Check if server is running first
    console.log('Checking server status...');
    const serverRunning = await checkServerStatus();

    if (!serverRunning) {
      console.log('Server not running, attempting to start...');
      const serverStarted = await attemptStartServer();

      if (!serverStarted) {
        // If server still not running, show helpful error and return
        toast.error(
          'Backend server is required. Please start it manually with: cd server && npm run dev',
          { duration: 8000 }
        );
        setLoading(false);
        return;
      }
    }

    try {
      const requestBody = useDirectConnection
        ? {
            connectionString: sourceConnectionString,
            useDirectConnection: true
          }
        : {
            branchId: sourceBranch,
            apiKey: neonApiKey,
            projectId: neonProjectId,
            useDirectConnection: false
          };

      const response = await fetch(`${NEON_API_BASE_URL}/api/neon/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('Failed to load tables');
      
      const data = await response.json();
      setTables(data.tables.map((t: any) => ({ ...t, selected: true })));
      toast.success(`Loaded ${data.tables.length} tables`);
    } catch (error) {
      console.error('Error loading tables:', error);
      toast.error('Failed to load tables from source branch');
    } finally {
      setLoading(false);
    }
  };

  const compareSchemas = async () => {
    if (useDirectConnection) {
      if (!sourceConnectionString || !targetConnectionString) {
        toast.error('Please enter both source and target connection strings');
        return;
      }
    } else {
      if (!sourceBranch || !targetBranch) {
        toast.error('Please select both source and target branches');
        return;
      }
    }

    setLoading(true);

    // Check if server is running first
    console.log('Checking server status for schema comparison...');
    const serverRunning = await checkServerStatus();

    if (!serverRunning) {
      console.log('Server not running, attempting to start...');
      const serverStarted = await attemptStartServer();

      if (!serverStarted) {
        toast.error(
          'Backend server is required for schema comparison. Please start it manually with: cd server && npm run dev',
          { duration: 8000 }
        );
        setLoading(false);
        return;
      }
    }

    try {
      const requestBody = useDirectConnection
        ? {
            sourceConnectionString,
            targetConnectionString,
            useDirectConnection: true
          }
        : {
            sourceBranchId: sourceBranch,
            targetBranchId: targetBranch,
            apiKey: neonApiKey,
            projectId: neonProjectId,
            useDirectConnection: false
          };

      const response = await fetch(`${NEON_API_BASE_URL}/api/neon/compare-schemas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) throw new Error('Failed to compare schemas');
      
      const data = await response.json();
      setSchemaDiff(data.diff);
      toast.success('Schema comparison complete');
    } catch (error) {
      console.error('Error comparing schemas:', error);
      toast.error('Failed to compare schemas');
    } finally {
      setLoading(false);
    }
  };

  const startMigration = async () => {
    console.log('🚀 Start Migration button clicked!');
    
    if (useDirectConnection) {
      if (!sourceConnectionString || !targetConnectionString) {
        toast.error('Please enter both source and target connection strings');
        return;
      }
    } else {
      if (!sourceBranch || !targetBranch) {
        toast.error('Please select both source and target branches');
        return;
      }
    }

    const selectedTables = tables.filter(t => t.selected).map(t => t.table_name);
    if (selectedTables.length === 0) {
      toast.error('Please select at least one table to migrate');
      return;
    }

    const sourceLabel = useDirectConnection ? sourceName : branches.find(b => b.id === sourceBranch)?.name;
    const targetLabel = useDirectConnection ? targetName : branches.find(b => b.id === targetBranch)?.name;

    const migrationDetails = [
      `Are you sure you want to migrate ${selectedTables.length} table(s) from ${sourceLabel} to ${targetLabel}?`,
      '',
      'This will:',
      migrationType === 'schema' || migrationType === 'both' || migrationType === 'schema-selective' ? '- Update schema structure' : '',
      migrationType === 'schema-missing' ? '- Add only missing schema elements (columns, tables)' : '',
      migrationType === 'data' || migrationType === 'both' ? '- Copy all data records' : '',
      migrationType === 'selective-data' || migrationType === 'schema-selective' ? '- Copy only data records that don\'t exist in target' : '',
      '',
      '⚠️ This action cannot be undone.'
    ].filter(Boolean).join('\n');

    const confirmed = window.confirm(migrationDetails);

    if (!confirmed) return;

    setMigrating(true);
    setMigrationProgress('Starting migration...');

    // Check if server is running first
    console.log('Checking server status for migration...');
    const serverRunning = await checkServerStatus();

    if (!serverRunning) {
      console.log('Server not running, attempting to start...');
      const serverStarted = await attemptStartServer();

      if (!serverStarted) {
        toast.error(
          'Backend server is required for migration. Please start it manually with: cd server && npm run dev',
          { duration: 8000 }
        );
        setMigrating(false);
        setMigrationProgress('');
        return;
      }
    }

    try {
      const requestBody = useDirectConnection
        ? {
            sourceConnectionString,
            targetConnectionString,
            tables: selectedTables,
            migrationType,
            useDirectConnection: true
          }
        : {
            sourceBranchId: sourceBranch,
            targetBranchId: targetBranch,
            tables: selectedTables,
            migrationType,
            apiKey: neonApiKey,
            projectId: neonProjectId,
            useDirectConnection: false
          };

      const response = await fetch(`${NEON_API_BASE_URL}/api/neon/migrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Migration failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              setMigrationProgress(data.message);
              
              if (data.error) {
                toast.error(data.message);
              }
            }
          }
        }
      }

      toast.success('Migration completed successfully!');
      setMigrationProgress('Migration completed!');
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Migration failed');
      setMigrationProgress(`Error: ${error.message}`);
    } finally {
      setMigrating(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    setTables(tables.map(t => 
      t.table_name === tableName ? { ...t, selected: !t.selected } : t
    ));
  };

  const toggleAllTables = () => {
    const allSelected = tables.every(t => t.selected);
    setTables(tables.map(t => ({ ...t, selected: !allSelected })));
  };

  const selectOnlyMissing = () => {
    if (!schemaDiff) {
      toast.error('Please compare schemas first');
      return;
    }

    // Select only tables that exist in source but not in target
    const missingTableNames = schemaDiff.tables_only_in_source;
    
    setTables(tables.map(t => ({
      ...t,
      selected: missingTableNames.includes(t.table_name)
    })));

    toast.success(`Selected ${missingTableNames.length} missing table(s)`);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            Database Branch Migration
          </h3>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Database className="w-4 h-4" />
            Configure Neon API
          </button>
        </div>

        {showConfig && (
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg space-y-4">
            <h4 className="font-medium text-gray-900">Branch Configuration</h4>
            
            {/* Connection Mode Toggle */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={useDirectConnection}
                  onChange={() => setUseDirectConnection(true)}
                  className="text-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">Direct Connection Strings (Recommended)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!useDirectConnection}
                  onChange={() => setUseDirectConnection(false)}
                  className="text-indigo-600"
                />
                <span className="text-sm font-medium text-gray-700">Neon API</span>
              </label>
            </div>

            {useDirectConnection ? (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <strong>Quick Setup:</strong> Paste your PostgreSQL connection strings from Neon Console → Branches → Connection Details
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Branch Name (e.g., Development)
                  </label>
                  <input
                    type="text"
                    value={sourceName}
                    onChange={(e) => setSourceName(e.target.value)}
                    placeholder="Development"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Connection String
                  </label>
                  <textarea
                    value={sourceConnectionString}
                    onChange={(e) => setSourceConnectionString(e.target.value)}
                    placeholder="postgresql://user:password@ep-dev-branch.neon.tech/neondb?sslmode=require"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get from Neon Console → Your Project → Branches → Dev Branch → Connection String
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Branch Name (e.g., Production)
                  </label>
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="Production"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Connection String
                  </label>
                  <textarea
                    value={targetConnectionString}
                    onChange={(e) => setTargetConnectionString(e.target.value)}
                    placeholder="postgresql://user:password@ep-main-branch.neon.tech/neondb?sslmode=require"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get from Neon Console → Your Project → Branches → Main Branch → Connection String
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Neon Project ID
                  </label>
                  <input
                    type="text"
                    value={neonProjectId}
                    onChange={(e) => setNeonProjectId(e.target.value)}
                    placeholder="e.g., ep-young-firefly-123456"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your Neon console URL or project settings
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Neon API Key
                  </label>
                  <input
                    type="password"
                    value={neonApiKey}
                    onChange={(e) => setNeonApiKey(e.target.value)}
                    placeholder="Enter your Neon API key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Generate an API key in your Neon account settings
                  </p>
                </div>
              </div>
            )}
            
            <button
              onClick={saveNeonConfig}
              disabled={useDirectConnection ? (!sourceConnectionString || !targetConnectionString) : (!neonApiKey || !neonProjectId)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Configuration
            </button>
          </div>
        )}

        {/* Info Alert */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              {useDirectConnection ? (
                <>
                  <li>Configure your source and target connection strings above</li>
                  <li>Click "Load Tables" to see available tables</li>
                  <li>Choose which tables to migrate</li>
                  <li>Select migration type (schema, data, or both)</li>
                  <li>Review and execute the migration</li>
                </>
              ) : (
                <>
                  <li>Select source branch (your development branch)</li>
                  <li>Select target branch (your production/main branch)</li>
                  <li>Choose which tables to migrate</li>
                  <li>Select migration type (schema, data, or both)</li>
                  <li>Review and execute the migration</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Branch Selection or Connection Status */}
        {useDirectConnection ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source Branch
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md">
                  <Database className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">{sourceName || 'Not configured'}</span>
                  {sourceConnectionString && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
                {sourceConnectionString && (
                  <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                    {sourceConnectionString.substring(0, 50)}...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Branch
                </label>
                <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">{targetName || 'Not configured'}</span>
                  {targetConnectionString && (
                    <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
                {targetConnectionString && (
                  <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                    {targetConnectionString.substring(0, 50)}...
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Branch (From)
              </label>
              <select
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="">Select source branch...</option>
                {branches.map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.database_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Branch (To)
              </label>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                disabled={loading}
              >
                <option value="">Select target branch...</option>
                {branches.filter(b => b.id !== sourceBranch).map(branch => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.database_name})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Branch Management Section */}
        {!useDirectConnection && branches.length > 0 && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900">Branch Management</h4>
              <button
                onClick={loadBranches}
                disabled={loading}
                className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="space-y-3">
              {branches.map(branch => (
                <div key={branch.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md">
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="font-medium text-gray-900">{branch.name}</p>
                      <p className="text-sm text-gray-500">{branch.database_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      branch.current_state === 'ready'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {branch.current_state}
                    </span>
                    <button
                      onClick={() => deleteBranch(branch.id, branch.name)}
                      disabled={loading}
                      className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title={`Delete branch "${branch.name}"`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          {!useDirectConnection && branches.length === 0 && (
            <button
              onClick={loadBranches}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Load Branches'}
            </button>
          )}

          <button
            onClick={loadTables}
            disabled={loading || (useDirectConnection ? !sourceConnectionString : !sourceBranch)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Load Tables
          </button>

          <button
            onClick={compareSchemas}
            disabled={loading || (useDirectConnection ? (!sourceConnectionString || !targetConnectionString) : (!sourceBranch || !targetBranch))}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Compare Schemas
          </button>
        </div>

        {/* Migration Type Selection */}
        {tables.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Migration Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="schema"
                  checked={migrationType === 'schema'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">Schema Only</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="schema-missing"
                  checked={migrationType === 'schema-missing'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">Schema Only (Missing)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="data"
                  checked={migrationType === 'data'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">Data Only</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="selective-data"
                  checked={migrationType === 'selective-data'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">Selective Data (Only Missing)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="schema-selective"
                  checked={migrationType === 'schema-selective'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">Schema + Selective Data</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="both"
                  checked={migrationType === 'both'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600"
                />
                <span className="text-sm text-gray-700">Schema + All Data</span>
              </label>
            </div>
          </div>
        )}

        {/* Schema Diff Display */}
        {schemaDiff && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Schema Differences</h4>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">NEW = New table</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">+COLS = Has new columns</span>
              </div>
            </div>
            
            {schemaDiff.tables_only_in_source.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  New Tables in Source ({schemaDiff.tables_only_in_source.length})
                </p>
                <ul className="ml-6 mt-1 text-sm text-gray-600 list-disc">
                  {schemaDiff.tables_only_in_source.map(table => (
                    <li key={table}>{table}</li>
                  ))}
                </ul>
              </div>
            )}

            {schemaDiff.tables_only_in_target.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-orange-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Tables Only in Target ({schemaDiff.tables_only_in_target.length})
                </p>
                <ul className="ml-6 mt-1 text-sm text-gray-600 list-disc">
                  {schemaDiff.tables_only_in_target.map(table => (
                    <li key={table}>{table}</li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(schemaDiff.columns_diff).length > 0 && (
              <div>
                <p className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Column Differences
                </p>
                {Object.entries(schemaDiff.columns_diff).map(([table, diff]) => (
                  <div key={table} className="ml-6 mt-2">
                    <p className="text-sm font-medium text-gray-700">{table}</p>
                    {diff.only_in_source.length > 0 && (
                      <p className="text-xs text-green-600 ml-4">
                        New columns: {diff.only_in_source.join(', ')}
                      </p>
                    )}
                    {diff.type_changes.length > 0 && (
                      <p className="text-xs text-orange-600 ml-4">
                        Type changes: {diff.type_changes.map(c => `${c.column} (${c.source_type} → ${c.target_type})`).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tables List */}
        {tables.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">
                Select Tables to Migrate ({tables.filter(t => t.selected).length}/{tables.length})
              </h4>
              <div className="flex gap-2">
                {schemaDiff && schemaDiff.tables_only_in_source.length > 0 && (
                  <button
                    onClick={selectOnlyMissing}
                    className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium"
                    title="Select only tables that don't exist in target"
                  >
                    Select Missing Only ({schemaDiff.tables_only_in_source.length})
                  </button>
                )}
                <button
                  onClick={toggleAllTables}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {tables.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={tables.every(t => t.selected)}
                        onChange={toggleAllTables}
                        className="rounded text-indigo-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Table Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rows
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Size
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tables.map(table => {
                    const isNewTable = schemaDiff?.tables_only_in_source.includes(table.table_name);
                    const hasColumnDiff = schemaDiff?.columns_diff[table.table_name];
                    const existsInBoth = schemaDiff?.tables_in_both.includes(table.table_name);
                    
                    return (
                      <tr
                        key={table.table_name}
                        className={`hover:bg-gray-50 ${table.selected ? 'bg-indigo-50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={table.selected}
                            onChange={() => toggleTableSelection(table.table_name)}
                            className="rounded text-indigo-600"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {table.table_name}
                            {isNewTable && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full" title="New table - doesn't exist in target">
                                NEW
                              </span>
                            )}
                            {hasColumnDiff && existsInBoth && (
                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full" title="Has column differences">
                                +COLS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {table.row_count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {table.size}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Migration Progress */}
        {migrating && (
          <div className="mb-6 p-4 bg-indigo-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <h4 className="font-medium text-gray-900">Migration in Progress</h4>
            </div>
            <p className="text-sm text-gray-700 ml-8">{migrationProgress}</p>
          </div>
        )}

        {/* Start Migration Button */}
        {tables.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {tables.filter(t => t.selected).length} table(s) selected for migration
            </div>
            <button
              onClick={startMigration}
              disabled={migrating || tables.filter(t => t.selected).length === 0 || (useDirectConnection ? !targetConnectionString : !targetBranch)}
              className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              <Upload className="w-5 h-5" />
              Start Migration
            </button>
          </div>
        )}
      </GlassCard>

      {/* Documentation */}
      <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-600" />
          Important Notes & Best Practices
        </h4>
        
        {/* Recommended Workflow */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
          <h5 className="font-medium text-gray-900 mb-2 text-sm">🎯 Recommended Workflow for Safe Migration:</h5>
          <ol className="space-y-1 text-sm text-gray-700 list-decimal list-inside">
            <li>Click <strong>"Load Branches"</strong> to see all available branches</li>
            <li>Use the <strong>Branch Management</strong> section to delete unwanted branches</li>
            <li>Click <strong>"Compare Schemas"</strong> to see differences between branches</li>
            <li>Click <strong>"Select Missing Only"</strong> to select only new tables</li>
            <li>Choose <strong>"Schema + Data"</strong> migration type</li>
            <li>Review the selected tables (marked with "NEW" badge)</li>
            <li>Click <strong>"Start Migration"</strong> to migrate safely</li>
          </ol>
        </div>

        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-red-600">🗑️</span>
            <span><strong>Delete Branch</strong> - Permanently removes a branch and all its data (cannot be undone)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-green-600">✓</span>
            <span><strong>Select Missing Only</strong> - Safest option, only migrates tables that don't exist in target</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600">•</span>
            <span><strong>NEW badge</strong> = Table doesn't exist in target (safe to migrate)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600">•</span>
            <span><strong>+COLS badge</strong> = Table exists but has new columns (will add columns only)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-orange-600">⚠</span>
            <span>Always test migrations on a copy of your data first</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600">•</span>
            <span>Large tables may take several minutes to migrate</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600">•</span>
            <span>Schema migration will create tables and columns if they don't exist</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-600">•</span>
            <span>Data migration will INSERT new records (won't update existing ones)</span>
          </li>
        </ul>
      </GlassCard>
    </div>
  );
};

export default DatabaseBranchMigration;

