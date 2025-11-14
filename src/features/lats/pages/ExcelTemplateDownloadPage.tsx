import React, { useState } from 'react';
import { Download, FileText, Info, CheckCircle, AlertCircle, BarChart3, Users, Settings, RefreshCw, Share2, Star, Clock, Zap } from 'lucide-react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import { toast } from 'react-hot-toast';

// Enhanced components
import { TemplateAnalyticsWidget } from '../components/template/TemplateAnalyticsWidget';
import { TemplateCollaborationWidget } from '../components/template/TemplateCollaborationWidget';

const ExcelTemplateDownloadPage: React.FC = () => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'analytics' | 'collaboration'>('templates');
  const [showAdvancedView, setShowAdvancedView] = useState(false);

  const downloadTemplate = (type: string, content: string, filename: string) => {
    setDownloading(type);
    
    try {
      // Add BOM for Excel compatibility
      const BOM = '\uFEFF';
      const csvContent = BOM + content;
      
      // Create the blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success(`✅ ${type} template downloaded successfully!`);
    } catch (error) {
      toast.error('❌ Download failed. Please try again.');
      console.error('Download error:', error);
    } finally {
      setDownloading(null);
    }
  };

  const productTemplate = `Product Import Template - LATS System
Instructions:
1. Fill in the required fields (marked with *)
2. Use commas to separate multiple tags
3. Prices should be numbers only (no currency symbols)
4. Stock quantities should be whole numbers
5. Category and Supplier IDs can be left empty if not available

Required Fields (*),name*,sku*,description,price,cost_price,stock_quantity,min_stock,max_stock,category_id,supplier_id,tags,variant_name

Field Descriptions:
name* - Product name (required)
sku* - Stock Keeping Unit (required, unique identifier)

description - Product description (optional)
price - Selling price in cents (e.g., 159999 = 1,599.99)
cost_price - Cost price in cents (e.g., 120000 = 1,200.00)
stock_quantity - Current stock level
min_stock - Minimum stock level for alerts
max_stock - Maximum stock level
category_id - Category UUID (optional)

supplier_id - Supplier UUID (optional)
tags - Comma-separated tags (optional)
variant_name - Product variant name (optional)`;

  const customerTemplate = `Customer Import Template - LATS System
Instructions:
1. Fill in the required fields (marked with *)
2. Phone numbers should include country code (+255 for Tanzania)
3. Gender options: male, female, other
4. Loyalty levels: bronze, silver, gold, platinum
5. Color tags: new, vip, complainer, purchased

Required Fields (*),Name*,Phone Number*,Gender,City,WhatsApp Number,Notes,Loyalty Level,Color Tag,Birth Month,Birth Day,Referral Source,Location Description,National ID,Referred By,Total Spent,Points,Is Active,Email

Field Descriptions:
Name* - Customer full name (required)
Phone Number* - Phone number with country code (required)
Gender - male, female, or other
City - Customer's city
WhatsApp Number - WhatsApp number (optional)
Notes - Customer notes
Loyalty Level - bronze, silver, gold, or platinum
Color Tag - new, vip, complainer, or purchased
Birth Month - Birth month (1-12)
Birth Day - Birth day (1-31)
Referral Source - How customer found you
Location Description - Detailed address
National ID - National identification number
Referred By - Name of referring customer
Total Spent - Total amount spent
Points - Loyalty points
Is Active - true or false
Email - Customer email address`;

  const templates = [
    {
      type: 'Products',
      description: 'Import products with variants, pricing, and inventory data',
      icon: <FileText className="w-6 h-6" />,
      content: productTemplate,
      filename: 'lats_product_import_template.csv',
      requiredFields: ['name', 'sku'],
      tips: [
        'Prices are in cents (159999 = 1,599.99)',
        'SKU must be unique for each product',
        'Use commas to separate multiple tags',
        'Leave category/brand/supplier IDs empty if not available'
      ]
    },
    {
      type: 'Customers',
      description: 'Import customer data with contact information and loyalty details',
      icon: <FileText className="w-6 h-6" />,
      content: customerTemplate,
      filename: 'lats_customer_import_template.csv',
      requiredFields: ['Name', 'Phone Number'],
      tips: [
        'Phone numbers must include country code (+255)',
        'Gender options: male, female, other',
        'Loyalty levels: bronze, silver, gold, platinum',
        'Color tags: new, vip, complainer, purchased'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Download className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Template Center</h1>
          <p className="text-lg text-gray-600">
            AI-powered template management with analytics, collaboration, and smart downloads
          </p>
        </div>

        {/* Enhanced Controls */}
        <div className="mb-6 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => setShowAdvancedView(!showAdvancedView)}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
              showAdvancedView ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'
            } transition-colors`}
          >
            <Zap className="w-4 h-4 mr-2" />
            {showAdvancedView ? 'Standard View' : 'Advanced View'}
          </button>

          <button
            onClick={() => {/* Refresh templates */}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Templates
          </button>

          <button
            onClick={() => {/* Share templates */}}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Templates
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 justify-center">
              {[
                { id: 'templates', label: 'Templates', icon: FileText },
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
                        ? 'border-blue-500 text-blue-600'
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
        {activeTab === 'templates' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Template Downloads</h2>
              <p className="text-gray-600">
                Download pre-formatted Excel templates for bulk data import with AI-powered validation
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              {templates.map((template) => (
                <GlassCard key={template.type} className="p-6">
                  <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {template.icon}
                <div>
                  <h3 className="text-xl font-semibold text-white">{template.type}</h3>
                  <p className="text-gray-300 text-sm">{template.description}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Required Fields:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.requiredFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Tips:</span>
              </div>
              <ul className="text-sm text-gray-300 space-y-1">
                {template.tips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <GlassButton
              onClick={() => downloadTemplate(template.type, template.content, template.filename)}
              disabled={downloading === template.type}
              className="w-full"
            >
              {downloading === template.type ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Downloading...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Download {template.type} Template
                </div>
              )}
            </GlassButton>
          </GlassCard>
        ))}
      </div>

      <GlassCard className="mt-8 p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Import Instructions</h3>
        <div className="space-y-4 text-gray-300">
          <div>
            <h4 className="font-medium text-white mb-2">1. Download Template</h4>
            <p>Click the download button above to get the Excel template for your data type.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">2. Fill in Data</h4>
            <p>Open the downloaded CSV file in Excel or Google Sheets. Fill in your data following the sample format.</p>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">3. Save as CSV</h4>
            <p>Save your file as CSV format (File → Save As → CSV).</p>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">4. Import Data</h4>
            <p>Go to the respective page (Inventory for products, Customers for customers) and use the import feature to upload your CSV file.</p>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
            <h4 className="font-medium text-yellow-400 mb-2">Important Notes:</h4>
            <ul className="text-sm space-y-1">
              <li>• Always backup your data before importing</li>
              <li>• Test with a small sample first</li>
              <li>• Ensure all required fields are filled</li>
              <li>• Check data format (dates, numbers, etc.)</li>
              <li>• Remove any empty rows before importing</li>
            </ul>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="mt-8 p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Import Instructions</h3>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h4 className="font-medium text-white mb-2">1. Download Template</h4>
                  <p>Click the download button above to get the Excel template for your data type.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">2. Fill Data</h4>
                  <p>Fill in your data following the format and requirements specified in the template.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">3. Upload</h4>
                  <p>Use the bulk import feature in your respective module to upload the completed template.</p>
                </div>
                <div>
                  <h4 className="font-medium text-white mb-2">4. Validate</h4>
                  <p>The system will validate your data and show any errors that need to be fixed.</p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Template Analytics</h2>
              <p className="text-gray-600">
                AI-powered insights into template usage, success rates, and optimization recommendations
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TemplateAnalyticsWidget />
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Templates:</span>
                      <span className="font-medium">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Users:</span>
                      <span className="font-medium">24</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Avg Success Rate:</span>
                      <span className="font-medium text-green-600">94.2%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Top Templates</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Product Import</span>
                      <span className="font-medium">1,247 downloads</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Customer Import</span>
                      <span className="font-medium">892 downloads</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Sales Data</span>
                      <span className="font-medium">634 downloads</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'collaboration' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Collaboration</h2>
              <p className="text-gray-600">
                Work together on template management, share insights, and collaborate on data import projects
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <TemplateCollaborationWidget />
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Shares</h4>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <div className="font-medium">Product Template</div>
                      <div className="text-gray-600">Shared with Warehouse Team</div>
                      <div className="text-xs text-gray-500">2 hours ago</div>
                    </div>
                    <div className="text-sm">
                      <div className="font-medium">Customer Template</div>
                      <div className="text-gray-600">Shared with Sales Team</div>
                      <div className="text-xs text-gray-500">1 day ago</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Team Activity</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Sarah downloaded Product Template</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Mike shared Customer Template</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Lisa created Sales Data Template</span>
                    </div>
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

export default ExcelTemplateDownloadPage;
