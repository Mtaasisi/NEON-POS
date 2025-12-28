/**
 * Integrations Test Page
 * Test all integrations to verify they work correctly
 */

import React, { useState, useEffect } from 'react';
import {
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  Smartphone,
  MessageCircle,
  Mail,
  CreditCard,
  BarChart,
  Zap,
  Globe,
  RefreshCw,
  Send,
  Clock,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import {
  getAllIntegrations,
  getCredentials,
  updateIntegrationUsage,
  type Integration,
} from '../../../lib/integrationsApi';
import { smsService } from '../../../services/smsService';

interface TestResult {
  integration: string;
  test: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
  timestamp?: Date;
}

const IntegrationsTestPage: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

  // Test form data
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test message from LATS POS');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setLoading(true);
    try {
      const data = await getAllIntegrations();
      setIntegrations(data.filter(i => i.is_enabled));
    } catch (error: any) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [...prev, { ...result, timestamp: new Date() }]);
  };

  const updateTestResult = (index: number, updates: Partial<TestResult>) => {
    setTestResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], ...updates };
      return newResults;
    });
  };

  /**
   * Test SMS Integration
   */
  const testSMS = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number');
      return;
    }

    const startTime = Date.now();
    const testIndex = testResults.length;
    
    addTestResult({
      integration: 'SMS',
      test: 'Send Test SMS',
      status: 'running',
    });

    try {
      const credentials = await getCredentials('SMS_GATEWAY');
      if (!credentials) {
        throw new Error('SMS not configured');
      }

      const result = await smsService.sendSMS(testPhone, testMessage);
      const duration = Date.now() - startTime;

      if (result.success) {
        updateTestResult(testIndex, {
          status: 'passed',
          message: `SMS sent successfully in ${duration}ms`,
          duration,
        });
        toast.success('SMS test passed!');
      } else {
        updateTestResult(testIndex, {
          status: 'failed',
          message: result.error || 'Unknown error',
          duration,
        });
        toast.error('SMS test failed');
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(testIndex, {
        status: 'failed',
        message: error.message,
        duration,
      });
      toast.error('SMS test error: ' + error.message);
    }
  };


  /**
   * Test Credentials Fetch
   */
  const testCredentialsFetch = async (integrationName: string) => {
    const startTime = Date.now();
    const testIndex = testResults.length;
    
    addTestResult({
      integration: integrationName,
      test: 'Fetch Credentials',
      status: 'running',
    });

    try {
      const credentials = await getCredentials(integrationName);
      const duration = Date.now() - startTime;

      if (credentials) {
        updateTestResult(testIndex, {
          status: 'passed',
          message: `Credentials fetched successfully (${Object.keys(credentials).length} fields) in ${duration}ms`,
          duration,
        });
        toast.success(`${integrationName} credentials loaded!`);
      } else {
        updateTestResult(testIndex, {
          status: 'failed',
          message: 'Integration not found or not enabled',
          duration,
        });
        toast.warning(`${integrationName} not configured`);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      updateTestResult(testIndex, {
        status: 'failed',
        message: error.message,
        duration,
      });
      toast.error('Credentials fetch error');
    }
  };

  /**
   * Test All Enabled Integrations
   */
  const testAllIntegrations = async () => {
    setTesting(true);
    setTestResults([]);
    
    for (const integration of integrations) {
      await testCredentialsFetch(integration.integration_name);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTesting(false);
    toast.success('All tests completed!');
  };

  /**
   * Clear Test Results
   */
  const clearResults = () => {
    setTestResults([]);
    toast.success('Results cleared');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getIntegrationIcon = (integration: Integration) => {
    const icons: Record<string, any> = {
      sms: Smartphone,
      whatsapp: MessageCircle,
      email: Mail,
      payment: CreditCard,
      analytics: BarChart,
      ai: Zap,
      custom: Globe,
    };
    const Icon = icons[integration.integration_type] || Globe;
    return <Icon className="w-5 h-5 text-blue-600" />;
  };

  const stats = {
    total: testResults.length,
    passed: testResults.filter(r => r.status === 'passed').length,
    failed: testResults.filter(r => r.status === 'failed').length,
    running: testResults.filter(r => r.status === 'running').length,
    avgDuration: testResults.length > 0
      ? Math.round(testResults.reduce((acc, r) => acc + (r.duration || 0), 0) / testResults.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <TestTube className="w-8 h-8 text-blue-600" />
          Integrations Testing Center
        </h1>
        <p className="text-gray-600 mt-2">
          Test all your integrations to ensure they're working correctly
        </p>
      </div>

      {/* Stats */}
      {testResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <GlassCard className="p-4">
            <div className="text-sm text-gray-600">Total Tests</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-sm text-gray-600">Passed</div>
            <div className="text-2xl font-bold text-green-600">{stats.passed}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-sm text-gray-600">Failed</div>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-sm text-gray-600">Running</div>
            <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-sm text-gray-600">Avg Duration</div>
            <div className="text-2xl font-bold text-gray-900">{stats.avgDuration}ms</div>
          </GlassCard>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Available Integrations */}
        <div className="space-y-6">
          {/* Enabled Integrations */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Enabled Integrations ({integrations.length})</h2>
              <GlassButton
                onClick={loadIntegrations}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </GlassButton>
            </div>

            {integrations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No enabled integrations found</p>
                <p className="text-sm mt-2">Go to Admin Settings → Integrations to enable some</p>
              </div>
            ) : (
              <div className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getIntegrationIcon(integration)}
                      <div>
                        <div className="font-medium text-gray-900">
                          {integration.provider_name || integration.integration_name}
                        </div>
                        <div className="text-sm text-gray-600">
                          {integration.integration_type}
                          {integration.is_test_mode && (
                            <span className="ml-2 text-xs text-orange-600 font-medium">
                              Test Mode
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <GlassButton
                      onClick={() => testCredentialsFetch(integration.integration_name)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <TestTube className="w-4 h-4" />
                      Test
                    </GlassButton>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <GlassButton
                onClick={testAllIntegrations}
                disabled={testing || integrations.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                {testing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Testing All...
                  </>
                ) : (
                  <>
                    <TestTube className="w-5 h-5" />
                    Test All Integrations
                  </>
                )}
              </GlassButton>
              <GlassButton
                onClick={clearResults}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                disabled={testResults.length === 0}
              >
                <RefreshCw className="w-5 h-5" />
                Clear Results
              </GlassButton>
            </div>
          </GlassCard>

          {/* Manual Tests */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4">Manual Tests</h2>
            <div className="space-y-4">
              {/* Phone Number Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Phone Number
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="e.g., +255712345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Message Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Test Message
                </label>
                <textarea
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  rows={3}
                  placeholder="Enter test message"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Test Buttons */}
              <div className="grid grid-cols-1 gap-3">
                <GlassButton
                  onClick={testSMS}
                  disabled={!testPhone || !testMessage}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Smartphone className="w-4 h-4" />
                  Test SMS
                </GlassButton>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Test Results */}
        <div>
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Test Results</h2>
              {testResults.length > 0 && (
                <span className="text-sm text-gray-600">
                  {testResults.length} test{testResults.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {testResults.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <TestTube className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No tests run yet</p>
                <p className="text-sm mt-2">Click "Test All" or test individual integrations</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      result.status === 'passed'
                        ? 'border-green-200 bg-green-50'
                        : result.status === 'failed'
                        ? 'border-red-200 bg-red-50'
                        : result.status === 'running'
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <div>
                          <div className="font-semibold text-gray-900">
                            {result.integration}
                          </div>
                          <div className="text-sm text-gray-600">{result.test}</div>
                        </div>
                      </div>
                      {result.duration && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {result.duration}ms
                        </div>
                      )}
                    </div>
                    {result.message && (
                      <div
                        className={`text-sm mt-2 p-2 rounded ${
                          result.status === 'passed'
                            ? 'bg-green-100 text-green-800'
                            : result.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {result.message}
                      </div>
                    )}
                    {result.timestamp && (
                      <div className="text-xs text-gray-500 mt-2">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default IntegrationsTestPage;

