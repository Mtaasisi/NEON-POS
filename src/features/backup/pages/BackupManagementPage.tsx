import React, { useState, useEffect } from 'react';
import { 
  Database, Download, Upload, Settings, CheckCircle, AlertCircle, 
  Clock, FileText, HardDrive, Cloud, RefreshCw, Play, Square,
  Calendar, Bell, Shield, Trash2, Plus, Eye, Download as DownloadIcon
} from 'lucide-react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { 
  getBackupStatus, 
  getBackupFiles, 
  runManualBackup, 
  downloadBackup,
  restoreFromBackup,
  previewBackupFile,
  getRestoreFormats,
  getAutomaticBackupConfig,
  saveAutomaticBackupConfig,
  toggleAutomaticBackup,
  cleanOldBackups,
  getBackupLogs,
  runSqlBackup,
  getSqlBackupStatus,
  downloadSqlBackup,
  testSqlBackupConnection,
  BackupStatus,
  BackupFile,
  BackupResult,
  AutomaticBackupConfig,
  SqlBackupResult
} from '../../../lib/backupApi';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

interface BackupManagementPageProps {}

export const BackupManagementPage: React.FC<BackupManagementPageProps> = () => {
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [autoConfig, setAutoConfig] = useState<AutomaticBackupConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningBackup, setIsRunningBackup] = useState(false);
  const [isRunningSqlBackup, setIsRunningSqlBackup] = useState(false);
  const [backupType, setBackupType] = useState<'local' | 'dropbox' | 'complete'>('complete');
  const [sqlBackupType, setSqlBackupType] = useState<'full' | 'schema' | 'data'>('full');
  const [sqlBackupFormat, setSqlBackupFormat] = useState<'sql' | 'custom'>('sql');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [backupLogs, setBackupLogs] = useState<string[]>([]);
  const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFormats, setRestoreFormats] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);

  useEffect(() => {
    loadBackupData();
    loadRestoreFormats();
  }, []);

  const loadRestoreFormats = async () => {
    try {
      // getRestoreFormats handles connection errors gracefully and returns fallback data
      const formats = await getRestoreFormats();
      setRestoreFormats(formats);
    } catch (error) {
      // This should rarely happen since getRestoreFormats has fallback logic
      // Only log unexpected errors
      if (error instanceof Error && !error.message.includes('fetch')) {
        console.error('Error loading restore formats:', error);
      }
      // Set default formats as last resort
      setRestoreFormats({
        formats: [
          {
            format: 'SQL',
            extension: '.sql',
            description: 'PostgreSQL SQL dump format (RECOMMENDED)',
            advantages: [
              'Standard PostgreSQL format',
              'Easiest to restore',
              'Can be executed directly with psql',
              'Contains both schema and data',
            ]
          },
          {
            format: 'JSON',
            extension: '.json',
            description: 'JSON backup format',
            advantages: [
              'Human-readable',
              'Easy to parse programmatically',
            ]
          }
        ],
        recommended: 'SQL'
      });
    }
  };

  const loadBackupData = async () => {
    try {
      setIsLoading(true);
      const [status, files, config, logs] = await Promise.all([
        getBackupStatus(),
        getBackupFiles(),
        getAutomaticBackupConfig(),
        getBackupLogs()
      ]);
      
      setBackupStatus(status);
      setBackupFiles(files);
      setAutoConfig(config);
      setBackupLogs(logs);
    } catch (error) {
      console.error('Error loading backup data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBackup = async () => {
    try {
      setIsRunningBackup(true);
      const result = await runManualBackup(backupType);
      
      if (result.success) {
        alert(`✅ ${result.message}`);
        loadBackupData(); // Refresh data
      } else {
        alert(`❌ Backup failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Backup failed: ${error}`);
    } finally {
      setIsRunningBackup(false);
    }
  };

  const handleRunSqlBackup = async () => {
    try {
      setIsRunningSqlBackup(true);
      const result = await runSqlBackup({
        type: sqlBackupType,
        format: sqlBackupFormat,
        outputDir: '~/Desktop/SQL'
      });
      
      if (result.success) {
        alert(`✅ SQL backup completed successfully!\n\nFile: ${result.filePath}\nSize: ${result.fileSize}\nTables: ${result.tablesCount}\nRecords: ${result.recordsCount}`);
        loadBackupData();
      } else {
        // Don't show alert for expected conditions (like local server not available)
        if (!result.isExpected) {
          alert(`❌ SQL backup failed: ${result.error}`);
        } else {
          console.log('SQL backup not available:', result.message);
        }
      }
    } catch (error) {
      alert(`❌ SQL backup failed: ${error}`);
    } finally {
      setIsRunningSqlBackup(false);
    }
  };

  const handleDownloadBackup = async (file: BackupFile) => {
    try {
      const result = await downloadBackup(file.name);
      if (result.success) {
        alert('✅ Backup downloaded successfully!');
      } else {
        alert(`❌ Download failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Download failed: ${error}`);
    }
  };

  const handleRestoreBackup = async (file: BackupFile) => {
    if (!confirm(`Are you sure you want to restore from backup "${file.name}"? This will overwrite current data.`)) {
      return;
    }

    // For existing backup files, we'd need to download first then restore
    // For now, show message to use file upload instead
    alert('⚠️ Please use the "Restore from File" section below to upload and restore a backup file.\n\nSupported formats: .sql (recommended) or .json');
  };

  const handleRestoreFromFile = async () => {
    if (!restoreFile) {
      alert('❌ Please select a backup file to restore');
      return;
    }

    // Check if tables are selected
    if (selectedTables.length === 0) {
      alert('❌ Please select at least one table to restore');
      return;
    }

    const tablesToRestore = selectedTables.length === previewData?.tables.length 
      ? 'all tables' 
      : `${selectedTables.length} selected table(s)`;

    if (!confirm(`⚠️ WARNING: Restoring ${tablesToRestore} from "${restoreFile.name}" will overwrite current database data.\n\nAre you sure you want to continue?`)) {
      return;
    }

    try {
      setIsRestoring(true);
      const result = await restoreFromBackup(restoreFile, selectedTables);
      
      if (result.success) {
        const data = result.data;
        const message = `✅ Restore completed successfully!\n\n` +
          `Tables restored: ${data?.tablesRestored || 'N/A'}\n` +
          `Records restored: ${data?.recordsRestored || 'N/A'}\n` +
          `Format: ${data?.format || 'N/A'}\n` +
          `Selected: ${data?.selectedTables || 'all'}`;
        
        if (data?.warnings && data.warnings.length > 0) {
          alert(message + `\n\n⚠️ Warnings:\n${data.warnings.join('\n')}`);
        } else {
          alert(message);
        }
        
        // Reset everything
        setRestoreFile(null);
        setPreviewData(null);
        setSelectedTables([]);
        setShowTableSelection(false);
        // Refresh backup data
        loadBackupData();
      } else {
        // Show user-friendly error message
        const errorMsg = result.error || result.message || 'Unknown error';
        alert(`❌ Restore failed\n\n${errorMsg}\n\nPlease check:\n- The backup file is valid\n- The server is running\n- Check server logs for details`);
      }
    } catch (error) {
      // Extract user-friendly error message
      let errorMsg = 'Unknown error';
      if (error instanceof Error) {
        errorMsg = error.message;
        // If there's full error details, log them but don't show to user
        if ((error as any).fullDetails) {
          console.error('Full restore error:', (error as any).fullDetails);
        }
      }
      alert(`❌ Restore failed\n\n${errorMsg}\n\nPlease check:\n- The backup file is valid\n- The server is running\n- Check server logs for details`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type - support .sql, .json, and .gz (compressed)
      const isSql = file.name.endsWith('.sql');
      const isJson = file.name.endsWith('.json');
      const isGz = file.name.endsWith('.gz') || file.name.endsWith('.sql.gz');
      
      if (!isSql && !isJson && !isGz) {
        alert('❌ Invalid file type. Please select a .sql, .json, or .sql.gz backup file.');
        event.target.value = ''; // Clear input
        return;
      }
      
      // Handle compressed .gz files
      if (isGz) {
        try {
          // Decompress using browser's CompressionStream API (if available) or show instructions
          if (typeof DecompressionStream !== 'undefined') {
            const stream = file.stream();
            const decompressionStream = new DecompressionStream('gzip');
            const decompressedStream = stream.pipeThrough(decompressionStream);
            const decompressedBlob = await new Response(decompressedStream).blob();
            
            // Create a new File object with .sql extension
            const decompressedFile = new File(
              [decompressedBlob],
              file.name.replace(/\.gz$/, ''),
              { type: 'application/sql' }
            );
            
            setRestoreFile(decompressedFile);
            setPreviewData(null);
            setSelectedTables([]);
            setShowTableSelection(false);
            await handlePreviewFile(decompressedFile);
            return;
          } else {
            // Fallback: show instructions to extract manually
            alert('⚠️ Compressed file detected.\n\nPlease extract the .gz file first:\n1. Download the backup ZIP from GitHub Actions\n2. Extract the ZIP\n3. Extract the .gz file (gunzip or 7-Zip)\n4. Upload the .sql file here');
            event.target.value = '';
            return;
          }
        } catch (error) {
          alert('❌ Failed to decompress file. Please extract the .gz file manually first.');
          event.target.value = '';
          return;
        }
      }
      
      // Validate file size (1GB limit)
      if (file.size > 1024 * 1024 * 1024) {
        alert('❌ File too large. Maximum file size is 1GB (1024MB).');
        event.target.value = '';
        return;
      }
      
      setRestoreFile(file);
      setPreviewData(null);
      setSelectedTables([]);
      setShowTableSelection(false);
      
      // Automatically preview the file
      await handlePreviewFile(file);
    }
  };

  const handlePreviewFile = async (file: File) => {
    try {
      setIsPreviewing(true);
      const result = await previewBackupFile(file);
      
      if (result.success && result.data) {
        setPreviewData(result.data);
        // Select all tables by default
        setSelectedTables(result.data.tables.map((t: any) => t.name));
        setShowTableSelection(true);
      } else {
        alert(`❌ Failed to preview backup file: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error previewing backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleToggleTable = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName)
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const handleSelectAllTables = () => {
    if (previewData?.tables) {
      setSelectedTables(previewData.tables.map((t: any) => t.name));
    }
  };

  const handleDeselectAllTables = () => {
    setSelectedTables([]);
  };

  const handleToggleAutoBackup = async () => {
    if (!autoConfig) return;
    
    try {
      const result = await toggleAutomaticBackup(!autoConfig.enabled);
      if (result.success) {
        setAutoConfig(prev => prev ? { ...prev, enabled: !prev.enabled } : null);
        alert(`✅ Automatic backup ${!autoConfig.enabled ? 'enabled' : 'disabled'}`);
      } else {
        alert(`❌ Failed to toggle automatic backup: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to toggle automatic backup: ${error}`);
    }
  };

  const handleCleanOldBackups = async () => {
    if (!confirm('Are you sure you want to clean old backups? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await cleanOldBackups();
      if (result.success) {
        alert('✅ Old backups cleaned successfully!');
        loadBackupData();
      } else {
        alert(`❌ Failed to clean old backups: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to clean old backups: ${error}`);
    }
  };

  const handleTestSqlConnection = async () => {
    try {
      const result = await testSqlBackupConnection();
      if (result.success) {
        alert('✅ SQL backup connection test successful!');
      } else {
        alert(`❌ Connection test failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Connection test failed: ${error}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading backup system...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Backup Management</h1>
            <p className="text-gray-600 mt-2">Manage data backups and restore points</p>
          </div>
          <GlassButton
            onClick={loadBackupData}
            icon={<RefreshCw size={20} />}
            variant="secondary"
          >
            Refresh
          </GlassButton>
        </div>

        {/* Backup Status Overview */}
        {backupStatus && (
          <GlassCard className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Last Backup</h3>
                <p className="text-sm text-gray-600">{backupStatus.lastBackup}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-3">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Total Backups</h3>
                <p className="text-sm text-gray-600">{backupStatus.totalBackups}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3">
                  <HardDrive className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Total Size</h3>
                <p className="text-sm text-gray-600">{backupStatus.totalSize}</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3">
                  <Cloud className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Cloud Sync</h3>
                <p className="text-sm text-gray-600">
                  {backupStatus.dropboxConfigured ? 'Configured' : 'Not configured'}
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Manual Backup Section */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Manual Backup</h3>
                <p className="text-gray-600">Create a backup of your data</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Type
                </label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="complete">Complete (Local + Cloud)</option>
                  <option value="local">Local Only</option>
                  <option value="dropbox">Dropbox Only</option>
                </select>
              </div>

              <GlassButton
                onClick={handleRunBackup}
                disabled={isRunningBackup}
                icon={isRunningBackup ? <Square size={16} /> : <Play size={16} />}
                className="w-full"
              >
                {isRunningBackup ? 'Running Backup...' : 'Run Backup'}
              </GlassButton>
            </div>
          </GlassCard>

          {/* SQL Backup Section */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">SQL Database Backup</h3>
                <p className="text-gray-600">Create SQL database dumps</p>
              </div>
              <Database className="w-8 h-8 text-green-600" />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type
                  </label>
                  <select
                    value={sqlBackupType}
                    onChange={(e) => setSqlBackupType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="full">Full Database</option>
                    <option value="schema">Schema Only</option>
                    <option value="data">Data Only</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Format
                  </label>
                  <select
                    value={sqlBackupFormat}
                    onChange={(e) => setSqlBackupFormat(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sql">SQL</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-2">
                <GlassButton
                  onClick={handleRunSqlBackup}
                  disabled={isRunningSqlBackup}
                  icon={isRunningSqlBackup ? <Square size={16} /> : <Play size={16} />}
                  className="flex-1"
                >
                  {isRunningSqlBackup ? 'Running...' : 'Run SQL Backup'}
                </GlassButton>
                
                <GlassButton
                  onClick={handleTestSqlConnection}
                  icon={<CheckCircle size={16} />}
                  variant="secondary"
                >
                  Test
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Automatic Backup Settings */}
        {autoConfig && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Automatic Backup</h3>
                <p className="text-gray-600">Configure automatic backup schedules</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Enable Automatic Backup</h4>
                  <p className="text-sm text-gray-600">Automatically backup data at scheduled intervals</p>
                </div>
                <button
                  onClick={handleToggleAutoBackup}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoConfig.enabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {autoConfig.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequency
                    </label>
                    <select
                      value={autoConfig.frequency}
                      onChange={(e) => setAutoConfig(prev => prev ? { ...prev, frequency: e.target.value as any } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={autoConfig.time}
                      onChange={(e) => setAutoConfig(prev => prev ? { ...prev, time: e.target.value } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Backups
                    </label>
                    <input
                      type="number"
                      value={autoConfig.maxBackups}
                      onChange={(e) => setAutoConfig(prev => prev ? { ...prev, maxBackups: parseInt(e.target.value) } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Restore from File Section */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Restore from Backup File</h3>
              <p className="text-gray-600">Upload and restore a backup file (.sql, .json, or .sql.gz format)</p>
            </div>
            <Upload className="w-8 h-8 text-orange-600" />
          </div>

          {/* GitHub Actions Backup Instructions */}
          <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-start space-x-3">
              <Cloud className="w-5 h-5 text-purple-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-purple-900 mb-1">📥 Download from GitHub Actions:</p>
                <ol className="text-xs text-purple-800 space-y-1 ml-4 list-decimal">
                  <li>Go to <a href="https://github.com/Mtaasisi/NEON-POS/actions" target="_blank" rel="noopener noreferrer" className="underline">Actions tab</a></li>
                  <li>Find "Automatic Neon Database Backup" or "Automatic NEON 02 Database Backup"</li>
                  <li>Click on a workflow run → Scroll to "Artifacts" section</li>
                  <li>Download the backup ZIP file</li>
                  <li>Extract the ZIP → Extract the .gz file → Upload the .sql file here</li>
                </ol>
                <p className="text-xs text-purple-700 mt-2">
                  💡 Tip: You can also upload the .sql.gz file directly - it will be automatically decompressed!
                </p>
              </div>
            </div>
          </div>

          {restoreFormats && (
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">📋 Supported Formats:</p>
              <div className="space-y-2">
                {restoreFormats.formats.map((format: any, index: number) => (
                  <div key={index} className="text-sm text-blue-800">
                    <span className="font-semibold">{format.format}</span> ({format.extension}) - {format.description}
                    {format.format === restoreFormats.recommended && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-200 rounded text-xs">RECOMMENDED</span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700 mt-2">
                💡 {restoreFormats.note || 'SQL format is recommended as it is the easiest to restore.'}
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Backup File
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept=".sql,.json,.gz,.sql.gz"
                  onChange={handleFileSelect}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    cursor-pointer"
                  disabled={isRestoring}
                />
              </div>
              {restoreFile && (
                <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{restoreFile.name}</p>
                        <p className="text-xs text-green-700">
                          {(restoreFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRestoreFile(null);
                        setPreviewData(null);
                        setSelectedTables([]);
                        setShowTableSelection(false);
                      }}
                      className="text-red-600 hover:text-red-800"
                      disabled={isRestoring}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {isPreviewing && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <p className="text-sm text-blue-900">Analyzing backup file...</p>
                  </div>
                </div>
              )}

              {previewData && showTableSelection && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Select Tables to Restore</h4>
                      <p className="text-sm text-gray-600">
                        Found {previewData.totalTables} tables with {previewData.totalRecords.toLocaleString()} total records
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSelectAllTables}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleDeselectAllTables}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {previewData.tables.map((table: any) => (
                      <label
                        key={table.name}
                        className="flex items-center space-x-3 p-2 hover:bg-white rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(table.name)}
                          onChange={() => handleToggleTable(table.name)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          disabled={isRestoring}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-900">{table.name}</span>
                          <span className="ml-2 text-xs text-gray-500">
                            ({table.recordCount.toLocaleString()} records)
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>{selectedTables.length}</strong> of <strong>{previewData.totalTables}</strong> tables selected
                      {selectedTables.length > 0 && (
                        <span className="ml-2 text-green-600">
                          ({previewData.tables
                            .filter((t: any) => selectedTables.includes(t.name))
                            .reduce((sum: number, t: any) => sum + t.recordCount, 0)
                            .toLocaleString()} records will be restored)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <GlassButton
              onClick={handleRestoreFromFile}
              disabled={!restoreFile || isRestoring || selectedTables.length === 0}
              icon={isRestoring ? <Square size={16} /> : <Upload size={16} />}
              className="w-full"
              variant={restoreFile && selectedTables.length > 0 ? "primary" : "secondary"}
            >
              {isRestoring 
                ? 'Restoring...' 
                : selectedTables.length === 0 
                  ? 'Select Tables to Restore' 
                  : `Restore ${selectedTables.length} Selected Table(s)`}
            </GlassButton>

            <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-xs text-yellow-800">
                ⚠️ <strong>Warning:</strong> Restoring will overwrite existing data in the database. 
                Make sure you have a current backup before proceeding.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Backup Files List */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Backup Files</h3>
              <p className="text-gray-600">Manage your backup files</p>
            </div>
            <GlassButton
              onClick={handleCleanOldBackups}
              icon={<Trash2 size={16} />}
              variant="secondary"
            >
              Clean Old
            </GlassButton>
          </div>

          {backupFiles.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No backup files found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backupFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{file.name}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{file.size}</span>
                        <span>{file.records} records</span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {file.timestamp}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          file.location === 'Local' ? 'bg-blue-100 text-blue-800' :
                          file.location === 'Dropbox' ? 'bg-green-100 text-green-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {file.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <GlassButton
                      onClick={() => handleDownloadBackup(file)}
                      icon={<DownloadIcon size={16} />}
                      variant="secondary"
                      size="sm"
                    >
                      Download
                    </GlassButton>
                    
                    <GlassButton
                      onClick={() => handleRestoreBackup(file)}
                      icon={<Upload size={16} />}
                      variant="secondary"
                      size="sm"
                    >
                      Restore
                    </GlassButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Backup Logs */}
        {backupLogs.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Backup Logs</h3>
                <p className="text-gray-600">Recent backup activity</p>
              </div>
              <Eye className="w-8 h-8 text-gray-600" />
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {backupLogs.map((log, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md text-sm text-gray-700">
                  {log}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default BackupManagementPage;
