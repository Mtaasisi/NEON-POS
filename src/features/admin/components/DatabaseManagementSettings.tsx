/**
 * Database Management Settings
 * Allows downloading full database for offline-first operation
 */

import React, { useState, useEffect } from 'react';
import { Download, Database, CheckCircle, AlertTriangle, RefreshCw, Trash2, Wifi, WifiOff, HardDrive, Cloud, Clock, Play, Pause, Settings, Upload, FileText, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { fullDatabaseDownloadService } from '../../../services/fullDatabaseDownloadService';
import { offlineSaleSyncService } from '../../../services/offlineSaleSyncService';
import { autoSyncService } from '../../../services/autoSyncService';
import { 
  restoreFromBackup,
  previewBackupFile,
  getRestoreFormats,
  BackupResult
} from '../../../lib/backupApi';

const DatabaseManagementSettings: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; currentTask: string; percentage: number } | null>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [pendingSales, setPendingSales] = useState(0);
  const [pendingSalesList, setPendingSalesList] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState(autoSyncService.getStatus());
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  
  // Restore functionality state
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreFormats, setRestoreFormats] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showTableSelection, setShowTableSelection] = useState(false);

  useEffect(() => {
    loadMetadata();
    loadPendingSales();
    loadRestoreFormats();
    
    // Start auto sync for offline sales
    offlineSaleSyncService.startAutoSync();
    
    // Subscribe to auto sync status updates
    const unsubscribe = autoSyncService.subscribe((status) => {
      setAutoSyncStatus(status);
      if (import.meta.env.DEV) {
        console.log('🔄 [AutoSync] Status updated:', status);
      }
    });
    
    // Load sync interval from settings
    const savedInterval = localStorage.getItem('auto_sync_interval');
    if (savedInterval) {
      setSyncInterval(Math.round(parseInt(savedInterval, 10) / 1000 / 60));
    }
    
    // Update pending sales count periodically
    const interval = setInterval(() => {
      loadPendingSales();
    }, 5000);

    return () => {
      clearInterval(interval);
      offlineSaleSyncService.stopAutoSync();
      unsubscribe();
    };
  }, []);

  const loadRestoreFormats = async () => {
    try {
      const formats = await getRestoreFormats();
      setRestoreFormats(formats);
    } catch (error) {
      console.error('Failed to load restore formats:', error);
    }
  };

  const loadMetadata = () => {
    const meta = fullDatabaseDownloadService.getDownloadMetadata();
    setMetadata(meta);
  };

  const loadPendingSales = () => {
    const allSales = offlineSaleSyncService.getOfflineSales();
    const pending = allSales.filter(s => !s.synced);
    setPendingSales(pending.length);
    setPendingSalesList(pending);
  };

  const handleDownload = async () => {
    if (!confirm('This will download all essential data to your local storage. This may take a few minutes. Continue?')) {
      return;
    }

    setDownloading(true);
    setProgress(null);

    try {
      const result = await fullDatabaseDownloadService.downloadFullDatabase((prog) => {
        setProgress(prog);
      });

      if (result.success) {
        const totalItems = Object.values(result.data).reduce((a: number, b: number) => a + b, 0);
        toast.success(`✅ Database downloaded successfully! ${totalItems} items downloaded.`);
        
        // Log detailed results to console
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ [Database Download] COMPLETED SUCCESSFULLY');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📊 Download Summary:', {
          totalItems,
          products: result.data.products,
          productsWithVariants: 'Check console for details',
          customers: result.data.customers,
          categories: result.data.categories,
          suppliers: result.data.suppliers,
          variants: result.data.variants,
          childVariants: result.data.childVariants,
          downloadTime: `${(result.downloadTime / 1000).toFixed(1)}s`
        });
        console.log('💾 Storage:', {
          localStorageUsed: formatSize(getStorageSize()),
          timestamp: new Date(result.timestamp).toLocaleString()
        });
        console.log('🔄 Auto Sync:', {
          enabled: autoSyncService.isEnabled(),
          nextSync: autoSyncStatus.nextSyncTime ? new Date(autoSyncStatus.nextSyncTime).toLocaleString() : 'N/A'
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        loadMetadata();
        
        // Start auto sync if online
        if (navigator.onLine && !autoSyncService.isEnabled()) {
          autoSyncService.startAutoSync();
        }
      } else {
        console.error('❌ [Database Download] FAILED:', result.error);
        toast.error(`❌ Download failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download database');
    } finally {
      setDownloading(false);
      setProgress(null);
    }
  };

  const handleSyncPendingSales = async () => {
    if (!navigator.onLine) {
      toast.error('You are offline. Please connect to the internet to sync sales.');
      return;
    }

    setSyncing(true);
    try {
      const result = await offlineSaleSyncService.syncAllPendingSales();
      if (result.synced > 0) {
        toast.success(`✅ Synced ${result.synced} sales successfully`);
      }
      if (result.failed > 0) {
        toast.error(`⚠️ ${result.failed} sales failed to sync`);
      }
      if (result.synced === 0 && result.failed === 0) {
        toast.success('✅ No pending sales to sync');
      }
      loadPendingSales();
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync sales');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearDatabase = () => {
    if (!confirm('Are you sure you want to clear all downloaded database? This will remove all locally cached data. This action cannot be undone.')) {
      return;
    }

    fullDatabaseDownloadService.clearDownload();
    autoSyncService.stopAutoSync();
    console.log('🗑️ [Database] Local database cleared');
    toast.success('✅ Local database cleared');
    loadMetadata();
  };

  const handleToggleAutoSync = () => {
    if (autoSyncService.isEnabled()) {
      autoSyncService.stopAutoSync();
      console.log('⏸️ [AutoSync] Stopped by user');
      toast.success('Auto sync stopped');
    } else {
      if (!navigator.onLine) {
        toast.error('Cannot start auto sync - offline');
        return;
      }
      autoSyncService.startAutoSync();
      console.log('▶️ [AutoSync] Started by user');
      toast.success('Auto sync started');
    }
  };

  const handleSyncNow = async () => {
    if (!navigator.onLine) {
      toast.error('Cannot sync - offline');
      return;
    }

    setSyncing(true);
    console.log('🔄 [AutoSync] Manual sync triggered by user');
    
    try {
      const result = await autoSyncService.syncNow();
      if (result.success) {
        toast.success('✅ Database synced successfully');
        loadMetadata();
        
        // Verify all data after sync
        const verification = await fullDatabaseDownloadService.verifyAllData();
        if (verification.allOk) {
          console.log('✅ [Sync] All data verified successfully after sync');
        } else {
          console.warn('⚠️ [Sync] Some data issues detected:', verification.summary);
        }
      } else {
        toast.error(`❌ Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ [AutoSync] Manual sync error:', error);
      toast.error('Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const handleVerifyData = async () => {
    console.log('🔍 [Database] Manual verification triggered by user');
    const verification = await fullDatabaseDownloadService.verifyAllData();
    
    if (verification.allOk) {
      toast.success('✅ All data verified successfully');
    } else {
      toast.error(`⚠️ ${verification.summary}`);
    }
  };

  const handleSetSyncInterval = () => {
    autoSyncService.setSyncInterval(syncInterval);
    toast.success(`Auto sync interval set to ${syncInterval} minutes`);
    setShowSyncSettings(false);
    console.log(`⚙️ [AutoSync] Interval changed to ${syncInterval} minutes`);
  };

  // Restore functionality handlers
  const handleRestoreFromFile = async () => {
    if (!restoreFile) {
      toast.error('❌ Please select a backup file to restore');
      return;
    }

    // Check if tables are selected
    if (selectedTables.length === 0) {
      toast.error('❌ Please select at least one table to restore');
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
          toast.success(message + `\n\n⚠️ Warnings:\n${data.warnings.join('\n')}`);
        } else {
          toast.success(message);
        }
        
        // Reset everything
        setRestoreFile(null);
        setPreviewData(null);
        setSelectedTables([]);
        setShowTableSelection(false);
        // Refresh metadata
        loadMetadata();
      } else {
        const errorMsg = result.error || result.message || 'Unknown error';
        toast.error(`❌ Restore failed: ${errorMsg}`);
      }
    } catch (error) {
      let errorMsg = 'Unknown error';
      if (error instanceof Error) {
        errorMsg = error.message;
      }
      toast.error(`❌ Restore failed: ${errorMsg}`);
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
        toast.error('❌ Invalid file type. Please select a .sql, .json, or .sql.gz backup file.');
        event.target.value = '';
        return;
      }
      
      // Handle compressed .gz files
      if (isGz) {
        try {
          // Decompress using browser's CompressionStream API (if available)
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
            toast.error('⚠️ Please extract the .gz file manually first. Download from GitHub Actions → Extract ZIP → Extract .gz → Upload .sql file here');
            event.target.value = '';
            return;
          }
        } catch (error) {
          toast.error('❌ Failed to decompress file. Please extract the .gz file manually first.');
          event.target.value = '';
          return;
        }
      }
      
      // Validate file size (1GB limit)
      if (file.size > 1024 * 1024 * 1024) {
        toast.error('❌ File too large. Maximum file size is 1GB (1024MB).');
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
        toast.success(`✅ Backup preview loaded: ${result.data.totalTables} tables found`);
      } else {
        toast.error(`❌ Failed to preview backup file: ${result.error}`);
      }
    } catch (error) {
      toast.error(`❌ Error previewing backup file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getStorageSize = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return total;
  };

  const isDownloaded = fullDatabaseDownloadService.isDownloaded();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Database Management
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Download full database for offline-first operation and faster performance
        </p>
      </div>

      {/* Download Status */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Download Status</h3>
          {isDownloaded && (
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Downloaded
            </span>
          )}
        </div>

        {metadata && (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Downloaded</p>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDate(metadata.timestamp)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Download Time</p>
                <p className="text-sm font-medium text-gray-900">
                  {(metadata.downloadTime / 1000).toFixed(1)}s
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Downloaded Data</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Products:</span>
                  <span className="font-semibold">{metadata.data.products || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Customers:</span>
                  <span className="font-semibold">{metadata.data.customers || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Categories:</span>
                  <span className={`font-semibold ${(metadata.data.categories || 0) === 0 ? 'text-orange-600' : ''}`}>
                    {metadata.data.categories || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suppliers:</span>
                  <span className={`font-semibold ${(metadata.data.suppliers || 0) === 0 ? 'text-orange-600' : ''}`}>
                    {metadata.data.suppliers || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Variants:</span>
                  <span className="font-semibold">{metadata.data.variants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Child Variants:</span>
                  <span className="font-semibold">{metadata.data.childVariants || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Methods:</span>
                  <span className="font-semibold">{metadata.data.paymentMethods || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Payment Accounts:</span>
                  <span className="font-semibold">{metadata.data.paymentAccounts || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Employees:</span>
                  <span className="font-semibold">{metadata.data.employees || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Branches:</span>
                  <span className="font-semibold">{metadata.data.branches || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Installment Plans:</span>
                  <span className="font-semibold">{metadata.data.installmentPlans || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recent Sales:</span>
                  <span className="font-semibold">{metadata.data.recentSales || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Stock Levels:</span>
                  <span className="font-semibold">{metadata.data.stockLevels || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Settings:</span>
                  <span className="font-semibold">{metadata.data.settings || 0}</span>
                </div>
              </div>
              
              {/* Warning for missing data */}
              {(metadata.data.categories === 0 || metadata.data.suppliers === 0) && (
                <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-xs text-orange-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {metadata.data.categories === 0 && 'Categories not found. '}
                    {metadata.data.suppliers === 0 && 'Suppliers not found. '}
                    This may indicate the tables don't exist or have no active records.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!metadata && (
          <div className="text-center py-8 text-gray-500">
            <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No database downloaded yet</p>
            <p className="text-xs mt-1">Download to enable offline-first operation</p>
          </div>
        )}

        {/* Download Progress */}
        {downloading && progress && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900">
                Downloading {progress.currentTask}...
              </span>
              <span className="text-sm font-semibold text-blue-700">
                {progress.percentage}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-blue-700 mt-2">
              {progress.current} of {progress.total} tasks completed
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {downloading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download Full Database
              </>
            )}
          </button>

          {metadata && (
            <button
              onClick={handleClearDatabase}
              className="px-4 py-2.5 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Automatic Background Sync */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Automatic Background Sync</h3>
            <p className="text-xs text-gray-500 mt-1">
              Automatically syncs database when WiFi/network is available
            </p>
          </div>
          <div className="flex items-center gap-2">
            {navigator.onLine ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Online
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Sync Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Sync Status</p>
                <p className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                  {autoSyncStatus.isSyncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-blue-600">Syncing...</span>
                    </>
                  ) : autoSyncService.isEnabled() ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">Paused</span>
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Last Sync</p>
                <p className="text-sm font-medium text-gray-900">
                  {autoSyncStatus.lastSyncTime ? (
                    <>
                      {new Date(autoSyncStatus.lastSyncTime).toLocaleTimeString()}
                      {autoSyncStatus.lastSyncSuccess ? (
                        <CheckCircle className="w-3 h-3 text-green-600 inline-block ml-1" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-red-600 inline-block ml-1" />
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Never</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Next Sync</p>
                <p className="text-sm font-medium text-gray-900">
                  {autoSyncStatus.nextSyncTime ? (
                    new Date(autoSyncStatus.nextSyncTime).toLocaleTimeString()
                  ) : (
                    <span className="text-gray-400">Not scheduled</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Sync Interval</p>
                <p className="text-sm font-medium text-gray-900">
                  {Math.round(autoSyncStatus.syncInterval / 1000 / 60)} minutes
                </p>
              </div>
            </div>

            {autoSyncStatus.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                <AlertTriangle className="w-3 h-3 inline-block mr-1" />
                {autoSyncStatus.error}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleToggleAutoSync}
              disabled={!navigator.onLine && !autoSyncService.isEnabled()}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                autoSyncService.isEnabled()
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {autoSyncService.isEnabled() ? (
                <>
                  <Pause className="w-4 h-4" />
                  Pause Auto Sync
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Auto Sync
                </>
              )}
            </button>
            <button
              onClick={handleSyncNow}
              disabled={syncing || !navigator.onLine}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Sync Now
                </>
              )}
            </button>
            <button
              onClick={() => setShowSyncSettings(!showSyncSettings)}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* Sync Settings */}
          {showSyncSettings && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-3">Sync Interval</p>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={syncInterval}
                  onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                  className="w-20 px-3 py-2 border border-blue-300 rounded-lg text-sm font-semibold"
                />
                <span className="text-sm text-blue-800">minutes</span>
                <button
                  onClick={handleSetSyncInterval}
                  className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
              <p className="text-xs text-blue-700 mt-2">
                Database will automatically sync every {syncInterval} minutes when online
              </p>
            </div>
          )}

          {/* Console Logs Info */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600 flex items-center gap-1 mb-2">
              <AlertTriangle className="w-3 h-3" />
              <span className="font-semibold">Console Logs:</span> Open browser console (F12) to see detailed sync logs
            </p>
            <button
              onClick={handleVerifyData}
              className="w-full px-3 py-2 bg-gray-600 text-white rounded-lg text-xs font-semibold hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-3 h-3" />
              Verify All Data
            </button>
          </div>
        </div>
      </div>

      {/* Offline Sales Sync */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Offline Sales Sync</h3>
          <div className="flex items-center gap-2">
            {navigator.onLine ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <Wifi className="w-3 h-3" />
                Online
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Pending Sales</p>
                <p className="text-xs text-gray-500 mt-1">
                  Sales waiting to be synced to online database
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">{pendingSales}</p>
                {pendingSales > 0 && (
                  <p className="text-xs text-orange-600 mt-1">Needs sync</p>
                )}
              </div>
            </div>
          </div>

          {/* Pending Sales List */}
          {pendingSales > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-semibold text-gray-900">Pending Sales Details</p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Sale ID</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Customer</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Items</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Created</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Attempts</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingSalesList.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <div className="font-mono text-xs text-gray-900">
                            {sale.id.substring(0, 16)}...
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-gray-900">
                            {sale.saleData?.customerName || sale.saleData?.customer_name || 'Walk-in'}
                          </div>
                          {sale.saleData?.customerPhone && (
                            <div className="text-xs text-gray-500">{sale.saleData.customerPhone}</div>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="font-semibold text-gray-900">
                            {new Intl.NumberFormat('en-TZ', {
                              style: 'currency',
                              currency: 'TZS',
                              minimumFractionDigits: 0,
                            }).format(sale.saleData?.total || sale.saleData?.total_amount || 0)}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-gray-900">
                            {sale.saleData?.items?.length || 0} items
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="text-xs text-gray-600">
                            {new Date(sale.timestamp).toLocaleString('en-TZ', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold ${
                              sale.syncAttempts >= 3 ? 'text-red-600' : 'text-orange-600'
                            }`}>
                              {sale.syncAttempts}/3
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {sale.error ? (
                            <div className="flex items-center gap-1 group relative">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600 font-semibold cursor-help">
                                Failed
                              </span>
                              <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10 bg-red-50 border border-red-200 rounded-lg p-2 shadow-lg max-w-xs">
                                <p className="text-xs text-red-800 font-semibold mb-1">Sync Error:</p>
                                <p className="text-xs text-red-700">{sale.error}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-orange-600 font-semibold">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pendingSales === 0 && (
            <div className="p-8 text-center border border-gray-200 rounded-lg bg-gray-50">
              <Cloud className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">No Pending Sales</p>
              <p className="text-xs text-gray-500 mt-1">All sales have been synced successfully</p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncPendingSales}
              disabled={syncing || !navigator.onLine || pendingSales === 0}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  Sync Pending Sales
                </>
              )}
            </button>
          </div>

          {pendingSales > 0 && !navigator.onLine && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-800">
                You have {pendingSales} sales waiting to sync. They will automatically sync when you go online.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Storage Info */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Information</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <HardDrive className="w-4 h-4" />
              Local Storage Used
            </span>
            <span className="text-sm font-semibold text-gray-900">
              {formatSize(getStorageSize())}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Storage Limit</span>
            <span className="text-sm font-semibold text-gray-900">~5-10 MB</span>
          </div>
        </div>
      </div>

      {/* Restore from Backup Section */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Restore from Backup</h3>
            <p className="text-sm text-gray-600 mt-1">Upload and restore a backup file (.sql, .json, or .sql.gz format)</p>
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
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAllTables}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {previewData.tables.map((table: any) => (
                    <label key={table.name} className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTables.includes(table.name)}
                        onChange={() => handleToggleTable(table.name)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-900 flex-1">{table.name}</span>
                      <span className="text-xs text-gray-500">{table.recordCount.toLocaleString()} records</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Selected: {selectedTables.length} of {previewData.tables.length} tables
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleRestoreFromFile}
            disabled={!restoreFile || selectedTables.length === 0 || isRestoring}
            className="w-full px-4 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRestoring ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Restoring...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Restore Selected Tables
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Download full database to enable offline-first operation</li>
              <li>All data is stored locally for instant access</li>
              <li>Sales are saved locally first, then synced to online database in background</li>
              <li>Automatic sync runs every 30 seconds when online</li>
              <li>Download again to refresh your local database</li>
              <li>Restore backups from GitHub Actions or local backup files</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseManagementSettings;

