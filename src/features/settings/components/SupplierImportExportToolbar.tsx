import React, { useState, useRef } from 'react';
import { Upload, Download, FileDown, FileUp, AlertCircle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassCard from '../../shared/components/ui/GlassCard';
import {
  exportAndDownloadSuppliers,
  importSuppliersFromCSV,
  downloadSupplierTemplate,
  exportSupplierStatistics,
  type ImportResult
} from '../../../lib/supplierImportExport';
import { Supplier } from '../../../lib/supplierApi';

interface SupplierImportExportToolbarProps {
  suppliers: Supplier[];
  onImportComplete?: () => void;
}

const SupplierImportExportToolbar: React.FC<SupplierImportExportToolbarProps> = ({
  suppliers,
  onImportComplete
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    try {
      exportAndDownloadSuppliers(suppliers);
      toast.success(`Exported ${suppliers.length} suppliers`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export suppliers');
    }
  };

  const handleExportStats = () => {
    try {
      exportSupplierStatistics(suppliers);
      toast.success('Statistics report exported');
    } catch (error) {
      console.error('Export stats error:', error);
      toast.error('Failed to export statistics');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadSupplierTemplate();
      toast.success('Template downloaded');
    } catch (error) {
      console.error('Download template error:', error);
      toast.error('Failed to download template');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      setImporting(true);
      setImportResult(null);

      const result = await importSuppliersFromCSV(file);
      setImportResult(result);

      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} suppliers`);
        onImportComplete?.();
      }

      if (result.failed > 0) {
        toast.error(`Failed to import ${result.failed} suppliers`);
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import suppliers');
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={suppliers.length === 0}
          title="Export suppliers to CSV"
          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Export
        </button>

        {/* Import Button */}
        <button
          onClick={() => setShowImportModal(true)}
          title="Import suppliers from CSV"
          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm"
        >
          <Upload size={16} />
          Import
        </button>

        {/* Export Stats */}
        <button
          onClick={handleExportStats}
          disabled={suppliers.length === 0}
          title="Export statistics report"
          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileDown size={16} />
          Stats
        </button>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <>
          <div 
            className="fixed bg-black/50"
            onClick={() => {
              if (!importing) {
                setShowImportModal(false);
                setImportResult(null);
              }
            }}
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 55
            }}
          />
          
          <div 
            className="fixed flex items-center justify-center p-4"
            style={{
              left: 'var(--sidebar-width, 0px)',
              top: 'var(--topbar-height, 64px)',
              right: 0,
              bottom: 0,
              zIndex: 60,
              pointerEvents: 'none'
            }}
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full"
              style={{ pointerEvents: 'auto' }}
            >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Import Suppliers</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                disabled={importing}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Import Instructions</h4>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Download the template CSV file to see the required format</li>
                  <li>Fill in your supplier data following the template structure</li>
                  <li>Upload the completed CSV file to import suppliers</li>
                  <li>Duplicate supplier names will be skipped</li>
                </ul>
              </div>

              {/* Template Download */}
              <div>
                <button
                  onClick={handleDownloadTemplate}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <FileDown size={16} />
                  Download Template CSV
                </button>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select CSV File to Import
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={importing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Import Progress */}
              {importing && (
                <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-gray-600">Importing suppliers...</span>
                </div>
              )}

              {/* Import Result */}
              {importResult && !importing && (
                <GlassCard className="p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Import Results</h4>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Successfully imported:</span>
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle size={16} />
                        {importResult.success}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Failed:</span>
                      <span className="flex items-center gap-1 text-red-600 font-medium">
                        <AlertCircle size={16} />
                        {importResult.failed}
                      </span>
                    </div>
                  </div>

                  {/* Error Details */}
                  {importResult.errors.length > 0 && (
                    <div className="border-t border-gray-200 pt-3">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Errors:</h5>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {importResult.errors.slice(0, 10).map((error, index) => (
                          <div key={index} className="text-xs bg-red-50 text-red-700 p-2 rounded">
                            <div className="font-medium">Row {error.row}: {error.error}</div>
                            {error.data.Name && (
                              <div className="text-red-600 mt-1">Supplier: {error.data.Name}</div>
                            )}
                          </div>
                        ))}
                        {importResult.errors.length > 10 && (
                          <div className="text-xs text-gray-600 text-center">
                            ... and {importResult.errors.length - 10} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </GlassCard>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportResult(null);
                }}
                disabled={importing}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importResult ? 'Close' : 'Cancel'}
              </button>
            </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SupplierImportExportToolbar;

