import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import SearchBar from '../../shared/components/ui/SearchBar';
import GlassSelect from '../../shared/components/ui/GlassSelect';
import { 
  CreditCard, DollarSign, TrendingUp, BarChart3, Wallet, 
  RefreshCw, ChevronRight, Download, Activity, ArrowUpDown,
  Filter, Search, Calendar, FileText, Bell, Settings, Eye, EyeOff,
  Package, Users, Building, Smartphone, Clock, CheckCircle,
  AlertTriangle, TrendingDown, ArrowUpRight, ArrowDownRight, X,
  LayoutGrid, List, TestTube, PieChartIcon
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
  ResponsiveContainer
} from 'recharts';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { 
  paymentTrackingService,
  PaymentTransaction,
  PaymentMetrics,
  PaymentMethodSummary,
  DailySummary
} from '../../../lib/paymentTrackingService';
import { financialService, FinancialAnalytics } from '../../../lib/financialService';
import { paymentService, PaymentAnalytics, PaymentInsights } from '../services/PaymentService';
import { paymentProviderService, PaymentProvider } from '../../../lib/paymentProviderService';
import { enhancedPaymentService } from '../../../lib/enhancedPaymentService';
import { financeAccountService } from '../../../lib/financeAccountService';
import { currencyService } from '../../../lib/currencyService';

interface PaymentTrackingDashboardProps {
  onViewDetails?: (payment: PaymentTransaction) => void;
  onRefund?: (payment: PaymentTransaction) => void;
  onExport?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

const PaymentTrackingDashboard: React.FC<PaymentTrackingDashboardProps> = ({
  onViewDetails,
  onRefund,
  onExport,
  onNavigateToTab
}) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  
  // Payment data state
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalPayments: 0,
    totalAmount: 0,
    completedAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
    totalFees: 0,
    successRate: '0.0'
  });
  const [methodSummary, setMethodSummary] = useState<PaymentMethodSummary[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary[]>([]);
  
  // Enhanced comprehensive data states
  const [financialAnalytics, setFinancialAnalytics] = useState<FinancialAnalytics | null>(null);
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null);
  const [paymentInsights, setPaymentInsights] = useState<PaymentInsights | null>(null);
  const [paymentProviders, setPaymentProviders] = useState<PaymentProvider[]>([]);
  const [financeAccounts, setFinanceAccounts] = useState<any[]>([]);
  const [enhancedTransactions, setEnhancedTransactions] = useState<any[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  
  // Additional comprehensive data states
  const [customerPayments, setCustomerPayments] = useState<any[]>([]);
  const [purchaseOrderPayments, setPurchaseOrderPayments] = useState<any[]>([]);
  const [devicePayments, setDevicePayments] = useState<any[]>([]);
  const [repairPayments, setRepairPayments] = useState<any[]>([]);
  const [totalRevenueSummary, setTotalRevenueSummary] = useState<any>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  
  // Enhanced comprehensive data states for graphs
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [allFinanceAccounts, setAllFinanceAccounts] = useState<any[]>([]);
  const [allPaymentProviders, setAllPaymentProviders] = useState<any[]>([]);
  const [paymentMethodAnalytics, setPaymentMethodAnalytics] = useState<any[]>([]);
  const [currencyUsageStats, setCurrencyUsageStats] = useState<any[]>([]);
  const [dailyPaymentBreakdown, setDailyPaymentBreakdown] = useState<any[]>([]);
  const [paymentStatusAnalytics, setPaymentStatusAnalytics] = useState<any[]>([]);
  const [topCustomersByPayments, setTopCustomersByPayments] = useState<any[]>([]);
  const [paymentTrendsByHour, setPaymentTrendsByHour] = useState<any[]>([]);
  const [failedPaymentAnalysis, setFailedPaymentAnalysis] = useState<any[]>([]);

  // Chart data preparation with comprehensive database integration
  const chartData = useMemo(() => {
    // Daily performance data for line chart (enhanced with all payment sources)
    const dailyData = dailySummary.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: day.totalAmount,
      transactions: day.transactionCount,
      fullDate: day.date
    }));

    // Enhanced payment methods data combining all sources
    const allPayments = [
      ...payments,
      ...customerPayments,
      ...purchaseOrderPayments,
      ...devicePayments,
      ...repairPayments,
      ...paymentTransactions
    ];

    const methodTotals = allPayments.reduce((acc, payment) => {
      // Extract method from multiple possible locations including metadata
      const method = payment.method || 
                    payment.payment_method || 
                    payment.metadata?.method ||
                    payment.metadata?.payment_method ||
                    'unknown';
      if (!acc[method]) {
        acc[method] = { total: 0, count: 0 };
      }
      const paymentAmount = Number(payment.amount || payment.total_amount || 0);
      acc[method].total += isNaN(paymentAmount) ? 0 : paymentAmount;
      acc[method].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const totalAmount = Object.values(methodTotals).reduce((sum, method) => {
      const methodTotal = Number(method.total);
      return sum + (isNaN(methodTotal) ? 0 : methodTotal);
    }, 0);
    
    const methodsData = Object.entries(methodTotals).map(([method, data]) => {
      // Ensure method is a string and handle null/undefined cases
      const methodStr = method || 'unknown';
      const methodName = methodStr.charAt(0).toUpperCase() + methodStr.slice(1).replace(/_/g, ' ');
      
      return {
        name: methodName,
        value: data.total,
        count: data.count,
        percentage: totalAmount > 0 ? (data.total / totalAmount) * 100 : 0
      };
    }).sort((a, b) => b.value - a.value);

    // Enhanced payment status data from all sources
    const statusTotals = allPayments.reduce((acc, payment) => {
      const rawStatus = payment.status || payment.payment_status || 'unknown';
      // Normalize status to lowercase for consistent aggregation
      const status = String(rawStatus).toLowerCase();
      
      // Map 'success' to 'completed' for consistency
      const normalizedStatus = status === 'success' ? 'completed' : status;
      
      if (!acc[normalizedStatus]) {
        acc[normalizedStatus] = { total: 0, count: 0 };
      }
      const paymentAmount = Number(payment.amount || payment.total_amount || 0);
      acc[normalizedStatus].total += isNaN(paymentAmount) ? 0 : paymentAmount;
      acc[normalizedStatus].count += 1;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    // Debug logging
    if (allPayments.length > 0) {
      console.log('📊 Payment Status Aggregation:', {
        totalPayments: allPayments.length,
        statusTotals,
        sampleStatuses: allPayments.slice(0, 5).map(p => p.status || p.payment_status)
      });
    }

    const statusData = [
      {
        status: 'Completed',
        amount: statusTotals.completed?.total || 0,
        count: statusTotals.completed?.count || 0,
        color: '#10B981'
      },
      {
        status: 'Pending',
        amount: statusTotals.pending?.total || 0,
        count: statusTotals.pending?.count || 0,
        color: '#F59E0B'
      },
      {
        status: 'Failed',
        amount: statusTotals.failed?.total || 0,
        count: statusTotals.failed?.count || 0,
        color: '#EF4444'
      }
    ].filter(item => item.amount > 0 || item.count > 0); // Only show statuses with data

    // Monthly trends data for additional insights
    const monthlyData = monthlyTrends.map(trend => ({
      month: new Date(trend.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      amount: trend.total_amount || 0,
      transactions: trend.transaction_count || 0,
      fullDate: trend.month
    }));

    // Enhanced analytics data
    const currencyData = currencyUsageStats.map(currency => ({
      currency: currency.currency_code,
      amount: currency.total_amount,
      count: currency.transaction_count,
      percentage: currency.percentage
    }));

    const hourlyData = paymentTrendsByHour.map(hour => ({
      hour: `${hour.hour}:00`,
      amount: hour.total_amount,
      transactions: hour.transaction_count
    }));

    const customerData = topCustomersByPayments.map(customer => ({
      name: customer.customer_name,
      amount: customer.total_amount,
      transactions: customer.transaction_count
    }));

    const failedPaymentData = failedPaymentAnalysis.map(failure => ({
      reason: failure.failure_reason,
      count: failure.failure_count,
      amount: failure.total_amount
    }));

    const dailyBreakdownData = dailyPaymentBreakdown.map(day => ({
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      amount: day.total_amount,
      transactions: day.transaction_count,
      methods: day.method_breakdown
    }));

    return {
      dailyData,
      methodsData,
      statusData,
      monthlyData,
      currencyData,
      hourlyData,
      customerData,
      failedPaymentData,
      dailyBreakdownData,
      totalPayments: allPayments.length,
      totalRevenue: totalAmount,
      totalAccounts: allFinanceAccounts.length,
      totalProviders: allPaymentProviders.length
    };
  }, [
    dailySummary, methodSummary, metrics, payments, customerPayments, 
    purchaseOrderPayments, devicePayments, repairPayments, monthlyTrends,
    paymentTransactions, currencyUsageStats, paymentTrendsByHour, 
    topCustomersByPayments, failedPaymentAnalysis, dailyPaymentBreakdown,
    allFinanceAccounts, allPaymentProviders
  ]);

  // Chart colors
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  // Fetch comprehensive payment data from all available sources
  const fetchPaymentData = useCallback(async () => {
    console.log('🔄 PaymentTracking: Fetching comprehensive payment data from all database sources...');
    setIsLoading(true);
    try {
      // Check if user is authenticated first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn('User not authenticated, skipping payment data fetch');
        setIsLoading(false);
        return;
      }
      // Fetch data from all available services and direct database queries in parallel
      const [
        paymentsData, 
        metricsData, 
        methodSummaryData, 
        dailySummaryData,
        financialAnalyticsData,
        paymentAnalyticsData,
        paymentInsightsData,
        paymentProvidersData,
        financeAccountsData,
        enhancedTransactionsData,
        currencyData,
        currencyStatsData,
        // Additional database queries for comprehensive data
        customerPaymentsData,
        purchaseOrderPaymentsData,
        devicePaymentsData,
        repairPaymentsData,
        paymentTransactionsData,
        allFinanceAccountsData,
        allPaymentProvidersData
      ] = await Promise.allSettled([
        // Core payment tracking data
        paymentTrackingService.debouncedFetchPaymentTransactions(
          selectedDate || undefined, 
          selectedDate || undefined, 
          statusFilter !== 'all' ? statusFilter : undefined, 
          methodFilter !== 'all' ? methodFilter : undefined
        ),
        paymentTrackingService.calculatePaymentMetrics(selectedDate || undefined, selectedDate || undefined),
        paymentTrackingService.getPaymentMethodSummary(selectedDate || undefined, selectedDate || undefined),
        paymentTrackingService.getDailySummary(7),
        
        // Enhanced financial analytics
        financialService.getComprehensiveFinancialData(),
        paymentService.getPaymentAnalytics(selectedDate || undefined, selectedDate || undefined),
        paymentService.getPaymentInsights(),
        paymentProviderService.getPaymentProviders(),
        financeAccountService.getActiveFinanceAccounts(),
        enhancedPaymentService.getPaymentTransactionsForAccount('all', 1000, 0),
        currencyService.getCurrenciesUsedInPayments(),
        currencyService.getCurrencyStatistics(),
        
        // Additional comprehensive database queries with error handling
        supabase.from('customer_payments').select('*').order('created_at', { ascending: false }).limit(500).then(r => r.error ? { data: [], error: r.error } : r),
        supabase.from('purchase_order_payments').select('*').order('created_at', { ascending: false }).limit(500).then(r => r.error ? { data: [], error: r.error } : r),
        // Use customer_payments as device_payments (filtered for device payments)
        supabase.from('customer_payments').select('*').not('device_id', 'is', null).order('created_at', { ascending: false }).limit(500).then(r => r.error ? { data: [], error: r.error } : r),
        // Use customer_payments as repair_payments (filtered for repair context)
        supabase.from('customer_payments').select('*').not('device_id', 'is', null).order('created_at', { ascending: false }).limit(500).then(r => r.error ? { data: [], error: r.error } : r),
        // Additional comprehensive data queries with graceful error handling
        supabase.from('payment_transactions').select('*').order('created_at', { ascending: false }).limit(1000).then(r => r.error ? { data: [], error: r.error } : r),
        supabase.from('finance_accounts').select('*').order('created_at', { ascending: false }).then(r => r.error ? { data: [], error: r.error } : r),
        supabase.from('payment_providers').select('*').order('created_at', { ascending: false }).then(r => r.error ? { data: [], error: r.error } : r)
      ]);

      // Handle each result individually with comprehensive error handling
      if (paymentsData.status === 'fulfilled') {
        setPayments(paymentsData.value);
        console.log(`✅ Fetched ${paymentsData.value.length} payment transactions`);
      } else {
        console.error('Failed to fetch payments:', paymentsData.reason);
        // Keep existing payments data if fetch fails
      }

      if (metricsData.status === 'fulfilled') {
        setMetrics(metricsData.value);
        console.log('✅ Fetched payment metrics');
      } else {
        console.error('Failed to fetch metrics:', metricsData.reason);
        // Keep existing metrics if fetch fails
      }

      if (methodSummaryData.status === 'fulfilled') {
        setMethodSummary(methodSummaryData.value);
        console.log('✅ Fetched payment method summary');
      } else {
        console.error('Failed to fetch method summary:', methodSummaryData.reason);
        // Keep existing method summary if fetch fails
      }

      if (dailySummaryData.status === 'fulfilled') {
        setDailySummary(dailySummaryData.value);
        console.log('✅ Fetched daily summary');
      } else {
        console.error('Failed to fetch daily summary:', dailySummaryData.reason);
        // Keep existing daily summary if fetch fails
      }

      // Handle enhanced financial analytics
      if (financialAnalyticsData.status === 'fulfilled') {
        setFinancialAnalytics(financialAnalyticsData.value);
        console.log('✅ Fetched comprehensive financial analytics');
      } else {
        console.error('Failed to fetch financial analytics:', financialAnalyticsData.reason);
      }

      // Handle payment analytics
      if (paymentAnalyticsData.status === 'fulfilled') {
        setPaymentAnalytics(paymentAnalyticsData.value);
        console.log('✅ Fetched payment analytics');
      } else {
        console.error('Failed to fetch payment analytics:', paymentAnalyticsData.reason);
      }

      // Handle payment insights
      if (paymentInsightsData.status === 'fulfilled') {
        setPaymentInsights(paymentInsightsData.value);
        console.log('✅ Fetched payment insights');
      } else {
        console.error('Failed to fetch payment insights:', paymentInsightsData.reason);
      }

      // Handle payment providers
      if (paymentProvidersData.status === 'fulfilled') {
        setPaymentProviders(paymentProvidersData.value);
        console.log(`✅ Fetched ${paymentProvidersData.value.length} payment providers`);
      } else {
        console.error('Failed to fetch payment providers:', paymentProvidersData.reason);
      }

      // Handle finance accounts
      if (financeAccountsData.status === 'fulfilled') {
        setFinanceAccounts(financeAccountsData.value);
        console.log(`✅ Fetched ${financeAccountsData.value.length} finance accounts`);
      } else {
        console.error('Failed to fetch finance accounts:', financeAccountsData.reason);
      }

      // Handle enhanced transactions
      if (enhancedTransactionsData.status === 'fulfilled') {
        setEnhancedTransactions(enhancedTransactionsData.value);
        console.log(`✅ Fetched ${enhancedTransactionsData.value.length} enhanced transactions`);
      } else {
        console.error('Failed to fetch enhanced transactions:', enhancedTransactionsData.reason);
      }

      // Handle currency data
      if (currencyData.status === 'fulfilled') {
        setAvailableCurrencies(currencyData.value);
        console.log(`✅ Fetched ${currencyData.value.length} available currencies`);
      } else {
        console.error('Failed to fetch available currencies:', currencyData.reason);
      }

      // Handle additional comprehensive database results
      if (customerPaymentsData.status === 'fulfilled') {
        setCustomerPayments(customerPaymentsData.value.data || []);
        console.log(`✅ Fetched ${customerPaymentsData.value.data?.length || 0} customer payments`);
      } else {
        console.error('Failed to fetch customer payments:', customerPaymentsData.reason);
      }

      if (purchaseOrderPaymentsData.status === 'fulfilled') {
        setPurchaseOrderPayments(purchaseOrderPaymentsData.value.data || []);
        console.log(`✅ Fetched ${purchaseOrderPaymentsData.value.data?.length || 0} purchase order payments`);
      } else {
        console.error('Failed to fetch purchase order payments:', purchaseOrderPaymentsData.reason);
      }

      if (devicePaymentsData.status === 'fulfilled') {
        setDevicePayments(devicePaymentsData.value.data || []);
        console.log(`✅ Fetched ${devicePaymentsData.value.data?.length || 0} device payments`);
      } else {
        console.error('Failed to fetch device payments:', devicePaymentsData.reason);
      }

      if (repairPaymentsData.status === 'fulfilled') {
        setRepairPayments(repairPaymentsData.value.data || []);
        console.log(`✅ Fetched ${repairPaymentsData.value.data?.length || 0} repair payments`);
      } else {
        console.error('Failed to fetch repair payments:', repairPaymentsData.reason);
      }

      if (paymentTransactionsData.status === 'fulfilled') {
        setPaymentTransactions(paymentTransactionsData.value.data || []);
        console.log(`✅ Fetched ${paymentTransactionsData.value.data?.length || 0} payment transactions`);
      } else {
        console.error('Failed to fetch payment transactions:', paymentTransactionsData.reason);
      }

      if (allFinanceAccountsData.status === 'fulfilled') {
        setAllFinanceAccounts(allFinanceAccountsData.value.data || []);
        console.log(`✅ Fetched ${allFinanceAccountsData.value.data?.length || 0} finance accounts`);
      } else {
        console.error('Failed to fetch finance accounts:', allFinanceAccountsData.reason);
      }

      if (allPaymentProvidersData.status === 'fulfilled') {
        setAllPaymentProviders(allPaymentProvidersData.value.data || []);
        console.log(`✅ Fetched ${allPaymentProvidersData.value.data?.length || 0} payment providers`);
      } else {
        console.error('Failed to fetch payment providers:', allPaymentProvidersData.reason);
      }

      // Process currency statistics for charts
      if (currencyStatsData.status === 'fulfilled') {
        const currencyStats = currencyStatsData.value;
        
        // Handle empty statistics gracefully
        if (Object.keys(currencyStats).length === 0) {
          console.log('ℹ️ No currency statistics data available (this is normal if using single currency)');
          setCurrencyUsageStats([]);
        } else {
          const currencyArray = Object.entries(currencyStats).map(([currency_code, stats]: [string, any]) => ({
            currency_code,
            total_amount: stats.totalAmount || 0,
            transaction_count: stats.count || 0,
            percentage: 0 // Will be calculated below
          }));
          
          const totalCurrencyAmount = currencyArray.reduce((sum, c) => sum + c.total_amount, 0);
          currencyArray.forEach(c => {
            c.percentage = totalCurrencyAmount > 0 ? (c.total_amount / totalCurrencyAmount) * 100 : 0;
          });
          
          setCurrencyUsageStats(currencyArray);
          console.log(`✅ Processed ${currencyArray.length} currency statistics`);
        }
      } else {
        console.warn('⚠️ Currency statistics unavailable (dashboard will work without it)');
        setCurrencyUsageStats([]);
      }

      // Generate analytics from all collected payment data
      const allPaymentsList = [
        ...(paymentsData.status === 'fulfilled' ? paymentsData.value : []),
        ...(customerPaymentsData.status === 'fulfilled' ? (customerPaymentsData.value.data || []) : []),
        ...(purchaseOrderPaymentsData.status === 'fulfilled' ? (purchaseOrderPaymentsData.value.data || []) : []),
        ...(paymentTransactionsData.status === 'fulfilled' ? (paymentTransactionsData.value.data || []) : [])
      ];

      console.log(`📊 Processing analytics from ${allPaymentsList.length} total payments`);

      // Generate hourly trends
      const hourlyTrends: any[] = [];
      const hourlyBuckets: Record<number, { total_amount: number; transaction_count: number }> = {};
      
      allPaymentsList.forEach((payment: any) => {
        const dateField = payment.payment_date || payment.created_at || payment.date;
        if (dateField) {
          const hour = new Date(dateField).getHours();
          if (!hourlyBuckets[hour]) {
            hourlyBuckets[hour] = { total_amount: 0, transaction_count: 0 };
          }
          hourlyBuckets[hour].total_amount += Number(payment.amount || payment.total_amount || 0);
          hourlyBuckets[hour].transaction_count += 1;
        }
      });

      for (let hour = 0; hour < 24; hour++) {
        hourlyTrends.push({
          hour,
          total_amount: hourlyBuckets[hour]?.total_amount || 0,
          transaction_count: hourlyBuckets[hour]?.transaction_count || 0
        });
      }
      setPaymentTrendsByHour(hourlyTrends);
      console.log(`✅ Generated hourly trends with ${hourlyTrends.filter(h => h.transaction_count > 0).length} active hours`);

      // Generate top customers by payments
      const customerTotals: Record<string, { customer_name: string; total_amount: number; transaction_count: number }> = {};
      
      allPaymentsList.forEach((payment: any) => {
        const customerId = payment.customer_id || payment.customerId || payment.customer_email || payment.customer_phone || 'unknown';
        const customerName = payment.customer_name || 
                            payment.customerName || 
                            payment.customers?.name || 
                            payment.customer_email ||
                            `Customer ${String(customerId).substring(0, 8)}`;
        
        // Skip if customer name is invalid
        if (!customerName || customerName === 'unknown' || customerName.includes('undefined')) {
          return;
        }
        
        if (!customerTotals[customerId]) {
          customerTotals[customerId] = {
            customer_name: customerName,
            total_amount: 0,
            transaction_count: 0
          };
        }
        
        customerTotals[customerId].total_amount += Number(payment.amount || payment.total_amount || 0);
        customerTotals[customerId].transaction_count += 1;
      });

      const topCustomers = Object.values(customerTotals)
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 20);
      
      setTopCustomersByPayments(topCustomers);
      console.log(`✅ Generated top ${topCustomers.length} customers`);

      // Generate failed payment analysis
      const failedPayments = allPaymentsList.filter((p: any) => 
        p.status === 'failed' || p.payment_status === 'failed'
      );
      
      const failureReasons: Record<string, { failure_count: number; total_amount: number }> = {};
      
      failedPayments.forEach((payment: any) => {
        // Extract failure reason from multiple possible locations including metadata
        const reason = payment.failure_reason || 
                      payment.metadata?.failure_reason || 
                      payment.notes || 
                      payment.error_message ||
                      'Unknown Reason';
        if (!failureReasons[reason]) {
          failureReasons[reason] = { failure_count: 0, total_amount: 0 };
        }
        failureReasons[reason].failure_count += 1;
        failureReasons[reason].total_amount += Number(payment.amount || payment.total_amount || 0);
      });

      const failedPaymentAnalysisList = Object.entries(failureReasons).map(([failure_reason, data]) => ({
        failure_reason,
        failure_count: data.failure_count,
        total_amount: data.total_amount
      }));

      setFailedPaymentAnalysis(failedPaymentAnalysisList);
      console.log(`✅ Generated failed payment analysis with ${failedPaymentAnalysisList.length} failure reasons`);

      // Generate daily payment breakdown (last 30 days)
      const dailyBuckets: Record<string, { total_amount: number; transaction_count: number; method_breakdown: Record<string, number> }> = {};
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      allPaymentsList.forEach((payment: any) => {
        const dateField = payment.payment_date || payment.created_at || payment.date;
        if (dateField) {
          const paymentDate = new Date(dateField);
          if (paymentDate >= thirtyDaysAgo) {
            const dateKey = paymentDate.toISOString().split('T')[0];
            
            if (!dailyBuckets[dateKey]) {
              dailyBuckets[dateKey] = {
                total_amount: 0,
                transaction_count: 0,
                method_breakdown: {}
              };
            }
            
            const amount = Number(payment.amount || payment.total_amount || 0);
            dailyBuckets[dateKey].total_amount += amount;
            dailyBuckets[dateKey].transaction_count += 1;
            
            const method = payment.method || payment.payment_method || 'unknown';
            dailyBuckets[dateKey].method_breakdown[method] = 
              (dailyBuckets[dateKey].method_breakdown[method] || 0) + amount;
          }
        }
      });

      const dailyBreakdown = Object.entries(dailyBuckets)
        .map(([date, data]) => ({
          date,
          total_amount: data.total_amount,
          transaction_count: data.transaction_count,
          method_breakdown: data.method_breakdown
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setDailyPaymentBreakdown(dailyBreakdown);
      console.log(`✅ Generated daily breakdown for ${dailyBreakdown.length} days`);

      // Generate monthly trends (last 12 months)
      const monthlyBuckets: Record<string, { total_amount: number; transaction_count: number }> = {};
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      allPaymentsList.forEach((payment: any) => {
        const dateField = payment.payment_date || payment.created_at || payment.date;
        if (dateField) {
          const paymentDate = new Date(dateField);
          if (paymentDate >= twelveMonthsAgo) {
            const monthKey = `${paymentDate.getFullYear()}-${String(paymentDate.getMonth() + 1).padStart(2, '0')}-01`;
            
            if (!monthlyBuckets[monthKey]) {
              monthlyBuckets[monthKey] = {
                total_amount: 0,
                transaction_count: 0
              };
            }
            
            monthlyBuckets[monthKey].total_amount += Number(payment.amount || payment.total_amount || 0);
            monthlyBuckets[monthKey].transaction_count += 1;
          }
        }
      });

      const monthlyTrendsList = Object.entries(monthlyBuckets)
        .map(([month, data]) => ({
          month,
          total_amount: data.total_amount,
          transaction_count: data.transaction_count
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      setMonthlyTrends(monthlyTrendsList);
      console.log(`✅ Generated monthly trends for ${monthlyTrendsList.length} months`);

      // Show success message if most requests succeeded
      const successCount = [
        paymentsData, metricsData, methodSummaryData, dailySummaryData,
        financialAnalyticsData, paymentAnalyticsData, paymentInsightsData,
        paymentProvidersData, financeAccountsData, enhancedTransactionsData, currencyData, currencyStatsData,
        customerPaymentsData, purchaseOrderPaymentsData, devicePaymentsData, 
        repairPaymentsData, paymentTransactionsData, allFinanceAccountsData, allPaymentProvidersData
      ].filter(result => result.status === 'fulfilled').length;

      if (successCount >= 10) {
        console.log(`✅ Successfully loaded ${successCount}/19 comprehensive data sources from database`);
      } else {
        toast.error('Some payment data failed to load. Check your connection.');
      }
    } catch (error) {
      console.error('Error fetching payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, statusFilter, methodFilter]);

  // Auto-refresh setup
  useEffect(() => {
    fetchPaymentData();
    
    if (autoRefresh) {
      const interval = setInterval(fetchPaymentData, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchPaymentData, autoRefresh]);

  // Debounced fetch function for real-time updates
  const debouncedFetch = useCallback(() => {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = setTimeout(() => {
      fetchPaymentData();
    }, 2000); // 2 second debounce
  }, [fetchPaymentData]);

  // Real-time subscriptions with comprehensive table coverage
  useEffect(() => {
    if (!autoRefresh) return;

    let paymentsSubscription: any;
    let reconnectTimeout: NodeJS.Timeout;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 2; // Reduced to 2 attempts
    const baseReconnectDelay = 10000; // Increased to 10 seconds for stability
    let isSubscribed = false;
    let isConnecting = false;
    let lastConnectionAttempt = 0;
    const connectionCooldown = 5000; // 5 second cooldown between attempts

    const setupSubscription = () => {
      // Prevent rapid reconnection attempts
      const now = Date.now();
      if (isConnecting || (now - lastConnectionAttempt < connectionCooldown)) {
        console.log('⏳ PaymentTracking: Connection cooldown active, skipping setup');
        return;
      }

      try {
        isConnecting = true;
        lastConnectionAttempt = now;

        // Clean up existing subscription first
        if (paymentsSubscription) {
          paymentsSubscription.unsubscribe();
        }

        paymentsSubscription = supabase
          .channel('comprehensive-payment-tracking-updates')
          // Core payment tables
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_payments' }, (payload) => {
            console.log('🔔 Customer payment update received:', payload);
            debouncedFetch();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'lats_sales' }, (payload) => {
            console.log('🔔 POS sale update received:', payload);
            debouncedFetch();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'lats_sale_items' }, (payload) => {
            console.log('🔔 Sale item update received:', payload);
            debouncedFetch();
          })
          // Financial and account tables
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_accounts' }, (payload) => {
            console.log('🔔 Finance account update received:', payload);
            debouncedFetch();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_transactions' }, (payload) => {
            console.log('🔔 Finance transaction update received:', payload);
            debouncedFetch();
          })
          // Customer and device tables
          .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, (payload) => {
            console.log('🔔 Customer update received:', payload);
            debouncedFetch();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'devices' }, (payload) => {
            console.log('🔔 Device update received:', payload);
            debouncedFetch();
          })
          // Audit and compliance tables
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_audit_log' }, (payload) => {
            console.log('🔔 Payment audit log update received:', payload);
            debouncedFetch();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_reconciliation' }, (payload) => {
            console.log('🔔 Payment reconciliation update received:', payload);
            debouncedFetch();
          })
          .subscribe((status) => {
            console.log('📡 Subscription status:', status);
            isConnecting = false;
            
            if (status === 'SUBSCRIBED') {
              reconnectAttempts = 0; // Reset attempts on successful connection
              isSubscribed = true;
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              isSubscribed = false;
              
              // Only attempt reconnection if we haven't exceeded max attempts
              if (reconnectAttempts < maxReconnectAttempts) {
                console.warn('⚠️ Subscription closed, attempting to reconnect...');
                reconnectAttempts++;
                const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
                
                setTimeout(() => {
                  if (!isSubscribed && !isConnecting && autoRefresh) { // Double-check before reconnecting
                    setupSubscription();
                  }
                }, delay);
              } else {
                console.error('❌ Max reconnection attempts reached, stopping subscription');
              }
            }
          });
      } catch (error) {
        console.error('❌ Error setting up subscription:', error);
        isSubscribed = false;
        isConnecting = false;
        
        // Retry after delay with exponential backoff
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
          setTimeout(() => {
            if (!isSubscribed && !isConnecting && autoRefresh) { // Double-check before reconnecting
              setupSubscription();
            }
          }, delay);
        }
      }
    };

    // Initial setup with delay to prevent immediate connection
    setTimeout(() => {
      setupSubscription();
    }, 1000);

    return () => {
      clearTimeout(reconnectTimeout);
      isSubscribed = false;
      isConnecting = false;
      if (paymentsSubscription) {
        paymentsSubscription.unsubscribe();
      }
    };
  }, [fetchPaymentData, autoRefresh]);

  // Filter payments based on search query and filters
  const filteredPayments = useMemo(() => {
    let filtered = payments;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(payment => {
        return (
          payment.customerName.toLowerCase().includes(searchLower) ||
          payment.transactionId.toLowerCase().includes(searchLower) ||
          payment.reference.toLowerCase().includes(searchLower) ||
          payment.method.toLowerCase().includes(searchLower) ||
          (payment.currency && payment.currency.toLowerCase().includes(searchLower))
        );
      });
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }
    
    // Apply method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter(payment => payment.method === methodFilter);
    }
    
    // Apply currency filter
    if (currencyFilter !== 'all') {
      filtered = filtered.filter(payment => payment.currency === currencyFilter);
    }
    
    return filtered;
  }, [payments, searchQuery, statusFilter, methodFilter, currencyFilter]);

  // Format currency following user preference (no trailing zeros, show full numbers)
  const formatMoney = (amount: number | undefined | null) => {
    // Handle NaN, undefined, null, and Infinity
    const safeAmount = Number(amount);
    if (!isFinite(safeAmount) || isNaN(safeAmount)) {
      return new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(0);
    }
    
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(safeAmount);
  };

  // Handle payment actions
  const handlePaymentAction = async (paymentId: string, action: string, source: 'device_payment' | 'pos_sale' | 'repair_payment') => {
    try {
      let newStatus: 'completed' | 'pending' | 'failed' | 'stopped' | 'cancelled';
      
      if (action === 'confirm') {
        newStatus = 'completed';
      } else if (action === 'reject') {
        newStatus = 'failed';
      } else if (action === 'stop' || action === 'cancel') {
        newStatus = 'stopped';
      } else {
        return;
      }

      const success = await paymentTrackingService.updatePaymentStatus(paymentId, newStatus, source);
      
      if (success) {
        await fetchPaymentData();
        toast.success(`Payment ${action} successful`);
      } else {
        toast.error(`Failed to ${action} payment`);
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error(`Error updating payment: ${error}`);
    }
  };

  // Get status styling
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'approved':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-orange-600 bg-orange-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'stopped':
      case 'cancelled':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments Overview</h1>
          <p className="text-gray-600">Complete summary of all payment activities across your business</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPaymentData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-900">{formatMoney(chartData.totalRevenue || metrics.totalAmount)}</p>
              <p className="text-xs text-green-600 mt-1">{chartData.totalPayments || metrics.totalPayments} transactions</p>
            </div>
            <div className="p-3 bg-green-500 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Completed Payments</p>
              <p className="text-2xl font-bold text-blue-900">{formatMoney(metrics.completedAmount)}</p>
              <p className="text-xs text-blue-600 mt-1">{metrics.successRate}% success rate</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Pending Payments</p>
              <p className="text-2xl font-bold text-orange-900">{formatMoney(metrics.pendingAmount)}</p>
              <p className="text-xs text-orange-600 mt-1">Awaiting confirmation</p>
            </div>
            <div className="p-3 bg-orange-500 rounded-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Processing Fees</p>
              <p className="text-2xl font-bold text-purple-900">{formatMoney(metrics.totalFees)}</p>
              <p className="text-xs text-purple-600 mt-1">Total fees collected</p>
            </div>
            <div className="p-3 bg-purple-500 rounded-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
          </div>
        </GlassCard>
      </div>

      {/* System Status */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Database Status: All Systems Connected</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              {chartData.totalPayments} Total Transactions
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {paymentProviders.length} Providers
            </span>
            <span className="flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              {financeAccounts.length} Accounts
            </span>
            <span className="flex items-center gap-1">
              <Building className="w-4 h-4" />
              {availableCurrencies.length} Currencies
            </span>
          </div>
        </div>
      </GlassCard>

      {/* Comprehensive Charts Section */}
      <div className="grid grid-cols-1 gap-6">

        {/* Payment Status Bar Chart */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Status</h3>
              <p className="text-sm text-gray-600">Amount by status</p>
            </div>
            <Activity className="w-5 h-5 text-orange-600" />
          </div>
          <div className="h-64">
            {chartData.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.statusData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    type="number"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="status"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name, props) => [
                      formatMoney(value), 
                      `${props.payload.status} (${props.payload.count} transactions)`
                    ]}
                  />
                  <Bar dataKey="amount" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <Activity className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">No payment status data available</p>
                <p className="text-xs mt-1">Process payments to see status breakdown</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Additional Comprehensive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Pie Chart */}
        {chartData.methodsData.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                <p className="text-sm text-gray-600">Distribution by method</p>
              </div>
              <PieChartIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.methodsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.methodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name, props) => [
                      formatMoney(value), 
                      `${props.payload.name} (${props.payload.count} transactions)`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        )}

        {/* Currency Usage Chart */}
        {chartData.currencyData.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Currency Usage</h3>
                <p className="text-sm text-gray-600">Transactions by currency</p>
              </div>
              <Building className="w-5 h-5 text-purple-600" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.currencyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="currency" 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name, props) => [
                      formatMoney(value), 
                      `${props.payload.currency} (${props.payload.count} transactions)`
                    ]}
                  />
                  <Bar dataKey="amount" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        )}

        {/* Hourly Payment Trends */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Hourly Trends</h3>
              <p className="text-sm text-gray-600">Payment activity by hour</p>
            </div>
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          {chartData.hourlyData.filter(h => h.transaction_count > 0).length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name, props) => [
                      formatMoney(value), 
                      `Amount (${props.payload.transactions} transactions)`
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No hourly trend data available yet</p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Top Customers and Failed Payments Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers by Payments */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
              <p className="text-sm text-gray-600">Highest paying customers</p>
            </div>
            <Users className="w-5 h-5 text-green-600" />
          </div>
          {chartData.customerData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.customerData.slice(0, 10)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    type="number"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name, props) => [
                      formatMoney(value), 
                      `${props.payload.name} (${props.payload.transactions} transactions)`
                    ]}
                  />
                  <Bar dataKey="amount" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No customer payment data available yet</p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Failed Payment Analysis */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Failed Payments</h3>
              <p className="text-sm text-gray-600">Analysis of payment failures</p>
            </div>
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          {chartData.failedPaymentData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData.failedPaymentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ reason, count }) => `${reason} (${count})`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.failedPaymentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any, name, props) => [
                      `${value} failures`, 
                      `${props.payload.reason} (${formatMoney(props.payload.amount)} lost)`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-300" />
                <p className="font-medium text-green-600">Great! No failed payments</p>
                <p className="text-sm">All transactions are successful</p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Payment Methods Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Top Payment Methods</h3>
            </div>
            <button
              onClick={() => onNavigateToTab?.('providers')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {methodSummary.slice(0, 4).map((method) => {
              const methodName = method.method ? method.method.replace(/_/g, ' ') : 'unknown';
              return (
                <div key={method.method || 'unknown'} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      {method.method === 'cash' && <DollarSign className="w-4 h-4 text-orange-600" />}
                      {method.method === 'mobile_money' && <Smartphone className="w-4 h-4 text-green-600" />}
                      {method.method === 'card' && <CreditCard className="w-4 h-4 text-blue-600" />}
                      {method.method === 'bank_transfer' && <Building className="w-4 h-4 text-purple-600" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 capitalize">{methodName}</div>
                      <div className="text-xs text-gray-600">{method.count} transactions</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{formatMoney(method.totalAmount)}</div>
                    <div className="text-xs text-gray-500">{method.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            </div>
            <button
              onClick={() => onNavigateToTab?.('transactions')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {payments.slice(0, 5).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    payment.status === 'completed' ? 'bg-green-100' :
                    payment.status === 'pending' ? 'bg-orange-100' : 'bg-red-100'
                  }`}>
                    <CreditCard className={`w-4 h-4 ${
                      payment.status === 'completed' ? 'text-green-600' :
                      payment.status === 'pending' ? 'text-orange-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{payment.customerName}</div>
                    <div className="text-xs text-gray-600">{new Date(payment.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">{formatMoney(payment.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance Chart */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Daily Performance</h3>
              <p className="text-sm text-gray-600">Revenue trends over the last 7 days</p>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                Last 7 Days
              </button>
              <button className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                Last 30 Days
              </button>
            </div>
          </div>
          {chartData.dailyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyData}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [formatMoney(value), 'Amount']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No daily performance data available yet</p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Monthly Trends Chart */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Monthly Trends</h3>
              <p className="text-sm text-gray-600">Revenue trends over the last 12 months</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          {chartData.monthlyData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: any) => [formatMoney(value), 'Amount']}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No monthly trend data available yet</p>
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Comprehensive Analytics Section */}
      {(financialAnalytics || paymentAnalytics || paymentInsights) && (
        <div className="space-y-6">
          {/* Financial Analytics with Charts */}
          {financialAnalytics && (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-600">Total Revenue</p>
                      <p className="text-2xl font-bold text-blue-900">
                        {formatMoney(financialAnalytics?.summary?.totalRevenue || 0)}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Revenue Growth: {financialAnalytics?.summary?.revenueGrowth?.toFixed(1) || '0.0'}%
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-600">Total Expenses</p>
                      <p className="text-2xl font-bold text-orange-900">
                        {formatMoney(financialAnalytics?.summary?.totalExpenses || 0)}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">
                        Expense Growth: {financialAnalytics?.summary?.expenseGrowth?.toFixed(1) || '0.0'}%
                      </p>
                    </div>
                    <div className="p-3 bg-orange-500 rounded-lg">
                      <TrendingDown className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600">Net Profit</p>
                      <p className="text-2xl font-bold text-green-900">
                        {formatMoney(financialAnalytics?.summary?.netProfit || 0)}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Profit Growth: {financialAnalytics?.summary?.profitGrowth?.toFixed(1) || '0.0'}%
                      </p>
                    </div>
                    <div className="p-3 bg-green-500 rounded-lg">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </GlassCard>
              </div>

              {/* Financial Analytics Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue vs Expenses vs Profit Bar Chart */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Financial Overview</h3>
                      <p className="text-sm text-gray-600">Revenue, Expenses & Profit comparison</p>
                    </div>
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'Revenue',
                            value: financialAnalytics?.summary?.totalRevenue || 0,
                            color: '#3B82F6'
                          },
                          {
                            name: 'Expenses',
                            value: financialAnalytics?.summary?.totalExpenses || 0,
                            color: '#F59E0B'
                          },
                          {
                            name: 'Net Profit',
                            value: financialAnalytics?.summary?.netProfit || 0,
                            color: '#10B981'
                          }
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          dataKey="name" 
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: any) => [formatMoney(value), 'Amount']}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {[
                            { color: '#3B82F6' },
                            { color: '#F59E0B' },
                            { color: '#10B981' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>

                {/* Growth Trends Chart */}
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Growth Trends</h3>
                      <p className="text-sm text-gray-600">Year-over-year growth percentages</p>
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: 'Revenue Growth',
                            value: financialAnalytics?.summary?.revenueGrowth || 0,
                            color: '#3B82F6'
                          },
                          {
                            name: 'Expense Growth',
                            value: financialAnalytics?.summary?.expenseGrowth || 0,
                            color: '#F59E0B'
                          },
                          {
                            name: 'Profit Growth',
                            value: financialAnalytics?.summary?.profitGrowth || 0,
                            color: '#10B981'
                          }
                        ]}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis 
                          type="number"
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}%`}
                        />
                        <YAxis 
                          type="category"
                          dataKey="name"
                          stroke="#6B7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          width={120}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: any) => [`${value.toFixed(1)}%`, 'Growth']}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {[
                            { color: '#3B82F6' },
                            { color: '#F59E0B' },
                            { color: '#10B981' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlassCard>
              </div>

              {/* Financial Distribution Pie Chart */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Financial Distribution</h3>
                    <p className="text-sm text-gray-600">Revenue vs Expenses breakdown</p>
                  </div>
                  <PieChartIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          {
                            name: 'Revenue',
                            value: financialAnalytics?.summary?.totalRevenue || 0,
                            color: '#3B82F6'
                          },
                          {
                            name: 'Expenses',
                            value: financialAnalytics?.summary?.totalExpenses || 0,
                            color: '#F59E0B'
                          }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        label={({ name, value, percent }) => 
                          `${name}: ${formatMoney(value)} (${(percent * 100).toFixed(1)}%)`
                        }
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#3B82F6" />
                        <Cell fill="#F59E0B" />
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any) => [formatMoney(value), 'Amount']}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36}
                        formatter={(value) => value}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </GlassCard>
            </>
          )}

          {/* Payment Insights */}
          {paymentInsights && (
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment Insights</h3>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {paymentInsights?.topPaymentMethod || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-600">Top Method</div>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatMoney(paymentInsights?.averageTransactionValue || 0)}
                    </div>
                    <div className="text-xs text-gray-600">Avg Transaction</div>
                  </div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {paymentInsights?.peakHour || 'N/A'}
                  </div>
                  <div className="text-xs text-gray-600">Peak Hour</div>
                </div>
                <div className="text-sm text-gray-600">
                  <div>Success Rate: {paymentInsights?.successRate?.toFixed(1) || '0.0'}%</div>
                  <div>Failure Rate: {paymentInsights?.failureRate?.toFixed(1) || '0.0'}%</div>
                  <div>Refund Rate: {paymentInsights?.refundRate?.toFixed(1) || '0.0'}%</div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Payment Accounts Summary */}
      {financeAccounts.length > 0 && (
        <GlassCard className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Payment Accounts Summary</h3>
            <p className="text-sm text-gray-600">Overview of all payment accounts and balances</p>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {financeAccounts.length}
              </div>
              <div className="text-xs text-gray-600">Total Accounts</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {financeAccounts.filter(account => account.is_active).length}
              </div>
              <div className="text-xs text-gray-600">Active Accounts</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {formatMoney(financeAccounts.reduce((sum, account) => sum + (account.balance || 0), 0))}
              </div>
              <div className="text-xs text-gray-600">Total Balance</div>
            </div>
          </div>


          {/* Top Accounts by Balance */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Accounts by Balance</h4>
            <div className="space-y-2">
              {financeAccounts
                .sort((a, b) => (b.balance || 0) - (a.balance || 0))
                .slice(0, 3)
                .map((account) => {
                  const getAccountIcon = (type: string) => {
                    switch (type) {
                      case 'cash': return <DollarSign className="w-4 h-4 text-orange-600" />;
                      case 'bank': return <Building className="w-4 h-4 text-blue-600" />;
                      case 'mobile_money': return <Smartphone className="w-4 h-4 text-green-600" />;
                      case 'credit_card': return <CreditCard className="w-4 h-4 text-purple-600" />;
                      default: return <CreditCard className="w-4 h-4 text-gray-600" />;
                    }
                  };

                  const getStatusColor = (isActive: boolean) => {
                    return isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
                  };

                  const accountTypeName = account.type ? account.type.replace(/_/g, ' ') : 'unknown';
                  
                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-1 bg-white rounded">
                          {getAccountIcon(account.type)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{account.name}</div>
                          <div className="text-xs text-gray-600 capitalize">{accountTypeName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatMoney(account.balance || 0)}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.is_active)}`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              
              {financeAccounts.length > 3 && (
                <div className="text-center py-2">
                  <button 
                    onClick={() => onNavigateToTab?.('providers')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View all {financeAccounts.length} accounts →
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-sm text-gray-600">Common payment management tasks</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigateToTab?.('transactions')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              <CreditCard size={16} />
              View All Transactions
            </button>
            <button
              onClick={() => onNavigateToTab?.('providers')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              <Settings size={16} />
              Manage Accounts
            </button>
            <button
              onClick={() => onNavigateToTab?.('purchase-orders')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              <Package size={16} />
              Purchase Orders
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default PaymentTrackingDashboard;
