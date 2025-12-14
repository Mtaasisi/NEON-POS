import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload, Download, Users, FileText, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { Customer } from '../../../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import EnhancedExcelImportModal from '../../reports/components/EnhancedExcelImportModal';
import CustomerUpdateImportModal from './CustomerUpdateImportModal';
import { fetchAllCustomers } from '../../../lib/customerApi';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

type TabType = 'import' | 'update' | 'export';

interface CustomerImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (customers: Customer[]) => void;
  onUpdateComplete?: (customers: Customer[]) => void;
}

const CustomerImportExportModal: React.FC<CustomerImportExportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  onUpdateComplete
}) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('import');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportFields, setExportFields] = useState<string[]>([
    'name', 'phone', 'email', 'gender', 'city', 'whatsapp',
    'loyaltyLevel', 'points', 'totalSpent', 'colorTag', 'status'
  ]);

  useBodyScrollLock(isOpen);

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('import');
    }
  }, [isOpen]);

  const handleImportComplete = (importedCustomers: Customer[]) => {
    toast.success(`Successfully imported ${importedCustomers.length} customers`);
    setIsImportModalOpen(false);
    onImportComplete?.(importedCustomers);
    // Optionally refresh the customer list
    if (activeTab === 'export') {
      loadCustomers();
    }
  };

  const handleUpdateComplete = (updatedCustomers: Customer[]) => {
    toast.success(`Successfully updated ${updatedCustomers.length} customers`);
    setIsUpdateModalOpen(false);
    onUpdateComplete?.(updatedCustomers);
    // Optionally refresh the customer list
    if (activeTab === 'export') {
      loadCustomers();
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const data = await fetchAllCustomers();
      setCustomers(data);
      toast.success(`Loaded ${data.length} customers`);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (customers.length === 0) {
      toast.error('No customers to export. Please load customers first.');
      return;
    }

    try {
      // Define field mapping in consistent order
      const fieldMap = [
        { key: 'name', header: 'Name', getValue: (c: Customer) => c.name },
        { key: 'phone', header: 'Phone', getValue: (c: Customer) => c.phone },
        { key: 'email', header: 'Email', getValue: (c: Customer) => c.email || '' },
        { key: 'gender', header: 'Gender', getValue: (c: Customer) => c.gender || '' },
        { key: 'city', header: 'City', getValue: (c: Customer) => c.city || '' },
        { key: 'whatsapp', header: 'WhatsApp', getValue: (c: Customer) => c.whatsapp || '' },
        { key: 'loyaltyLevel', header: 'Loyalty Level', getValue: (c: Customer) => c.loyaltyLevel || '' },
        { key: 'points', header: 'Points', getValue: (c: Customer) => c.points?.toString() || '0' },
        { key: 'totalSpent', header: 'Total Spent', getValue: (c: Customer) => {
          const totalSpent = c.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
          return totalSpent.toString();
        }},
        { key: 'orders', header: 'Orders', getValue: (c: Customer) => c.orders?.toString() || '0' },
        { key: 'colorTag', header: 'Color Tag', getValue: (c: Customer) => c.colorTag || '' },
        { key: 'status', header: 'Status', getValue: (c: Customer) => c.isActive ? 'Active' : 'Inactive' },
        { key: 'branch', header: 'Branch', getValue: (c: Customer) => c.branchName || '' },
        { key: 'referralSource', header: 'Referral Source', getValue: (c: Customer) => c.referralSource || '' },
        { key: 'birthMonth', header: 'Birth Month', getValue: (c: Customer) => c.birthMonth || '' },
        { key: 'birthDay', header: 'Birth Day', getValue: (c: Customer) => c.birthDay?.toString() || '' },
        { key: 'joinDate', header: 'Join Date', getValue: (c: Customer) => c.joinDate ? new Date(c.joinDate).toLocaleDateString() : '' },
        { key: 'lastVisit', header: 'Last Visit', getValue: (c: Customer) => c.lastVisit ? new Date(c.lastVisit).toLocaleDateString() : '' }
      ];

      // Filter to only selected fields and maintain order
      const selectedFields = fieldMap.filter(f => exportFields.includes(f.key));
      const headers = selectedFields.map(f => f.header);
      
      const rows = customers.map(customer => 
        selectedFields.map(field => escapeCSVField(field.getValue(customer)))
      );

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${customers.length} customers to CSV`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export customers');
    }
  };

  const escapeCSVField = (field: string): string => {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const availableFields = [
    { value: 'name', label: 'Name' },
    { value: 'phone', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'gender', label: 'Gender' },
    { value: 'city', label: 'City' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'loyaltyLevel', label: 'Loyalty Level' },
    { value: 'points', label: 'Points' },
    { value: 'totalSpent', label: 'Total Spent' },
    { value: 'orders', label: 'Orders' },
    { value: 'colorTag', label: 'Color Tag' },
    { value: 'status', label: 'Status' },
    { value: 'branch', label: 'Branch' },
    { value: 'referralSource', label: 'Referral Source' },
    { value: 'birthMonth', label: 'Birth Month' },
    { value: 'birthDay', label: 'Birth Day' },
    { value: 'joinDate', label: 'Join Date' },
    { value: 'lastVisit', label: 'Last Visit' }
  ];

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Customer Import & Export</h2>
                <p className="text-sm text-gray-600">Import new customers, update existing ones, or export customer data</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-2 bg-white rounded-xl p-1 border-2 border-gray-200">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'import'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload size={18} />
                <span>Import New</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('update')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'update'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <RefreshCw size={18} />
                <span>Update Existing</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === 'export'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Download size={18} />
                <span>Export Data</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Import Tab */}
          {activeTab === 'import' && (
            <GlassCard className="p-6">
              <div className="text-center mb-6">
                <Upload className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Import New Customers</h2>
                <p className="text-gray-600 mb-6">
                  Import customers from Excel/CSV files. Existing customers will be automatically skipped based on phone number or email.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900">Auto-skip existing customers</h3>
                    <p className="text-sm text-blue-700">Based on phone number or email</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-green-900">Bulk processing</h3>
                    <p className="text-sm text-green-700">Import hundreds of customers at once</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Smart validation</h3>
                    <p className="text-sm text-yellow-700">Automatic phone formatting and validation</p>
                  </div>
                </div>
              </div>

              <GlassButton
                onClick={() => setIsImportModalOpen(true)}
                className="w-full"
                variant="primary"
              >
                <Upload className="w-4 h-4 mr-2" />
                Start Import
              </GlassButton>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Required Fields:</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• <strong>name</strong> - Customer's full name</li>
                  <li>• <strong>phone</strong> - Phone number (auto-formats with 255 prefix)</li>
                  <li>• <strong>email</strong> - Email address (optional)</li>
                  <li>• <strong>gender</strong> - male, female, or other</li>
                  <li>• <strong>city</strong> - City/location</li>
                </ul>
              </div>
            </GlassCard>
          )}

          {/* Update Tab */}
          {activeTab === 'update' && (
            <GlassCard className="p-6">
              <div className="text-center mb-6">
                <RefreshCw className="w-16 h-16 mx-auto text-purple-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Update Existing Customers</h2>
                <p className="text-gray-600 mb-6">
                  Update customer information by importing a CSV/Excel file. Customers are matched by phone number.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-purple-900">Smart matching</h3>
                    <p className="text-sm text-purple-700">Automatically matches customers by phone number</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-blue-900">Selective updates</h3>
                    <p className="text-sm text-blue-700">Only updates fields that have values in your file</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <Users className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <div>
                    <h3 className="font-medium text-green-900">Preview before update</h3>
                    <p className="text-sm text-green-700">Review changes before applying updates</p>
                  </div>
                </div>
              </div>

              <GlassButton
                onClick={() => setIsUpdateModalOpen(true)}
                className="w-full"
                variant="primary"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Start Update Import
              </GlassButton>
            </GlassCard>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <GlassCard className="p-6">
              <div className="text-center mb-6">
                <Download className="w-16 h-16 mx-auto text-teal-500 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Export Customer Data</h2>
                <p className="text-gray-600 mb-6">
                  Export customer data to CSV format with customizable fields.
                </p>
              </div>

              <div className="space-y-6">
                {/* Load Customers */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">Customer Data</h3>
                    <p className="text-sm text-gray-600">
                      {customers.length > 0 
                        ? `${customers.length} customers loaded`
                        : 'No customers loaded. Click "Load Customers" to fetch data.'
                      }
                    </p>
                  </div>
                  <GlassButton
                    onClick={loadCustomers}
                    disabled={loading}
                    variant="secondary"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Load Customers
                      </>
                    )}
                  </GlassButton>
                </div>

                {/* Export Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Export Format
                  </label>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'csv' | 'xlsx')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="csv">CSV (.csv)</option>
                    <option value="xlsx">Excel (.xlsx) - Coming Soon</option>
                  </select>
                </div>

                {/* Export Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Fields to Export
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 bg-gray-50 rounded-lg max-h-64 overflow-y-auto">
                    {availableFields.map((field) => (
                      <label
                        key={field.value}
                        className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={exportFields.includes(field.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setExportFields([...exportFields, field.value]);
                            } else {
                              setExportFields(exportFields.filter(f => f !== field.value));
                            }
                          }}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">{field.label}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      onClick={() => setExportFields(availableFields.map(f => f.value))}
                      className="text-sm text-teal-600 hover:text-teal-700"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setExportFields([])}
                      className="text-sm text-gray-600 hover:text-gray-700"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Export Button */}
                <GlassButton
                  onClick={handleExport}
                  disabled={customers.length === 0 || exportFields.length === 0}
                  className="w-full"
                  variant="primary"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export {customers.length} Customers
                </GlassButton>
              </div>
            </GlassCard>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <EnhancedExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
      />

      {/* Update Modal */}
      <CustomerUpdateImportModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onImportComplete={handleUpdateComplete}
      />
    </div>,
    document.body
  );
};

export default CustomerImportExportModal;
