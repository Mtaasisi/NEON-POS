import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Database,
  Search,
  Filter,
  X,
  Check,
  Info,
  Shield,
  Lock,
  ChevronDown,
  ChevronRight,
  Minus,
  ShoppingCart,
  Users,
  Package,
  FileText,
  Settings,
  Wrench,
  TrendingUp,
  Mail,
  DollarSign,
  Truck,
  GitBranch,
  Box,
  BarChart3,
  Tag,
  Gift,
  Archive,
  Store,
  Layers,
  HelpCircle
} from 'lucide-react';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';

interface TableInfo {
  table_name: string;
  row_count: number;
  size_bytes?: number;
  checked: boolean;
  category: string;
}

interface TableCategory {
  name: string;
  tables: string[];
  description: string;
}

const TABLE_CATEGORIES: TableCategory[] = [
  {
    name: 'Sales & Transactions',
    description: 'Sales records, POS transactions, and related data',
    tables: [
      'lats_sales',
      'lats_sale_items',
      'lats_receipts',
      'account_transactions',
      'payment_transactions',
      'mobile_money_transactions',
      'customer_payments',
      'installment_payments',
      'gift_card_transactions',
      'points_transactions'
    ]
  },
  {
    name: 'Customers',
    description: 'Customer profiles, communications, and activity',
    tables: [
      'lats_customers',
      'customer_notes',
      'customer_messages',
      'customer_communications',
      'customer_checkins',
      'customer_preferences',
      'customer_revenue',
      'customer_special_orders',
      'customer_installment_plans',
      'customer_installment_plan_payments',
      'customer_points_history',
      'whatsapp_customers',
      'contact_history',
      'contact_methods',
      'contact_preferences',
      'buyer_details'
    ]
  },
  {
    name: 'Inventory & Products',
    description: 'Products, stock movements, and inventory tracking',
    tables: [
      'lats_products',
      'lats_product_variants',
      'lats_inventory_items',
      'inventory_items',
      'lats_stock_movements',
      'lats_inventory_adjustments',
      'product_images',
      'product_interests',
      'imei_validation',
      'serial_number_movements',
      'lats_product_validation'
    ]
  },
  {
    name: 'Purchase Orders & Suppliers',
    description: 'Purchase orders, supplier data, and receiving records',
    tables: [
      'lats_purchase_orders',
      'lats_purchase_order_items',
      'lats_purchase_order_payments',
      'lats_purchase_order_audit_log',
      'purchase_order_audit',
      'purchase_order_messages',
      'purchase_order_payments',
      'purchase_order_quality_checks',
      'purchase_order_quality_check_items',
      'lats_suppliers',
      'suppliers'
    ]
  },
  {
    name: 'Devices & Repairs',
    description: 'Device repair tracking, diagnostics, and service records',
    tables: [
      'devices',
      'device_attachments',
      'device_checklists',
      'device_ratings',
      'device_remarks',
      'device_transitions',
      'diagnostic_requests',
      'diagnostic_devices',
      'diagnostic_checks',
      'diagnostic_checklist_results',
      'diagnostic_problem_templates',
      'diagnostic_templates',
      'repair_parts',
      'quality_checks',
      'quality_check_items',
      'quality_check_results',
      'quality_check_criteria',
      'quality_check_templates'
    ]
  },
  {
    name: 'Trade-Ins',
    description: 'Trade-in transactions and assessments',
    tables: [
      'lats_trade_in_transactions',
      'lats_trade_in_contracts',
      'lats_trade_in_damage_assessments',
      'lats_trade_in_prices',
      'lats_trade_in_settings'
    ]
  },
  {
    name: 'Employees & Attendance',
    description: 'Employee records, shifts, and attendance tracking',
    tables: [
      'employees',
      'lats_employees',
      'employees_backup_migration',
      'employee_shifts',
      'attendance_records',
      'shift_templates',
      'leave_requests',
      'user_daily_goals',
      'user_branch_assignments'
    ]
  },
  {
    name: 'Communications',
    description: 'SMS, email, WhatsApp, and notification logs',
    tables: [
      'sms_logs',
      'sms_triggers',
      'sms_trigger_logs',
      'email_logs',
      'chat_messages',
      'communication_log',
      'communication_templates',
      'notifications',
      'notification_templates',
      'whatsapp_message_templates',
      'whatsapp_templates',
      'whatsapp_instances_comprehensive'
    ]
  },
  {
    name: 'Finance & Expenses',
    description: 'Expense tracking, accounts, and financial records',
    tables: [
      'expenses',
      'finance_expenses',
      'expense_categories',
      'finance_expense_categories',
      'finance_accounts',
      'finance_transfers',
      'recurring_expenses',
      'recurring_expense_history'
    ]
  },
  {
    name: 'Shipping & Logistics',
    description: 'Shipping records and cargo tracking',
    tables: [
      'lats_shipping',
      'lats_shipping_cargo_items'
    ]
  },
  {
    name: 'Branches & Transfers',
    description: 'Branch transfers and stock movement between locations',
    tables: [
      'branch_transfers',
      'branch_activity_log',
      'scheduled_transfers',
      'scheduled_transfer_executions'
    ]
  },
  {
    name: 'Spare Parts',
    description: 'Spare parts inventory and usage tracking',
    tables: [
      'lats_spare_parts',
      'lats_spare_part_variants',
      'lats_spare_part_usage'
    ]
  },
  {
    name: 'System & Audit Logs',
    description: 'System logs, audit trails, and API logs',
    tables: [
      'audit_logs',
      'api_request_logs',
      'webhook_logs',
      'admin_settings_log',
      'auto_reorder_log'
    ]
  },
  {
    name: 'Sales & Marketing',
    description: 'Sales pipeline, appointments, and customer engagement',
    tables: [
      'sales_pipeline',
      'appointments',
      'reminders',
      'special_order_payments'
    ]
  },
  {
    name: 'Returns & Gift Cards',
    description: 'Product returns and gift card management',
    tables: [
      'returns',
      'gift_cards'
    ]
  },
  {
    name: 'Backup Tables',
    description: 'System backup and migration tables',
    tables: [
      'customer_fix_backup'
    ]
  }
];

export const DatabaseDataCleanupPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [confirmText, setConfirmText] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showTableSelector, setShowTableSelector] = useState(false);

  // Get category icon and color
  const getCategoryIcon = (categoryName: string): { icon: any; color: string } => {
    const icons: { [key: string]: { icon: any; color: string } } = {
      'Sales & Transactions': { icon: ShoppingCart, color: 'text-orange-600' },
      'Customers': { icon: Users, color: 'text-purple-600' },
      'Inventory & Products': { icon: Package, color: 'text-green-600' },
      'Purchase Orders & Suppliers': { icon: FileText, color: 'text-blue-600' },
      'Devices & Repairs': { icon: Wrench, color: 'text-red-600' },
      'Trade-Ins': { icon: TrendingUp, color: 'text-teal-600' },
      'Employees & Attendance': { icon: Users, color: 'text-indigo-600' },
      'Communications': { icon: Mail, color: 'text-pink-600' },
      'Finance & Expenses': { icon: DollarSign, color: 'text-emerald-600' },
      'Shipping & Logistics': { icon: Truck, color: 'text-cyan-600' },
      'Branches & Transfers': { icon: GitBranch, color: 'text-violet-600' },
      'Spare Parts': { icon: Box, color: 'text-amber-600' },
      'System & Audit Logs': { icon: Settings, color: 'text-gray-600' },
      'Sales & Marketing': { icon: BarChart3, color: 'text-rose-600' },
      'Returns & Gift Cards': { icon: Gift, color: 'text-yellow-600' },
      'Backup Tables': { icon: Archive, color: 'text-slate-600' },
      'Other': { icon: Layers, color: 'text-gray-500' }
    };
    return icons[categoryName] || { icon: Database, color: 'text-gray-600' };
  };

  // Scan database to get all tables and their row counts
  const scanDatabase = async () => {
    setScanning(true);
    setLoading(true);
    try {
      toast.loading('Scanning database...', { id: 'scan' });

      // Get all tables from information schema
      // @ts-ignore - Neon query builder implements thenable interface
      const { data: allTables, error: schemaError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .order('table_name');

      if (schemaError) {
        throw new Error('Failed to fetch database schema');
      }

      const tableNames = allTables?.map((t: any) => t.table_name) || [];
      console.log(`📊 Found ${tableNames.length} tables in database`);

      // Get row counts for each table
      const tableInfoPromises = tableNames.map(async (tableName: string) => {
        try {
          // @ts-ignore
          const { count, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });

          if (error) {
            console.warn(`Could not count rows in ${tableName}:`, error);
            return {
              table_name: tableName,
              row_count: 0,
              checked: false,
              category: getCategoryForTable(tableName)
            };
          }

          return {
            table_name: tableName,
            row_count: count || 0,
            checked: false,
            category: getCategoryForTable(tableName)
          };
        } catch (err) {
          console.warn(`Error processing ${tableName}:`, err);
          return {
            table_name: tableName,
            row_count: 0,
            checked: false,
            category: getCategoryForTable(tableName)
          };
        }
      });

      const tableInfos = await Promise.all(tableInfoPromises);
      setTables(tableInfos.sort((a, b) => b.row_count - a.row_count));

      toast.success(`Scanned ${tableInfos.length} tables`, { id: 'scan' });
    } catch (error: any) {
      console.error('Error scanning database:', error);
      toast.error(error.message || 'Failed to scan database', { id: 'scan' });
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  // Get category for a table
  const getCategoryForTable = (tableName: string): string => {
    for (const category of TABLE_CATEGORIES) {
      if (category.tables.includes(tableName)) {
        return category.name;
      }
    }
    return 'Other';
  };

  // Toggle table selection
  const toggleTable = (tableName: string) => {
    setTables(prev =>
      prev.map(t =>
        t.table_name === tableName ? { ...t, checked: !t.checked } : t
      )
    );
  };

  // Toggle category selection
  const toggleCategory = (categoryName: string) => {
    const category = TABLE_CATEGORIES.find(c => c.name === categoryName);
    if (!category) return;

    const allChecked = tables
      .filter(t => category.tables.includes(t.table_name))
      .every(t => t.checked);

    setTables(prev =>
      prev.map(t =>
        category.tables.includes(t.table_name)
          ? { ...t, checked: !allChecked }
          : t
      )
    );
  };

  // Toggle select all
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setTables(prev => prev.map(t => ({ ...t, checked: newSelectAll })));
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryName: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // Expand all categories
  const expandAllCategories = () => {
    const allCategoryNames = groupedTables.map(cat => cat.name);
    setExpandedCategories(new Set(allCategoryNames));
  };

  // Collapse all categories
  const collapseAllCategories = () => {
    setExpandedCategories(new Set());
  };

  // Delete selected tables' data
  const deleteSelectedData = async () => {
    const selectedTables = tables.filter(t => t.checked);
    
    if (selectedTables.length === 0) {
      toast.error('No tables selected');
      return;
    }

    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setDeleting(true);
    const results: { table: string; success: boolean; error?: string; deletedRows?: number }[] = [];

    try {
      toast.loading(`Deleting data from ${selectedTables.length} tables...`, { id: 'delete' });

      for (const table of selectedTables) {
        try {
          // Get current count
          // @ts-ignore
          const { count: beforeCount } = await supabase
            .from(table.table_name)
            .select('*', { count: 'exact', head: true });

          // Delete all rows from the table
          // Note: This uses a dummy condition to delete all rows
          // Foreign key constraints may prevent deletion - handle gracefully
          // @ts-ignore
          const { error } = await supabase
            .from(table.table_name)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything (dummy condition)

          if (error) {
            // Enhanced error message for foreign key constraints
            let errorMessage = error.message;
            if (error.message.includes('foreign key constraint')) {
              errorMessage = `Cannot delete: Referenced by other tables. Delete dependent tables first or use SQL with CASCADE.`;
            }
            
            results.push({
              table: table.table_name,
              success: false,
              error: errorMessage
            });
          } else {
            results.push({
              table: table.table_name,
              success: true,
              deletedRows: beforeCount || 0
            });
          }
        } catch (err: any) {
          // Enhanced error handling
          let errorMessage = err.message || 'Unknown error';
          if (errorMessage.includes('foreign key constraint')) {
            errorMessage = `Cannot delete: Referenced by other tables. Delete dependent tables first.`;
          }
          
          results.push({
            table: table.table_name,
            success: false,
            error: errorMessage
          });
        }
      }

      // Show results
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const totalDeleted = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.deletedRows || 0), 0);

      if (successCount > 0) {
        toast.success(
          `Successfully deleted ${totalDeleted.toLocaleString()} rows from ${successCount} table(s)`,
          { id: 'delete', duration: 5000 }
        );
      }

      if (failCount > 0) {
        toast.error(
          `Failed to delete data from ${failCount} table(s)`,
          { id: 'delete-error', duration: 5000 }
        );
        console.error('Failed deletions:', results.filter(r => !r.success));
      }

      // Refresh the table list
      await scanDatabase();
      setConfirmText('');
      setShowConfirmDialog(false);
      
      // Uncheck all tables
      setTables(prev => prev.map(t => ({ ...t, checked: false })));
      setSelectAll(false);

    } catch (error: any) {
      console.error('Error during deletion:', error);
      toast.error(error.message || 'Failed to delete data', { id: 'delete' });
    } finally {
      setDeleting(false);
    }
  };

  // Filter tables based on search and category
  const filteredTables = tables.filter(table => {
    const matchesSearch = table.table_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || table.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group tables by category
  const groupedTables = TABLE_CATEGORIES.map(category => ({
    ...category,
    tables: filteredTables.filter(t => category.tables.includes(t.table_name)),
    totalRows: filteredTables
      .filter(t => category.tables.includes(t.table_name))
      .reduce((sum, t) => sum + t.row_count, 0)
  })).filter(cat => cat.tables.length > 0);

  // Add "Other" category for uncategorized tables
  const otherTables = filteredTables.filter(t => t.category === 'Other');
  if (otherTables.length > 0) {
    groupedTables.push({
      name: 'Other',
      description: 'Uncategorized tables',
      tables: otherTables,
      totalRows: otherTables.reduce((sum, t) => sum + t.row_count, 0)
    });
  }

  // Calculate statistics
  const selectedTables = tables.filter(t => t.checked);
  const totalRows = tables.reduce((sum, t) => sum + t.row_count, 0);
  const selectedRows = selectedTables.reduce((sum, t) => sum + t.row_count, 0);

  // Auto-scan on mount
  useEffect(() => {
    scanDatabase();
  }, []);

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex items-center gap-2">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">Database Data Cleanup</h3>
              <p className="text-sm text-gray-600">Select tables to remove data from</p>
              </div>
              <div className="group relative">
                <HelpCircle className="h-5 w-5 text-gray-400 hover:text-gray-600 cursor-help" />
                <div className="invisible group-hover:visible absolute left-0 top-8 z-50 w-80 p-4 bg-gray-900 text-white text-xs rounded-lg shadow-xl">
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-red-400 mb-1">⚠️ Warning</p>
                      <p>This permanently deletes data from selected tables. Cannot be undone. Make backups first!</p>
                    </div>
                    <div>
                      <p className="font-semibold text-blue-400 mb-1">🔗 Foreign Keys</p>
                      <p>Delete child tables first if you get constraint errors. Example: delete purchase_order_payments before finance_accounts.</p>
                    </div>
                  </div>
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            </div>
          </div>
          <GlassButton
            onClick={scanDatabase}
            disabled={scanning}
            variant="secondary"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            {scanning ? 'Scanning...' : 'Refresh Scan'}
          </GlassButton>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium mb-1">Total Tables</div>
            <div className="text-2xl font-bold text-blue-900">{tables.length}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="text-sm text-purple-600 font-medium mb-1">Total Rows</div>
            <div className="text-2xl font-bold text-purple-900">{totalRows.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium mb-1">Selected Tables</div>
            <div className="text-2xl font-bold text-green-900">{selectedTables.length}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="text-sm text-red-600 font-medium mb-1">Rows to Delete</div>
            <div className="text-2xl font-bold text-red-900">{selectedRows.toLocaleString()}</div>
          </div>
        </div>

        {/* Table Selector - Collapsible */}
        <div className="border border-indigo-200 rounded-lg bg-white mb-6">
          <button
            onClick={() => setShowTableSelector(!showTableSelector)}
            disabled={loading || scanning}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <Database className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm font-medium text-gray-700">
                Select Tables to Clean
              </span>
              {!showTableSelector && tables.length > 0 && (
                <>
                  <span className="text-xs text-gray-500">
                    ({groupedTables.length} groups)
                  </span>
                  {selectedTables.length > 0 && selectedTables.length < tables.length && (
                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                      {selectedTables.length}/{tables.length} tables
                    </span>
                  )}
                  {selectedTables.length === tables.length && tables.length > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                      All tables selected
                    </span>
                  )}
                  {selectedTables.length === 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      No tables selected
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ChevronDown 
                className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                  showTableSelector ? 'transform rotate-180' : ''
                }`}
            />
          </div>
          </button>
          
          {showTableSelector && (
            <div className="border-t border-indigo-200 animate-in slide-in-from-top-2 duration-200">
              <div className="p-3">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                    <span className="ml-3 text-sm text-gray-600">Loading tables...</span>
                  </div>
                ) : (
                  <>
                    {/* Search and Controls */}
                    <div className="space-y-3 mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          {selectedTables.length} of {tables.length} tables selected
                        </span>
          <div className="flex gap-2">
                          <button
                            onClick={expandAllCategories}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 rounded transition-colors"
                          >
                            Expand All
                          </button>
                          <button
                            onClick={collapseAllCategories}
                            className="text-xs text-gray-600 hover:text-gray-700 font-medium px-2 py-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            Collapse All
                          </button>
                          <span className="border-l border-gray-300 mx-1"></span>
            <button
              onClick={handleSelectAll}
                            className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors ${
                selectAll
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {selectAll ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

                      {/* Compact Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search tables..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 focus:bg-white transition-colors"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Clear search"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
          </div>
                    </div>

                    {/* Tables by Category */}
                    {groupedTables.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No tables found</p>
          </div>
        ) : (
                      <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {groupedTables.map((category) => {
              const isExpanded = expandedCategories.has(category.name);
              const categoryTables = category.tables;
              const allChecked = categoryTables.every(t => t.checked);
              const someChecked = categoryTables.some(t => t.checked) && !allChecked;
              const categoryIcon = getCategoryIcon(category.name);
              const IconComponent = categoryIcon.icon;
              const selectedCount = categoryTables.filter(t => t.checked).length;

              return (
                <div key={category.name} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Category Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white">
                    <div className="p-3 flex items-center justify-between">
                      <button
                        onClick={() => toggleCategoryExpansion(category.name)}
                        className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
                      >
                        <ChevronDown 
                          className={`h-4 w-4 text-gray-500 transition-transform duration-200 ${
                            isExpanded ? 'transform rotate-180' : ''
                        }`}
                        />
                        <IconComponent className={`h-4 w-4 ${categoryIcon.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm text-gray-800">{category.name}</h4>
                            <span className="text-xs text-gray-500">
                              ({categoryTables.length} table{categoryTables.length !== 1 ? 's' : ''})
                            </span>
                            {selectedCount > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                allChecked 
                                  ? 'bg-indigo-100 text-indigo-700' 
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {selectedCount}/{categoryTables.length}
                              </span>
                            )}
                      </div>
                          <p className="text-xs text-gray-600 mt-0.5">{category.description}</p>
                    </div>
                      </button>
                      <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                      <div className="text-right">
                          <div className="text-xs font-medium text-gray-600">
                          {category.totalRows.toLocaleString()} rows
                        </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={() => toggleCategory(category.name)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                          title={allChecked ? 'Deselect all in category' : 'Select all in category'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category Tables */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-white animate-in slide-in-from-top-2 duration-200">
                      <div className="p-2 space-y-1">
                      {categoryTables.map((table) => (
                          <label
                          key={table.table_name}
                            className={`flex items-center justify-between py-2 px-3 rounded-md cursor-pointer transition-colors group ${
                                table.checked
                                ? 'bg-indigo-50 hover:bg-indigo-100' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <input
                                type="checkbox"
                                checked={table.checked}
                                onChange={() => toggleTable(table.table_name)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer flex-shrink-0"
                              />
                              <span className="font-mono text-sm text-gray-700 group-hover:text-gray-900 truncate">
                                {table.table_name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                table.row_count > 0 
                                  ? 'bg-gray-100 text-gray-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {table.row_count.toLocaleString()} row{table.row_count !== 1 ? 's' : ''}
                              </span>
                          </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Delete Button */}
        {selectedTables.length > 0 && (
          <div className="pt-6 border-t border-gray-200">
            <GlassButton
              onClick={() => setShowConfirmDialog(true)}
              disabled={deleting}
              variant="danger"
              className="w-full flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Delete Data from {selectedTables.length} Selected Table{selectedTables.length !== 1 ? 's' : ''}
              ({selectedRows.toLocaleString()} rows)
            </GlassButton>
          </div>
        )}
      </GlassCard>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Data Deletion</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-900 mb-2">
                You are about to permanently delete data from:
              </p>
              <ul className="text-sm text-red-800 space-y-1 max-h-40 overflow-y-auto">
                {selectedTables.map(t => (
                  <li key={t.table_name} className="font-mono">
                    • {t.table_name} ({t.row_count.toLocaleString()} rows)
                  </li>
                ))}
              </ul>
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm font-semibold text-red-900">
                  Total: {selectedRows.toLocaleString()} rows will be deleted
                </p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setConfirmText('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={deleteSelectedData}
                disabled={confirmText !== 'DELETE' || deleting}
                className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
                  confirmText === 'DELETE' && !deleting
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete Data'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DatabaseDataCleanupPanel;

