import React from 'react';
import { 
  Package, TrendingUp, DollarSign, 
  CheckCircle, Star,
  Database, Save, BarChart3,
  Building, ShoppingCart, Activity,
  PieChart, AlertCircle, ExternalLink
} from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';

interface AnalyticsTabProps {
  products: any[];
  categories: any[];
  formatMoney: (amount: number) => string;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  products,
  categories,
  formatMoney
}) => {
  const [isBackingUp, setIsBackingUp] = React.useState(false);
  const [backupProgress, setBackupProgress] = React.useState(0);
  const [backupStatus, setBackupStatus] = React.useState('');
  
  // Additional analytics state
  const [salesData, setSalesData] = React.useState<any>(null);
  const [supplierData, setSupplierData] = React.useState<any>(null);
  const [recentActivity, setRecentActivity] = React.useState<any[]>([]);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = React.useState(false);

  // Load additional analytics data
  React.useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!products || products.length === 0) return;
      
      setIsLoadingAnalytics(true);
      try {
        // Fetch sales data for top selling products
        const { data: sales, error: salesError } = await supabase
          .from('lats_sales')
          .select(`
            id,
            total_amount,
            created_at
          `)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (salesError) {
          console.warn('Error fetching sales data:', salesError);
        }

        if (!salesError && sales && Array.isArray(sales)) {
          // Calculate basic sales metrics
          const totalRevenue = sales.reduce((sum: number, sale: any) => {
            const amount = typeof sale.total_amount === 'number' ? sale.total_amount : parseFloat(sale.total_amount) || 0;
            return sum + amount;
          }, 0);
          const totalTransactions = sales.length;
          const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
          
          setSalesData({
            topSellingProducts: [], // No product-level data available without sale items
            totalRevenue,
            totalTransactions,
            averageOrderValue
          });
        }

        // Fetch supplier data
        const { data: suppliers, error: suppliersError } = await supabase
          .from('lats_suppliers')
          .select(`
            id,
            name,
            contact_person,
            phone,
            email,
            is_active
          `);

        if (suppliersError) {
          console.error('Error fetching supplier data:', suppliersError);
        }

        if (!suppliersError && suppliers && Array.isArray(suppliers)) {
          setSupplierData({
            totalSuppliers: suppliers.length,
            activeSuppliers: suppliers.filter((s: any) => s.is_active).length,
            topSuppliers: suppliers.slice(0, 5)
          });
        }

        // Fetch recent activity
        const { data: recentSales, error: recentError } = await supabase
          .from('lats_sales')
          .select(`
            id,
            total_amount,
            created_at,
            customer_name,
            status
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentError) {
          console.warn('Error fetching recent sales data:', recentError);
        }

        if (!recentError && recentSales && Array.isArray(recentSales)) {
          setRecentActivity(recentSales.map((sale: any) => ({
            id: sale.id,
            type: 'sale',
            description: `Sale to ${sale.customer_name || 'Customer'}`,
            amount: sale.total_amount,
            date: sale.created_at,
            status: sale.status
          })));
        }

      } catch (error) {
        console.error('Error loading analytics data:', error);
        // Silently continue - the component will still work with basic analytics
      } finally {
        setIsLoadingAnalytics(false);
      }
    };

    loadAnalyticsData();
  }, [products]);

  // Calculate additional analytics
  const analytics = React.useMemo(() => {
    const totalProducts = products?.length || 0;
    const activeProducts = products?.filter(p => p.isActive).length || 0;
    const inactiveProducts = totalProducts - activeProducts;
    const featuredProducts = products?.filter(p => p.isFeatured).length || 0;
    
    // Stock analytics with proper thresholds
    const lowStockProducts = products?.filter(p => {
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) || 0;
      const minStock = p.variants?.[0]?.minQuantity || p.minStockLevel || 5; // Default min stock of 5
      return totalStock > 0 && totalStock <= minStock;
    }).length || 0;
    
    const outOfStockProducts = products?.filter(p => {
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) || 0;
      return totalStock <= 0;
    }).length || 0;
    
    const wellStockedProducts = products?.filter(p => {
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) || 0;
      const minStock = p.variants?.[0]?.minQuantity || p.minStockLevel || 5;
      return totalStock > minStock;
    }).length || 0;
    
    // Reorder alerts (products below minimum stock level)
    const reorderAlerts = products?.filter(p => {
      const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) || 0;
      const minStock = p.variants?.[0]?.minQuantity || p.minStockLevel || 5;
      return totalStock <= minStock && totalStock > 0;
    }).length || 0;
    
    // Value analytics - use ALL variants for accurate calculation
    const totalValue = products?.reduce((sum, product) => {
      const productValue = product.variants?.reduce((variantSum: number, variant: any) => {
        const costPrice = Number(variant.costPrice) || 0;
        const quantity = Number(variant.quantity) || 0;
        return Number(variantSum) + (costPrice * quantity);
      }, 0) || 0;
      return Number(sum) + Number(productValue);
    }, 0) || 0;
    
    const retailValue = products?.reduce((sum, product) => {
      // Calculate retail value using ALL variants for consistency
      const productRetailValue = product.variants?.reduce((variantSum: number, variant: any) => {
        // Use sellingPrice if available, otherwise calculate from cost price with markup
        const costPrice = Number(variant.costPrice) || 0;
        const sellingPrice = Number(variant.sellingPrice) || (costPrice * 1.5) || 0; // 50% markup if no selling price
        const quantity = Number(variant.quantity) || 0;
        return Number(variantSum) + (sellingPrice * quantity);
      }, 0) || 0;
      return Number(sum) + Number(productRetailValue);
    }, 0) || 0;
    
    const potentialProfit = retailValue - totalValue;
    // Calculate profit margin as (profit / cost) * 100 for more accurate representation
    const profitMargin = totalValue > 0 ? (potentialProfit / totalValue) * 100 : 0;
    
    // Category analytics - create categories from product data since we don't have explicit categories
    const categoryMap = new Map();
    
    // Group products by inferred categories based on product names
    products?.forEach(product => {
      let categoryName = 'Electronics'; // Default category
      
      // Infer category from product name
      const productName = product.name?.toLowerCase() || '';
      if (productName.includes('iphone') || productName.includes('ipad') || productName.includes('macbook')) {
        categoryName = 'iPhones';
      } else if (productName.includes('jbl') || productName.includes('speaker') || productName.includes('soundbar')) {
        categoryName = 'Bluetooth Speakers';
      } else if (productName.includes('soundbar') || productName.includes('bar')) {
        categoryName = 'Soundbars';
      } else if (productName.includes('keyboard') || productName.includes('mechanical')) {
        categoryName = 'Keyboards';
      } else if (productName.includes('cpu') || productName.includes('min') || productName.includes('desktop')) {
        categoryName = 'CPU';
      } else if (productName.includes('monitor') || productName.includes('display')) {
        categoryName = 'Monitors';
      }
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          products: [],
          count: 0,
          value: 0
        });
      }
      
      const category = categoryMap.get(categoryName);
      category.products.push(product);
      category.count += 1;
      
      // Calculate category value using retail prices
      const productValue = product.variants?.reduce((sum: number, variant: any) => {
        const costPrice = Number(variant.costPrice) || 0;
        const sellingPrice = Number(variant.sellingPrice) || (costPrice * 1.5) || 0; // 50% markup if no selling price
        const quantity = Number(variant.quantity) || 0;
        return Number(sum) + (sellingPrice * quantity);
      }, 0) || 0;
      
      category.value = Number(category.value) + Number(productValue);
    });
    
    const categoryStats = Array.from(categoryMap.values())
      .map(category => ({
        name: category.name,
        count: category.count,
        value: category.value,
        percentage: totalProducts > 0 ? (category.count / totalProducts) * 100 : 0
      }))
      .sort((a: any, b: any) => b.value - a.value);
    
    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      featuredProducts,
      lowStockProducts,
      outOfStockProducts,
      wellStockedProducts,
      reorderAlerts,
      totalValue,
      retailValue,
      potentialProfit,
      profitMargin,
      categoryStats
    };
  }, [products, categories]);

  // Database backup function
  const performDatabaseBackup = async () => {
    setIsBackingUp(true);
    setBackupProgress(0);
    setBackupStatus('Starting backup...');

    try {
      // Only backup tables that are actually used in the application
      const ACTIVE_TABLES = [
        // Core Business Tables (definitely exist)
        'customers',
        'lats_categories', 
        'lats_products',
        'lats_product_variants',
        'lats_suppliers',
        'employees',
        'appointments',
        'settings',
        'devices',
        'auth_users',
        'integrations',
        'system_settings',
        'notification_templates',
        'audit_logs',
        'product_images',
        'user_settings',
        'lats_pos_general_settings',
        'lats_pos_receipt_settings',
        'lats_pos_advanced_settings',
        'lats_purchase_orders',
        'lats_stock_movements',
        'user_daily_goals',
        
        // Financial Tables (important for business)
        'customer_payments',
        'finance_accounts',
        'finance_expenses',
        'finance_expense_categories',
        'finance_transfers',
        'gift_cards',
        'gift_card_transactions',
        'installment_payments',
        
        // Device Management Tables
        'device_attachments',
        'device_checklists',
        'device_ratings',
        'device_remarks',
        'device_transitions',
        'diagnostic_checks',
        'diagnostic_devices',
        'diagnostic_requests',
        'diagnostic_templates',
        
        // Customer Management Tables
        'customer_notes',
        'customer_checkins',
        'customer_revenue',
        'contact_history',
        'contact_methods',
        'contact_preferences',
        
        // Communication Tables
        'communication_templates',
        'email_logs',
        'chat_messages',
        
        // WhatsApp Tables (likely exist)
        'whatsapp_message_templates',
        'whatsapp_instance_settings_view',
        'whatsapp_templates',
        
        // SMS Tables (likely exist)
        'sms_logs',
        'sms_triggers',
        
        // Admin Tables
        'admin_settings',
        'admin_settings_log',
        'admin_settings_view',
        
        // Other Tables (likely exist)
        'uuid_diagnostic_log'
      ];

      setBackupStatus(`Backing up ${ACTIVE_TABLES.length} active tables...`);

      const backup: any = {
        timestamp: new Date().toISOString(),
        databaseInfo: {
          totalTables: ACTIVE_TABLES.length,
          backupType: 'UI BACKUP - ACTIVE TABLES ONLY'
        },
        tables: {},
        summary: {
          totalTables: 0,
          tablesWithData: 0,
          totalRecords: 0
        }
      };

      let totalRecords = 0;
      let tablesWithData = 0;
      let processedTables = 0;

      for (const tableName of ACTIVE_TABLES) {
        try {
          processedTables++;
          const progress = ((processedTables / ACTIVE_TABLES.length) * 100);
          setBackupProgress(progress);
          setBackupStatus(`Backing up table: ${tableName} (${processedTables}/${ACTIVE_TABLES.length})`);

          // Get all records from table using pagination
          const allRecords: any[] = [];
          let from = 0;
          const pageSize = 1000;

          while (true) {
            const { data, error } = await supabase
              .from(tableName)
              .select('*')
              .range(from, from + pageSize - 1);

            if (error) {
              // Table doesn't exist, skip it silently
              console.log(`⚠️ Table '${tableName}' does not exist, skipping...`);
              break;
            }

            if (!data || data.length === 0) {
              break;
            }

            allRecords.push(...data);

            if (data.length < pageSize) {
              break;
            }

            from += pageSize;
            await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
          }

          const recordCount = allRecords.length;
          backup.tables[tableName] = {
            exists: true,
            recordCount,
            data: allRecords
          };

          totalRecords += recordCount;
          if (recordCount > 0) tablesWithData++;

        } catch (error: any) {
          // Handle any other errors gracefully
          const errorMessage = error?.message || 'Unknown error';
          backup.tables[tableName] = {
            exists: true,
            error: errorMessage,
            data: null
          };
          console.log(`❌ Error backing up '${tableName}': ${errorMessage}`);
        }
      }

      // Update summary
      backup.summary.totalTables = ACTIVE_TABLES.length;
      backup.summary.tablesWithData = tablesWithData;
      backup.summary.totalRecords = totalRecords;

      // Create download
      const backupJson = JSON.stringify(backup, null, 2);
      const blob = new Blob([backupJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupStatus(`✅ Backup completed! ${totalRecords.toLocaleString()} records backed up from ${tablesWithData} tables`);
      setBackupProgress(100);

      // Reset after 3 seconds
      setTimeout(() => {
        setIsBackingUp(false);
        setBackupProgress(0);
        setBackupStatus('');
      }, 3000);

    } catch (error: any) {
      setBackupStatus(`❌ Backup failed: ${error.message}`);
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Row - Key Metrics Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Total Products */}
        <div className="bg-white rounded-2xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Total Products</h3>
                <p className="text-xs text-gray-400 mt-0.5">{analytics.activeProducts} active</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="text-3xl font-bold text-gray-900">{analytics.totalProducts}</div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={14} className="text-emerald-500" />
                <span className="text-xs text-gray-500">Active</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900">
                {analytics.activeProducts}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={14} className="text-gray-500" />
                <span className="text-xs text-gray-500">Inactive</span>
              </div>
              <span className="text-2xl font-semibold text-gray-900">
                {analytics.inactiveProducts}
              </span>
            </div>
          </div>
        </div>

        {/* Stock Status */}
        <div className="bg-white rounded-2xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Stock Health</h3>
                <p className="text-xs text-gray-400 mt-0.5">{analytics.lowStockProducts} low stock</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="text-3xl font-bold text-emerald-600">{analytics.wellStockedProducts}</div>
            <p className="text-xs text-gray-500 mt-1">Well stocked items</p>
          </div>

          {/* Stock Distribution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
              <span className="text-xs text-gray-600">Well Stocked</span>
              <span className="text-sm font-semibold text-emerald-600">{analytics.wellStockedProducts}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <span className="text-xs text-gray-600">Low Stock</span>
              <span className="text-sm font-semibold text-amber-600">{analytics.lowStockProducts}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-rose-50 rounded-lg">
              <span className="text-xs text-gray-600">Out of Stock</span>
              <span className="text-sm font-semibold text-rose-600">{analytics.outOfStockProducts}</span>
            </div>
          </div>
        </div>

        {/* Retail Value */}
        <div className="bg-white rounded-2xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Inventory Value</h3>
                <p className="text-xs text-gray-400 mt-0.5">Total retail value</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="text-3xl font-bold text-purple-600">{formatMoney(analytics.retailValue)}</div>
            <p className="text-xs text-gray-500 mt-1">Avg Margin: {analytics.profitMargin.toFixed(1)}%</p>
          </div>

          {/* Value Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Cost Value</span>
              <span className="text-sm font-semibold text-gray-900">{formatMoney(analytics.totalValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Retail Value</span>
              <span className="text-sm font-semibold text-purple-600">{formatMoney(analytics.retailValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Potential Profit</span>
              <span className="text-sm font-semibold text-emerald-600">{formatMoney(analytics.potentialProfit)}</span>
            </div>
          </div>
        </div>

        {/* Profit Potential */}
        <div className="bg-white rounded-2xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Profit Margin</h3>
                <p className="text-xs text-gray-400 mt-0.5">Average margin</p>
              </div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-600">{formatMoney(analytics.potentialProfit)}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Profit margin: {analytics.profitMargin.toFixed(1)}%
            </p>
          </div>

          {/* Margin Indicator */}
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Profit Margin</span>
              <span>{analytics.profitMargin.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  analytics.profitMargin >= 50 ? 'bg-emerald-500' : 
                  analytics.profitMargin >= 30 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(analytics.profitMargin, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs">
              <span className={`${analytics.profitMargin >= 50 ? 'text-emerald-600 font-semibold' : 'text-gray-500'}`}>
                Excellent (50%+)
              </span>
              <span className={`${analytics.profitMargin >= 30 && analytics.profitMargin < 50 ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                Good (30-50%)
              </span>
              <span className={`${analytics.profitMargin < 30 ? 'text-rose-600 font-semibold' : 'text-gray-500'}`}>
                Low (&lt;30%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Charts and Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Distribution */}
        <div className="bg-white rounded-2xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <PieChart className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Stock Distribution</h3>
                <p className="text-xs text-gray-400 mt-0.5">{analytics.totalProducts} products tracked</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-3xl font-bold text-gray-900">{analytics.totalProducts}</div>
            <p className="text-xs text-gray-500 mt-1">Total Products</p>
          </div>

          {/* Percentage Indicators */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Well Stocked</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.totalProducts > 0 ? Math.round((analytics.wellStockedProducts / analytics.totalProducts) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Low Stock</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.totalProducts > 0 ? Math.round((analytics.lowStockProducts / analytics.totalProducts) * 100) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Out of Stock</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {analytics.totalProducts > 0 ? Math.round((analytics.outOfStockProducts / analytics.totalProducts) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Visual Distribution Bar */}
          <div className="space-y-2">
            <div className="flex h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 transition-all duration-300"
                style={{ width: `${analytics.totalProducts > 0 ? (analytics.wellStockedProducts / analytics.totalProducts) * 100 : 0}%` }}
              ></div>
              <div 
                className="bg-amber-500 transition-all duration-300"
                style={{ width: `${analytics.totalProducts > 0 ? (analytics.lowStockProducts / analytics.totalProducts) * 100 : 0}%` }}
              ></div>
              <div 
                className="bg-rose-500 transition-all duration-300"
                style={{ width: `${analytics.totalProducts > 0 ? (analytics.outOfStockProducts / analytics.totalProducts) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>{analytics.wellStockedProducts}</span>
              <span>{analytics.lowStockProducts}</span>
              <span>{analytics.outOfStockProducts}</span>
            </div>
          </div>
        </div>

        {/* Category Performance */}
        <div className="bg-white rounded-2xl p-7 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Top Categories</h3>
                <p className="text-xs text-gray-400 mt-0.5">By value</p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-3xl font-bold text-gray-900">{analytics.categoryStats.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total Categories</p>
          </div>
          
          <div className="space-y-2 flex-grow max-h-48 overflow-y-auto">
            {analytics.categoryStats.slice(0, 5).map((category, index) => (
              <div key={category.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-white">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 truncate">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 ml-8">
                    <span className="text-xs text-gray-500">{category.count} products</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{category.percentage.toFixed(1)}%</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-purple-600 ml-2">
                  {formatMoney(category.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Overview */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Financial Overview</h3>
              <p className="text-xs text-gray-400 mt-0.5">Inventory value</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Cost Value</span>
              <span className="text-sm font-semibold text-red-600">{formatMoney(analytics.totalValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Retail Value</span>
              <span className="text-sm font-semibold text-green-600">{formatMoney(analytics.retailValue)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className={`text-sm font-semibold ${analytics.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analytics.profitMargin.toFixed(1)}%
              </span>
            </div>
            
            {/* Profit Margin Visual */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Profit Margin</span>
                <span>{analytics.profitMargin.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    analytics.profitMargin >= 50 ? 'bg-green-500' : 
                    analytics.profitMargin >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(analytics.profitMargin, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Third Row - Sales Performance & Real-time Data */}
      {salesData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Performance Chart */}
          <div className="bg-white rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Sales Performance</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">{formatMoney(salesData.totalRevenue)}</div>
                <div className="text-xs text-gray-500">Total Revenue</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">{salesData.totalTransactions}</div>
                <div className="text-xs text-gray-500">Transactions</div>
              </div>
            </div>
            
            {/* Top Selling Products Mini Chart */}
            {salesData.topSellingProducts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700">Top Products</h4>
                {salesData.topSellingProducts.slice(0, 3).map((product: any, index: number) => {
                  const productInfo = products.find(p => p.id === product.productId);
                  return (
                    <div key={product.productId} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                        </div>
                        <span className="text-xs text-gray-700 truncate">{productInfo?.name || 'Unknown'}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold text-gray-900">{product.totalSold}</div>
                        <div className="text-xs text-gray-500">units</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supplier Performance */}
          {supplierData && (
            <div className="bg-white rounded-2xl p-7">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Building className="w-5 h-5 text-gray-700" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Supplier Performance</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{supplierData.totalSuppliers} suppliers</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">{supplierData.totalSuppliers}</div>
                  <div className="text-xs text-gray-500">Total Suppliers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{supplierData.activeSuppliers}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{supplierData.topSuppliers.length}</div>
                  <div className="text-xs text-gray-500">Listed</div>
                </div>
              </div>
              
              {/* Top Suppliers Mini List */}
              {supplierData.topSuppliers.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700">Top Suppliers</h4>
                  {supplierData.topSuppliers.slice(0, 3).map((supplier: any, index: number) => (
                    <div key={supplier.id} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-orange-600">{index + 1}</span>
                        </div>
                        <span className="text-xs text-gray-700 truncate">{supplier.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${supplier.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        <span className="text-xs text-gray-600">{supplier.is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fourth Row - Compact Analytics & Database Backup */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="bg-white rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Activity className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Recent Activity</h3>
                <p className="text-xs text-gray-400 mt-0.5">Latest transactions</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {recentActivity.slice(0, 4).map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                      <ShoppingCart className="w-3 h-3 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-gray-900 truncate">{activity.description}</div>
                      <div className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-gray-900">{formatMoney(activity.amount)}</div>
                    <div className={`text-xs px-1 py-0.5 rounded-full ${
                      activity.status === 'completed' ? 'bg-green-100 text-green-700' :
                      activity.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {activity.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Intelligence */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Business Intelligence</h3>
              <p className="text-xs text-gray-400 mt-0.5">Key metrics</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">ABC Analysis</span>
              <span className="text-xs font-semibold text-gray-900">
                {analytics.categoryStats.slice(0, 1).length}A, {analytics.categoryStats.slice(1, 3).length}B, {analytics.categoryStats.slice(3).length}C
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Inventory Turnover</span>
              <span className="text-xs font-semibold text-gray-900">
                {salesData ? (salesData.totalRevenue / analytics.totalValue).toFixed(2) : 'N/A'}x
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">Profitability</span>
              <span className={`text-xs font-semibold ${analytics.profitMargin >= 50 ? 'text-green-600' : analytics.profitMargin >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                {analytics.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Database Backup */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Database className="w-5 h-5 text-gray-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Database Backup</h3>
              <p className="text-xs text-gray-400 mt-0.5">Export all data</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs text-gray-600">Create a complete backup of all your data</p>
            <button
              onClick={performDatabaseBackup}
              disabled={isBackingUp}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                isBackingUp
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
              }`}
            >
              {isBackingUp ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Backing Up...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Backup Database
                </>
              )}
            </button>

            {isBackingUp && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${backupProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-indigo-700">{backupStatus}</p>
              </div>
            )}

            {!isBackingUp && backupStatus && (
              <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-700">{backupStatus}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fifth Row - Additional Analytics Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Featured Products */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Star className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Featured</h3>
                <p className="text-xs text-gray-400 mt-0.5">{analytics.totalProducts > 0 ? ((analytics.featuredProducts / analytics.totalProducts) * 100).toFixed(1) : 0}% of total</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-600">{analytics.featuredProducts}</div>
        </div>

        {/* Reorder Alerts */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Reorder Alerts</h3>
                <p className="text-xs text-gray-400 mt-0.5">Need restocking</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-orange-600">{analytics.reorderAlerts}</div>
        </div>

        {/* Out of Stock */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Out of Stock</h3>
                <p className="text-xs text-gray-400 mt-0.5">Products unavailable</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-600">{analytics.outOfStockProducts}</div>
        </div>

        {/* Total Categories */}
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-gray-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Categories</h3>
                <p className="text-xs text-gray-400 mt-0.5">Product categories</p>
              </div>
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-600">{analytics.categoryStats.length}</div>
        </div>
      </div>

      {/* Sixth Row - Detailed Category Breakdown */}
      <div className="bg-white rounded-2xl p-7">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Complete Category Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">{analytics.categoryStats.length} categories</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analytics.categoryStats.map((category, index) => (
            <div key={category.name} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{category.name}</span>
                </div>
                <span className="text-xs text-gray-500">{category.count} products</span>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Value</span>
                  <span className="font-semibold text-gray-900">{formatMoney(category.value)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Percentage</span>
                  <span className="font-semibold text-gray-900">{category.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                  <div 
                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${category.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Loading State - Following Dashboard Design */}
      {isLoadingAnalytics && (
        <div className="bg-white rounded-2xl p-7">
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnalyticsTab;


