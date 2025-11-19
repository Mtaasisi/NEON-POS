import React, { useState } from 'react';
import { BackButton } from '../../shared/components/ui/BackButton';
import BulkProductImport from '../components/product/BulkProductImport';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { ImportAnalyticsWidget } from '../components/import/ImportAnalyticsWidget';
import { ImportCollaborationWidget } from '../components/import/ImportCollaborationWidget';

// Enhanced UI components
import { Upload, FileSpreadsheet, Users, BarChart3, Settings, RefreshCw, HelpCircle, Zap } from 'lucide-react';
import GlassCard from '../../shared/components/ui/GlassCard';

const BulkImportPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'import' | 'analytics' | 'collaboration'>('import');
  const [showAdvancedView, setShowAdvancedView] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-indigo-100 rounded-full">
              <Upload className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Import Center</h1>
          <p className="text-lg text-gray-600">
            AI-powered bulk data import with validation, analytics, and team collaboration
          </p>
        </div>

        {/* Enhanced Controls */}
        <div className="mb-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setShowAdvancedView(!showAdvancedView)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
              showAdvancedView ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50'
            } transition-colors`}
          >
            <Zap className="w-4 h-4 mr-2" />
            {showAdvancedView ? 'Standard View' : 'Advanced View'}
          </button>

          <button
            onClick={() => {/* Refresh import data */}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </button>

          <button
            onClick={() => {/* Show help */}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            Import Help
          </button>

          <button
            onClick={() => {/* Settings */}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 justify-center">
              {[
                { id: 'import', label: 'Import Data', icon: FileSpreadsheet },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'collaboration', label: 'Team', icon: Users }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'import' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Bulk Data Import</h2>
              <p className="text-gray-600">
                Import large datasets with AI-powered validation, error detection, and progress tracking
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <GlassCard className="p-4 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-600">1,847</div>
                <div className="text-sm text-gray-600">Total Imports</div>
              </GlassCard>

              <GlassCard className="p-4 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-600">91.2%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </GlassCard>

              <GlassCard className="p-4 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-600">87.5</div>
                <div className="text-sm text-gray-600">Data Quality</div>
              </GlassCard>

              <GlassCard className="p-4 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div className="text-2xl font-bold text-orange-600">24</div>
                <div className="text-sm text-gray-600">Active Users</div>
              </GlassCard>
            </div>

            {/* Main Import Component */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <BulkProductImport />
            </div>

            {/* Import Instructions */}
            <GlassCard className="mt-6 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Import Best Practices</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Data Preparation</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Clean and validate data before import</li>
                    <li>• Ensure consistent formatting</li>
                    <li>• Remove duplicate records</li>
                    <li>• Verify required fields are populated</li>
                    <li>• Check data types match expected formats</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Import Process</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Start with small test imports</li>
                    <li>• Monitor progress and error messages</li>
                    <li>• Review validation results carefully</li>
                    <li>• Keep backup of original data</li>
                    <li>• Schedule large imports during off-peak hours</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Analytics</h2>
              <p className="text-gray-600">
                AI-powered insights into import performance, success rates, and data quality metrics
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ImportAnalyticsWidget />
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Import Health Check</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-medium text-green-600">91.2%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Error Rate:</span>
                      <span className="font-medium text-red-600">8.8%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Processing:</span>
                      <span className="font-medium">4.7 min</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Data Quality:</span>
                      <span className="font-medium text-blue-600">87.5/100</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Common Issues</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium text-red-600">Missing Required Fields</div>
                      <div className="text-gray-600">23% of import failures</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-yellow-600">Invalid Data Format</div>
                      <div className="text-gray-600">18% of import failures</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium text-orange-600">Duplicate Records</div>
                      <div className="text-gray-600">12% of import failures</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Performance Tips</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Use CSV for large datasets</li>
                    <li>• Validate data before import</li>
                    <li>• Schedule imports during off-hours</li>
                    <li>• Monitor system resources</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Team Collaboration</h2>
              <p className="text-gray-600">
                Work together on data imports, share insights, and get help from the import specialist team
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ImportCollaborationWidget />
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Import Resources</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📖 Import Guide
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      🎯 Best Practices
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      🔧 Troubleshooting
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">
                      📞 Contact Support
                    </button>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Help Requests</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">CSV Format Issues</div>
                      <div className="text-gray-600">Resolved • 2 hours ago</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Large File Upload</div>
                      <div className="text-gray-600">In Progress • 4 hours ago</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Data Validation Help</div>
                      <div className="text-gray-600">Resolved • 1 day ago</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Import Templates</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      📄 Product Template
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      👥 Customer Template
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded">
                      📦 Inventory Template
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImportPage;