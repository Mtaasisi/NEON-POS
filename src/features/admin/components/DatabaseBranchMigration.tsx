import React, { useState, useEffect, useMemo } from 'react';
import { GitBranch, Database, ArrowRight, RefreshCw, Download, Upload, Check, X, AlertTriangle, Info, CheckCircle, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, Activity, Save, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import { useAuth } from '../../../context/AuthContext';
import {
  getMigrationConfigs,
  getDefaultMigrationConfig,
  saveMigrationConfig,
  updateMigrationConfig,
  deleteMigrationConfig,
  setDefaultMigrationConfig,
  type MigrationConfig
} from '../../../lib/migrationConfigApi';

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
  
  // Table filtering and sorting
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const [tableSortColumn, setTableSortColumn] = useState<'table_name' | 'row_count' | 'size' | null>(null);
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tableFilter, setTableFilter] = useState<'all' | 'selected' | 'new' | 'modified'>('all');
  
  // Migration progress details
  const [migrationDetails, setMigrationDetails] = useState<{
    currentTable: string;
    totalTables: number;
    completedTables: number;
    currentTableProgress: string;
  } | null>(null);
  
  // Activity log for migration progress
  const [activityLog, setActivityLog] = useState<string[]>([]);
  
  // Migration results summary
  const [migrationResults, setMigrationResults] = useState<{
    tablesMigrated: Array<{
      tableName: string;
      rowsMigrated: number;
      rowsSkipped: number;
      errors: number;
      status: 'success' | 'error' | 'partial';
      verified?: {
        exists: boolean;
        rowCount?: number;
        verifiedAt?: Date;
      };
    }>;
    totalRowsMigrated: number;
    totalRowsSkipped: number;
    totalErrors: number;
    schemaChanges: Array<{
      tableName: string;
      changes: string[];
    }>;
    completedAt: Date | null;
    debugInfo?: {
      sourceTables: string[];
      targetTablesBefore: string[];
      targetTablesAfter: string[];
      migrationType: string;
    };
  } | null>(null);
  
  // Debug mode toggle
  const [showDebug, setShowDebug] = useState(false);
  
  // Auth context
  const { currentUser } = useAuth();
  
  // Saved configurations
  const [savedConfigs, setSavedConfigs] = useState<MigrationConfig[]>([]);
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [configName, setConfigName] = useState<string>('Default Configuration');
  
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

  // Load saved configurations from database
  useEffect(() => {
    if (!currentUser?.id) return;

    const loadConfigs = async () => {
      try {
        const configs = await getMigrationConfigs(currentUser.id);
        setSavedConfigs(configs);
        
        // Load default config or first config
        const defaultConfig = configs.find(c => c.is_default) || configs[0];
        if (defaultConfig) {
          loadConfigIntoState(defaultConfig);
          setCurrentConfigId(defaultConfig.id);
          setConfigName(defaultConfig.config_name);
        } else if (configs.length === 0) {
          // No saved configs, use defaults
          setCurrentConfigId(null);
          setConfigName('Default Configuration');
        }
      } catch (error: any) {
        console.error('Error loading migration configs:', error);
        // Check if table doesn't exist
        if (error.message?.includes('relation "migration_configurations" does not exist')) {
          toast.error('Migration configurations table not found. Please run: node run-migration-config-table.mjs', { duration: 8000 });
        }
        // Fallback to localStorage for backward compatibility
        loadFromLocalStorage();
      }
    };

    loadConfigs();
  }, [currentUser?.id]);

  // Helper to load config into state
  const loadConfigIntoState = (config: MigrationConfig) => {
    setUseDirectConnection(config.use_direct_connection);
    setSourceConnectionString(config.source_connection_string || '');
    setTargetConnectionString(config.target_connection_string || '');
    setSourceName(config.source_branch_name || 'Development');
    setTargetName(config.target_branch_name || 'Production');
    setNeonApiKey(config.neon_api_key || '');
    setNeonProjectId(config.neon_project_id || '');
  };

  // Fallback to localStorage for backward compatibility
  const loadFromLocalStorage = () => {
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
  };

  // Auto-filter tables based on migration type
  useEffect(() => {
    if (!schemaDiff || tables.length === 0) return;

    // Auto-filter based on migration type
    switch (migrationType) {
      case 'schema-missing':
        // FAST MODE: Show only new tables (tables that don't exist in target)
        // Auto-select only missing tables to make migration faster
        if (schemaDiff.tables_only_in_source.length > 0) {
          setTableFilter('new');
          // Auto-select only missing tables for faster migration
          const missingTableNames = schemaDiff.tables_only_in_source;
          setTables(prevTables => prevTables.map(t => ({
            ...t,
            selected: missingTableNames.includes(t.table_name)
          })));
          toast.success(`⚡ Fast mode: Auto-selected ${missingTableNames.length} missing table(s)`, { duration: 3000 });
        } else {
          // No missing tables - deselect all
          setTables(prevTables => prevTables.map(t => ({ ...t, selected: false })));
          toast.info('No missing tables found. All tables already exist in target.', { duration: 3000 });
        }
        break;
      
      case 'selective-data':
      case 'schema-selective':
        // For selective data, show all tables (user can select which ones)
        // But switch from restrictive filters to 'all' if needed
        if (tableFilter === 'new' || tableFilter === 'modified') {
          setTableFilter('all');
        }
        break;
      
      case 'schema':
        // Show tables with schema differences (new columns or new tables)
        if (Object.keys(schemaDiff.columns_diff).length > 0) {
          setTableFilter('modified');
          toast.success(`Filtered to show ${Object.keys(schemaDiff.columns_diff).length} modified table(s) with schema differences`, { duration: 3000 });
        } else if (schemaDiff.tables_only_in_source.length > 0) {
          setTableFilter('new');
          toast.success(`Filtered to show ${schemaDiff.tables_only_in_source.length} new table(s)`, { duration: 3000 });
        }
        break;
      
      case 'data':
      case 'both':
        // Show all tables for full data migration
        // Only change if currently showing a restrictive filter
        if (tableFilter === 'new' || tableFilter === 'modified') {
          setTableFilter('all');
        }
        break;
      
      default:
        // Keep current filter
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [migrationType]);

  const saveNeonConfig = async () => {
    if (!currentUser?.id) {
      toast.error('Please log in to save configurations');
      return;
    }

    try {
      const configData = {
        config_name: configName,
        use_direct_connection: useDirectConnection,
        source_connection_string: useDirectConnection ? sourceConnectionString : undefined,
        target_connection_string: useDirectConnection ? targetConnectionString : undefined,
        source_branch_name: useDirectConnection ? sourceName : undefined,
        target_branch_name: useDirectConnection ? targetName : undefined,
        neon_api_key: !useDirectConnection ? neonApiKey : undefined,
        neon_project_id: !useDirectConnection ? neonProjectId : undefined,
        is_default: true // Set as default when saving
      };

      if (currentConfigId) {
        // Update existing config
        const updatedConfig = await updateMigrationConfig(currentConfigId, currentUser.id, configData);
        setSavedConfigs(prev => prev.map(c => c.id === currentConfigId ? updatedConfig : c));
        toast.success('Configuration updated successfully');
    } else {
        // Create new config
        const newConfig = await saveMigrationConfig(currentUser.id, configData);
        setCurrentConfigId(newConfig.id);
        setSavedConfigs(prev => {
          // Mark all others as not default
          const updated = prev.map(c => ({ ...c, is_default: false }));
          return [...updated, newConfig];
        });
        toast.success('Configuration saved successfully');
      }

      setShowConfig(false);
      
      if (!useDirectConnection) {
      loadBranches();
      }
    } catch (error: any) {
      console.error('Error saving config:', error);
      if (error.message?.includes('relation "migration_configurations" does not exist')) {
        toast.error('Database table not found. Please run: node run-migration-config-table.mjs', { duration: 10000 });
      } else {
        toast.error(error.message || 'Failed to save configuration');
      }
    }
  };

  const loadSavedConfig = async (configId: string) => {
    if (!currentUser?.id) return;

    try {
      const config = savedConfigs.find(c => c.id === configId);
      if (config) {
        loadConfigIntoState(config);
        setCurrentConfigId(configId);
        setConfigName(config.config_name);
        toast.success(`Loaded configuration: ${config.config_name}`);
      }
    } catch (error: any) {
      console.error('Error loading config:', error);
      toast.error('Failed to load configuration');
    }
  };

  const deleteSavedConfig = async (configId: string) => {
    if (!currentUser?.id) return;
    if (!window.confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await deleteMigrationConfig(configId, currentUser.id);
      setSavedConfigs(prev => prev.filter(c => c.id !== configId));
      if (currentConfigId === configId) {
        // Load default or first config
        const remaining = savedConfigs.filter(c => c.id !== configId);
        const defaultConfig = remaining.find(c => c.is_default) || remaining[0];
        if (defaultConfig) {
          loadConfigIntoState(defaultConfig);
          setCurrentConfigId(defaultConfig.id);
          setConfigName(defaultConfig.config_name);
        } else {
          setCurrentConfigId(null);
          // Reset to defaults
          setUseDirectConnection(true);
          setSourceConnectionString('');
          setTargetConnectionString('');
          setSourceName('Development');
          setTargetName('Production');
          setNeonApiKey('');
          setNeonProjectId('');
        }
      }
      toast.success('Configuration deleted');
    } catch (error: any) {
      console.error('Error deleting config:', error);
      toast.error('Failed to delete configuration');
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
      const loadedTables = data.tables.map((t: any) => ({ ...t, selected: true }));
      setTables(loadedTables);
      
      // If schemaDiff exists, automatically filter to show only differences
      if (schemaDiff) {
        const tablesWithDifferences = [
          ...schemaDiff.tables_only_in_source,
          ...Object.keys(schemaDiff.columns_diff)
        ];
        
        if (tablesWithDifferences.length > 0) {
          // Auto-select and filter to show only differences
          setTables(loadedTables.map(t => ({
            ...t,
            selected: tablesWithDifferences.includes(t.table_name)
          })));
          
          if (schemaDiff.tables_only_in_source.length > 0 && Object.keys(schemaDiff.columns_diff).length > 0) {
            setTableFilter('all'); // Will show only differences via filteredAndSortedTables
          } else if (schemaDiff.tables_only_in_source.length > 0) {
            setTableFilter('new');
          } else {
            setTableFilter('modified');
          }
          
          toast.success(`Loaded ${data.tables.length} tables - Showing ${tablesWithDifferences.length} with differences`, { duration: 4000 });
        } else {
          toast.success(`Loaded ${data.tables.length} tables`);
        }
      } else {
        toast.success(`Loaded ${data.tables.length} tables`);
      }
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
      
      // Automatically filter to show only differences (new and modified tables)
      const diff = data.diff;
      const tablesWithDifferences = [
        ...diff.tables_only_in_source, // New tables
        ...Object.keys(diff.columns_diff) // Modified tables (with column differences)
      ];
      
      if (tablesWithDifferences.length > 0) {
        // Filter to show only differences
        if (diff.tables_only_in_source.length > 0 && Object.keys(diff.columns_diff).length > 0) {
          // Both new and modified tables exist - show all differences
          setTableFilter('all'); // We'll filter manually to show both new and modified
          // Select tables with differences
          setTables(prevTables => prevTables.map(t => ({
            ...t,
            selected: tablesWithDifferences.includes(t.table_name)
          })));
        } else if (diff.tables_only_in_source.length > 0) {
          // Only new tables
          setTableFilter('new');
          setTables(prevTables => prevTables.map(t => ({
            ...t,
            selected: diff.tables_only_in_source.includes(t.table_name)
          })));
        } else if (Object.keys(diff.columns_diff).length > 0) {
          // Only modified tables
          setTableFilter('modified');
          setTables(prevTables => prevTables.map(t => ({
            ...t,
            selected: Object.keys(diff.columns_diff).includes(t.table_name)
          })));
        }
        
        toast.success(`Schema comparison complete - Showing ${tablesWithDifferences.length} table(s) with differences`, { duration: 4000 });
      } else {
        toast.success('Schema comparison complete - No differences found', { duration: 3000 });
      }
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
    
    // Get target tables before migration for verification
    let targetTablesBefore: string[] = [];
    try {
      const verifyResponse = await fetch(`${NEON_API_BASE_URL}/api/neon/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(useDirectConnection ? {
          connectionString: targetConnectionString,
          useDirectConnection: true
        } : {
          branchId: targetBranch,
          apiKey: neonApiKey,
          projectId: neonProjectId,
          useDirectConnection: false
        })
      });
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        targetTablesBefore = verifyData.tables?.map((t: any) => t.table_name) || [];
      }
    } catch (err) {
      console.warn('Could not get target tables before migration:', err);
    }

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
    setMigrationResults(null); // Reset previous results
    setActivityLog(['Starting migration...']); // Initialize activity log

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
        let currentTableIndex = 0;
        const totalTables = selectedTables.length;
        const results: typeof migrationResults = {
          tablesMigrated: [],
          totalRowsMigrated: 0,
          totalRowsSkipped: 0,
          totalErrors: 0,
          schemaChanges: [],
          completedAt: null
        };
        let currentTableName = '';
        const sourceTablesList = selectedTables;
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6));
              const message = data.message;
              setMigrationProgress(message);
              
              // Add to activity log (keep last 20 messages)
              setActivityLog(prev => {
                const newLog = [...prev, message];
                return newLog.slice(-20); // Keep last 20 messages
              });
              
              // Parse progress details
              if (data.message.includes('Processing table:')) {
                currentTableName = data.message.split('Processing table:')[1]?.trim() || '';
                if (currentTableName) {
                  setMigrationDetails({
                    currentTable: currentTableName,
                    totalTables,
                    completedTables: currentTableIndex,
                    currentTableProgress: ''
                  });
                  // Initialize table result
                  results.tablesMigrated.push({
                    tableName: currentTableName,
                    rowsMigrated: 0,
                    rowsSkipped: 0,
                    errors: 0,
                    status: 'success'
                  });
                }
              } else if (data.message.includes('Completed migration for')) {
                const tableName = data.message.split('Completed migration for')[1]?.trim() || currentTableName;
                currentTableIndex++;
                setMigrationDetails(prev => prev ? {
                  ...prev,
                  completedTables: currentTableIndex,
                  currentTable: ''
                } : null);
              } else if (data.message.includes('Migrated') && data.message.includes('/')) {
                // Extract progress like "Migrated 50/100 rows"
                setMigrationDetails(prev => prev ? {
                  ...prev,
                  currentTableProgress: data.message
                } : null);
              } else if (data.message.includes('migration complete for')) {
                // Parse completion message: "✓ data migration complete for table_name (X rows migrated, Y skipped, Z errors)"
                const match = data.message.match(/for\s+(\w+)\s+\((\d+)\s+rows\s+migrated(?:,\s*(\d+)\s+skipped)?(?:,\s*(\d+)\s+errors)?\)/);
                if (match) {
                  const tableName = match[1];
                  const rowsMigrated = parseInt(match[2]) || 0;
                  const rowsSkipped = parseInt(match[3]) || 0;
                  const errors = parseInt(match[4]) || 0;
                  
                  const tableResult = results.tablesMigrated.find(t => t.tableName === tableName);
                  if (tableResult) {
                    tableResult.rowsMigrated += rowsMigrated;
                    tableResult.rowsSkipped += rowsSkipped;
                    tableResult.errors += errors;
                    tableResult.status = errors > 0 ? 'partial' : rowsMigrated > 0 ? 'success' : 'success';
                  }
                  
                  results.totalRowsMigrated += rowsMigrated;
                  results.totalRowsSkipped += rowsSkipped;
                  results.totalErrors += errors;
                }
              } else if (data.message.includes('Table') && data.message.includes('created')) {
                // Schema change: "✓ Table table_name created"
                const tableName = data.message.match(/Table\s+(\w+)\s+created/)?.[1];
                if (tableName) {
                  const existing = results.schemaChanges.find(s => s.tableName === tableName);
                  if (!existing) {
                    results.schemaChanges.push({
                      tableName,
                      changes: ['Table created']
                    });
                  }
                }
              } else if (data.message.includes('Added') && data.message.includes('column')) {
                // Schema change: "✓ Added X column(s) to table_name"
                const match = data.message.match(/Added\s+(\d+)\s+column\(s\)\s+to\s+(\w+)/);
                if (match) {
                  const count = match[1];
                  const tableName = match[2];
                  const existing = results.schemaChanges.find(s => s.tableName === tableName);
                  if (existing) {
                    existing.changes.push(`${count} column(s) added`);
                  } else {
                    results.schemaChanges.push({
                      tableName,
                      changes: [`${count} column(s) added`]
                    });
                  }
                }
              } else if (data.message.includes('Error migrating')) {
                // Error: "✗ Error migrating table_name: error message"
                const match = data.message.match(/Error migrating\s+(\w+):\s*(.+)/);
                if (match) {
                  const tableName = match[1];
                  const tableResult = results.tablesMigrated.find(t => t.tableName === tableName);
                  if (tableResult) {
                    tableResult.status = 'error';
                    tableResult.errors++;
                  }
                  results.totalErrors++;
                }
              }
              
              if (data.error) {
                toast.error(data.message);
              }
            }
          }
        }
        
        results.completedAt = new Date();
        
        // Verify migrated tables in target database
        setActivityLog(prev => [...prev, '🔍 Verifying migrated tables in target database...']);
        toast.loading('Verifying migration...', { id: 'verify' });
        
        try {
          const verifyResponse = await fetch(`${NEON_API_BASE_URL}/api/neon/tables`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(useDirectConnection ? {
              connectionString: targetConnectionString,
              useDirectConnection: true
            } : {
              branchId: targetBranch,
              apiKey: neonApiKey,
              projectId: neonProjectId,
              useDirectConnection: false
            })
          });
          
          if (verifyResponse.ok) {
            const verifyData = await verifyResponse.json();
            const targetTablesAfter = verifyData.tables?.map((t: any) => t.table_name) || [];
            
            // Verify each migrated table
            for (const tableResult of results.tablesMigrated) {
              const exists = targetTablesAfter.includes(tableResult.tableName);
              if (exists) {
                // Get row count from target
                try {
                  const countResponse = await fetch(`${NEON_API_BASE_URL}/api/neon/verify-table`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      tableName: tableResult.tableName,
                      ...(useDirectConnection ? {
                        connectionString: targetConnectionString,
                        useDirectConnection: true
                      } : {
                        branchId: targetBranch,
                        apiKey: neonApiKey,
                        projectId: neonProjectId,
                        useDirectConnection: false
                      })
                    })
                  });
                  
                  if (countResponse.ok) {
                    const countData = await countResponse.json();
                    tableResult.verified = {
                      exists: true,
                      rowCount: countData.rowCount || 0,
                      verifiedAt: new Date()
                    };
                  } else {
                    tableResult.verified = {
                      exists: true,
                      verifiedAt: new Date()
                    };
                  }
                } catch (err) {
                  tableResult.verified = {
                    exists: true,
                    verifiedAt: new Date()
                  };
                }
              } else {
                tableResult.verified = {
                  exists: false,
                  verifiedAt: new Date()
                };
              }
            }
            
            // Add debug info
            results.debugInfo = {
              sourceTables: sourceTablesList,
              targetTablesBefore,
              targetTablesAfter,
              migrationType
            };
            
            setActivityLog(prev => [...prev, `✓ Verification complete: ${results.tablesMigrated.filter(t => t.verified?.exists).length}/${results.tablesMigrated.length} tables verified in target`]);
            toast.success('Migration verified successfully!', { id: 'verify' });
          } else {
            setActivityLog(prev => [...prev, '⚠️ Could not verify tables in target database']);
            toast.error('Could not verify migration', { id: 'verify' });
          }
        } catch (verifyErr) {
          console.error('Verification error:', verifyErr);
          setActivityLog(prev => [...prev, '⚠️ Verification failed: ' + (verifyErr as Error).message]);
          toast.error('Verification failed', { id: 'verify' });
        }
        
        setMigrationResults(results);
      }

      toast.success('Migration completed successfully!');
      setMigrationProgress('Migration completed!');
      setMigrationDetails(null);
      setActivityLog(prev => [...prev, '🎉 Migration completed successfully!']);
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error(error.message || 'Migration failed');
      setMigrationProgress(`Error: ${error.message}`);
      setActivityLog(prev => [...prev, `✗ Error: ${error.message}`]);
    } finally {
      setMigrating(false);
    }
  };

  const toggleTableSelection = (tableName: string) => {
    const updatedTables = tables.map(t => 
      t.table_name === tableName ? { ...t, selected: !t.selected } : t
    );
    setTables(updatedTables);
    
    // Auto-filter to "selected" if user is selecting tables manually
    const selectedCount = updatedTables.filter(t => t.selected).length;
    if (selectedCount > 0 && tableFilter === 'all') {
      // Only auto-filter if there are selected tables and currently showing all
      // Don't force it, just suggest by keeping current filter
    }
  };

  const toggleAllTables = () => {
    const allSelected = tables.every(t => t.selected);
    const updatedTables = tables.map(t => ({ ...t, selected: !allSelected }));
    setTables(updatedTables);
    
    // If selecting all, show all tables. If deselecting all, keep current filter
    if (!allSelected && tableFilter === 'selected') {
      setTableFilter('all');
    }
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

    // Automatically filter to show only new tables
    setTableFilter('new');

    toast.success(`Selected ${missingTableNames.length} missing table(s) and filtered to show only new tables`);
  };

  // Filter and sort tables
  const filteredAndSortedTables = useMemo(() => {
    let filtered = tables;

    // Apply search filter
    if (tableSearchQuery) {
      filtered = filtered.filter(t => 
        t.table_name.toLowerCase().includes(tableSearchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (tableFilter === 'selected') {
      filtered = filtered.filter(t => t.selected);
    } else if (tableFilter === 'new' && schemaDiff) {
      filtered = filtered.filter(t => schemaDiff.tables_only_in_source.includes(t.table_name));
    } else if (tableFilter === 'modified' && schemaDiff) {
      filtered = filtered.filter(t => 
        schemaDiff.columns_diff[t.table_name] && 
        schemaDiff.tables_in_both.includes(t.table_name)
      );
    } else if (tableFilter === 'all' && schemaDiff) {
      // When showing "all" but schemaDiff exists, show only tables with differences
      // This happens automatically after compareSchemas is called
      const tablesWithDifferences = [
        ...schemaDiff.tables_only_in_source,
        ...Object.keys(schemaDiff.columns_diff)
      ];
      // Only filter if there are differences (don't hide all tables if no differences)
      if (tablesWithDifferences.length > 0) {
        filtered = filtered.filter(t => tablesWithDifferences.includes(t.table_name));
      }
    }

    // Apply sorting
    if (tableSortColumn) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any, bVal: any;
        
        if (tableSortColumn === 'table_name') {
          aVal = a.table_name.toLowerCase();
          bVal = b.table_name.toLowerCase();
        } else if (tableSortColumn === 'row_count') {
          aVal = a.row_count;
          bVal = b.row_count;
        } else if (tableSortColumn === 'size') {
          // Parse size string (e.g., "24 kB" -> 24, "1.5 MB" -> 1536)
          const parseSize = (sizeStr: string): number => {
            const match = sizeStr.match(/^([\d.]+)\s*(kB|MB|GB|TB|bytes?)?/i);
            if (!match) return 0;
            const value = parseFloat(match[1]);
            const unit = (match[2] || 'bytes').toLowerCase();
            const multipliers: { [key: string]: number } = {
              'bytes': 1,
              'byte': 1,
              'kb': 1024,
              'mb': 1024 * 1024,
              'gb': 1024 * 1024 * 1024,
              'tb': 1024 * 1024 * 1024 * 1024
            };
            return value * (multipliers[unit] || 1);
          };
          aVal = parseSize(a.size);
          bVal = parseSize(b.size);
        } else {
          return 0;
        }

        if (aVal < bVal) return tableSortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return tableSortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [tables, tableSearchQuery, tableFilter, tableSortColumn, tableSortDirection, schemaDiff]);

  const handleSort = (column: 'table_name' | 'row_count' | 'size') => {
    if (tableSortColumn === column) {
      setTableSortDirection(tableSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortColumn(column);
      setTableSortDirection('asc');
    }
  };

  const getSortIcon = (column: 'table_name' | 'row_count' | 'size') => {
    if (tableSortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return tableSortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-indigo-600" />
      : <ArrowDown className="w-3 h-3 text-indigo-600" />;
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
            <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Branch Configuration</h4>
              {savedConfigs.length > 0 && (
                <div className="text-xs text-gray-600">
                  {savedConfigs.length} saved configuration{savedConfigs.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Saved Configurations */}
            {savedConfigs.length > 0 && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-indigo-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saved Configurations
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {savedConfigs.map((config) => (
                    <div
                      key={config.id}
                      className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                        currentConfigId === config.id
                          ? 'bg-indigo-100 border-indigo-400'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => loadSavedConfig(config.id)}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {config.is_default && (
                          <Bookmark className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{config.config_name}</span>
                        <span className="text-xs text-gray-500">
                          ({config.use_direct_connection ? 'Direct Connection' : 'Neon API'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {config.is_default && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">Default</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSavedConfig(config.id);
                          }}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                          title="Delete configuration"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Name
              </label>
              <input
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="e.g., Dev to Prod Migration"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
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
            
            <div className="flex gap-2">
            <button
              onClick={saveNeonConfig}
                disabled={useDirectConnection ? (!sourceConnectionString || !targetConnectionString) : (!neonApiKey || !neonProjectId) || !configName.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                <Save className="w-4 h-4" />
                {currentConfigId ? 'Update Configuration' : 'Save Configuration'}
            </button>
              {currentConfigId && (
                <button
                  onClick={async () => {
                    if (!currentUser?.id) return;
                    try {
                      await setDefaultMigrationConfig(currentConfigId, currentUser.id);
                      setSavedConfigs(prev => prev.map(c => ({
                        ...c,
                        is_default: c.id === currentConfigId
                      })));
                      toast.success('Set as default configuration');
                    } catch (error: any) {
                      toast.error('Failed to set default');
                    }
                  }}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
                >
                  <Bookmark className="w-4 h-4" />
                  Set as Default
                </button>
              )}
          </div>
        </div>
        )}


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
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Migration Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <label className="flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors" style={{ borderColor: migrationType === 'schema' ? '#6366f1' : '#e5e7eb' }}>
                <input
                  type="radio"
                  value="schema"
                  checked={migrationType === 'schema'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Schema Only</div>
                  <div className="text-xs text-gray-500 mt-1">Creates tables and columns only, no data</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors relative" style={{ borderColor: migrationType === 'schema-missing' ? '#6366f1' : '#e5e7eb' }}>
                <input
                  type="radio"
                  value="schema-missing"
                  checked={migrationType === 'schema-missing'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    Schema Only (Missing)
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      FAST
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Auto-selects only missing tables for faster migration</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors" style={{ borderColor: migrationType === 'data' ? '#6366f1' : '#e5e7eb' }}>
                <input
                  type="radio"
                  value="data"
                  checked={migrationType === 'data'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Data Only</div>
                  <div className="text-xs text-gray-500 mt-1">Copies all data records (schema must exist)</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors" style={{ borderColor: migrationType === 'selective-data' ? '#6366f1' : '#e5e7eb' }}>
                <input
                  type="radio"
                  value="selective-data"
                  checked={migrationType === 'selective-data'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Selective Data (Only Missing)</div>
                  <div className="text-xs text-gray-500 mt-1">Copies only records that don't exist in target</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors" style={{ borderColor: migrationType === 'schema-selective' ? '#6366f1' : '#e5e7eb' }}>
                <input
                  type="radio"
                  value="schema-selective"
                  checked={migrationType === 'schema-selective'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Schema + Selective Data</div>
                  <div className="text-xs text-gray-500 mt-1">Creates schema and copies only missing records</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 bg-white border-2 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors" style={{ borderColor: migrationType === 'both' ? '#6366f1' : '#e5e7eb' }}>
                <input
                  type="radio"
                  value="both"
                  checked={migrationType === 'both'}
                  onChange={(e) => setMigrationType(e.target.value as any)}
                  className="text-indigo-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">Schema + All Data</div>
                  <div className="text-xs text-gray-500 mt-1">Creates schema and copies all data records</div>
                </div>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h4 className="font-medium text-gray-900">
                Select Tables to Migrate ({tables.filter(t => t.selected).length}/{tables.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {schemaDiff && schemaDiff.tables_only_in_source.length > 0 && (
                  <button
                    onClick={selectOnlyMissing}
                    className="text-sm px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 font-medium flex items-center gap-1"
                    title="Select only tables that don't exist in target and show only selected"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Select Missing Only ({schemaDiff.tables_only_in_source.length})
                  </button>
                )}
                {tables.filter(t => t.selected).length > 0 && (
                  <button
                    onClick={() => setTableFilter('selected')}
                    className="text-sm px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 font-medium flex items-center gap-1"
                    title="Show only selected tables"
                  >
                    <Filter className="w-3 h-3" />
                    Show Only Selected ({tables.filter(t => t.selected).length})
                  </button>
                )}
                <button
                  onClick={toggleAllTables}
                  className="text-sm px-3 py-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md font-medium"
                >
                  {tables.every(t => t.selected) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>
            
            {/* Search and Filter Bar */}
            <div className="mb-3 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tables..."
                  value={tableSearchQuery}
                  onChange={(e) => setTableSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className={`w-4 h-4 ${tableFilter !== 'all' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <select
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value as any)}
                  className={`px-3 py-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    tableFilter !== 'all' ? 'border-indigo-300 bg-indigo-50' : 'border-gray-300'
                  }`}
                >
                  <option value="all">All Tables</option>
                  <option value="selected">Selected Only ({tables.filter(t => t.selected).length})</option>
                  {schemaDiff && schemaDiff.tables_only_in_source.length > 0 && (
                    <option value="new">New Tables ({schemaDiff.tables_only_in_source.length})</option>
                  )}
                  {schemaDiff && Object.keys(schemaDiff.columns_diff).length > 0 && (
                    <option value="modified">Modified Tables ({Object.keys(schemaDiff.columns_diff).length})</option>
                  )}
                </select>
                {tableFilter !== 'all' && (
                  <button
                    onClick={() => setTableFilter('all')}
                    className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 hover:bg-gray-100 rounded"
                    title="Clear filter"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <input
                        type="checkbox"
                        checked={filteredAndSortedTables.every(t => t.selected)}
                        onChange={(e) => {
                          const allSelected = filteredAndSortedTables.every(t => t.selected);
                          setTables(tables.map(t => {
                            const isInFiltered = filteredAndSortedTables.some(ft => ft.table_name === t.table_name);
                            return isInFiltered ? { ...t, selected: !allSelected } : t;
                          }));
                        }}
                        className="rounded text-indigo-600"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('table_name')}
                    >
                      <div className="flex items-center gap-1">
                      Table Name
                        {getSortIcon('table_name')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('row_count')}
                    >
                      <div className="flex items-center gap-1">
                      Rows
                        {getSortIcon('row_count')}
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center gap-1">
                      Size
                        {getSortIcon('size')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedTables.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                        No tables found matching your search criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedTables.map(table => {
                    const isNewTable = schemaDiff?.tables_only_in_source.includes(table.table_name);
                    const hasColumnDiff = schemaDiff?.columns_diff[table.table_name];
                    const existsInBoth = schemaDiff?.tables_in_both.includes(table.table_name);
                    
                    return (
                      <tr
                        key={table.table_name}
                          className={`hover:bg-gray-50 transition-colors ${table.selected ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={table.selected}
                            onChange={() => toggleTableSelection(table.table_name)}
                              className="rounded text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono">{table.table_name}</span>
                            {isNewTable && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full border border-green-200" title="New table - doesn't exist in target">
                                NEW
                              </span>
                            )}
                            {hasColumnDiff && existsInBoth && (
                                <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full border border-blue-200" title="Has column differences">
                                +COLS
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                            <span className="font-mono">{table.row_count.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                            <span className="font-mono">{table.size}</span>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {tableSearchQuery && (
              <div className="mt-2 text-xs text-gray-500">
                Showing {filteredAndSortedTables.length} of {tables.length} tables
              </div>
            )}
          </div>
        )}

        {/* Migration Progress */}
        {migrating && (
          <div className="mb-6 p-6 bg-gradient-to-r from-indigo-50 via-blue-50 to-purple-50 rounded-xl border-2 border-indigo-300 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                <div className="absolute inset-0 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>
            </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Migration in Progress</h4>
                <p className="text-xs text-gray-500">Please wait while tables are being migrated...</p>
              </div>
            </div>
            
            {migrationDetails && (
              <div className="mb-4 p-4 bg-white rounded-lg border-2 border-indigo-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Table {migrationDetails.completedTables + 1} of {migrationDetails.totalTables}
                    </span>
                    {migrationDetails.currentTable && (
                      <div className="text-xs text-gray-500 mt-1">
                        Processing: <span className="font-mono font-medium text-indigo-600">{migrationDetails.currentTable}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600">
                      {Math.round(((migrationDetails.completedTables + (migrationDetails.currentTable ? 0.5 : 1)) / migrationDetails.totalTables) * 100)}%
                    </div>
                    <div className="text-xs text-gray-500">Complete</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-blue-500 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ 
                      width: `${Math.min(((migrationDetails.completedTables + (migrationDetails.currentTable ? 0.5 : 1)) / migrationDetails.totalTables) * 100, 100)}%` 
                    }}
                  >
                    <span className="text-xs font-medium text-white">
                      {migrationDetails.completedTables + (migrationDetails.currentTable ? 1 : 0)}/{migrationDetails.totalTables}
                    </span>
                  </div>
                </div>
                {migrationDetails.currentTableProgress && (
                  <div className="mt-2 p-2 bg-indigo-50 rounded border border-indigo-100">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-gray-700 font-mono">{migrationDetails.currentTableProgress}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* Real-time Activity Log */}
            <div className="bg-white rounded-lg border border-indigo-100 shadow-sm">
              <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  Activity Log
                </h5>
                <span className="text-xs text-gray-500">{activityLog.length} entries</span>
              </div>
              <div className="p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {activityLog.length > 0 ? (
                    activityLog.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm animate-fade-in">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                          log.includes('✓') || log.includes('complete') 
                            ? 'bg-green-500' 
                            : log.includes('✗') || log.includes('Error') || log.includes('error')
                            ? 'bg-red-500'
                            : log.includes('⚠')
                            ? 'bg-yellow-500'
                            : 'bg-indigo-500 animate-pulse'
                        }`}></div>
                        <p className="text-gray-700 font-mono text-xs whitespace-pre-wrap break-words">
                          {log}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 italic">Waiting for migration to start...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Migration Results Summary */}
        {migrationResults && !migrating && (
          <div className="mb-6 p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border-2 border-green-200 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h4 className="text-lg font-semibold text-gray-900">Migration Summary</h4>
              </div>
              <button
                onClick={() => setMigrationResults(null)}
                className="text-gray-400 hover:text-gray-600"
                title="Close summary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {migrationResults.completedAt && (
              <p className="text-sm text-gray-600 mb-4">
                Completed at: {migrationResults.completedAt.toLocaleString()}
              </p>
            )}

            {/* Overall Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-2xl font-bold text-indigo-600">
                  {migrationResults.tablesMigrated.length}
                </div>
                <div className="text-sm text-gray-600">Tables Migrated</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {migrationResults.totalRowsMigrated.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Rows Migrated</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-600">
                  {migrationResults.totalRowsSkipped.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Rows Skipped</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-red-200">
                <div className="text-2xl font-bold text-red-600">
                  {migrationResults.totalErrors}
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
            </div>

            {/* Tables Details */}
            {migrationResults.tablesMigrated.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="font-semibold text-gray-900">Migrated Tables ({migrationResults.tablesMigrated.length})</h5>
                  <button
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md flex items-center gap-1"
                  >
                    <Info className="w-3 h-3" />
                    {showDebug ? 'Hide' : 'Show'} Debug Info
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Table</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rows Migrated</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Skipped</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {migrationResults.tablesMigrated.map((table, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-mono text-gray-900 font-medium">{table.tableName}</td>
                          <td className="px-4 py-2 text-sm text-gray-700">{table.rowsMigrated.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-yellow-600">{table.rowsSkipped.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-red-600">{table.errors}</td>
                          <td className="px-4 py-2">
                            {table.verified ? (
                              <div className="flex flex-col gap-1">
                                {table.verified.exists ? (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center gap-1 w-fit">
                                    <CheckCircle className="w-3 h-3" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full flex items-center gap-1 w-fit">
                                    <X className="w-3 h-3" />
                                    Not Found
                                  </span>
                                )}
                                {table.verified.rowCount !== undefined && (
                                  <span className="text-xs text-gray-500">
                                    {table.verified.rowCount.toLocaleString()} rows
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Not verified</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              table.status === 'success' 
                                ? 'bg-green-100 text-green-700' 
                                : table.status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {table.status === 'success' ? '✓ Success' : table.status === 'error' ? '✗ Error' : '⚠ Partial'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Debug Information */}
            {showDebug && migrationResults.debugInfo && (
              <div className="mb-4 p-4 bg-gray-900 rounded-lg border border-gray-700">
                <h5 className="font-semibold text-gray-100 mb-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  Debug Information
                </h5>
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-gray-400">Migration Type:</span>
                    <span className="text-green-400 ml-2">{migrationResults.debugInfo.migrationType}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Source Tables ({migrationResults.debugInfo.sourceTables.length}):</span>
                    <div className="text-gray-300 ml-4 mt-1">
                      {migrationResults.debugInfo.sourceTables.join(', ')}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Target Tables Before ({migrationResults.debugInfo.targetTablesBefore.length}):</span>
                    <div className="text-gray-300 ml-4 mt-1 max-h-20 overflow-y-auto">
                      {migrationResults.debugInfo.targetTablesBefore.length > 0 
                        ? migrationResults.debugInfo.targetTablesBefore.join(', ')
                        : 'None'
                      }
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Target Tables After ({migrationResults.debugInfo.targetTablesAfter.length}):</span>
                    <div className="text-gray-300 ml-4 mt-1 max-h-20 overflow-y-auto">
                      {migrationResults.debugInfo.targetTablesAfter.length > 0
                        ? migrationResults.debugInfo.targetTablesAfter.join(', ')
                        : 'None'
                      }
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">New Tables Created:</span>
                    <div className="text-green-400 ml-4 mt-1">
                      {migrationResults.debugInfo.targetTablesAfter.filter(t => !migrationResults.debugInfo!.targetTablesBefore.includes(t)).join(', ') || 'None'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Schema Changes */}
            {migrationResults.schemaChanges.length > 0 && (
              <div>
                <h5 className="font-semibold text-gray-900 mb-3">Schema Changes</h5>
                <div className="space-y-2">
                  {migrationResults.schemaChanges.map((change, idx) => (
                    <div key={idx} className="bg-white rounded-md p-3 border border-blue-200">
                      <div className="font-medium text-sm text-gray-900 font-mono mb-1">{change.tableName}</div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {change.changes.map((ch, chIdx) => (
                          <li key={chIdx} className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-blue-600" />
                            {ch}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
    </div>
  );
};

export default DatabaseBranchMigration;

