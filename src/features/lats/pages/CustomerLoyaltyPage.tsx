import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassButton from '../../shared/components/ui/GlassButton';
import PriceInput from '../../../shared/components/ui/PriceInput';
import { BackButton } from '../../shared/components/ui/BackButton';
import { 
  customerLoyaltyService, 
  LoyaltyCustomer, 
  LoyaltyMetrics, 
  LoyaltyTier, 
  LoyaltyReward, 
  PointTransaction 
} from '../../../lib/customerLoyaltyService';

import { smsService } from '../../../services/smsService';
import { MessageCircle, Phone, Mail, Send, BarChart3, TrendingUp, Users, DollarSign, ShoppingBag, Clock, Gift, Award, CheckCircle, AlertCircle, Megaphone, Filter, Download, Upload, Target, Calendar, Star, Crown, Zap, Settings, RefreshCw, Eye, EyeOff, Search, Plus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabaseClient';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

const CustomerLoyaltyPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showPointsHistory, setShowPointsHistory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [customers, setCustomers] = useState<LoyaltyCustomer[]>([]);
  const [metrics, setMetrics] = useState<LoyaltyMetrics>({
    totalCustomers: 0,
    totalPoints: 0,
    vipCustomers: 0,
    activeCustomers: 0,
    totalSpent: 0,
    averagePoints: 0
  });
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  
  // Communication state
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [selectedCustomerForCommunication, setSelectedCustomerForCommunication] = useState<LoyaltyCustomer | null>(null);
  const [communicationMessage, setCommunicationMessage] = useState('');
  const [communicationType, setCommunicationType] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [sendingCommunication, setSendingCommunication] = useState(false);
  
  // Analytics state
  const [showCustomerAnalytics, setShowCustomerAnalytics] = useState(false);
  const [selectedCustomerForAnalytics, setSelectedCustomerForAnalytics] = useState<LoyaltyCustomer | null>(null);
  const [customerAnalyticsData, setCustomerAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [posSales, setPosSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [sparePartUsage, setSparePartUsage] = useState<any[]>([]);
  
  // Reward redemption state
  const [showRewardRedemption, setShowRewardRedemption] = useState(false);
  const [selectedCustomerForRedemption, setSelectedCustomerForRedemption] = useState<LoyaltyCustomer | null>(null);
  const [selectedReward, setSelectedReward] = useState<LoyaltyReward | null>(null);
  const [redemptionLoading, setRedemptionLoading] = useState(false);
  const [redemptionHistory, setRedemptionHistory] = useState<any[]>([]);
  
  // Campaigns state
  const [showCampaignsModal, setShowCampaignsModal] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    message: '',
    targetTier: 'all',
    targetStatus: 'all',
    scheduledDate: '',
    type: 'whatsapp'
  });
  const [campaignLoading, setCampaignLoading] = useState(false);
  
  // Reporting state
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportType, setReportType] = useState('loyalty-overview');
  const [reportPeriod, setReportPeriod] = useState('30d');
  const [generatingReport, setGeneratingReport] = useState(false);
  
  // Segmentation state
  const [showSegmentationModal, setShowSegmentationModal] = useState(false);
  const [customerSegments, setCustomerSegments] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  
  // Bulk operations state
  const [showBulkOperations, setShowBulkOperations] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [bulkOperation, setBulkOperation] = useState<'points' | 'communication' | 'tier' | 'export'>('points');
  const [bulkPointsAmount, setBulkPointsAmount] = useState(0);
  const [bulkMessage, setBulkMessage] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [minPoints, setMinPoints] = useState('');
  const [maxPoints, setMaxPoints] = useState('');
  const [minSpent, setMinSpent] = useState('');
  const [maxSpent, setMaxSpent] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50; // Show 50 customers per page

  // Fetch data on component mount and when filters change
  useEffect(() => {
    fetchLoyaltyData();
  }, [selectedTier, selectedStatus]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    fetchLoyaltyData();
  }, [selectedTier, selectedStatus]);

  // Initialize segmentation data
  useEffect(() => {
    if (customers.length > 0) {
      calculateCustomerSegments();
    }
  }, [customers]);

  const fetchLoyaltyData = async (page: number = 1, append: boolean = false) => {
    if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      // Fetch paginated loyalty data
      const [customersData, metricsData, tiersData, rewardsData, historyData] = await Promise.all([
        customerLoyaltyService.fetchLoyaltyCustomersPaginated(page, pageSize, searchQuery, selectedTier, selectedStatus),
        customerLoyaltyService.calculateLoyaltyMetrics(),
        Promise.resolve(customerLoyaltyService.getLoyaltyTiers()),
        Promise.resolve(customerLoyaltyService.getAvailableRewards()),
        customerLoyaltyService.fetchPointHistory()
      ]);

      // Update customers (append if loading more, replace if new page)
      if (append && page > 1) {
        setCustomers(prev => [...prev, ...customersData.customers]);
      } else {
        setCustomers(customersData.customers);
      }

      // Update pagination state
      setCurrentPage(customersData.currentPage);
      setTotalPages(customersData.totalPages);
      setHasNextPage(customersData.hasNextPage);
      setHasPreviousPage(customersData.hasPreviousPage);
      setTotalCount(customersData.totalCount);

      // Update other data (only on first load or filter change)
      if (page === 1) {
        setMetrics(metricsData);
        setTiers(tiersData);
        setRewards(rewardsData);
        setPointHistory(historyData);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching loyalty data:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more customers
  const loadMoreCustomers = async () => {
    if (hasNextPage && !loadingMore) {
      await fetchLoyaltyData(currentPage + 1, true);
    }
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchLoyaltyData(1, false);
  };

  // Format currency
  const formatMoney = (amount: number) => {
    const realAmount = amount || 0;
    
    // Safety check: Detect unrealistic amounts
    const MAX_REALISTIC_AMOUNT = 1_000_000_000_000; // 1 trillion
    const isCorrupt = Math.abs(realAmount) > MAX_REALISTIC_AMOUNT;
    
    if (isCorrupt) {
      console.warn(`⚠️ CORRUPT DATA - Amount: ${realAmount}`);
    }
    
    // Safety check: Handle NaN and Infinity
    if (!isFinite(realAmount)) {
      console.warn(`⚠️ Invalid amount: ${amount}.`);
      return 'TZS 0 ⚠️ INVALID';
    }
    
    const formatted = new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS'
    }).format(realAmount);
    
    // Add corruption indicator
    return isCorrupt ? `${formatted} ⚠️` : formatted;
  };

  // Get tier color
  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vip':
        return 'text-purple-600 bg-purple-100';
      case 'premium':
        return 'text-yellow-600 bg-yellow-100';
      case 'regular':
        return 'text-blue-600 bg-blue-100';
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'payment_customer':
        return 'text-teal-600 bg-teal-100';
      case 'engaged':
        return 'text-indigo-600 bg-indigo-100';
      case 'interested':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Handle communication
  const handleSendCommunication = async () => {
    if (!selectedCustomerForCommunication || !communicationMessage.trim()) {
      toast.error('Please select a customer and enter a message');
      return;
    }

    setSendingCommunication(true);
    try {
      let success = false;
      
      switch (communicationType) {

          
        case 'sms':
          const smsResult = await smsService.sendSMS(
            selectedCustomerForCommunication.phone,
            communicationMessage
          );
          success = smsResult.success;
          break;
          
        case 'email':
          if (selectedCustomerForCommunication.email) {
            // Email service would be implemented here
            success = true;
            toast.success('Email service not yet implemented');
          } else {
            toast.error('Customer has no email address');
            return;
          }
          break;
      }

      if (success) {
        toast.success(`${communicationType.toUpperCase()} message sent successfully!`);
        setShowCommunicationModal(false);
        setCommunicationMessage('');
        setSelectedCustomerForCommunication(null);
      } else {
        toast.error(`Failed to send ${communicationType.toUpperCase()} message`);
      }
    } catch (error) {
      console.error('Error sending communication:', error);
      toast.error('Failed to send message');
    } finally {
      setSendingCommunication(false);
    }
  };

  const openCommunicationModal = (customer: LoyaltyCustomer, type: 'sms' | 'email') => {
    setSelectedCustomerForCommunication(customer);
    setCommunicationType(type);
    setCommunicationMessage('');
    setShowCommunicationModal(true);
  };

  // Analytics functions
  const fetchCustomerAnalytics = async (customerId: string) => {
    setLoadingAnalytics(true);
    try {
      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      
      // Fetch POS sales for this customer - TODAY ONLY
      // Using simplified approach to avoid 400 errors
      const { data: posData, error: posError } = await supabase
        .from('lats_sales')
        .select(`
          id,
          sale_number,
          customer_id,
          subtotal,
          total_amount,
          payment_method,
          status,
          created_at,
          updated_at
        `)
        .eq('customer_id', customerId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .order('created_at', { ascending: false });

      let finalPosData = posData;
      let finalPosError = posError;

      if (posError) {
        console.warn('Complex customer sales query failed, trying simpler query:', posError.message);
        
        // Fallback to simpler query without joins
        const { data: simplePosData, error: simplePosError } = await supabase
          .from('lats_sales')
          .select('*')
          .eq('customer_id', customerId)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false });

        if (simplePosError) {
          console.error('Simple customer sales query also failed:', simplePosError);
          // Continue with empty data instead of failing completely
          finalPosData = [];
          finalPosError = null;
        } else {
          finalPosData = simplePosData;
          finalPosError = null;
          console.log(`✅ Loaded ${finalPosData?.length || 0} customer sales (without sale items)`);
        }
      } else {
        console.log(`✅ Loaded ${finalPosData?.length || 0} customer sales`);
      }

      // Fetch spare part usage for this customer - TODAY ONLY
      // First fetch device IDs for this customer
      const { data: devicesData } = await supabase
        .from('devices')
        .select('id')
        .eq('customer_id', customerId);
      
      const deviceIds = devicesData?.map(d => d.id) || [];
      
      let spareData: any[] = [];
      let spareError: any = null;
      
      if (deviceIds.length > 0) {
        const result = await supabase
          .from('lats_spare_part_usage')
          .select('*')
          .in('device_id', deviceIds)
          .gte('created_at', startOfDay.toISOString())
          .lt('created_at', endOfDay.toISOString())
          .order('created_at', { ascending: false });
        
        spareData = result.data || [];
        spareError = result.error;
      }
      
      // Fetch spare part details separately to avoid SQL syntax issues
      if (!spareError && spareData && spareData.length > 0) {
        const sparePartIds = [...new Set(spareData.map((u: any) => u.spare_part_id).filter(Boolean))];
        if (sparePartIds.length > 0) {
          const { data: spareParts } = await supabase
            .from('lats_spare_parts')
            .select('id, name, part_number, cost_price, selling_price')
            .in('id', sparePartIds);
          
          const sparePartsMap = (spareParts || []).reduce((acc: any, sp: any) => {
            acc[sp.id] = sp;
            return acc;
          }, {});
          
          // Enrich usage data with spare part details
          spareData.forEach((usage: any) => {
            if (usage.spare_part_id) {
              usage.lats_spare_parts = sparePartsMap[usage.spare_part_id] || null;
            }
          });
        }
      }

      if (!finalPosError && finalPosData) {
        setPosSales(finalPosData);
        
        // Extract sale items (only if we have the complex data with sale items)
        if (finalPosData.length > 0 && finalPosData[0].lats_sale_items) {
          const allItems = finalPosData.flatMap((sale: any) => 
            (sale.lats_sale_items || []).map((item: any) => ({
              ...item,
              saleNumber: sale.sale_number,
              saleDate: sale.created_at,
              paymentMethod: sale.payment_method,
              saleStatus: sale.status
            }))
          );
          setSaleItems(allItems);
        } else {
          // If we only have simple data, set empty sale items
          setSaleItems([]);
        }
      }

      if (!spareError && spareData) {
        setSparePartUsage(spareData);
      }

      // Calculate analytics
      const analytics = calculateCustomerAnalytics(customerId, finalPosData || [], spareData || []);
      setCustomerAnalyticsData(analytics);

    } catch (error) {
      console.error('Error fetching customer analytics:', error);
      toast.error('Failed to load customer analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const calculateCustomerAnalytics = (customerId: string, posSales: any[], spareUsage: any[]) => {
    const totalPosSpent = posSales.reduce((sum, sale) => {
      const amount = typeof sale.total_amount === 'number' ? sale.total_amount : parseFloat(sale.total_amount) || 0;
      return sum + amount;
    }, 0);
    const totalSpareSpent = spareUsage.reduce((sum, usage) => {
      const price = typeof usage.lats_spare_parts?.selling_price === 'number' ? usage.lats_spare_parts.selling_price : parseFloat(usage.lats_spare_parts?.selling_price) || 0;
      return sum + price;
    }, 0);
    
    const totalSpent = totalPosSpent + totalSpareSpent;
    const orderCount = posSales.length;
    const avgOrderValue = orderCount > 0 ? totalPosSpent / orderCount : 0;
    
    // Calculate days since last purchase
    let daysSinceLastPurchase = 0;
    if (posSales.length > 0) {
      const lastPurchase = new Date(posSales[0].created_at);
      daysSinceLastPurchase = Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calculate unique products
    const uniqueProducts = new Set(saleItems.map(item => item.lats_products?.name || 'Unknown')).size;
    const totalItems = saleItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

    return {
      totalSpent,
      totalPosSpent,
      totalSpareSpent,
      orderCount,
      avgOrderValue,
      daysSinceLastPurchase,
      uniqueProducts,
      totalItems,
      purchaseFrequency: orderCount > 0 ? (orderCount / Math.max(daysSinceLastPurchase / 30, 1)) : 0
    };
  };

  const openCustomerAnalytics = async (customer: LoyaltyCustomer) => {
    setSelectedCustomerForAnalytics(customer);
    setShowCustomerAnalytics(true);
    await fetchCustomerAnalytics(customer.customerId);
  };

  // Reward redemption functions
  const fetchRedemptionHistory = async (customerId: string) => {
    try {
      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('customer_id', customerId)
        .eq('transaction_type', 'redeemed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setRedemptionHistory(data);
      }
    } catch (error) {
      console.error('Error fetching redemption history:', error);
    }
  };

  const openRewardRedemption = async (customer: LoyaltyCustomer) => {
    setSelectedCustomerForRedemption(customer);
    setSelectedReward(null);
    setShowRewardRedemption(true);
    await fetchRedemptionHistory(customer.customerId);
  };

  const handleRewardRedemption = async () => {
    if (!selectedCustomerForRedemption || !selectedReward) {
      toast.error('Please select a customer and reward');
      return;
    }

    if (selectedCustomerForRedemption.points < selectedReward.points) {
      toast.error('Customer does not have enough points for this reward');
      return;
    }

    setRedemptionLoading(true);
    try {
      // Deduct points from customer
      const success = await customerLoyaltyService.updateCustomerPoints(
        selectedCustomerForRedemption.customerId,
        -selectedReward.points,
        `Redeemed: ${selectedReward.name}`,
        'redeemed'
      );

      if (success) {
        // Record redemption in database
        const { error: redemptionError } = await supabase
          .from('reward_redemptions')
          .insert({
            customer_id: selectedCustomerForRedemption.customerId,
            reward_id: selectedReward.id,
            reward_name: selectedReward.name,
            points_used: selectedReward.points,
            redeemed_at: new Date().toISOString(),
            status: 'active'
          });

        if (redemptionError) {
          console.warn('Could not record redemption:', redemptionError);
        }

        // Send notification to customer
        const notificationMessage = `Congratulations! You've successfully redeemed ${selectedReward.name} for ${selectedReward.points} points. Your new balance is ${selectedCustomerForRedemption.points - selectedReward.points} points.`;
        


        toast.success(`Reward redeemed successfully! ${selectedReward.points} points deducted.`);
        
        // Refresh data
        await fetchLoyaltyData(1, false);
        await fetchRedemptionHistory(selectedCustomerForRedemption.customerId);
        
        setShowRewardRedemption(false);
        setSelectedCustomerForRedemption(null);
        setSelectedReward(null);
      } else {
        toast.error('Failed to redeem reward');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error('Failed to redeem reward');
    } finally {
      setRedemptionLoading(false);
    }
  };

  const getAvailableRewardsForCustomer = (customerPoints: number) => {
    return rewards.filter(reward => 
      reward.active && customerPoints >= reward.points
    );
  };

  // Campaigns functions
  const fetchCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('loyalty_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCampaigns(data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    }
  };

  const createCampaign = async () => {
    if (!newCampaign.name || !newCampaign.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCampaignLoading(true);
    try {
      const { error } = await supabase
        .from('loyalty_campaigns')
        .insert({
          name: newCampaign.name,
          message: newCampaign.message,
          target_tier: newCampaign.targetTier,
          target_status: newCampaign.targetStatus,
          scheduled_date: newCampaign.scheduledDate,
          type: newCampaign.type,
          status: 'scheduled',
          created_at: new Date().toISOString()
        });

      if (!error) {
        toast.success('Campaign created successfully!');
        setNewCampaign({
          name: '',
          message: '',
          targetTier: 'all',
          targetStatus: 'all',
          scheduledDate: '',
          type: 'whatsapp'
        });
        await fetchCampaigns();
      } else {
        toast.error('Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setCampaignLoading(false);
    }
  };

  // Reporting functions
  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportData = {
        type: reportType,
        period: reportPeriod,
        generatedAt: new Date().toISOString(),
        data: {
          totalCustomers: metrics.totalCustomers,
          totalPoints: metrics.totalPoints,
          totalSpent: metrics.totalSpent,
          averagePoints: metrics.averagePoints,
          vipCustomers: metrics.vipCustomers
        }
      };

      // Create downloadable report
      const reportBlob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(reportBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loyalty-report-${reportType}-${reportPeriod}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report generated and downloaded successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Segmentation functions
  const calculateCustomerSegments = () => {
    const segments = [
      {
        name: 'VIP Customers',
        criteria: 'VIP tier with high spending',
        count: customers.filter(c => c.tier === 'vip' && c.totalSpent > 100000).length,
        color: 'purple'
      },
      {
        name: 'High Value',
        criteria: 'Premium tier or high points',
        count: customers.filter(c => c.tier === 'premium' || c.points > 500).length,
        color: 'yellow'
      },
      {
        name: 'Active Customers',
        criteria: 'Recent activity within 30 days',
        count: customers.filter(c => {
          const lastVisit = new Date(c.lastVisit);
          const daysSince = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 30;
        }).length,
        color: 'green'
      },
      {
        name: 'At Risk',
        criteria: 'No activity for 90+ days',
        count: customers.filter(c => {
          const lastVisit = new Date(c.lastVisit);
          const daysSince = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 90;
        }).length,
        color: 'red'
      }
    ];
    setCustomerSegments(segments);
  };

  // Bulk operations functions
  const handleBulkOperation = async () => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select customers for bulk operation');
      return;
    }

    setBulkLoading(true);
    try {
      let success = true;

      switch (bulkOperation) {
        case 'points':
          for (const customerId of selectedCustomers) {
            const result = await customerLoyaltyService.updateCustomerPoints(
              customerId,
              bulkPointsAmount,
              'Bulk points adjustment',
              'adjusted'
            );
            if (!result) success = false;
          }
          break;

        case 'communication':
          // WhatsApp service removed
          success = false;
          toast.error('WhatsApp service not available');
          break;

        case 'export':
          const exportData = customers.filter(c => selectedCustomers.includes(c.customerId));
          const exportBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(exportBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `loyalty-customers-export-${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
          break;
      }

      if (success) {
        toast.success(`Bulk operation completed successfully for ${selectedCustomers.length} customers!`);
        setSelectedCustomers([]);
        await fetchLoyaltyData(1, false);
      } else {
        toast.error('Some operations failed. Please check the results.');
      }
    } catch (error) {
      console.error('Error in bulk operation:', error);
      toast.error('Failed to complete bulk operation');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllCustomers = () => {
    setSelectedCustomers(customers.map(c => c.customerId));
  };

  const clearSelection = () => {
    setSelectedCustomers([]);
  };

  // Advanced filtering
  const getFilteredCustomers = () => {
    let filtered = [...customers];

    // Basic filters
    if (selectedTier !== 'all') {
      filtered = filtered.filter(c => c.tier === selectedTier);
    }
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus);
    }
    if (searchQuery) {
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Advanced filters
    if (minPoints) {
      filtered = filtered.filter(c => c.points >= parseInt(minPoints));
    }
    if (maxPoints) {
      filtered = filtered.filter(c => c.points <= parseInt(maxPoints));
    }
    if (minSpent) {
      filtered = filtered.filter(c => c.totalSpent >= parseInt(minSpent));
    }
    if (maxSpent) {
      filtered = filtered.filter(c => c.totalSpent <= parseInt(maxSpent));
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'points':
          aValue = a.points;
          bValue = b.points;
          break;
        case 'spent':
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'lastVisit':
          aValue = new Date(a.lastVisit).getTime();
          bValue = new Date(b.lastVisit).getTime();
          break;
        default:
          aValue = a.points;
          bValue = b.points;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  };

  // Handle points adjustment
  const handlePointsAdjustment = async (customerId: string, adjustment: number, reason: string) => {
    try {
      const success = await customerLoyaltyService.updateCustomerPoints(
        customerId,
        adjustment,
        reason,
        adjustment > 0 ? 'earned' : 'adjusted'
      );
      
      if (success) {
        // Refresh data after successful update
        await fetchLoyaltyData(1, false);
        alert(`Points adjustment successful: ${adjustment > 0 ? '+' : ''}${adjustment} points - ${reason}`);
      } else {
        alert('Failed to adjust points');
      }
    } catch (error) {
      console.error('Error adjusting points:', error);
      alert(`Error adjusting points: ${error}`);
    }
  };

  // Format date helper
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && currentPage === 1) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Loyalty</h1>
                  <p className="text-sm text-gray-600">Manage loyalty points, rewards, and customer tiers</p>
                </div>
              </div>
              <BackButton to="/lats" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto flex items-center justify-center py-12">
            <LoadingSpinner size="sm" color="purple" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Combined Container - All sections in one */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Fixed Header Section - Enhanced Modal Style */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Award className="w-8 h-8 text-white" />
              </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Loyalty</h1>
                <p className="text-sm text-gray-600">Manage loyalty points, rewards, and customer tiers</p>
            </div>
            </div>

            {/* Right: Back Button */}
            <BackButton to="/lats" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
          </div>

        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap">
            {/* Add Customer Button */}
            <button
              onClick={() => alert('Add new customer to loyalty program')}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700"
            >
              <Plus size={18} />
              <span>Add Customer</span>
            </button>

            {/* Campaigns Button */}
            <button
              onClick={() => setShowCampaignsModal(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
            >
              <Megaphone size={18} />
              <span>Campaigns</span>
            </button>

            {/* Reports Button */}
            <button
              onClick={() => setShowReportsModal(true)}
              className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
            >
              <Download size={18} />
              <span>Reports</span>
            </button>
            </div>
            </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Fixed Statistics Section */}
          <div className="p-6 pb-0 flex-shrink-0">
            <div 
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
                gap: '1rem'
              }}
            >
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
          </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalCustomers}</p>
          </div>
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Star className="w-6 h-6 text-white" />
                  </div>
            <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Points</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.totalPoints.toLocaleString()}</p>
            </div>
            </div>
          </div>
              
              <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
            <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">VIP Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.vipCustomers}</p>
            </div>
            </div>
          </div>
              
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-5 hover:bg-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <CheckCircle className="w-6 h-6 text-white" />
          </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Active Customers</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics.activeCustomers}</p>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-5 hover:bg-teal-100 hover:border-teal-300 transition-all shadow-sm hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
            <div>
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatMoney(metrics.totalSpent)}</p>
            </div>
            </div>
          </div>
          </div>
      </div>

          {/* Fixed Search and Filters Section - Enhanced */}
          <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
                      placeholder="Search customers, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white font-medium"
            />
                  </div>
          </div>
          
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Tier Filter */}
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white font-medium min-w-[140px]"
            >
              <option value="all">All Tiers</option>
                    <option value="vip">VIP</option>
                    <option value="premium">Premium</option>
                    <option value="regular">Regular</option>
                    <option value="active">Active</option>
                    <option value="payment_customer">Payment Customer</option>
                    <option value="engaged">Engaged</option>
                    <option value="interested">Interested</option>
            </select>

                  {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white font-medium min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

                  {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all text-gray-900 bg-white font-medium min-w-[160px]"
            >
              <option value="points">Points</option>
              <option value="spent">Total Spent</option>
              <option value="name">Name</option>
              <option value="lastVisit">Last Visit</option>
            </select>

                  {/* Refresh Button */}
                  <button
                    onClick={() => fetchLoyaltyData(1, false)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-purple-300 transition-all disabled:opacity-50 bg-white font-medium"
            >
                    {loading ? (
                      <LoadingSpinner size="sm" color="purple" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
          </div>

              {/* Enhanced Feature Buttons Row */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-sm ${
                      showAdvancedFilters 
                        ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">{showAdvancedFilters ? 'Hide' : 'Advanced'} Filters</span>
                  </button>
                  <button
                    onClick={() => setShowBulkOperations(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Zap className="w-4 h-4" />
                    <span className="hidden sm:inline">Bulk Operations</span>
                  </button>
                  <button
                    onClick={() => setShowSegmentationModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all shadow-sm hover:shadow-md font-medium text-sm"
                  >
                    <Target className="w-4 h-4" />
                    <span className="hidden sm:inline">Segments</span>
                  </button>
          </div>

                {/* Last Updated Timestamp */}
                {lastUpdated && (
                  <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-xl font-medium">
                    Last: {lastUpdated.toLocaleTimeString()}
                  </div>
                )}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Points</label>
              <input
                type="number"
                placeholder="0"
                value={minPoints}
                onChange={(e) => setMinPoints(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Points</label>
              <input
                type="number"
                placeholder="∞"
                value={maxPoints}
                onChange={(e) => setMaxPoints(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Spent</label>
              <PriceInput
                value={parseFloat(minSpent) || 0}
                onChange={(value) => setMinSpent(value.toString())}
                placeholder="0"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Spent</label>
              <PriceInput
                value={parseFloat(maxSpent) || 0}
                onChange={(value) => setMaxSpent(value.toString())}
                placeholder="∞"
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>
        )}
              </div>
            </div>

          {/* Scrollable Customers List */}
          <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
            {/* Error Display */}
            {customers.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No customers found</h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || selectedTier !== 'all' || selectedStatus !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by adding customers to the loyalty program'
                  }
                </p>
                {!searchQuery && selectedTier === 'all' && selectedStatus === 'all' && (
                  <button
                    onClick={() => alert('Add new customer to loyalty program')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Customer</span>
                  </button>
                )}
              </div>
            ) : (
              <>
            {/* Bulk Selection Controls */}
                {getFilteredCustomers().length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === getFilteredCustomers().length && getFilteredCustomers().length > 0}
                    onChange={selectAllCustomers}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                        <span className="ml-2 text-sm font-medium text-gray-700">Select All</span>
                </label>
                <button
                  onClick={clearSelection}
                        className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Clear Selection
                </button>
                      <span className="text-sm text-gray-600 font-medium">
                  {selectedCustomers.length} selected
                </span>
              </div>
              {selectedCustomers.length > 0 && (
                      <button
                    onClick={() => setShowBulkOperations(true)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 font-medium shadow-sm"
                  >
                    Bulk Actions ({selectedCustomers.length})
                      </button>
              )}
            </div>
                )}

                {/* Customers List - Enhanced Modal Style */}
                <div className="space-y-3 mb-4">
                  {getFilteredCustomers().map((customer) => {
                    const isExpanded = expandedCustomer === customer.customerId;
                    
                    return (
                      <div
                        key={customer.id}
                        className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg ${
                          isExpanded
                            ? 'border-purple-500 shadow-xl' 
                            : 'border-gray-200 hover:border-purple-400'
                        }`}
                      >
                        {/* Mobile Card View */}
                        <div className="md:hidden p-4">
                          <div className="space-y-3">
                            {/* Customer Name and Tier */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                                  <Users className="w-6 h-6 text-white" />
                                </div>
                      <div>
                                  <h3 className="font-bold text-gray-900 text-sm">{customer.name}</h3>
                                  <p className="text-xs text-gray-500">{customer.phone}</p>
                      </div>
                    </div>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getTierColor(customer.tier)}`}>
                        {customer.tier}
                      </span>
                  </div>

                            {/* Points and Spent */}
                            <div className="flex items-center justify-between">
                    <div>
                                <p className="text-xs text-gray-600">Points</p>
                                <p className="text-lg font-bold text-gray-900">{customer.points}</p>
                    </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-600">Total Spent</p>
                                <p className="text-lg font-bold text-gray-900">{formatMoney(customer.totalSpent)}</p>
                    </div>
                    </div>
                            
                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-purple-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                <span>{isExpanded ? 'Less' : 'More'}</span>
                              </button>
                              <button
                                onClick={() => openCustomerAnalytics(customer)}
                                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold"
                              >
                                <BarChart3 className="w-4 h-4" />
                                <span>Analytics</span>
                              </button>
                            </div>
                    </div>
                  </div>

                        {/* Desktop List View - Expandable */}
                        <div className="hidden md:block w-full">
                          {/* Header - Clickable */}
                          <div 
                            className="flex items-start justify-between p-6 cursor-pointer"
                            onClick={() => setExpandedCustomer(isExpanded ? null : customer.id)}
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              {/* Expand/Collapse Icon */}
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                                isExpanded ? 'bg-purple-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
                              }`}>
                                <ChevronDown 
                                  className={`w-5 h-5 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                  </div>

                              {/* Main Content */}
                              <div className="flex-1 min-w-0">
                                {/* Customer Name and Tier Row */}
                                <div className="flex items-center gap-3 mb-4 flex-wrap">
                                  <h3 className="text-2xl font-bold text-gray-900 truncate">{customer.name}</h3>
                                  
                                  {/* Tier Badge */}
                                  <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${getTierColor(customer.tier)} flex items-center gap-2 flex-shrink-0`}>
                                    <Crown className="w-5 h-5" />
                                    <span className="capitalize">{customer.tier.replace('_', ' ')}</span>
                                  </span>
                                </div>
                                
                                {/* Info Badges Row */}
                                <div className="flex items-center gap-3 flex-wrap">
                                  {/* Points Badge */}
                                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 flex-shrink-0">
                                    <Star className="w-5 h-5" />
                                    <span className="text-base font-semibold">{customer.points.toLocaleString()}</span>
                                    <span className="text-sm text-purple-600 font-medium">points</span>
                                  </div>

                                  {/* Total Spent */}
                                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                                    <DollarSign className="w-5 h-5" />
                                    <span className="text-base font-semibold">{formatMoney(customer.totalSpent)}</span>
                                  </div>

                                  {/* Orders & Date Combined Card */}
                                  <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                                    <div className="flex items-center gap-2">
                                      <ShoppingBag className="w-5 h-5 text-teal-600" />
                                      <span className="text-base font-semibold text-teal-700">{customer.orders}</span>
                                      <span className="text-sm text-teal-600 font-medium">orders</span>
                                    </div>
                                    <div className="w-px h-5 bg-gray-300"></div>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-5 h-5 text-gray-600" />
                                      <span className="text-base font-medium text-gray-600">{formatDate(customer.lastVisit)}</span>
                                    </div>
                                  </div>

                                  {/* Status Badge */}
                                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                                    customer.status === 'active' 
                                      ? 'bg-green-50 text-green-700 border border-green-200' 
                                      : 'bg-gray-50 text-gray-700 border border-gray-200'
                                  }`}>
                                    <CheckCircle className="w-5 h-5" />
                                    <span className="text-sm font-medium capitalize">{customer.status}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Points Display Card */}
                            <div className="ml-4 flex-shrink-0">
                              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 shadow-lg min-w-[140px]">
                                <p className="text-xs font-medium text-purple-100 mb-1">Points Balance</p>
                                <p className="text-2xl font-bold text-white">{customer.points.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-6 pb-6 border-t border-gray-200 pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Customer Details */}
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900">Customer Information</h4>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Phone className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">{customer.phone}</span>
                                    </div>
                                    {customer.email && (
                                      <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">{customer.email}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <Calendar className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">Joined: {formatDate(customer.joinDate)}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm text-gray-600">Last Purchase: {formatDate(customer.lastPurchase)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Statistics */}
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900">Statistics</h4>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                      <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                                      <p className="text-lg font-bold text-gray-900">{customer.orders}</p>
                                    </div>
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                      <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                                      <p className="text-lg font-bold text-gray-900">{formatMoney(customer.totalSpent)}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex flex-wrap gap-2">
                    <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                        const points = prompt('Enter points to add (positive) or subtract (negative):');
                        if (points !== null) {
                          const pointsNum = parseInt(points);
                          if (!isNaN(pointsNum)) {
                            const reason = prompt('Enter reason for points adjustment:') || 'Manual adjustment';
                            handlePointsAdjustment(customer.customerId, pointsNum, reason);
                          }
                        }
                      }}
                                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold"
                    >
                                  <Zap className="w-4 h-4" />
                      Adjust Points
                    </button>
                    <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCommunicationModal(customer, 'sms');
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold"
                    >
                                  <Phone className="w-4 h-4" />
                                  SMS
                    </button>
                    {customer.email && (
                      <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCommunicationModal(customer, 'email');
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold"
                      >
                                    <Mail className="w-4 h-4" />
                                    Email
                      </button>
                    )}
                    <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCustomerAnalytics(customer);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold"
                    >
                                  <BarChart3 className="w-4 h-4" />
                                  Analytics
                    </button>
                    <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openRewardRedemption(customer);
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all shadow-sm hover:shadow-md text-sm font-semibold"
                                >
                                  <Gift className="w-4 h-4" />
                                  Redeem
                    </button>
                  </div>

                              {/* Points History */}
                  {showPointsHistory && (
                                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                                  <h4 className="font-semibold text-gray-900 mb-3">Points History</h4>
                                  <div className="space-y-2 max-h-40 overflow-y-auto">
                        {pointHistory
                          .filter(transaction => transaction.customerId === customer.customerId)
                                      .slice(0, 10)
                          .map((transaction, index) => (
                                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded-lg">
                                          <span className="text-sm text-gray-600">{transaction.reason}</span>
                                          <span className={`font-semibold text-sm ${transaction.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {transaction.points > 0 ? '+' : ''}{transaction.points}
                              </span>
                            </div>
                          ))}
                        {pointHistory.filter(t => t.customerId === customer.customerId).length === 0 && (
                                      <div className="text-sm text-gray-500 text-center py-2">No point history available</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-6 text-center">
                    <button
                  onClick={loadMoreCustomers}
                  disabled={loadingMore}
                      className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                      <span>Loading...</span>
                        </>
                  ) : (
                        <>
                          <span>Load More ({customers.length} of {totalCount})</span>
                        </>
                  )}
                    </button>
              </div>
            )}

            {/* Pagination Info */}
                <div className="mt-4 text-center text-sm text-gray-600 font-medium">
              Showing {customers.length} of {totalCount} customers
              {totalPages > 1 && (
                <span> • Page {currentPage} of {totalPages}</span>
              )}
            </div>
              </>
            )}

            {/* Sidebar - Tiers and Rewards */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loyalty Tiers */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-purple-600" />
                    Loyalty Tiers
                  </h3>
            <div className="space-y-3">
              {tiers.map((tier, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-purple-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-900">{tier.name}</div>
                          <div className="text-sm font-bold text-purple-600">{tier.discount}% discount</div>
                  </div>
                        <div className="text-xs text-gray-600 mb-2 font-medium">
                    {tier.minPoints} - {tier.maxPoints === 999999 ? '∞' : tier.maxPoints} points
                  </div>
                  <div className="text-xs text-gray-500">
                    {tier.benefits.join(', ')}
                  </div>
                </div>
              ))}
            </div>
                </div>

          {/* Available Rewards */}
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-pink-600" />
                    Available Rewards
                  </h3>
            <div className="space-y-3">
              {rewards.map((reward) => (
                      <div key={reward.id} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-pink-300 transition-all">
                  <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-900">{reward.name}</div>
                          <div className="text-sm font-bold text-pink-600">{reward.points} points</div>
                  </div>
                  <div className="text-xs text-gray-600 mb-2">{reward.description}</div>
                  <div className="flex justify-between items-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      reward.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {reward.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => alert(`Redeem ${reward.name}`)}
                            className="text-xs text-pink-600 hover:text-pink-800 font-semibold"
                    >
                      Redeem
                    </button>
                  </div>
                </div>
              ))}
            </div>
        </div>
      </div>
          </div>
          </div>
        </div>
      </div>

      {/* Customer Analytics Modal */}
      {showCustomerAnalytics && selectedCustomerForAnalytics && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Analytics for {selectedCustomerForAnalytics.name}
              </h3>
              <button
                onClick={() => setShowCustomerAnalytics(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {loadingAnalytics ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading analytics...</span>
              </div>
            ) : customerAnalyticsData ? (
              <div className="space-y-6">
                {/* Analytics Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <DollarSign className="text-blue-600 mr-2" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Total Spent</p>
                        <p className="text-lg font-bold text-gray-900">{formatMoney(customerAnalyticsData.totalSpent)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ShoppingBag className="text-green-600 mr-2" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Orders</p>
                        <p className="text-lg font-bold text-gray-900">{customerAnalyticsData.orderCount}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <TrendingUp className="text-purple-600 mr-2" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Avg Order</p>
                        <p className="text-lg font-bold text-gray-900">{formatMoney(customerAnalyticsData.avgOrderValue)}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Clock className="text-orange-600 mr-2" size={20} />
                      <div>
                        <p className="text-sm text-gray-600">Last Purchase</p>
                        <p className="text-lg font-bold text-gray-900">{customerAnalyticsData.daysSinceLastPurchase}d ago</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* POS Sales */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">POS Purchases</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Spent:</span>
                        <span className="font-medium">{formatMoney(customerAnalyticsData.totalPosSpent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Unique Products:</span>
                        <span className="font-medium">{customerAnalyticsData.uniqueProducts}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Items:</span>
                        <span className="font-medium">{customerAnalyticsData.totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Purchase Frequency:</span>
                        <span className="font-medium">{customerAnalyticsData.purchaseFrequency.toFixed(1)} orders/month</span>
                      </div>
                    </div>
                  </div>

                  {/* Spare Parts */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Spare Parts Usage</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Spent:</span>
                        <span className="font-medium">{formatMoney(customerAnalyticsData.totalSpareSpent)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Parts Used:</span>
                        <span className="font-medium">{sparePartUsage.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Sales */}
                {posSales.length > 0 && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-3">Recent Sales</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {posSales.slice(0, 5).map((sale, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-white rounded">
                          <div>
                            <p className="font-medium text-sm">Order #{sale.sale_number}</p>
                            <p className="text-xs text-gray-600">{new Date(sale.created_at).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">{formatMoney(sale.total_amount)}</p>
                            <p className="text-xs text-gray-600">{sale.payment_method}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No analytics data available for this customer</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reward Redemption Modal */}
      {showRewardRedemption && selectedCustomerForRedemption && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Redeem Rewards for {selectedCustomerForRedemption.name}
              </h3>
              <button
                onClick={() => setShowRewardRedemption(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Customer Points Info */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Points Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedCustomerForRedemption.points} points</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Loyalty Tier</p>
                  <span className={`inline-flex px-2 py-1 text-sm font-medium rounded-full ${getTierColor(selectedCustomerForRedemption.tier)}`}>
                    {selectedCustomerForRedemption.tier}
                  </span>
                </div>
              </div>
            </div>

            {/* Available Rewards */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Available Rewards</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getAvailableRewardsForCustomer(selectedCustomerForRedemption.points).map((reward) => (
                  <div
                    key={reward.id}
                    onClick={() => setSelectedReward(reward)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedReward?.id === reward.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-semibold text-gray-900">{reward.name}</h5>
                      <div className="flex items-center">
                        <Award className="text-yellow-500 mr-1" size={16} />
                        <span className="font-bold text-gray-900">{reward.points} pts</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        reward.active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {reward.active ? 'Available' : 'Unavailable'}
                      </span>
                      {selectedReward?.id === reward.id && (
                        <CheckCircle className="text-blue-500" size={16} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {getAvailableRewardsForCustomer(selectedCustomerForRedemption.points).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Gift size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>No rewards available for current points balance</p>
                  <p className="text-sm mt-2">Customer needs more points to redeem rewards</p>
                </div>
              )}
            </div>

            {/* Redemption History */}
            {redemptionHistory.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Redemptions</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {redemptionHistory.map((redemption, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{redemption.reason || 'Reward Redemption'}</p>
                        <p className="text-xs text-gray-600">{new Date(redemption.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-red-600">-{Math.abs(redemption.points_change)} pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowRewardRedemption(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRewardRedemption}
                disabled={redemptionLoading || !selectedReward}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {redemptionLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redeeming...
                  </>
                ) : (
                  <>
                    <Gift size={16} className="mr-2" />
                    Redeem Reward
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Operations Modal */}
      {showBulkOperations && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">
                Bulk Operations ({selectedCustomers.length} customers selected)
              </h3>
              <button
                onClick={() => setShowBulkOperations(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Operation Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Operation Type</label>
                <select
                  value={bulkOperation}
                  onChange={(e) => setBulkOperation(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="points">Adjust Points</option>
                  <option value="communication">Send Message</option>
                  <option value="export">Export Data</option>
                </select>
              </div>

              {/* Points Adjustment */}
              {bulkOperation === 'points' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Points to Add/Subtract</label>
                  <input
                    type="number"
                    value={bulkPointsAmount}
                    onChange={(e) => setBulkPointsAmount(parseInt(e.target.value) || 0)}
                    placeholder="Enter points (positive to add, negative to subtract)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}

              {/* Communication */}
              {bulkOperation === 'communication' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Enter message to send to all selected customers..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowBulkOperations(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkOperation}
                  disabled={bulkLoading || (bulkOperation === 'points' && bulkPointsAmount === 0) || (bulkOperation === 'communication' && !bulkMessage.trim())}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {bulkLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap size={16} className="mr-2" />
                      Execute Bulk Operation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns Modal */}
      {showCampaignsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Loyalty Campaigns</h3>
              <button
                onClick={() => setShowCampaignsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Campaign */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Create New Campaign</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
                  <input
                    type="text"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    placeholder="Enter campaign name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea
                    value={newCampaign.message}
                    onChange={(e) => setNewCampaign({...newCampaign, message: e.target.value})}
                    placeholder="Enter campaign message"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Target Tier</label>
                    <select
                      value={newCampaign.targetTier}
                      onChange={(e) => setNewCampaign({...newCampaign, targetTier: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="all">All Tiers</option>
                      <option value="bronze">Bronze</option>
                      <option value="silver">Silver</option>
                      <option value="gold">Gold</option>
                      <option value="platinum">Platinum</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={newCampaign.type}
                      onChange={(e) => setNewCampaign({...newCampaign, type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={createCampaign}
                  disabled={campaignLoading || !newCampaign.name || !newCampaign.message}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {campaignLoading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>

              {/* Campaigns List */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Active Campaigns</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {campaigns.map((campaign, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-medium text-gray-900">{campaign.name}</h5>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {campaign.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{campaign.message}</p>
                      <div className="text-xs text-gray-500">
                        Target: {campaign.target_tier} • Type: {campaign.type}
                      </div>
                    </div>
                  ))}
                  {campaigns.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Megaphone size={48} className="mx-auto mb-4 text-gray-300" />
                      <p>No campaigns created yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReportsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Generate Reports</h3>
              <button
                onClick={() => setShowReportsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="loyalty-overview">Loyalty Overview</option>
                  <option value="customer-segments">Customer Segments</option>
                  <option value="points-activity">Points Activity</option>
                  <option value="reward-redemptions">Reward Redemptions</option>
                  <option value="campaign-performance">Campaign Performance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowReportsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generateReport}
                  disabled={generatingReport}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {generatingReport ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download size={16} className="mr-2" />
                      Generate Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segmentation Modal */}
      {showSegmentationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Customer Segmentation</h3>
              <button
                onClick={() => setShowSegmentationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Segments Overview */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h4>
                <div className="space-y-3">
                  {customerSegments.map((segment, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900">{segment.name}</h5>
                        <span className={`text-sm font-bold ${
                          segment.color === 'purple' ? 'text-purple-600' :
                          segment.color === 'yellow' ? 'text-yellow-600' :
                          segment.color === 'green' ? 'text-green-600' :
                          'text-red-600'
                        }`}>
                          {segment.count} customers
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{segment.criteria}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Segment Actions */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Segment Actions</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Segment</label>
                    <select
                      value={selectedSegment}
                      onChange={(e) => setSelectedSegment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="all">All Customers</option>
                      {customerSegments.map((segment, index) => (
                        <option key={index} value={segment.name}>{segment.name} ({segment.count})</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Send Campaign to Segment
                    </button>
                    <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      Export Segment Data
                    </button>
                    <button className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                      Analyze Segment
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Communication Modal */}
      {showCommunicationModal && selectedCustomerForCommunication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Send {communicationType.toUpperCase()} to {selectedCustomerForCommunication.name}
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message
              </label>
              <textarea
                value={communicationMessage}
                onChange={(e) => setCommunicationMessage(e.target.value)}
                placeholder={`Enter your ${communicationType} message...`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                rows={4}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCommunicationModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendCommunication}
                disabled={sendingCommunication || !communicationMessage.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {sendingCommunication ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send {communicationType.toUpperCase()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLoyaltyPage;
