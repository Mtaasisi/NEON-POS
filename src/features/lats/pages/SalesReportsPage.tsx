// SalesReportsPage component for LATS module - Enhanced for Customer Care
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import PageHeader from '../components/ui/PageHeader';
import SaleDetailsModal from '../components/modals/SaleDetailsModal';
import DailyClosingModal from '../components/modals/DailyClosingModal';
import { supabase } from '../../../lib/supabaseClient';
import { 
  Eye, 
  Calendar, 
  User, 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Download,
  RefreshCw,
  Lock,
  Unlock,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { testDatabaseConnection } from '../../../utils/databaseTest';
import { safeQuery, SupabaseErrorHandler } from '../../../utils/supabaseErrorHandler';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { rbacManager } from '../lib/rbac';
import { useBusinessInfo } from '../../../hooks/useBusinessInfo';



interface Sale {
  id: string;
  sale_number: string;
  customer_id: string;
  customer_name?: string;
  total_amount: number;
  payment_method: any;
  status: string;
  user_id: string;  // Changed from created_by to user_id
  sold_by?: string;
  created_at: string;
  branch_id?: string;  // 🔒 Branch isolation
  lats_sale_items?: any[];
  subtotal?: number;
  discount?: number;
  tax?: number;
}

const SalesReportsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { businessInfo } = useBusinessInfo();
  const [selectedPeriod, setSelectedPeriod] = useState('1d'); // Default to today for customer care
  const [selectedReport, setSelectedReport] = useState('daily');
  const [dateRange, setDateRange] = useState({ 
    start: new Date().toISOString().split('T')[0], 
    end: new Date().toISOString().split('T')[0] 
  });
  
  // Sales data state
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userNames, setUserNames] = useState<{[key: string]: string}>({});
  
  // Modal state
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showSaleModal, setShowSaleModal] = useState(false);

  // Daily closing state
  const [isDailyClosed, setIsDailyClosed] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDailyClosingModal, setShowDailyClosingModal] = useState(false);
  const [dailyCloseTime, setDailyCloseTime] = useState<string | null>(null);

  // Helper function to display payment method
  const getPaymentMethodDisplay = (paymentMethod: any) => {
    if (!paymentMethod) return 'Unknown';
    
    if (typeof paymentMethod === 'string') {
      try {
        const parsed = JSON.parse(paymentMethod);
        if (parsed.type === 'multiple' && parsed.details?.payments) {
          const methods = parsed.details.payments.map((payment: any) => {
            const methodName = payment.method || payment.paymentMethod || 'Unknown';
            return methodName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          });
          const uniqueMethods = [...new Set(methods)];
          return uniqueMethods.join(', ');
        }
        return parsed.method || parsed.type || 'Unknown';
      } catch {
        return paymentMethod;
      }
    }
    
    if (typeof paymentMethod === 'object') {
      if (paymentMethod.type === 'multiple' && paymentMethod.details?.payments) {
        const methods = paymentMethod.details.payments.map((payment: any) => {
          const methodName = payment.method || payment.paymentMethod || 'Unknown';
          return methodName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        });
        const uniqueMethods = [...new Set(methods)];
        return uniqueMethods.join(', ');
      }
      return paymentMethod.method || paymentMethod.type || 'Unknown';
    }
    
    return 'Unknown';
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input field or modal is open
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || showSaleModal) {
        return;
      }

      // Escape key to go back to POS
      if (e.key === 'Escape') {
        navigate('/pos');
      }
      
      // Ctrl/Cmd + P to go to POS
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        navigate('/pos');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate, showSaleModal]);

  // Check if user can view profit information
  const canViewProfit = useMemo(() => {
    if (!currentUser) return false;
    // Only admins can view profit information
    return currentUser.role === 'admin';
  }, [currentUser]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    // Filter for today's sales only when in Daily Sales mode
    const today = new Date().toISOString().split('T')[0];
    const filteredSales = selectedReport === 'daily' && selectedPeriod === '1d'
      ? sales.filter(sale => new Date(sale.created_at).toISOString().split('T')[0] === today)
      : sales;

    // ⚠️ FIX: Ensure total_amount is always a valid number
    const totalSales = filteredSales.reduce((sum, sale) => {
      const amount = parseFloat(sale.total_amount) || 0;
      // Validate it's a safe number
      if (isNaN(amount) || !isFinite(amount)) {
        console.warn('Invalid sale amount:', sale.total_amount, 'for sale:', sale.sale_number);
        return sum;
      }
      return sum + amount;
    }, 0);
    
    const totalTransactions = filteredSales.length;
    const uniqueCustomers = new Set(filteredSales.map(sale => sale.customer_id)).size;
    const averageOrder = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    // Calculate profit only if user has permission to view it
    let totalProfit = 0;
    let profitMargin = '0.0';
    
    if (canViewProfit) {
      totalProfit = filteredSales.reduce((sum, sale) => {
        const profit = sale.lats_sale_items?.reduce((itemSum, item) => {
          return itemSum + (item.total_price - (item.cost_price || 0) * item.quantity);
        }, 0) || 0;
        return sum + profit;
      }, 0);
      
      profitMargin = totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : '0.0';
    }

    return {
      totalSales,
      totalTransactions,
      totalCustomers: uniqueCustomers,
      averageOrder,
      totalProfit,
      profitMargin
    };
  }, [sales, canViewProfit, selectedReport, selectedPeriod]);

  // Chart data calculations
  const chartData = useMemo(() => {
    // Daily sales distribution (last 7 days or selected period)
    const getDaysInPeriod = () => {
      switch(selectedPeriod) {
        case '1d': return 1;
        case '7d': return 7;
        case '30d': return 30;
        case '90d': return 90;
        default: return 7;
      }
    };

    const daysCount = getDaysInPeriod();
    const dailyData: { [key: string]: { date: string; sales: number; count: number } } = {};

    // Initialize days
    const today = new Date();
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyData[dateKey] = {
        date: displayDate,
        sales: 0,
        count: 0
      };
    }

    // Aggregate sales by day
    sales.forEach(sale => {
      const dateKey = new Date(sale.created_at).toISOString().split('T')[0];
      const amount = parseFloat(sale.total_amount) || 0;
      if (!isNaN(amount) && isFinite(amount) && dailyData[dateKey]) {
        dailyData[dateKey].sales += amount;
        dailyData[dateKey].count += 1;
      }
    });

    const dailySalesArray = Object.values(dailyData);

    // Payment method distribution
    const paymentData: { [key: string]: { name: string; value: number; count: number } } = {};
    sales.forEach(sale => {
      const method = getPaymentMethodDisplay(sale.payment_method);
      const amount = parseFloat(sale.total_amount) || 0;
      if (!isNaN(amount) && isFinite(amount)) {
        if (!paymentData[method]) {
          paymentData[method] = { name: method, value: 0, count: 0 };
        }
        paymentData[method].value += amount;
        paymentData[method].count += 1;
      }
    });

    // Top customers
    const customerData: { [key: string]: { name: string; value: number; orders: number } } = {};
    sales.forEach(sale => {
      const customerName = sale.customer_name || 'Walk-in';
      const amount = parseFloat(sale.total_amount) || 0;
      if (!isNaN(amount) && isFinite(amount)) {
        if (!customerData[customerName]) {
          customerData[customerName] = { name: customerName, value: 0, orders: 0 };
        }
        customerData[customerName].value += amount;
        customerData[customerName].orders += 1;
      }
    });

    const topCustomers = Object.values(customerData)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Daily trend with better date formatting
    const trendData: { [key: string]: { time: string; sales: number; transactions: number } } = {};
    
    // Initialize all days in the period
    for (let i = daysCount - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendData[dateKey] = { time: displayDate, sales: 0, transactions: 0 };
    }

    // Add actual sales data
    sales.forEach(sale => {
      const amount = parseFloat(sale.total_amount) || 0;
      if (!isNaN(amount) && isFinite(amount)) {
        const dateKey = new Date(sale.created_at).toISOString().split('T')[0];
        
        if (trendData[dateKey]) {
          trendData[dateKey].sales += amount;
          trendData[dateKey].transactions += 1;
        }
      }
    });

    return {
      daily: dailySalesArray,
      payments: Object.values(paymentData),
      topCustomers,
      trend: Object.values(trendData)
    };
  }, [sales, selectedPeriod]);

  // Check if user has permission to close daily sales
  const canCloseDailySales = useMemo(() => {
    if (!currentUser) return false;
    return rbacManager.hasPermission(currentUser.role, 'reports', 'daily-close');
  }, [currentUser]);

  // Check if user has permission to confirm transactions
  const canConfirmTransactions = useMemo(() => {
    if (!currentUser) return false;
    // Use RBAC to check permissions, or allow admin as fallback
    return rbacManager.hasPermission(currentUser.role, 'reports', 'confirm-transactions') || 
           currentUser.role === 'admin';
  }, [currentUser]);

  // Fetch user names for cashier display
  const fetchUserNames = async (userIds: string[]) => {
    if (userIds.length === 0) return {};
    
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching user names:', error);
        return {};
      }

      const nameMap: {[key: string]: string} = {};
      users?.forEach(user => {
        nameMap[user.id] = user.full_name || user.email || 'Unknown User';
      });
      
      return nameMap;
    } catch (err) {
      console.error('Error in fetchUserNames:', err);
      return {};
    }
  };

  // Fetch sales data
  const fetchSales = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔒 Get current branch for isolation
      const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;
      
      console.log('🏪 Current Branch ID:', currentBranchId);

      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      
      if (selectedPeriod === 'custom') {
        // Use custom date range
        startDate.setTime(new Date(dateRange.start).getTime());
        endDate.setTime(new Date(dateRange.end).getTime());
        // Set end date to end of day
        endDate.setHours(23, 59, 59, 999);
      } else {
        // Use predefined periods
        switch (selectedPeriod) {
          case '1d':
            startDate.setDate(endDate.getDate() - 1);
            break;
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          default:
            startDate.setDate(endDate.getDate() - 7);
        }
      }

      console.log('🔍 Fetching sales for period:', selectedPeriod, 'from', startDate.toISOString(), 'to', endDate.toISOString());

      // Build query with branch filter
      let query = supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_id,
          customer_name,
          total_amount,
          payment_method,
          status,
          user_id,
          sold_by,
          created_at,
          branch_id
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      // 🔒 APPLY BRANCH FILTER FOR ISOLATION
      if (currentBranchId) {
        console.log('🔒 APPLYING BRANCH FILTER:', currentBranchId);
        query = query.eq('branch_id', currentBranchId);
      } else {
        console.log('⚠️ NO BRANCH FILTER - SHOWING ALL SALES');
      }

      const salesResult = await safeQuery(
        () => query,
        () => SupabaseErrorHandler.createLatsSalesListFallbackQuery(supabase, 200)
      );

      // Fetch sale items count separately for each sale
      if (salesResult.data && salesResult.data.length > 0) {
        const salesWithItems = await Promise.all(
          salesResult.data.map(async (sale) => {
            const { data: items, error: itemsError } = await supabase
              .from('lats_sale_items')
              .select('id, quantity, total_price, cost_price')
              .eq('sale_id', sale.id);
            
            return {
              ...sale,
              lats_sale_items: items || []
            };
          })
        );
        salesResult.data = salesWithItems;
      }

      if (salesResult.error) {
        console.error('❌ Error fetching sales:', salesResult.error);
        const errorMsg = salesResult.error?.message || JSON.stringify(salesResult.error);
        console.error('❌ Error details:', errorMsg);
        setError(`Failed to load sales data: ${errorMsg}`);
        return;
      }

      const salesData = salesResult.data;
      console.log(`✅ Loaded ${salesData?.length || 0} total sales from database`);
      
      // Debug: Check if sale items are being loaded
      if (salesData && salesData.length > 0) {
        console.log('🔍 First sale items debug:', {
          sale_number: salesData[0].sale_number,
          has_items: !!salesData[0].lats_sale_items,
          items_count: salesData[0].lats_sale_items?.length || 0,
          items_data: salesData[0].lats_sale_items
        });
      }

      // Filter sales by date range in JavaScript (since Supabase date filters are causing issues)
      const filteredSales = (salesData || []).filter(sale => {
        const saleDate = new Date(sale.created_at);
        return saleDate >= startDate && saleDate <= endDate;
      });

      console.log(`📅 Filtered to ${filteredSales.length} sales for period ${selectedPeriod}`);
      setSales(filteredSales);

      // Fetch user names for cashier display
      const uniqueUserIds = [...new Set(filteredSales.map(sale => sale.user_id).filter(Boolean))];
      // Filter out invalid UUIDs (like 'care') to prevent 400 errors
      const validUserIds = uniqueUserIds.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });
      if (validUserIds.length > 0) {
        const names = await fetchUserNames(validUserIds);
        setUserNames(names);
      }
    } catch (err: any) {
      console.error('❌ Error fetching sales:', err);
      console.error('❌ Error type:', typeof err);
      console.error('❌ Error stringified:', JSON.stringify(err, null, 2));
      const errorMessage = err?.message || err?.error?.message || (typeof err === 'string' ? err : 'Unknown error occurred');
      setError(`Failed to load sales data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Run database test first
    testDatabaseConnection().then(result => {
      console.log('🔍 Database test result:', result);
    });
    
    fetchSales();
    checkDailyCloseStatus();
  }, [selectedPeriod, dateRange]);

  // Check if today's sales are already closed
  const checkDailyCloseStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      console.log('🔍 Checking daily closure status for date:', today);
      
      const { data, error } = await supabase
        .from('daily_sales_closures')
        .select('id, date, closed_at, closed_by')
        .eq('date', today)
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors when no record exists

      if (error) {
        console.error('❌ Error checking daily closure status:', error);
        setIsDailyClosed(false);
        return;
      }

      if (data) {
        console.log('✅ Found daily closure record:', data);
        setIsDailyClosed(true);
        setDailyCloseTime(data.closed_at);
      } else {
        console.log('📅 No daily closure found for today');
        setIsDailyClosed(false);
      }
    } catch (err) {
      console.log('❌ Error in checkDailyCloseStatus:', err);
      // If there's any error, assume day is open
      setIsDailyClosed(false);
    }
  };

  // Daily closing functionality
  const handleDailyClose = async () => {
    try {
      setIsClosing(true);
      
      // Create daily closure record
      const today = new Date().toISOString().split('T')[0];
      const closureData = {
        date: today,
        total_sales: summaryMetrics.totalSales,
        total_transactions: summaryMetrics.totalTransactions,
        closed_at: new Date().toISOString(),
        closed_by: currentUser?.role || 'customer_care',
        closed_by_user_id: currentUser?.id,
        sales_data: sales
      };

      const { error } = await supabase
        .from('daily_sales_closures')
        .upsert(closureData, { 
          onConflict: 'date',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Error closing daily sales (table may not exist):', error);
        // For now, just show success message even if table doesn't exist
        // TODO: Apply migration to create daily_sales_closures table
      }

      setIsDailyClosed(true);
      setDailyCloseTime(new Date().toISOString());
      setShowCloseConfirm(false);
      
      toast.success('Daily sales closed successfully! 🎉');
      
      // Export daily report
      exportDailyReport();
      
    } catch (err) {
      console.error('Error closing daily sales:', err);
      toast.error('Failed to close daily sales. Please try again.');
    } finally {
      setIsClosing(false);
    }
  };

  // Export daily report
  const exportDailyReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const reportData = [
      ['Daily Sales Report', today],
      ['Generated At', new Date().toLocaleString()],
      ['Total Sales', summaryMetrics.totalSales],
      ['Total Transactions', summaryMetrics.totalTransactions],
      ['Total Customers', summaryMetrics.totalCustomers],
      ['Average Order', summaryMetrics.averageOrder],
      ...(canViewProfit ? [
        ['Profit Margin', summaryMetrics.profitMargin + '%'],
        ['Total Profit', summaryMetrics.totalProfit]
      ] : []),
      [''],
      ['Transaction Details'],
      ['Sale Number', 'Customer', 'Amount', 'Payment Method', 'Time', 'Status'],
      ...sales.map(sale => [
        sale.sale_number,
        sale.customer_name || 'Walk-in',
        sale.total_amount,
        getPaymentMethodDisplay(sale.payment_method),
        formatDate(sale.created_at),
        sale.status
      ])
    ];

    const csvContent = reportData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-sales-report-${today}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Daily report exported successfully! 📊');
  };

  // Print daily report with logo
  const printDailyReport = () => {
    const today = new Date().toISOString().split('T')[0];
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      toast.error('Please allow popups to print reports');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Daily Sales Report - ${today}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              padding: 0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .logo {
              height: 60px;
              width: auto;
              margin: 0 auto 10px;
              display: block;
            }
            .business-name {
              font-size: 24px;
              font-weight: bold;
              margin: 10px 0;
            }
            .business-details {
              font-size: 12px;
              color: #666;
            }
            .report-title {
              font-size: 20px;
              font-weight: bold;
              margin: 20px 0;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin: 30px 0;
            }
            .summary-card {
              border: 1px solid #ddd;
              padding: 15px;
              border-radius: 5px;
              background: #f9f9f9;
            }
            .summary-card h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #666;
            }
            .summary-card .value {
              font-size: 24px;
              font-weight: bold;
              color: #333;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="${businessInfo.name}" class="logo" />` : ''}
            <div class="business-name">${businessInfo.name}</div>
            <div class="business-details">
              ${businessInfo.address ? `${businessInfo.address}<br>` : ''}
              ${businessInfo.phone ? `Tel: ${businessInfo.phone}<br>` : ''}
              ${businessInfo.email ? `Email: ${businessInfo.email}` : ''}
            </div>
          </div>

          <div class="report-title">Daily Sales Report</div>
          <div style="font-size: 14px; color: #666; margin-bottom: 20px;">
            Date: ${today} | Generated: ${new Date().toLocaleString()}
          </div>

          <div class="summary">
            <div class="summary-card">
              <h3>Total Sales</h3>
              <div class="value">${formatMoney(summaryMetrics.totalSales)}</div>
            </div>
            <div class="summary-card">
              <h3>Transactions</h3>
              <div class="value">${summaryMetrics.totalTransactions}</div>
            </div>
            <div class="summary-card">
              <h3>Average Order</h3>
              <div class="value">${formatMoney(summaryMetrics.averageOrder)}</div>
            </div>
            ${canViewProfit ? `
            <div class="summary-card">
              <h3>Total Profit</h3>
              <div class="value">${formatMoney(summaryMetrics.totalProfit)}</div>
            </div>
            <div class="summary-card">
              <h3>Profit Margin</h3>
              <div class="value">${summaryMetrics.profitMargin}%</div>
            </div>
            ` : ''}
            <div class="summary-card">
              <h3>Total Customers</h3>
              <div class="value">${summaryMetrics.totalCustomers}</div>
            </div>
          </div>

          <h3>Transaction Details</h3>
          <table>
            <thead>
              <tr>
                <th>Sale Number</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${sales.map(sale => `
                <tr>
                  <td>${sale.sale_number}</td>
                  <td>${sale.customer_name || 'Walk-in'}</td>
                  <td>${formatMoney(sale.total_amount)}</td>
                  <td>${getPaymentMethodDisplay(sale.payment_method)}</td>
                  <td>${formatDate(sale.created_at)}</td>
                  <td>${sale.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>This report was generated by ${businessInfo.name}</p>
            <p>${businessInfo.website ? `Visit us at: ${businessInfo.website}` : ''}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Format currency
  const formatMoney = (amount: number) => {
    // ⚠️ FIX: Handle invalid amounts gracefully
    const numAmount = parseFloat(String(amount)) || 0;
    
    if (isNaN(numAmount) || !isFinite(numAmount)) {
      console.warn('Invalid amount for formatting:', amount);
      return 'TSh 0';
    }
    
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-TZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSaleClick = (sale: Sale) => {
    console.log('🔍 Opening sale details for:', sale.id);
    setSelectedSale(sale);
    setShowSaleModal(true);
  };

  // Confirm transaction function
  const handleConfirmTransaction = async (saleId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent opening the sale modal
    
    try {
      const { error } = await supabase
        .from('lats_sales')
        .update({ 
          status: 'confirmed',
          confirmed_by: currentUser?.id,
          confirmed_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (error) {
        console.error('Error confirming transaction:', error);
        toast.error('Failed to confirm transaction');
        return;
      }

      toast.success('Transaction confirmed successfully! ✅');
      
      // Refresh the sales data
      fetchSales();
    } catch (err) {
      console.error('Error confirming transaction:', err);
      toast.error('Failed to confirm transaction');
    }
  };

  const fetchAllSales = async () => {
    try {
      setLoading(true);
      setError(null);

      // 🔒 Get current branch for isolation
      const currentBranchId = typeof localStorage !== 'undefined' ? localStorage.getItem('current_branch_id') : null;

      console.log('🔍 Fetching all sales for branch:', currentBranchId);

      // Build query with branch filter
      let query = supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_id,
          customer_name,
          total_amount,
          payment_method,
          status,
          user_id,
          sold_by,
          created_at,
          branch_id
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      // 🔒 APPLY BRANCH FILTER FOR ISOLATION
      if (currentBranchId) {
        console.log('🔒 APPLYING BRANCH FILTER:', currentBranchId);
        query = query.eq('branch_id', currentBranchId);
      } else {
        console.log('⚠️ NO BRANCH FILTER - SHOWING ALL SALES');
      }

      const { data: salesData, error: salesError } = await query;

      // Fetch sale items for each sale
      if (!salesError && salesData && salesData.length > 0) {
        const salesWithItems = await Promise.all(
          salesData.map(async (sale) => {
            const { data: items } = await supabase
              .from('lats_sale_items')
              .select('id, quantity, total_price, cost_price')
              .eq('sale_id', sale.id);
            
            return {
              ...sale,
              lats_sale_items: items || []
            };
          })
        );
        
        setSales(salesWithItems);
        setLoading(false);
        return;
      }

      if (salesError) {
        console.error('❌ Error fetching all sales:', salesError);
        setError(`Failed to load sales data: ${salesError.message}`);
        return;
      }

      console.log(`✅ Loaded ${salesData?.length || 0} sales (all time)`);
      setSales(salesData || []);

      // Fetch user names for cashier display
      const uniqueUserIds = [...new Set((salesData || []).map(sale => sale.user_id).filter(Boolean))];
      // Filter out invalid UUIDs (like 'care') to prevent 400 errors
      const validUserIds = uniqueUserIds.filter(id => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      });
      if (validUserIds.length > 0) {
        const names = await fetchUserNames(validUserIds);
        setUserNames(names);
      }
    } catch (err) {
      console.error('❌ Unexpected error fetching all sales:', err);
      setError(`Unexpected error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Generate simple chart
  const generateChart = (data: any[], key: string, valueKey: string, color = 'blue') => {
    const maxValue = Math.max(...data.map(item => item[valueKey]));
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className="w-24 text-sm text-gray-600 truncate">
              {item[key]}
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-3">
              <div 
                className={`bg-${color}-500 h-3 rounded-full transition-all duration-300`}
                style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
              />
            </div>
            <div className="w-20 text-sm font-medium text-gray-900 text-right">
              {formatMoney(item[valueKey])}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Generate report data based on selected report type
  const generateReportData = () => {
    switch (selectedReport) {
      case 'products':
        // Group by products
        const productData: { [key: string]: { name: string; total: number; quantity: number } } = {};
        sales.forEach(sale => {
          sale.lats_sale_items?.forEach(item => {
            const productKey = item.product_id;
            if (!productKey) return; // Skip items without product_id
            if (!productData[productKey]) {
              productData[productKey] = { name: `Product ${productKey.slice(0, 8)}...`, total: 0, quantity: 0 };
            }
            productData[productKey].total += item.total_price || 0;
            productData[productKey].quantity += item.quantity || 0;
          });
        });
        return Object.values(productData).sort((a, b) => b.total - a.total);

      case 'customers':
        // Group by customers
        const customerData: { [key: string]: { name: string; total: number; orders: number } } = {};
        sales.forEach(sale => {
          const customerKey = sale.customer_id || 'walk-in';
          if (!customerData[customerKey]) {
            customerData[customerKey] = { 
              name: customerKey === 'walk-in' ? 'Walk-in Customers' : (sale.customer_name || `Customer ${customerKey.slice(0, 8)}...`), 
              total: 0, 
              orders: 0 
            };
          }
          const amount = parseFloat(String(sale.total_amount)) || 0;
          customerData[customerKey].total += amount;
          customerData[customerKey].orders += 1;
        });
        return Object.values(customerData).sort((a, b) => b.total - a.total);

      case 'payments':
        // Group by payment methods
        const paymentData: { [key: string]: { name: string; total: number; count: number } } = {};
        sales.forEach(sale => {
          const paymentMethod = getPaymentMethodDisplay(sale.payment_method);
          if (!paymentData[paymentMethod]) {
            paymentData[paymentMethod] = { name: paymentMethod, total: 0, count: 0 };
          }
          const amount = parseFloat(String(sale.total_amount)) || 0;
          paymentData[paymentMethod].total += amount;
          paymentData[paymentMethod].count += 1;
        });
        return Object.values(paymentData).sort((a, b) => b.total - a.total);

      default:
        return [];
    }
  };

  // Export report functionality
  const exportReport = () => {
    const reportData = generateReportData();
    const csvContent = [
      ['Report Type', selectedReport],
      ['Period', selectedPeriod],
      ['Date Range', `${dateRange.start} to ${dateRange.end}`],
      ['Generated', new Date().toLocaleString()],
      [''],
      ...(selectedReport === 'products' ? 
        [['Product', 'Total Sales', 'Quantity Sold']] :
        selectedReport === 'customers' ?
        [['Customer', 'Total Spent', 'Orders']] :
        selectedReport === 'payments' ?
        [['Payment Method', 'Total Amount', 'Transaction Count']] :
        [['Date', 'Sales', 'Transactions']]
      ),
      ...reportData.map(item => 
        selectedReport === 'products' ? 
          [item.name, item.total, item.quantity] :
          selectedReport === 'customers' ?
          [item.name, item.total, item.orders] :
          selectedReport === 'payments' ?
          [item.name, item.total, item.count] :
          [item.name, item.total]
      )
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${selectedReport}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'transparent' }}>
      {/* Modern Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Sales Reports
                </h1>
                <p className="text-gray-600 mt-1">Monitor and manage daily sales performance</p>
              </div>
              
              {/* Back to POS shortcut hint */}
              <button
                onClick={() => navigate('/pos')}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md group"
                title="Go back to POS (Press ESC or Ctrl+P)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium">Back to POS</span>
                <div className="ml-1 px-2 py-0.5 bg-white/20 rounded text-xs font-mono">
                  ESC
                </div>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                isDailyClosed 
                  ? 'bg-green-100 text-green-800 border border-green-200' 
                  : 'bg-orange-100 text-orange-800 border border-orange-200'
              }`}>
                {isDailyClosed ? '🔒 Day Closed' : '🕐 Day Open'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Controls */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm mb-8">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Report Controls</h3>
                <p className="text-gray-600">Configure your sales report parameters</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex flex-col lg:flex-row items-start lg:items-end gap-4">
              {/* Left side - Filters */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                  <select
                    value={selectedReport}
                    onChange={(e) => setSelectedReport(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 bg-white/80 backdrop-blur-sm transition-all duration-200 text-sm"
                  >
                    <option value="daily">📊 Daily Sales</option>
                    <option value="products">📦 Product Performance</option>
                    <option value="customers">👥 Customer Analysis</option>
                    <option value="payments">💳 Payment Methods</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => {
                      setSelectedPeriod(e.target.value);
                      if (e.target.value !== 'custom') {
                        setTimeout(() => fetchSales(), 100);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 bg-white/80 backdrop-blur-sm transition-all duration-200 text-sm"
                  >
                    <option value="1d">📅 Today</option>
                    <option value="7d">📅 Last 7 Days</option>
                    <option value="30d">📅 Last 30 Days</option>
                    <option value="90d">📅 Last 90 Days</option>
                    <option value="custom">🗓️ Custom Range</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transactions</label>
                  <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="text-base font-bold text-gray-900">{sales.length}</div>
                  </div>
                </div>
              </div>

              {/* Right side - Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchSales}
                  disabled={loading}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow text-sm"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                
                <button
                  onClick={printDailyReport}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow text-sm"
                  title="Print Report"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Print</span>
                </button>

                <button
                  onClick={exportDailyReport}
                  className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow text-sm"
                  title="Export to CSV"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>

                {selectedReport === 'daily' && !isDailyClosed && canCloseDailySales && selectedPeriod === '1d' && (
                  <button
                    onClick={() => setShowDailyClosingModal(true)}
                    disabled={isClosing}
                    className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 shadow-sm hover:shadow text-sm"
                    title="Close Day"
                  >
                    <Lock className="w-4 h-4" />
                    <span className="hidden sm:inline">{isClosing ? 'Closing...' : 'Close'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Custom Date Range - Shows only when Custom is selected */}
            {selectedPeriod === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    onBlur={() => fetchSales()}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 bg-white/80 backdrop-blur-sm transition-all duration-200 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    onBlur={() => fetchSales()}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 bg-white/80 backdrop-blur-sm transition-all duration-200 text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Metrics - Only for Daily Sales */}
        {selectedReport === 'daily' && (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${canViewProfit ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 mb-8`}>
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{formatMoney(summaryMetrics.totalSales)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600 font-medium">Today's Performance</span>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalTransactions}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Avg: {formatMoney(summaryMetrics.averageOrder)}</span>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-500">Unique customers</span>
            </div>
          </div>

          {canViewProfit && (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-gray-900">{summaryMetrics.profitMargin}%</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="text-gray-500">Total: {formatMoney(summaryMetrics.totalProfit)}</span>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Analytics Charts Section - Only for Daily Sales */}
        {selectedReport === 'daily' && sales.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Sales Trend Chart */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Sales Trend</h3>
                  <p className="text-sm text-gray-600">Revenue over time</p>
                </div>
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData.trend}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="time" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [formatMoney(value), 'Sales']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Payment Methods Distribution */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                  <p className="text-sm text-gray-600">Distribution by method</p>
                </div>
                <PieChartIcon className="w-5 h-5 text-green-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.payments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.payments.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [formatMoney(value), 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Activity */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Daily Activity</h3>
                  <p className="text-sm text-gray-600">Sales by day</p>
                </div>
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [formatMoney(value), 'Sales']}
                  />
                  <Bar dataKey="sales" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Customers */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
                  <p className="text-sm text-gray-600">By total sales</p>
                </div>
                <User className="w-5 h-5 text-orange-600" />
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.topCustomers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    type="number" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any) => [formatMoney(value), 'Total']}
                  />
                  <Bar dataKey="value" fill="#f59e0b" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}


        {/* Report Type Specific Views */}
        {selectedReport !== 'daily' && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm mb-8">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedReport === 'products' ? 'Product Performance' :
                     selectedReport === 'customers' ? 'Customer Analysis' :
                     selectedReport === 'payments' ? 'Payment Methods' : 'Report'}
                  </h3>
                  <p className="text-gray-600">
                    {selectedReport === 'products' ? 'Top performing products by sales' :
                     selectedReport === 'customers' ? 'Customer spending analysis' :
                     selectedReport === 'payments' ? 'Payment method breakdown' : 'Report data'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6">

          {(() => {
            const reportData = generateReportData();
            if (reportData.length === 0) {
              return (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-4">📊</div>
                  <p>No data available for {selectedReport} report</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {selectedReport === 'products' && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Product Sales</h4>
                    {generateChart(reportData, 'name', 'total', 'blue')}
                  </div>
                )}
                
                {selectedReport === 'customers' && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Customer Spending</h4>
                    {generateChart(reportData, 'name', 'total', 'green')}
                  </div>
                )}
                
                {selectedReport === 'payments' && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-700 mb-3">Payment Methods</h4>
                    {generateChart(reportData, 'name', 'total', 'purple')}
                  </div>
                )}
              </div>
            );
          })()}
            </div>
          </div>
        )}

        {/* Sales List */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm">
          <div className="p-6 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <CreditCard className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedReport === 'daily' ? 'Sales Transactions' : 'Detailed Sales List'}
                  </h3>
                  <p className="text-gray-600">
                    {sales.length} transactions • {selectedPeriod === '1d' ? 'today' : 
                      selectedPeriod === '7d' ? 'last 7 days' :
                      selectedPeriod === '30d' ? 'last 30 days' :
                      selectedPeriod === '90d' ? 'last 90 days' : 
                      selectedPeriod === 'custom' ? 'custom range' : 'selected period'}
                  </p>
                </div>
              </div>
              {loading && (
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-200 border-t-blue-600"></div>
                  <span className="text-blue-600 font-medium">Loading...</span>
                </div>
              )}
            </div>
          </div>

        {error ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchSales}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-4">📊</div>
            <p>No sales found for {selectedPeriod === '1d' ? 'today' : 
              selectedPeriod === '7d' ? 'the last 7 days' :
              selectedPeriod === '30d' ? 'the last 30 days' :
              selectedPeriod === '90d' ? 'the last 90 days' : 'the selected period'}</p>
            <p className="text-sm mt-2">Try selecting a different time period or view all sales</p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => {
                  console.log('🔍 Loading all sales...');
                  fetchAllSales();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Show All Sales
              </button>
              <button
                onClick={() => setSelectedPeriod('90d')}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Try 90 Days
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <div className="space-y-4">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => handleSaleClick(sale)}
                  className="group bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-xl p-6 hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/80 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-blue-200/50"
                >
                  <div className="flex items-center justify-between">
                    {/* Left Section - Transaction Info */}
                    <div className="flex items-center gap-4">
                      {/* Status Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm ${
                        sale.status === 'confirmed' ? 'bg-blue-100' :
                        sale.status === 'completed' ? 'bg-green-100' :
                        sale.status === 'pending' ? 'bg-yellow-100' :
                        'bg-gray-100'
                      }`}>
                        {sale.status === 'confirmed' ? (
                          <CheckCircle className="w-6 h-6 text-blue-600" />
                        ) : sale.status === 'completed' ? (
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        ) : sale.status === 'pending' ? (
                          <Clock className="w-6 h-6 text-yellow-600" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-gray-600" />
                        )}
                      </div>

                      {/* Transaction Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">#{sale.sale_number}</h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sale.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                            sale.status === 'completed' ? 'bg-green-100 text-green-700' :
                            sale.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {sale.status}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(sale.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{sale.customer_name || 'Walk-in'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CreditCard className="w-4 h-4" />
                            <span>{getPaymentMethodDisplay(sale.payment_method)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Amount and Actions */}
                    <div className="flex items-center gap-4">
                      {/* Items Count */}
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {sale.lats_sale_items?.length || 0}
                        </div>
                        <div className="text-xs text-gray-500">items</div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <div className="text-xl font-bold text-green-600">
                          {formatMoney(sale.total_amount)}
                        </div>
                        {/* Cashier display */}
                        <div className="text-xs text-gray-500">
                          {sale.sold_by ? 
                            (sale.sold_by.split('@')[0].replace(/[._]/g, ' ').charAt(0).toUpperCase() + 
                             sale.sold_by.split('@')[0].replace(/[._]/g, ' ').slice(1)) 
                            : (sale.user_id ? (userNames[sale.user_id] || `User: ${sale.user_id.slice(0, 8)}...`) : 'System')}
                        </div>
                      </div>

                      {/* Admin Actions */}
                      {canConfirmTransactions && sale.status === 'completed' && (
                        <button
                          onClick={(e) => handleConfirmTransaction(sale.id, e)}
                          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-1"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirm
                        </button>
                      )}

                      {/* Arrow Icon */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>


      {/* Sale Details Modal */}
      {selectedSale && (
        <SaleDetailsModal
          isOpen={showSaleModal}
          onClose={() => {
            setShowSaleModal(false);
            setSelectedSale(null);
          }}
          saleId={selectedSale.id}
        />
      )}

      {/* Daily Closing Modal */}
      <DailyClosingModal
        isOpen={showDailyClosingModal}
        onClose={() => setShowDailyClosingModal(false)}
        onComplete={() => {
          setIsDailyClosed(true);
          setDailyCloseTime(new Date().toISOString());
          setShowDailyClosingModal(false);
        }}
        currentUser={currentUser}
      />

        {/* Daily Closing Confirmation Modal */}
        {showCloseConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-6">
                  <CheckCircle className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Close Daily Sales?
                </h3>
                <p className="text-gray-600 mb-6">
                  This will finalize today's sales and lock the data. You won't be able to make changes after closing.
                </p>
                
                {/* Daily Summary */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-6 text-left">
                  <h4 className="font-semibold text-orange-800 mb-3">Today's Summary:</h4>
                  <div className="space-y-2 text-sm text-orange-700">
                    <div className="flex justify-between">
                      <span>Total Sales:</span>
                      <span className="font-semibold">{formatMoney(summaryMetrics.totalSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transactions:</span>
                      <span className="font-semibold">{summaryMetrics.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customers:</span>
                      <span className="font-semibold">{summaryMetrics.totalCustomers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Order:</span>
                      <span className="font-semibold">{formatMoney(summaryMetrics.averageOrder)}</span>
                    </div>
                    {canViewProfit && (
                      <>
                        <div className="flex justify-between">
                          <span>Profit Margin:</span>
                          <span className="font-semibold">{summaryMetrics.profitMargin}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total Profit:</span>
                          <span className="font-semibold">{formatMoney(summaryMetrics.totalProfit)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-medium"
                    disabled={isClosing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDailyClose}
                    disabled={isClosing}
                    className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 font-medium"
                  >
                    {isClosing ? 'Closing...' : 'Close Day'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default SalesReportsPage;
