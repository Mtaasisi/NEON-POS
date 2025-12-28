import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import GlassInput from '../../../features/shared/components/ui/GlassInput';
import GlassSelect from '../../../features/shared/components/ui/GlassSelect';
import { 
  CreditCard, Save, Shield, TestTube, Plus, Trash2, Edit,
  DollarSign, FileText, Package, Building, Wallet, Tag,
  CheckCircle, XCircle, AlertCircle, TrendingUp, Mail, MessageSquare,
  Globe, RefreshCw, BarChart3, RotateCcw, Clock, Calendar,
  Users, Send, Phone, Hash
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { useSettingsSave } from '../../../context/SettingsSaveContext';

interface PaymentSettingsProps {
  isActive?: boolean;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
  created_at: string;
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ isActive }) => {
  const { registerSaveHandler, unregisterSaveHandler, setHasChanges } = useSettingsSave();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as 'gateway' | 'categories' | 'preferences' | 'notifications' | 'currency' | 'refunds' | 'reports' | null;
  const [activeTab, setActiveTab] = useState<'gateway' | 'categories' | 'preferences' | 'notifications' | 'currency' | 'refunds' | 'reports'>(tabFromUrl || 'categories');
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  
  // Form state for new/edit category
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'Package',
    color: 'blue'
  });

  // Payment Gateway Settings
  const [gatewaySettings, setGatewaySettings] = useState({
    beemEnabled: true,
    beemApiKey: '',
    beemSecretKey: '',
    beemEnvironment: 'sandbox',
  });

  // Payment Preferences
  const [preferences, setPreferences] = useState({
    cashEnabled: true,
    cardEnabled: true,
    mobileMoneyEnabled: true,
    autoConfirmPayments: false,
    requireReceipt: true,
    allowPartialPayments: true,
    taxRate: 18,
    defaultCurrency: 'TSh'
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    sendReceiptEmail: true,
    sendReceiptSMS: false,
    sendReceiptWhatsApp: true,
    autoSendOnSuccess: true,
    notifyOnFailure: true,
    notifyAdminOnPayment: false,
    receiptTemplate: 'modern',
    includeQRCode: true,
    includeLogo: true
  });

  // Currency Settings
  const [currencySettings, setCurrencySettings] = useState({
    baseCurrency: 'TZS',
    enabledCurrencies: ['TZS', 'USD', 'EUR'],
    exchangeRateSource: 'manual',
    autoUpdateRates: false,
    updateFrequency: 'daily',
    usdToTzs: 2350,
    eurToTzs: 2580,
    showCurrencySymbol: true
  });

  // Refund Settings
  const [refundSettings, setRefundSettings] = useState({
    enableRefunds: true,
    requireApproval: true,
    allowPartialRefund: true,
    refundTimeLimit: 30,
    autoProcessRefunds: false,
    notifyCustomerOnRefund: true,
    trackDisputes: true
  });

  // Report Settings
  const [reportSettings, setReportSettings] = useState({
    defaultPeriod: 'month',
    autoGenerateReports: false,
    reportFrequency: 'weekly',
    reportFormat: 'pdf',
    emailReports: false,
    reportRecipients: '',
    includeCharts: true,
    includeTransactionDetails: true
  });

  useEffect(() => {
    fetchExpenseCategories();
    loadSettings();
  }, []);

  // Update tab from URL parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['gateway', 'categories', 'preferences', 'notifications', 'currency', 'refunds', 'reports'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  // Function to change tab and update URL
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const loadSettings = () => {
    const savedGateway = localStorage.getItem('paymentGatewaySettings');
    const savedPreferences = localStorage.getItem('paymentPreferences');
    const savedNotifications = localStorage.getItem('paymentNotifications');
    const savedCurrency = localStorage.getItem('paymentCurrency');
    const savedRefunds = localStorage.getItem('paymentRefunds');
    const savedReports = localStorage.getItem('paymentReports');
    
    if (savedGateway) setGatewaySettings(JSON.parse(savedGateway));
    if (savedPreferences) setPreferences(JSON.parse(savedPreferences));
    if (savedNotifications) setNotificationSettings(JSON.parse(savedNotifications));
    if (savedCurrency) setCurrencySettings(JSON.parse(savedCurrency));
    if (savedRefunds) setRefundSettings(JSON.parse(savedRefunds));
    if (savedReports) setReportSettings(JSON.parse(savedReports));
  };

  const fetchExpenseCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setExpenseCategories(data || []);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      toast.error('Failed to load expense categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsLoading(true);
    try {
      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('expense_categories')
          .update({
            name: categoryForm.name,
            description: categoryForm.description,
            icon: categoryForm.icon,
            color: categoryForm.color
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated successfully');
      } else {
        // Create new category
        const { error } = await supabase
          .from('expense_categories')
          .insert([{
            name: categoryForm.name,
            description: categoryForm.description,
            icon: categoryForm.icon,
            color: categoryForm.color,
            is_active: true
          }]);

        if (error) throw error;
        toast.success('Category created successfully');
      }

      // Reset form and refresh
      setCategoryForm({ name: '', description: '', icon: 'Package', color: 'blue' });
      setEditingCategory(null);
      setIsAddingCategory(false);
      fetchExpenseCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Failed to save category');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCategoryStatus = async (category: ExpenseCategory) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ is_active: !category.is_active })
        .eq('id', category.id);

      if (error) throw error;
      toast.success(`Category ${!category.is_active ? 'activated' : 'deactivated'}`);
      fetchExpenseCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      toast.error('Failed to update category status');
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;
      toast.success('Category deleted successfully');
      fetchExpenseCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'Package',
      color: category.color || 'blue'
    });
    setIsAddingCategory(true);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setIsAddingCategory(false);
    setCategoryForm({ name: '', description: '', icon: 'Package', color: 'blue' });
  };

  useEffect(() => {
    const handleSave = async () => {
    localStorage.setItem('paymentGatewaySettings', JSON.stringify(gatewaySettings));
    localStorage.setItem('paymentPreferences', JSON.stringify(preferences));
    localStorage.setItem('paymentNotifications', JSON.stringify(notificationSettings));
    localStorage.setItem('paymentCurrency', JSON.stringify(currencySettings));
    localStorage.setItem('paymentRefunds', JSON.stringify(refundSettings));
    localStorage.setItem('paymentReports', JSON.stringify(reportSettings));
      toast.success('All payment settings saved');
    };
    
    registerSaveHandler('payment-settings', handleSave);
    return () => unregisterSaveHandler('payment-settings');
  }, [gatewaySettings, preferences, notificationSettings, currencySettings, refundSettings, reportSettings, registerSaveHandler, unregisterSaveHandler]);

  useEffect(() => {
    setHasChanges(true);
  }, [gatewaySettings, preferences, notificationSettings, currencySettings, refundSettings, reportSettings, setHasChanges]);

  const testConnection = () => {
    toast.success('Testing payment connection...');
    // Add actual payment gateway test logic here
  };

  const tabs = [
    { id: 'categories', label: 'Expense Categories', icon: Tag },
    { id: 'gateway', label: 'Payment Gateway', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: CreditCard },
    { id: 'notifications', label: 'Notifications & Receipts', icon: Mail },
    { id: 'currency', label: 'Currency Management', icon: Globe },
    { id: 'refunds', label: 'Refunds & Disputes', icon: RotateCcw },
    { id: 'reports', label: 'Payment Reports', icon: BarChart3 },
  ];

  const iconOptions = [
    { value: 'Package', label: 'Package' },
    { value: 'Building', label: 'Building' },
    { value: 'Wallet', label: 'Wallet' },
    { value: 'DollarSign', label: 'Dollar Sign' },
    { value: 'FileText', label: 'File Text' },
    { value: 'Tag', label: 'Tag' },
    { value: 'CreditCard', label: 'Credit Card' },
    { value: 'TrendingUp', label: 'Trending Up' }
  ];

  const colorOptions = [
    { value: 'blue', label: 'Blue' },
    { value: 'green', label: 'Green' },
    { value: 'red', label: 'Red' },
    { value: 'yellow', label: 'Yellow' },
    { value: 'purple', label: 'Purple' },
    { value: 'pink', label: 'Pink' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'gray', label: 'Gray' }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full flex flex-col overflow-hidden relative">
      {/* Icon Header - Fixed - Matching Store Management style */}
      <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
          {/* Icon */}
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          
          {/* Text */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Settings</h2>
            <p className="text-sm text-gray-600">Manage payment gateways, expense categories, and payment preferences</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b-2 border-gray-200">
          <nav className="flex space-x-2 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id as any)}
                  className={`
                    flex items-center gap-2 py-3 px-4 border-b-2 font-semibold text-sm transition-all whitespace-nowrap rounded-t-xl
                    ${activeTab === tab.id
                      ? 'border-green-500 text-green-700 bg-green-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Scrollable Content Section */}
      <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
        <div className="py-6">

          {/* Tab Content */}
          {/* ==================== EXPENSE CATEGORIES TAB ==================== */}
          {activeTab === 'categories' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-600" />
                Expense Categories
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Manage categories for organizing expenses
              </p>
            </div>
            {!isAddingCategory && (
              <GlassButton
                onClick={() => setIsAddingCategory(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </GlassButton>
            )}
          </div>

          {/* Add/Edit Form */}
          {isAddingCategory && (
            <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
              <h4 className="text-lg font-medium text-gray-800 mb-4">
                {editingCategory ? 'Edit Category' : 'New Category'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <GlassInput
                    label="Category Name *"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="e.g., Office Supplies"
                  />
                </div>
                <div>
                  <GlassInput
                    label="Description"
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <GlassSelect
                    label="Icon"
                    value={categoryForm.icon}
                    onChange={(value) => setCategoryForm({ ...categoryForm, icon: value })}
                    options={iconOptions}
                  />
                </div>
                <div>
                  <GlassSelect
                    label="Color"
                    value={categoryForm.color}
                    onChange={(value) => setCategoryForm({ ...categoryForm, color: value })}
                    options={colorOptions}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <GlassButton
                  onClick={handleSaveCategory}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCategory ? 'Update' : 'Create'} Category
                </GlassButton>
                <GlassButton
                  onClick={handleCancelEdit}
                  variant="secondary"
                >
                  Cancel
                </GlassButton>
              </div>
            </div>
          )}

          {/* Categories List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading categories...</p>
            </div>
          ) : expenseCategories.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600">No expense categories yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className={`
                    p-4 rounded-lg border-2 transition-all
                    ${category.is_active 
                      ? 'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md' 
                      : 'bg-gray-50 border-gray-200 opacity-60'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center
                        bg-${category.color}-100
                      `}>
                        <Package className={`w-5 h-5 text-${category.color}-600`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{category.name}</h4>
                        {category.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleCategoryStatus(category)}
                        className="p-1 hover:bg-gray-100 rounded"
                        title={category.is_active ? 'Deactivate' : 'Activate'}
                      >
                        {category.is_active ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="flex-1 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100 flex items-center justify-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
            </div>
          )}

          {/* ==================== PAYMENT GATEWAY TAB ==================== */}
          {activeTab === 'gateway' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-indigo-600" />
            Payment Gateway Configuration
          </h3>

          <div className="space-y-6">
            {/* Beem Payment Gateway */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Beem Payment Gateway
                </h4>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gatewaySettings.beemEnabled}
                    onChange={(e) => setGatewaySettings({ ...gatewaySettings, beemEnabled: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-800 text-sm font-medium">Enable</span>
                </label>
              </div>

              {gatewaySettings.beemEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <GlassInput
                      label="API Key"
                      type="password"
                      value={gatewaySettings.beemApiKey}
                      onChange={(e) => setGatewaySettings({ ...gatewaySettings, beemApiKey: e.target.value })}
                      placeholder="Enter API Key"
                    />
                  </div>

                  <div>
                    <GlassInput
                      label="Secret Key"
                      type="password"
                      value={gatewaySettings.beemSecretKey}
                      onChange={(e) => setGatewaySettings({ ...gatewaySettings, beemSecretKey: e.target.value })}
                      placeholder="Enter Secret Key"
                    />
                  </div>

                  <div>
                    <GlassSelect
                      label="Environment"
                      value={gatewaySettings.beemEnvironment}
                      onChange={(value) => setGatewaySettings({ ...gatewaySettings, beemEnvironment: value })}
                      options={[
                        { value: 'sandbox', label: 'Sandbox (Testing)' },
                        { value: 'production', label: 'Production (Live)' }
                      ]}
                    />
                  </div>

                  <div className="flex items-end">
                    <GlassButton
                      onClick={testConnection}
                      className="flex items-center gap-2 w-full"
                      variant="secondary"
                    >
                      <TestTube className="w-4 h-4" />
                      Test Connection
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>

          </div>
            </div>
          )}

          {/* ==================== PREFERENCES TAB ==================== */}
          {activeTab === 'preferences' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Payment Preferences
          </h3>

          <div className="space-y-6">
            {/* Payment Methods */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Enabled Payment Methods</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <input
                    type="checkbox"
                    checked={preferences.cashEnabled}
                    onChange={(e) => setPreferences({ ...preferences, cashEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <Wallet className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-800 font-medium">Cash Payments</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <input
                    type="checkbox"
                    checked={preferences.cardEnabled}
                    onChange={(e) => setPreferences({ ...preferences, cardEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <CreditCard className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-800 font-medium">Card Payments</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <input
                    type="checkbox"
                    checked={preferences.mobileMoneyEnabled}
                    onChange={(e) => setPreferences({ ...preferences, mobileMoneyEnabled: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <DollarSign className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-800 font-medium">Mobile Money</span>
                </label>
              </div>
            </div>

            {/* Transaction Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Transaction Settings</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <span className="text-gray-800 font-medium">Auto-confirm successful payments</span>
                  <input
                    type="checkbox"
                    checked={preferences.autoConfirmPayments}
                    onChange={(e) => setPreferences({ ...preferences, autoConfirmPayments: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <span className="text-gray-800 font-medium">Require receipt for all transactions</span>
                  <input
                    type="checkbox"
                    checked={preferences.requireReceipt}
                    onChange={(e) => setPreferences({ ...preferences, requireReceipt: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <span className="text-gray-800 font-medium">Allow partial payments</span>
                  <input
                    type="checkbox"
                    checked={preferences.allowPartialPayments}
                    onChange={(e) => setPreferences({ ...preferences, allowPartialPayments: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* Tax & Currency */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Tax & Currency</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <GlassInput
                    label="Default Tax Rate (%)"
                    type="number"
                    value={preferences.taxRate.toString()}
                    onChange={(e) => setPreferences({ ...preferences, taxRate: parseFloat(e.target.value) || 0 })}
                    placeholder="18"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                <div>
                  <GlassInput
                    label="Default Currency"
                    value={preferences.defaultCurrency}
                    onChange={(e) => setPreferences({ ...preferences, defaultCurrency: e.target.value })}
                    placeholder="TSh"
                  />
                </div>
              </div>
            </div>

          </div>
            </div>
          )}

          {/* ==================== NOTIFICATIONS & RECEIPTS TAB ==================== */}
          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <Mail className="w-5 h-5 text-indigo-600" />
            Payment Notifications & Receipts
          </h3>

          <div className="space-y-6">
            {/* Receipt Delivery Methods */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Receipt Delivery Methods</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="text-gray-800 font-medium block">Email Receipts</span>
                      <span className="text-sm text-gray-500">Send receipt via email after payment</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.sendReceiptEmail}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, sendReceiptEmail: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="text-gray-800 font-medium block">SMS Receipts</span>
                      <span className="text-sm text-gray-500">Send receipt via SMS (charges apply)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.sendReceiptSMS}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, sendReceiptSMS: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-600" />
                    <div>
                      <span className="text-gray-800 font-medium block">WhatsApp Receipts</span>
                      <span className="text-sm text-gray-500">Send receipt via WhatsApp</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.sendReceiptWhatsApp}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, sendReceiptWhatsApp: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* Notification Triggers */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Notification Triggers</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Auto-send on payment success</span>
                    <span className="text-sm text-gray-500">Automatically send receipt when payment is successful</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.autoSendOnSuccess}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, autoSendOnSuccess: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Notify on payment failure</span>
                    <span className="text-sm text-gray-500">Send notification when payment fails</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.notifyOnFailure}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyOnFailure: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Notify admin on payments</span>
                    <span className="text-sm text-gray-500">Send notifications to admin for all payments</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.notifyAdminOnPayment}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, notifyAdminOnPayment: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* Receipt Template */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Receipt Template & Customization</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <GlassSelect
                    label="Receipt Template"
                    value={notificationSettings.receiptTemplate}
                    onChange={(value) => setNotificationSettings({ ...notificationSettings, receiptTemplate: value })}
                    options={[
                      { value: 'modern', label: 'Modern' },
                      { value: 'classic', label: 'Classic' },
                      { value: 'minimal', label: 'Minimal' },
                      { value: 'detailed', label: 'Detailed' }
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-3 mt-4">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <span className="text-gray-800 font-medium">Include QR code in receipt</span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.includeQRCode}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, includeQRCode: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <span className="text-gray-800 font-medium">Include company logo in receipt</span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.includeLogo}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, includeLogo: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

          </div>
            </div>
          )}

          {/* ==================== CURRENCY MANAGEMENT TAB ==================== */}
          {activeTab === 'currency' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-indigo-600" />
            Multi-Currency Management
          </h3>

          <div className="space-y-6">
            {/* Base Currency */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Base Currency Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <GlassSelect
                    label="Base Currency"
                    value={currencySettings.baseCurrency}
                    onChange={(value) => setCurrencySettings({ ...currencySettings, baseCurrency: value })}
                    options={[
                      { value: 'TZS', label: 'Tanzanian Shilling (TZS)' },
                      { value: 'USD', label: 'US Dollar (USD)' },
                      { value: 'EUR', label: 'Euro (EUR)' },
                      { value: 'GBP', label: 'British Pound (GBP)' },
                      { value: 'KES', label: 'Kenyan Shilling (KES)' }
                    ]}
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center space-x-2 cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all w-full">
                    <input
                      type="checkbox"
                      checked={currencySettings.showCurrencySymbol}
                      onChange={(e) => setCurrencySettings({ ...currencySettings, showCurrencySymbol: e.target.checked })}
                      className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-800 font-medium">Show currency symbol</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Exchange Rate Management */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Exchange Rate Management</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <GlassSelect
                    label="Exchange Rate Source"
                    value={currencySettings.exchangeRateSource}
                    onChange={(value) => setCurrencySettings({ ...currencySettings, exchangeRateSource: value })}
                    options={[
                      { value: 'manual', label: 'Manual Entry' },
                      { value: 'api', label: 'Auto-update from API' },
                      { value: 'bank', label: 'Bank of Tanzania Rates' }
                    ]}
                  />
                </div>

                {currencySettings.exchangeRateSource === 'api' && (
                  <div>
                    <GlassSelect
                      label="Update Frequency"
                      value={currencySettings.updateFrequency}
                      onChange={(value) => setCurrencySettings({ ...currencySettings, updateFrequency: value })}
                      options={[
                        { value: 'hourly', label: 'Every Hour' },
                        { value: 'daily', label: 'Daily' },
                        { value: 'weekly', label: 'Weekly' }
                      ]}
                    />
                  </div>
                )}
              </div>

              {currencySettings.exchangeRateSource === 'api' && (
                <label className="flex items-center space-x-2 cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <input
                    type="checkbox"
                    checked={currencySettings.autoUpdateRates}
                    onChange={(e) => setCurrencySettings({ ...currencySettings, autoUpdateRates: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-gray-800 font-medium block">Auto-update exchange rates</span>
                    <span className="text-sm text-gray-500">Automatically fetch latest rates from API</span>
                  </div>
                </label>
              )}
            </div>

            {/* Manual Exchange Rates */}
            {currencySettings.exchangeRateSource === 'manual' && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Exchange Rates (Manual)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <GlassInput
                      label="USD to TZS Rate"
                      type="number"
                      value={currencySettings.usdToTzs.toString()}
                      onChange={(e) => setCurrencySettings({ ...currencySettings, usdToTzs: parseFloat(e.target.value) || 0 })}
                      placeholder="2350"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <GlassInput
                      label="EUR to TZS Rate"
                      type="number"
                      value={currencySettings.eurToTzs.toString()}
                      onChange={(e) => setCurrencySettings({ ...currencySettings, eurToTzs: parseFloat(e.target.value) || 0 })}
                      placeholder="2580"
                      step="0.01"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* Enabled Currencies */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Enabled Currencies</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['TZS', 'USD', 'EUR', 'GBP', 'KES'].map((currency) => (
                  <label key={currency} className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                    <input
                      type="checkbox"
                      checked={currencySettings.enabledCurrencies.includes(currency)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCurrencySettings({
                            ...currencySettings,
                            enabledCurrencies: [...currencySettings.enabledCurrencies, currency]
                          });
                        } else {
                          setCurrencySettings({
                            ...currencySettings,
                            enabledCurrencies: currencySettings.enabledCurrencies.filter(c => c !== currency)
                          });
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-gray-800 font-medium">{currency}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              {currencySettings.exchangeRateSource === 'api' && (
                <GlassButton
                  onClick={() => toast.success('Fetching latest exchange rates...')}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Rates Now
                </GlassButton>
              )}
            </div>
          </div>
            </div>
          )}

          {/* ==================== REFUNDS & DISPUTES TAB ==================== */}
          {activeTab === 'refunds' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <RotateCcw className="w-5 h-5 text-indigo-600" />
            Refunds & Dispute Management
          </h3>

          <div className="space-y-6">
            {/* Refund Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Refund Policies</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Enable refunds</span>
                    <span className="text-sm text-gray-500">Allow customers to request refunds</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={refundSettings.enableRefunds}
                    onChange={(e) => setRefundSettings({ ...refundSettings, enableRefunds: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                {refundSettings.enableRefunds && (
                  <>
                    <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <div>
                        <span className="text-gray-800 font-medium block">Require approval</span>
                        <span className="text-sm text-gray-500">Refunds must be approved by admin</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={refundSettings.requireApproval}
                        onChange={(e) => setRefundSettings({ ...refundSettings, requireApproval: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <div>
                        <span className="text-gray-800 font-medium block">Allow partial refunds</span>
                        <span className="text-sm text-gray-500">Enable partial refund amounts</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={refundSettings.allowPartialRefund}
                        onChange={(e) => setRefundSettings({ ...refundSettings, allowPartialRefund: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <div>
                        <span className="text-gray-800 font-medium block">Auto-process refunds</span>
                        <span className="text-sm text-gray-500">Automatically process approved refunds</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={refundSettings.autoProcessRefunds}
                        onChange={(e) => setRefundSettings({ ...refundSettings, autoProcessRefunds: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            {/* Refund Time Limit */}
            {refundSettings.enableRefunds && (
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-800">Refund Time Limit</h4>
                <div>
                  <GlassInput
                    label="Refund window (days)"
                    type="number"
                    value={refundSettings.refundTimeLimit.toString()}
                    onChange={(e) => setRefundSettings({ ...refundSettings, refundTimeLimit: parseInt(e.target.value) || 0 })}
                    placeholder="30"
                    min="1"
                    max="365"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Customers can request refunds within {refundSettings.refundTimeLimit} days of payment
                  </p>
                </div>
              </div>
            )}

            {/* Notifications */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Refund Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Notify customer on refund</span>
                    <span className="text-sm text-gray-500">Send notification when refund is processed</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={refundSettings.notifyCustomerOnRefund}
                    onChange={(e) => setRefundSettings({ ...refundSettings, notifyCustomerOnRefund: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* Dispute Management */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Dispute & Chargeback Management</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Track payment disputes</span>
                    <span className="text-sm text-gray-500">Enable dispute tracking and management</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={refundSettings.trackDisputes}
                    onChange={(e) => setRefundSettings({ ...refundSettings, trackDisputes: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>

              {refundSettings.trackDisputes && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Dispute Management Active</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        All disputed transactions will be tracked. You'll receive notifications for new disputes.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
            </div>
          )}

          {/* ==================== PAYMENT REPORTS TAB ==================== */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Payment Reports & Analytics
          </h3>

          <div className="space-y-6">
            {/* Default Report Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Default Report Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <GlassSelect
                    label="Default Report Period"
                    value={reportSettings.defaultPeriod}
                    onChange={(value) => setReportSettings({ ...reportSettings, defaultPeriod: value })}
                    options={[
                      { value: 'today', label: 'Today' },
                      { value: 'week', label: 'This Week' },
                      { value: 'month', label: 'This Month' },
                      { value: 'quarter', label: 'This Quarter' },
                      { value: 'year', label: 'This Year' },
                      { value: 'custom', label: 'Custom Range' }
                    ]}
                  />
                </div>

                <div>
                  <GlassSelect
                    label="Report Format"
                    value={reportSettings.reportFormat}
                    onChange={(value) => setReportSettings({ ...reportSettings, reportFormat: value })}
                    options={[
                      { value: 'pdf', label: 'PDF' },
                      { value: 'excel', label: 'Excel (XLSX)' },
                      { value: 'csv', label: 'CSV' },
                      { value: 'json', label: 'JSON' }
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* Auto-Generated Reports */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Automated Reports</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Enable auto-generated reports</span>
                    <span className="text-sm text-gray-500">Automatically generate periodic payment reports</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reportSettings.autoGenerateReports}
                    onChange={(e) => setReportSettings({ ...reportSettings, autoGenerateReports: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                {reportSettings.autoGenerateReports && (
                  <>
                    <div>
                      <GlassSelect
                        label="Report Frequency"
                        value={reportSettings.reportFrequency}
                        onChange={(value) => setReportSettings({ ...reportSettings, reportFrequency: value })}
                        options={[
                          { value: 'daily', label: 'Daily' },
                          { value: 'weekly', label: 'Weekly' },
                          { value: 'monthly', label: 'Monthly' },
                          { value: 'quarterly', label: 'Quarterly' }
                        ]}
                      />
                    </div>

                    <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <div>
                        <span className="text-gray-800 font-medium block">Email reports automatically</span>
                        <span className="text-sm text-gray-500">Send generated reports via email</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={reportSettings.emailReports}
                        onChange={(e) => setReportSettings({ ...reportSettings, emailReports: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                      />
                    </label>

                    {reportSettings.emailReports && (
                      <div>
                        <GlassInput
                          label="Report Recipients (comma separated)"
                          value={reportSettings.reportRecipients}
                          onChange={(e) => setReportSettings({ ...reportSettings, reportRecipients: e.target.value })}
                          placeholder="admin@example.com, finance@example.com"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Report Content */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Report Content</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Include charts and graphs</span>
                    <span className="text-sm text-gray-500">Add visual analytics to reports</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reportSettings.includeCharts}
                    onChange={(e) => setReportSettings({ ...reportSettings, includeCharts: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-4 rounded-lg border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                  <div>
                    <span className="text-gray-800 font-medium block">Include transaction details</span>
                    <span className="text-sm text-gray-500">Add individual transaction breakdown</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reportSettings.includeTransactionDetails}
                    onChange={(e) => setReportSettings({ ...reportSettings, includeTransactionDetails: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                </label>
              </div>
            </div>

            {/* KPIs to Track */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-800">Key Metrics to Track</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'Total Revenue',
                  'Transaction Count',
                  'Average Transaction Value',
                  'Success Rate',
                  'Payment Method Breakdown',
                  'Refund Rate',
                  'Peak Transaction Times',
                  'Customer Payment Trends'
                ].map((metric) => (
                  <label key={metric} className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-800">{metric}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <p className="text-sm text-indigo-800">
                Reports will be generated based on your configured settings and can be accessed from the Payment Management page.
              </p>
            </div>

          </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;
