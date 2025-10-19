import React, { useState } from 'react';
import { 
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Database,
  ArrowRight
} from 'lucide-react';
import { 
  runFullAnalysis, 
  cleanupBranchData, 
  CleanupReport, 
  CleanupOptions 
} from '../../../lib/branchDataCleanup';
import { useBranch } from '../../../context/BranchContext';
import toast from 'react-hot-toast';

export const BranchDataCleanupPanel: React.FC = () => {
  const { currentBranch } = useBranch();
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<CleanupReport[]>([]);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [cleanupAction, setCleanupAction] = useState<'delete' | 'reassign'>('reassign');

  const handleAnalyze = async () => {
    setLoading(true);
    setReports([]);
    
    try {
      const results = await runFullAnalysis();
      setReports(results);
      toast.success('Analysis completed!');
    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async (dryRun: boolean) => {
    setLoading(true);
    
    try {
      const options: CleanupOptions = {
        action: cleanupAction,
        dryRun,
        confirmationRequired: false
      };
      
      await cleanupBranchData(options);
      
      if (dryRun) {
        toast.success('✅ Dry run completed! Check console for details.');
      } else {
        toast.success('✅ Cleanup completed successfully!');
        // Re-run analysis to show updated results
        setTimeout(() => handleAnalyze(), 1000);
      }
      
      setShowCleanupDialog(false);
    } catch (error: any) {
      console.error('Cleanup failed:', error);
      toast.error(`Cleanup failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalOtherBranch = reports.reduce((sum, r) => sum + r.otherBranchRecords, 0);
  const totalUnassigned = reports.reduce((sum, r) => sum + r.unassignedRecords, 0);
  const hasIsolationViolation = totalOtherBranch > 0;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Branch Data Cleanup</h2>
            <p className="text-sm text-gray-500">
              Identify and fix branch isolation violations
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={loading || !currentBranch}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Analyzing...' : 'Analyze Data'}
          </button>
          
          {hasIsolationViolation && (
            <button
              onClick={() => setShowCleanupDialog(true)}
              disabled={loading || !currentBranch}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Cleanup Data
            </button>
          )}
        </div>
      </div>

      {/* Branch Selection Warning */}
      {!currentBranch && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-900">
                Please select a branch to use this tool.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {reports.length > 0 && (
        <>
          {/* Isolation Violation Alert */}
          {hasIsolationViolation && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    ⚠️ Branch Isolation Violation Detected!
                  </p>
                  <p className="text-sm text-red-700">
                    Your branch is in ISOLATED mode but has {totalOtherBranch} records from other branches.
                    This violates branch isolation rules. Use the cleanup tool to fix this issue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unassigned Records Warning */}
          {totalUnassigned > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 mb-1">
                    📋 Unassigned Records Found
                  </p>
                  <p className="text-sm text-yellow-700">
                    Found {totalUnassigned} records without branch assignment. 
                    These will be visible in shared/hybrid modes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-300">
                  <th className="text-left p-3 text-sm font-semibold text-gray-700">Table</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Total</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Current Branch</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Other Branches</th>
                  <th className="text-right p-3 text-sm font-semibold text-gray-700">Unassigned</th>
                  <th className="text-center p-3 text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((report) => {
                  const hasViolation = report.otherBranchRecords > 0;
                  return (
                    <tr key={report.table} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-gray-500" />
                          {report.table.replace('lats_', '')}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">{report.totalRecords}</td>
                      <td className="p-3 text-sm text-gray-700 text-right">{report.currentBranchRecords}</td>
                      <td className="p-3 text-sm text-right">
                        <span className={hasViolation ? 'font-bold text-red-600' : 'text-gray-700'}>
                          {report.otherBranchRecords}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-700 text-right">{report.unassignedRecords}</td>
                      <td className="p-3 text-center">
                        {hasViolation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                            <XCircle className="w-3 h-3" />
                            Violation
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            <CheckCircle className="w-3 h-3" />
                            OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Note */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Note:</strong> This tool helps identify and fix branch isolation issues.
              Records from other branches should not be visible when your branch is in ISOLATED mode.
            </p>
          </div>
        </>
      )}

      {/* Empty State */}
      {reports.length === 0 && !loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <Database className="w-12 h-12 text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-blue-800">
            Click "Analyze Data" to check for branch isolation issues.
          </p>
        </div>
      )}

      {/* Cleanup Confirmation Dialog */}
      {showCleanupDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            {/* Dialog Header */}
            <div className="p-6 border-b">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Trash2 className="w-6 h-6 text-orange-600" />
                Cleanup Branch Data
              </h3>
            </div>

            {/* Dialog Content */}
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-800">
                    This will modify database records. Please choose carefully!
                  </p>
                </div>
              </div>

              {/* Cleanup Action Radio Buttons */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">Cleanup Action</p>
                
                {/* Reassign Option */}
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="cleanup-action"
                    value="reassign"
                    checked={cleanupAction === 'reassign'}
                    onChange={(e) => setCleanupAction(e.target.value as 'delete' | 'reassign')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      Reassign to Current Branch (Recommended)
                    </p>
                    <p className="text-xs text-gray-600">
                      Move all data from other branches to the current branch. No data will be lost.
                    </p>
                  </div>
                </label>

                {/* Delete Option */}
                <label className="flex items-start gap-3 p-4 border-2 border-red-200 rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                  <input
                    type="radio"
                    name="cleanup-action"
                    value="delete"
                    checked={cleanupAction === 'delete'}
                    onChange={(e) => setCleanupAction(e.target.value as 'delete' | 'reassign')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-900 mb-1">
                      Delete Records (Dangerous!)
                    </p>
                    <p className="text-xs text-red-700">
                      Permanently delete all records from other branches. This cannot be undone!
                    </p>
                  </div>
                </label>
              </div>

              {/* Tip */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  💡 <strong>Tip:</strong> Try "Dry Run" first to preview what will happen
                  without making any actual changes.
                </p>
              </div>
            </div>

            {/* Dialog Actions */}
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowCleanupDialog(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleCleanup(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                Dry Run
              </button>
              <button
                onClick={() => handleCleanup(false)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
