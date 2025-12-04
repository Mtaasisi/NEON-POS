/**
 * Media Backup & Restore Component
 * Allows users to backup and restore their media library from local storage
 */

import React, { useState } from 'react';
import { Download, Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { localMediaStorage } from '../../../lib/localMediaStorage';
import { migrateMediaToLocalStorage, checkMigrationNeeded, getMigrationStatus } from '../../../lib/migrateMediaToLocal';

interface Props {
  onClose: () => void;
}

export default function MediaBackupRestore({ onClose }: Props) {
  const [importing, setImporting] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<{
    total: number;
    migrated: number;
    pending: number;
    needsMigration: boolean;
  } | null>(null);

  // Check migration status on mount
  React.useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    const status = await getMigrationStatus();
    setMigrationStatus(status);
  }

  async function handleExport() {
    try {
      const allMedia = localMediaStorage.exportAllMedia();
      const dataStr = JSON.stringify(allMedia, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `whatsapp-media-backup-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Media backup downloaded!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export media');
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const mediaData = JSON.parse(text);
      
      const count = localMediaStorage.importMedia(mediaData);
      toast.success(`Successfully imported ${count} media files!`);
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import media. Invalid file format.');
    } finally {
      setImporting(false);
    }
  }

  async function handleMigration() {
    if (!confirm('Migrate all external media URLs to local storage? This may take a few minutes.')) {
      return;
    }

    try {
      setMigrating(true);
      toast.loading('Migrating media...', { id: 'migration' });
      
      const result = await migrateMediaToLocalStorage();
      
      toast.dismiss('migration');
      
      if (result.success) {
        toast.success(
          `Migration complete! Migrated: ${result.migrated}, Skipped: ${result.skipped}, Failed: ${result.failed}`
        );
        checkStatus(); // Refresh status
      } else {
        toast.error(`Migration failed. Check console for details.`);
      }
      
      if (result.errors.length > 0) {
        console.error('Migration errors:', result.errors);
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('Migration failed');
    } finally {
      setMigrating(false);
    }
  }

  return (
    <div className="p-6 bg-white rounded-xl">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        Media Backup & Restore
      </h3>

      {/* Migration Status */}
      {migrationStatus && migrationStatus.needsMigration && (
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 mb-1">Migration Needed</h4>
              <p className="text-sm text-yellow-800 mb-3">
                You have {migrationStatus.pending} media files with external URLs that should be migrated to local storage.
              </p>
              <button
                onClick={handleMigration}
                disabled={migrating}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-2"
              >
                {migrating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Migrate to Local Storage
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {migrationStatus && !migrationStatus.needsMigration && migrationStatus.total > 0 && (
        <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 mb-1">All Media Local</h4>
              <p className="text-sm text-green-800">
                All {migrationStatus.total} media files are stored locally. No migration needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Backup Section */}
      <div className="mb-6">
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Download className="w-5 h-5 text-blue-600" />
          Backup Media
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Export all media files to a JSON backup file. Use this to transfer media to another device or as a safety backup.
        </p>
        <button
          onClick={handleExport}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download Backup
        </button>
      </div>

      {/* Restore Section */}
      <div>
        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-purple-600" />
          Restore Media
        </h4>
        <p className="text-sm text-gray-600 mb-3">
          Import media from a previously exported backup file. This will add the media to your local storage.
        </p>
        <label className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold flex items-center gap-2 cursor-pointer inline-flex">
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
          {importing ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Select Backup File
            </>
          )}
        </label>
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 <strong>Tip:</strong> Media is stored in your browser's localStorage. Regular backups are recommended
          to prevent data loss when clearing browser cache or switching devices.
        </p>
      </div>

      {/* Close Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}

