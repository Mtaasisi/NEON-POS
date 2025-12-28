import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Database,
  Eye,
  EyeOff,
  Settings,
  Bug,
  Package,
  Users,
  Warehouse,
  Factory,
  FolderTree
} from 'lucide-react';
import {
  runFullIsolationTest,
  enableDebugMode,
  disableDebugMode,
  isDebugMode,
  BranchDebugInfo,
  IsolationTestResult
} from '../../../lib/branchIsolationDebugger';
import { getCurrentBranchId } from '../../../lib/branchAwareApi';
import toast from 'react-hot-toast';

const BranchIsolationDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<BranchDebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [debugModeEnabled, setDebugModeEnabled] = useState(isDebugMode());
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        runTest();
      }, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const runTest = async () => {
    const branchId = getCurrentBranchId();
    if (!branchId) {
      toast.error('Please select a branch first');
      return;
    }

    setLoading(true);
    try {
      const result = await runFullIsolationTest(branchId);
      setDebugInfo(result);
      
      if (result.summary.failed > 0) {
        toast.error(`${result.summary.failed} isolation test(s) failed!`);
      } else if (result.summary.warnings > 0) {
        toast(`Tests passed with ${result.summary.warnings} warning(s)`, { icon: '⚠️' });
      } else {
        toast.success('All isolation tests passed!');
      }
    } catch (error: any) {
      console.error('Error running tests:', error);
      toast.error(error.message || 'Failed to run tests');
    } finally {
      setLoading(false);
    }
  };

  const toggleDebugMode = () => {
    if (debugModeEnabled) {
      disableDebugMode();
      setDebugModeEnabled(false);
      toast.success('Debug mode disabled');
    } else {
      enableDebugMode();
      setDebugModeEnabled(true);
      toast.success('Debug mode enabled - Check console for query logs');
    }
  };

  const getStatusIcon = (result: IsolationTestResult) => {
    if (!result.passed) {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (result.details.includes('⚠️')) {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'Products':
        return <Package className="w-5 h-5" />;
      case 'Customers':
        return <Users className="w-5 h-5" />;
      case 'Inventory':
        return <Warehouse className="w-5 h-5" />;
      case 'Suppliers':
        return <Factory className="w-5 h-5" />;
      case 'Categories':
        return <FolderTree className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Bug className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Branch Isolation Debugger</h2>
            <p className="text-sm text-gray-500">
              Test and verify data isolation is working correctly
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Debug Mode Toggle */}
          <button
            onClick={toggleDebugMode}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              debugModeEnabled
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {debugModeEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {debugModeEnabled ? 'Debug On' : 'Debug Off'}
          </button>

          {/* Auto-refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              autoRefresh
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh {autoRefresh ? 'On' : 'Off'}
          </button>

          {/* Run Test Button */}
          <button
            onClick={runTest}
            disabled={loading || !getCurrentBranchId()}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? 'Testing...' : 'Run Test'}
          </button>
        </div>
      </div>

      {/* Instructions */}
      {!debugInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-start gap-3">
            <Settings className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                How to Use the Debugger
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold">1.</span>
                  <span>Select a branch from the branch selector in the navigation</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">2.</span>
                  <span>Click "Run Test" to check if isolation is working correctly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">3.</span>
                  <span>Enable "Debug Mode" to see detailed query logs in the browser console</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold">4.</span>
                  <span>Enable "Auto-refresh" to continuously monitor isolation (updates every 10s)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Current Branch Info */}
      {debugInfo && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Branch Name</p>
                <p className="text-lg font-bold text-gray-900">{debugInfo.branchName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Branch ID</p>
                <p className="text-sm font-mono text-gray-700">{debugInfo.branchId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Isolation Mode</p>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${
                  debugInfo.isolationMode === 'shared' ? 'bg-blue-100 text-blue-700' :
                  debugInfo.isolationMode === 'isolated' ? 'bg-red-100 text-red-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  <Shield className="w-4 h-4" />
                  {debugInfo.isolationMode.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Last Tested</p>
                <p className="text-sm text-gray-700">
                  {new Date(debugInfo.testResults[0]?.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {debugInfo && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 mb-1">Tests Passed</p>
                <p className="text-3xl font-bold text-green-700">{debugInfo.summary.passed}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 mb-1">Tests Failed</p>
                <p className="text-3xl font-bold text-red-700">{debugInfo.summary.failed}</p>
              </div>
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600 mb-1">Warnings</p>
                <p className="text-3xl font-bold text-yellow-700">{debugInfo.summary.warnings}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* Feature Configuration */}
      {debugInfo && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Branch Configuration
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(debugInfo.settings).map(([key, value]) => (
              <div
                key={key}
                className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                  value
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <span className="text-sm font-medium text-gray-700">
                  {key.replace('share_', '').charAt(0).toUpperCase() + key.replace('share_', '').slice(1)}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  value ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {value ? 'SHARED' : 'ISOLATED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      {debugInfo && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Database className="w-5 h-5" />
            Isolation Test Results
          </h3>
          <div className="space-y-4">
            {debugInfo.testResults.map((result, index) => (
              <div
                key={index}
                className={`border-2 rounded-lg p-4 transition-all ${
                  !result.passed
                    ? 'bg-red-50 border-red-200'
                    : result.details.includes('⚠️')
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-green-50 border-green-200'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getFeatureIcon(result.feature)}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">
                        {result.feature}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Expected: <span className="font-semibold">{result.expected.toUpperCase()}</span>
                        {' '} | {' '}
                        Actual: <span className="font-semibold">{result.actual.toUpperCase()}</span>
                      </p>
                    </div>
                  </div>
                  {getStatusIcon(result)}
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-700">{result.details}</p>
                </div>

                {/* Data Count Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-600 mb-1">Current Branch</p>
                    <p className="text-xl font-bold text-blue-600">
                      {result.dataCount.currentBranch}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-600 mb-1">Other Branches</p>
                    <p className="text-xl font-bold text-purple-600">
                      {result.dataCount.otherBranches}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-600 mb-1">Shared Items</p>
                    <p className="text-xl font-bold text-green-600">
                      {result.dataCount.shared}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-xs text-gray-600 mb-1">Total Visible</p>
                    <p className="text-xl font-bold text-gray-900">
                      {result.dataCount.total}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug Mode Info */}
      {debugModeEnabled && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Eye className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-purple-900 mb-1">
                Debug Mode is Active
              </p>
              <p className="text-xs text-purple-700">
                All database queries will be logged to the browser console with detailed isolation information.
                Open the browser console (F12) to see the logs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchIsolationDebugPanel;

