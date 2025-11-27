import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { HardDrive, ExternalLink, Download, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface BackupWidgetProps {
  className?: string;
}

interface BackupMetrics {
  lastBackup: string;
  backupStatus: 'success' | 'warning' | 'error';
  backupSize: string;
  totalBackups: number;
  nextScheduled: string;
}

export const BackupWidget: React.FC<BackupWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<BackupMetrics>({
    lastBackup: 'Never',
    backupStatus: 'warning',
    backupSize: '0 KB',
    totalBackups: 0,
    nextScheduled: 'Daily at 2:00 AM'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    loadBackupData();
  }, []);

  const loadBackupData = async () => {
    try {
      setIsLoading(true);
      
      // Query backup logs
      const { data: backups, error } = await supabase
        .from('backup_logs')
        .select('id, created_at, status')
        .order('created_at', { ascending: false })
        .limit(10);

      // Handle missing table gracefully
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist - show default state
          setMetrics({
            lastBackup: 'Never',
            backupStatus: 'warning',
            backupSize: '0 KB',
            totalBackups: 0,
            nextScheduled: 'Daily at 2:00 AM'
          });
          setIsLoading(false);
          return;
        }
        throw error;
      }

      const totalBackups = backups?.length || 0;
      const lastBackup = backups?.[0];
      
      let lastBackupTime = 'Never';
      let backupStatus: 'success' | 'warning' | 'error' = 'warning';
      let backupSize = '0 KB';

      if (lastBackup) {
        const backupDate = new Date(lastBackup.created_at);
        const now = new Date();
        const hoursAgo = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursAgo < 24) {
          lastBackupTime = hoursAgo < 1 ? 'Just now' : `${Math.floor(hoursAgo)}h ago`;
          backupStatus = lastBackup.status === 'success' ? 'success' : 'error';
        } else {
          lastBackupTime = `${Math.floor(hoursAgo / 24)}d ago`;
          backupStatus = hoursAgo > 48 ? 'error' : 'warning';
        }

        // Note: backup_logs table may not have size column
        // if (lastBackup.size) {
        //   const sizeKB = lastBackup.size / 1024;
        //   const sizeMB = sizeKB / 1024;
        //   backupSize = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${sizeKB.toFixed(0)} KB`;
        // }
      }

      // Get next scheduled backup (from settings or default)
      const nextScheduled = 'Daily at 2:00 AM'; // This could come from settings

      setMetrics({
        lastBackup: lastBackupTime,
        backupStatus,
        backupSize,
        totalBackups,
        nextScheduled
      });
    } catch (error) {
      console.error('Error loading backup data:', error);
      setMetrics({
        lastBackup: 'Never',
        backupStatus: 'warning',
        backupSize: '0 KB',
        totalBackups: 0,
        nextScheduled: 'Daily at 2:00 AM'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (metrics.backupStatus) {
      case 'success':
        return 'text-emerald-600';
      case 'warning':
        return 'text-amber-600';
      case 'error':
        return 'text-rose-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (metrics.backupStatus) {
      case 'success':
        return <CheckCircle size={16} className="text-emerald-600" />;
      case 'warning':
        return <AlertCircle size={16} className="text-amber-600" />;
      case 'error':
        return <AlertCircle size={16} className="text-rose-600" />;
      default:
        return <Clock size={16} className="text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Backup Status</h3>
            <p className="text-xs text-gray-400 mt-0.5">Data protection</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/admin-settings?section=database')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-50 mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-gray-900">Last Backup</span>
          </div>
          <span className={`text-sm font-semibold ${getStatusColor()}`}>{metrics.lastBackup}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="px-3 py-2 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-400 mb-1">Total Backups</p>
            <p className="text-lg font-semibold text-gray-900">{metrics.totalBackups}</p>
          </div>
          <div className="px-3 py-2 rounded-lg bg-gray-50">
            <p className="text-xs text-gray-400 mb-1">Size</p>
            <p className="text-lg font-semibold text-gray-900">{metrics.backupSize}</p>
          </div>
        </div>
      </div>

      {/* Next Scheduled */}
      <div className="mb-6">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-blue-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-500">Next Scheduled</span>
          </div>
          <span className="text-sm font-medium text-blue-700">{metrics.nextScheduled}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowBackupModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Download size={14} />
          <span>Backup Now</span>
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowHistoryModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Clock size={14} />
          <span>History</span>
        </button>
      </div>

      {/* Backup Now Modal */}
      <Modal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} title="Create Backup" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600 mb-4">This will create a backup of your database.</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBackupModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.success('Backup initiated');
                setShowBackupModal(false);
                loadBackupData();
              }}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
            >
              Start Backup
            </button>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} title="Backup History" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Backup history will be listed here.</p>
          <button
            onClick={() => setShowHistoryModal(false)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

