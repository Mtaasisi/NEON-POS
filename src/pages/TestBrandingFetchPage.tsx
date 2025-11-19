/**
 * Test Page: Fetch Unified Branding Settings
 * 
 * This page demonstrates fetching and displaying branding settings
 * Visit: http://localhost:3000/test-branding-fetch
 */

import React, { useState } from 'react';
import { useBrandingSettings } from '../hooks/useUnifiedBranding';
import { BrandingService } from '../services/brandingService';
import GlassCard from '../features/shared/components/ui/GlassCard';
import GlassButton from '../features/shared/components/ui/GlassButton';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const TestBrandingFetchPage: React.FC = () => {
  const { settings, loading } = useBrandingSettings();
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    const results: any = {};

    try {
      // Test 1: Fetch all settings
      console.time('Fetch all settings');
      const allSettings = await BrandingService.getBranding();
      console.timeEnd('Fetch all settings');
      results.allSettings = allSettings;

      // Test 2: Fetch logo
      console.time('Fetch logo');
      const logo = await BrandingService.getLogo();
      console.timeEnd('Fetch logo');
      results.logo = logo;

      // Test 3: Fetch company name
      console.time('Fetch company name');
      const companyName = await BrandingService.getCompanyName();
      console.timeEnd('Fetch company name');
      results.companyName = companyName;

      // Test 4: Fetch colors
      console.time('Fetch colors');
      const colors = await BrandingService.getColors();
      console.timeEnd('Fetch colors');
      results.colors = colors;

      // Test 5: Fetch contact info
      console.time('Fetch contact info');
      const contact = await BrandingService.getContactInfo();
      console.timeEnd('Fetch contact info');
      results.contact = contact;

      // Test 6: Test cache (should be instant)
      console.time('Cached fetch');
      await BrandingService.getBranding();
      console.timeEnd('Cached fetch');

      results.success = true;
    } catch (error) {
      console.error('❌ Test failed:', error);
      results.success = false;
      results.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      setTesting(false);
      setTestResults(results);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">🎨 Test Branding Fetch</h1>
      <p className="text-gray-600 mb-6">Test fetching unified branding settings</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: React Hook Display */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            React Hook (useBrandingSettings)
          </h2>

          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading branding...</span>
            </div>
          ) : settings ? (
            <div className="space-y-4">
              {/* Logo */}
              {settings.business_logo && (
                <div className="border-2 border-gray-200 rounded-lg p-4 bg-white">
                  <img 
                    src={settings.business_logo} 
                    alt={settings.company_name}
                    className="w-24 h-24 object-contain mx-auto"
                  />
                </div>
              )}

              {/* Company Info */}
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-600">Company Name:</label>
                  <p className="text-lg font-semibold">{settings.company_name}</p>
                </div>

                {settings.business_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Address:</label>
                    <p>{settings.business_address}</p>
                  </div>
                )}

                {settings.business_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Phone:</label>
                    <p>{settings.business_phone}</p>
                  </div>
                )}

                {settings.business_email && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Email:</label>
                    <p>{settings.business_email}</p>
                  </div>
                )}
              </div>

              {/* Colors */}
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">Brand Colors:</label>
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: settings.primary_color }}
                    />
                    <span className="text-xs mt-1">Primary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: settings.secondary_color }}
                    />
                    <span className="text-xs mt-1">Secondary</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div 
                      className="w-16 h-16 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: settings.accent_color }}
                    />
                    <span className="text-xs mt-1">Accent</span>
                  </div>
                </div>
              </div>

              {/* Raw Data */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                  View Raw Data
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                  {JSON.stringify(settings, null, 2)}
                </pre>
              </details>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
              <p className="text-gray-600">No branding settings found</p>
              <p className="text-sm text-gray-500 mt-2">
                Run <code className="bg-gray-100 px-2 py-1 rounded">UNIFIED-BRANDING-MIGRATION.sql</code>
              </p>
            </div>
          )}
        </GlassCard>

        {/* Right Column: Service Tests */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            BrandingService Tests
          </h2>

          <div className="mb-4">
            <GlassButton
              onClick={runTests}
              disabled={testing}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Running Tests...' : 'Run All Tests'}
            </GlassButton>
          </div>

          {testResults && (
            <div className="space-y-4">
              {/* Test Status */}
              <div className={`p-4 rounded-lg border-2 ${
                testResults.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    testResults.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {testResults.success ? 'All Tests Passed!' : 'Tests Failed'}
                  </span>
                </div>
                {testResults.error && (
                  <p className="text-sm text-red-600 mt-2">{testResults.error}</p>
                )}
              </div>

              {/* Test Results */}
              {testResults.success && (
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium text-sm mb-1">✅ Logo</h4>
                    <p className="text-sm text-gray-600 truncate">{testResults.logo || 'Not set'}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium text-sm mb-1">✅ Company Name</h4>
                    <p className="text-sm text-gray-600">{testResults.companyName}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium text-sm mb-1">✅ Colors</h4>
                    <div className="flex gap-2 mt-2">
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: testResults.colors?.primary }}
                        title={testResults.colors?.primary}
                      />
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: testResults.colors?.secondary }}
                        title={testResults.colors?.secondary}
                      />
                      <div 
                        className="w-8 h-8 rounded border"
                        style={{ backgroundColor: testResults.colors?.accent }}
                        title={testResults.colors?.accent}
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium text-sm mb-1">✅ Contact Info</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {testResults.contact?.address && <p>📍 {testResults.contact.address}</p>}
                      {testResults.contact?.phone && <p>📞 {testResults.contact.phone}</p>}
                      {testResults.contact?.email && <p>📧 {testResults.contact.email}</p>}
                      {testResults.contact?.website && <p>🌐 {testResults.contact.website}</p>}
                    </div>
                  </div>

                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                      View All Test Results
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(testResults, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">💡 How to Use</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Run <code className="bg-blue-100 px-1 rounded">UNIFIED-BRANDING-MIGRATION.sql</code></li>
              <li>Click "Run All Tests" button above</li>
              <li>Check console for timing details</li>
              <li>Note: Second fetch is cached (very fast!)</li>
            </ol>
          </div>
        </GlassCard>
      </div>

      {/* Console Output Instructions */}
      <GlassCard className="p-6 mt-6">
        <h3 className="font-bold mb-2">📊 Console Output</h3>
        <p className="text-sm text-gray-600 mb-4">
          Open your browser console (F12) and run these commands:
        </p>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm space-y-2">
          <div>
            <span className="text-gray-500">// Fetch all branding</span>
            <br />
            <span>import &#123; BrandingService &#125; from './services/brandingService';</span>
            <br />
            <span>const branding = await BrandingService.getBranding();</span>
            <br />
            <span>console.log(branding);</span>
          </div>
          <div className="border-t border-gray-700 pt-2">
            <span className="text-gray-500">// Get specific fields</span>
            <br />
            <span>const logo = await BrandingService.getLogo();</span>
            <br />
            <span>const name = await BrandingService.getCompanyName();</span>
            <br />
            <span>const colors = await BrandingService.getColors();</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default TestBrandingFetchPage;

