import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Users, Phone, Mail, MapPin, Calendar, Star, MessageSquare, 
  Smartphone, CreditCard, Gift, Tag, Bell, BarChart2, PieChart, 
  ShoppingBag, Wrench, TrendingUp, DollarSign, Package, Clock, 
  AlertTriangle, CheckCircle, XCircle, Info, Edit, QrCode, 
  Copy, Download, Share2, History, Target, Percent, 
  Calculator, Banknote, Receipt, Layers, FileText, UserCheck,
  CalendarDays, MessageCircle, Settings,
  Shield, Award, Globe, Heart, Eye, EyeOff, Send, Archive, Zap
} from 'lucide-react';
import GlassButton from '../../shared/components/ui/GlassButton';
import GlassCard from '../../shared/components/ui/GlassCard';
import GlassBadge from '../../shared/components/ui/GlassBadge';
import { Customer, Device, Payment } from '../../../types';
import { formatCurrency } from '../../../lib/customerApi';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useDevices } from '../../../context/DevicesContext';
import { usePayments } from '../../../context/PaymentsContext';
import { calculatePointsForDevice } from '../../../lib/pointsConfig';
import { smsService } from '../../../services/smsService';
import { checkInCustomer } from '../../../lib/customerApi';
import { supabase } from '../../../lib/supabaseClient';
import { getCustomerStatus, trackCustomerActivity, reactivateCustomer, checkInCustomerWithReactivation } from '../../../lib/customerStatusService';
import Modal from '../../shared/components/ui/Modal';
import CustomerForm from './forms/CustomerForm';
import PointsManagementModal from './PointsManagementModal';
import { fetchCustomerAppointments, createAppointment } from '../../../lib/customerApi/appointments';
import { fetchCustomerReturns } from '../../../lib/customerApi/returns';
import WhatsAppMessageModal from './WhatsAppMessageModal';
import AppointmentModal from './forms/AppointmentModal';
import CustomerJourneyTimeline from './CustomerJourneyTimeline';
import CallAnalyticsCard from './CallAnalyticsCard';
import { useBodyScrollLock } from '../../../hooks/useBodyScrollLock';

interface CustomerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onEdit?: (customer: Customer) => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  isOpen,
  onClose,
  customer,
  onEdit
}) => {
  const { currentUser } = useAuth();
  
  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Additional scroll prevention for html element
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      
      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
      };
    }
  }, [isOpen]);
  const { addNote, updateCustomer, markCustomerAsRead } = useCustomers();
  const [currentCustomer, setCurrentCustomer] = useState(customer);
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Enhanced customer data state
  const [devices, setDevices] = useState<Device[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [posSales, setPosSales] = useState<any[]>([]);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [sparePartUsage, setSparePartUsage] = useState<any[]>([]);
  const [customerAnalytics, setCustomerAnalytics] = useState<any>(null);
  const [loadingEnhancedData, setLoadingEnhancedData] = useState(false);
  
  // Additional data state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [customerPreferences, setCustomerPreferences] = useState<any>(null);
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);
  
  // Customer status state
  const [customerStatus, setCustomerStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Modal states
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<string | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Update current customer when prop changes
  useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);

  // Load enhanced customer data
  useEffect(() => {
    if (isOpen && customer?.id) {
      loadEnhancedCustomerData();
      loadAdditionalCustomerData();
      loadCustomerStatus();
    }
  }, [isOpen, customer?.id]);

  // Enhanced data fetching functions
  const loadEnhancedCustomerData = async () => {
    if (!customer?.id) return;
    
    setLoadingEnhancedData(true);
    try {
      // Set basic data
      setDevices(customer.devices || []);
      
      // Fetch payments from customer_payments table
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', customer.id)
        .order('payment_date', { ascending: false });

      if (!paymentsError && paymentsData) {
        // Transform payment data to match expected format
        const transformedPayments = paymentsData.map(payment => ({
          id: payment.id,
          customerId: payment.customer_id,
          deviceId: payment.device_id,
          amount: payment.amount,
          method: payment.method,
          type: payment.payment_type,
          status: payment.status,
          date: payment.payment_date,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at
        }));
        setPayments(transformedPayments);
      } else {
        // Fallback to customer.payments if customer_payments table doesn't exist
        setPayments(customer.payments || []);
      }

      // Fetch POS sales with detailed items for this specific customer
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
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      let finalPosData = posData;
      let finalPosError = posError;

      if (posError) {
        console.warn('Complex customer detail sales query failed, trying simpler query:', posError.message);
        
        // Fallback to simpler query without joins
        const { data: simplePosData, error: simplePosError } = await supabase
          .from('lats_sales')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false });

        if (simplePosError) {
          console.error('Simple customer detail sales query also failed:', simplePosError);
          finalPosData = [];
          finalPosError = null;
        } else {
          finalPosData = simplePosData;
          finalPosError = null;
          console.log(`✅ Loaded ${finalPosData?.length || 0} customer detail sales (without joins)`);
        }
      } else {
        console.log(`✅ Loaded ${finalPosData?.length || 0} customer detail sales`);
      }

      if (!finalPosError && finalPosData) {
        setPosSales(finalPosData);
        
        // Fetch sale items separately to avoid complex joins
        if (finalPosData.length > 0) {
          const saleIds = finalPosData.map(sale => sale.id);
          
          const { data: saleItemsData, error: saleItemsError } = await supabase
            .from('lats_sale_items')
            .select(`
              id,
              sale_id,
              product_id,
              variant_id,
              quantity,
              unit_price,
              total_price
            `)
            .in('sale_id', saleIds);
          
          if (!saleItemsError && saleItemsData) {
            // Fetch product details for the items
            const productIds = [...new Set(saleItemsData.map(item => item.product_id).filter(Boolean))];
            const variantIds = [...new Set(saleItemsData.map(item => item.variant_id).filter(Boolean))];
            
            const { data: productsData } = await supabase
              .from('lats_products')
              .select('id, name, description, sku')
              .in('id', productIds);
            
            const { data: variantsData } = await supabase
              .from('lats_product_variants')
              .select('id, name, sku, attributes')
              .in('id', variantIds);
            
            // Fetch serial numbers for these sales
            const { data: serialLinks } = await supabase
              .from('sale_inventory_items')
              .select('sale_id, inventory_item_id')
              .in('sale_id', saleIds);
            
            let serialNumbersByProductVariant: Record<string, any[]> = {};
            if (serialLinks && serialLinks.length > 0) {
              const inventoryItemIds = serialLinks.map(link => link.inventory_item_id);
              const { data: inventoryItems } = await supabase
                .from('inventory_items')
                .select('*')
                .in('id', inventoryItemIds);
              
              if (inventoryItems) {
                // Group by product_id and variant_id for easy lookup
                inventoryItems.forEach(item => {
                  const key = `${item.product_id}_${item.variant_id || 'null'}`;
                  if (!serialNumbersByProductVariant[key]) {
                    serialNumbersByProductVariant[key] = [];
                  }
                  serialNumbersByProductVariant[key].push(item);
                });
              }
            }
            
            // Combine the data
            const allItems = saleItemsData.map((item: any) => {
              const sale = finalPosData.find(s => s.id === item.sale_id);
              const serialKey = `${item.product_id}_${item.variant_id || 'null'}`;
              return {
                ...item,
                saleNumber: sale?.sale_number,
                saleDate: sale?.created_at,
                paymentMethod: sale?.payment_method,
                saleStatus: sale?.status,
                product: productsData?.find(p => p.id === item.product_id),
                variant: variantsData?.find(v => v.id === item.variant_id),
                serialNumbers: serialNumbersByProductVariant[serialKey] || []
              };
            });
            
            setSaleItems(allItems);
          } else {
            setSaleItems([]);
          }
        } else {
          setSaleItems([]);
        }
      }

      // Fetch spare part usage for this customer (optional, may not exist)
      try {
        // First fetch the usage records by joining with devices table
        // lats_spare_part_usage has device_id, not customer_id
        // We need to join with devices table to filter by customer_id
        const { data: devicesData } = await supabase
          .from('devices')
          .select('id')
          .eq('customer_id', customer.id);
        
        const deviceIds = devicesData?.map(d => d.id) || [];
        
        let spareData: any[] = [];
        let spareError: any = null;
        
        if (deviceIds.length > 0) {
          const result = await supabase
            .from('lats_spare_part_usage')
            .select('*')
            .in('device_id', deviceIds)
            .order('created_at', { ascending: false});
          
          spareData = result.data || [];
          spareError = result.error;
        }

        if (!spareError && spareData && spareData.length > 0) {
          // Get unique spare part IDs
          const sparePartIds = [...new Set(spareData.map((u: any) => u.spare_part_id).filter(Boolean))];
          
          // Fetch spare part details separately
          if (sparePartIds.length > 0) {
            const { data: spareParts } = await supabase
              .from('lats_spare_parts')
              .select('id, name, part_number, cost_price, selling_price')
              .in('id', sparePartIds);
            
            // Create a lookup map
            const sparePartsMap = (spareParts || []).reduce((acc: any, sp: any) => {
              acc[sp.id] = sp;
              return acc;
            }, {});
            
            // Enrich usage records with spare part details
            const enrichedData = spareData.map((usage: any) => ({
              ...usage,
              lats_spare_parts: sparePartsMap[usage.spare_part_id] || null
            }));
            
            setSparePartUsage(enrichedData);
          } else {
            setSparePartUsage(spareData);
          }
        }

        // Calculate customer analytics
        const analytics = calculateCustomerAnalytics(customer.id, posData || [], spareData || []);
        setCustomerAnalytics(analytics);
      } catch (spareError) {
        // Spare parts data is optional, continue without it
        console.log('Spare parts data not available for this customer');
        const analytics = calculateCustomerAnalytics(customer.id, posData || [], []);
        setCustomerAnalytics(analytics);
      }

    } catch (error) {
      console.error('Error fetching core customer data:', error);
    } finally {
      setLoadingEnhancedData(false);
    }
  };

  // Load additional customer data
  const loadAdditionalCustomerData = async () => {
    if (!customer?.id) return;
    
    setLoadingAdditionalData(true);
    try {
      // Fetch appointments
      try {
        const appointmentsData = await fetchCustomerAppointments(customer.id);
        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      }

      // Fetch returns/warranty information
      try {
        const returnsData = await fetchCustomerReturns(customer.id);
        setReturns(returnsData || []);
      } catch (error) {
        console.error('Error fetching returns:', error);
        setReturns([]);
      }

      // Fetch communication history from customer_communications table
      try {
        const { data: commData, error: commError } = await supabase
          .from('customer_communications')
          .select('*')
          .eq('customer_id', customer.id)
          .order('sent_at', { ascending: false })
          .limit(50);

        if (!commError && commData) {
          setCommunicationHistory(commData);
        } else {
          // Fallback to SMS logs if customer_communications table doesn't exist
          const { data: smsData, error: smsError } = await supabase
            .from('sms_logs')
            .select('*')
            .eq('phone_number', customer.phone?.replace(/\D/g, '') || '')
            .order('created_at', { ascending: false })
            .limit(50);

          if (!smsError && smsData) {
            // Transform SMS data to match communication history format
            const transformedSmsData = smsData.map(sms => ({
              id: sms.id,
              customer_id: customer.id,
              type: 'sms',
              message: sms.message,
              status: sms.status,
              phone_number: sms.phone_number,
              sent_by: sms.sent_by,
              sent_at: sms.sent_at || sms.created_at,
              created_at: sms.created_at
            }));
            setCommunicationHistory(transformedSmsData);
          }
        }
      } catch (error) {
        console.error('Error fetching communication history:', error);
        setCommunicationHistory([]);
      }

      // Fetch referrals (customers referred by this customer)
      try {
        const { data: referralsData, error: referralsError } = await supabase
          .from('customers')
          .select('id, name, phone, created_at, total_spent')
          .eq('referred_by', customer.id)
          .order('created_at', { ascending: false });

        if (!referralsError && referralsData) {
          setReferrals(referralsData);
        }
      } catch (error) {
        console.error('Error fetching referrals:', error);
        setReferrals([]);
      }

      // Fetch customer preferences
      try {
        const { data: prefsData, error: prefsError } = await supabase
          .from('customer_preferences')
          .select('*')
          .eq('customer_id', customer.id);

        if (!prefsError && prefsData && prefsData.length > 0) {
          setCustomerPreferences(prefsData[0]);
        } else {
          setCustomerPreferences(null);
        }
      } catch (error) {
        console.error('Error fetching customer preferences:', error);
        setCustomerPreferences(null);
      }

    } catch (error) {
      console.error('Error loading additional customer data:', error);
    } finally {
      setLoadingAdditionalData(false);
    }
  };

  // Load customer status information
  const loadCustomerStatus = async () => {
    if (!customer?.id) return;
    
    setLoadingStatus(true);
    try {
      const status = await getCustomerStatus(customer.id);
      setCustomerStatus(status);
    } catch (error) {
      console.error('Error fetching customer status:', error);
      setCustomerStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };


  // Handle activity tracking for various actions
  const trackActivity = async (activityType: string) => {
    if (!customer?.id) return;
    
    try {
      await trackCustomerActivity(customer.id, activityType);
      // Refresh status after activity
      await loadCustomerStatus();
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  const calculateCustomerAnalytics = (customerId: string, posSales: any[], spareUsage: any[]) => {
    const totalPosSpent = posSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    const totalSpareSpent = spareUsage.reduce((sum, usage) => sum + (usage.lats_spare_parts?.selling_price || 0), 0);
    
    // Calculate device-related revenue for this customer from customer_payments table
    const customerDevices = devices.filter(device => device.customerId === customerId);
    const customerDeviceIds = customerDevices.map(device => device.id);
    
    // Get payments for this customer's devices
    const customerDevicePayments = payments.filter(payment => 
      payment.deviceId && customerDeviceIds.includes(payment.deviceId)
    );
    
    const totalDevicePayments = customerDevicePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    // Calculate breakdown by payment type
    const totalDeposits = customerDevicePayments.filter(payment => payment.type === 'deposit')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalRepairPayments = customerDevicePayments.filter(payment => payment.type === 'payment')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalRefunds = customerDevicePayments.filter(payment => payment.type === 'refund')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const totalDeviceSpent = totalDevicePayments;
    const totalSpent = totalPosSpent + totalSpareSpent + totalDeviceSpent;
    
    // Calculate unique products and total items from saleItems state
    const allItems = posSales.flatMap((sale: any) => 
      (sale.lats_sale_items || []).map((item: any) => ({
        ...item,
        saleNumber: sale.sale_number,
        saleDate: sale.created_at,
        paymentMethod: sale.payment_method,
        saleStatus: sale.status
      }))
    );
    
    const uniqueProducts = new Set(allItems.map(item => item.product_id)).size;
    const totalItems = allItems.length;
    
    const averageOrderValue = posSales.length > 0 ? totalPosSpent / posSales.length : 0;
    
    const lastPurchaseDate = posSales.length > 0 ? new Date(posSales[0].created_at) : null;
    const daysSinceLastPurchase = lastPurchaseDate ? Math.floor((Date.now() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    // Calculate customer ranking based on spending (using TSH values)
    const customerRanking = totalSpent > 100000 ? 'Top Customer' : totalSpent > 50000 ? 'VIP Customer' : 'Regular Customer';
    
    return {
      totalSpent,
      totalPosSpent,
      totalSpareSpent,
      totalDeviceSpent,
      deviceBreakdown: {
        payments: totalRepairPayments,
        deposits: totalDeposits,
        refunds: totalRefunds,
        totalPayments: totalDevicePayments
      },
      uniqueProducts,
      totalItems,
      averageOrderValue,
      lastPurchaseDate,
      daysSinceLastPurchase,
      purchaseFrequency: posSales.length > 0 ? posSales.length / Math.max(1, Math.floor((Date.now() - new Date(customer?.joinedDate || Date.now()).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0,
      customerRanking
    };
  };

  if (!isOpen || !customer) return null;

  // Ensure document.body exists before creating portal
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  return (
    <>
      {createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]" 
      style={{ 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="customer-detail-title"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Users className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="customer-detail-title" className="text-2xl font-bold text-gray-900 mb-2">{customer.name}</h3>
              <p className="text-sm text-gray-600">{customer.phone || 'No phone number'}</p>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Matching CBMCalculatorModal Style */}
        <div className="bg-white flex-shrink-0 px-6 py-4">
          <div className="flex rounded-lg bg-gray-100 p-1 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              type="button"
              className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Info className="w-4 h-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              type="button"
              className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'transactions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('repairs')}
              type="button"
              className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'repairs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              Repairs
            </button>
            <button
              onClick={() => setActiveTab('communications')}
              type="button"
              className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'communications'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Communications
            </button>
            <button
              onClick={() => setActiveTab('journey')}
              type="button"
              className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'journey'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Journey
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab - Essential Info Only */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics Bar - Clean & Simple */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="text-xs font-medium opacity-90 mb-1">Total Spent</div>
                  <div className="text-2xl font-bold">
                    {loadingEnhancedData ? '...' : formatCurrency(customerAnalytics?.totalSpent || 0).replace('Tsh ', '').replace('TZS ', '')}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="text-xs font-medium opacity-90 mb-1">Orders</div>
                  <div className="text-2xl font-bold">{loadingEnhancedData ? '...' : posSales.length}</div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="text-xs font-medium opacity-90 mb-1">Repairs</div>
                  <div className="text-2xl font-bold">{loadingEnhancedData ? '...' : devices.length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white shadow-lg">
                  <div className="text-xs font-medium opacity-90 mb-1">Points</div>
                  <div className="text-2xl font-bold">{loadingEnhancedData ? '...' : customer.points || 0}</div>
                </div>
              </div>

              {/* Main Content Layout - Simplified for CRM */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Contact & Basic Info */}
                <div className="space-y-6">
                  {/* Contact Card - Prominent */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg flex-shrink-0">
                        {customer.profileImage ? (
                          <img 
                            src={customer.profileImage} 
                            alt={customer.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          customer.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 truncate">{customer.name}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {customer.loyaltyLevel && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                              <Star className="w-3 h-3" />
                              {customer.loyaltyLevel}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            customer.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4 text-blue-500" />
                          <span>Phone</span>
                        </div>
                        <a 
                          href={`tel:${customer.phone}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {customer.phone || 'Not provided'}
                        </a>
                      </div>
                      {customer.whatsapp && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MessageSquare className="w-4 h-4 text-green-500" />
                            <span>WhatsApp</span>
                          </div>
                          <a 
                            href={`https://wa.me/${customer.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-green-600 hover:text-green-700 hover:underline"
                          >
                            {customer.whatsapp}
                          </a>
                        </div>
                      )}
                      {customer.email && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4 text-gray-500" />
                            <span>Email</span>
                          </div>
                          <a 
                            href={`mailto:${customer.email}`}
                            className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline truncate max-w-[200px]"
                            title={customer.email}
                          >
                            {customer.email}
                          </a>
                        </div>
                      )}
                      {customer.city && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span>Location</span>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{customer.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer Information - Consolidated */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
                      <UserCheck className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Customer Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Member Since</span>
                        <p className="text-sm font-medium text-gray-900">
                          {loadingStatus ? '...' : 
                           customerStatus ? new Date(customerStatus.memberSince).toLocaleDateString() :
                           customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 
                           customer.joinedDate ? new Date(customer.joinedDate).toLocaleDateString() : 
                           'Unknown'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Last Visit</span>
                        <p className="text-sm font-medium text-gray-900">
                          {loadingStatus ? '...' : 
                           customerStatus && customerStatus.lastVisit ? new Date(customerStatus.lastVisit).toLocaleDateString() :
                           customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 
                           customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : 
                           'Never'}
                        </p>
                        {customerStatus && customerStatus.daysSinceActivity !== null && (
                          <p className="text-xs text-gray-500">
                            {customerStatus.daysSinceActivity === 0 ? 'Today' :
                             customerStatus.daysSinceActivity === 1 ? '1 day ago' :
                             `${customerStatus.daysSinceActivity} days ago`}
                          </p>
                        )}
                      </div>
                      {customer.gender && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Gender</span>
                          <p className="text-sm font-medium text-gray-900 capitalize">{customer.gender}</p>
                        </div>
                      )}
                      {customer.country && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Country</span>
                          <p className="text-sm font-medium text-gray-900">{customer.country}</p>
                        </div>
                      )}
                      {customer.address && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Address</span>
                          <p className="text-sm font-medium text-gray-900">{customer.address}</p>
                        </div>
                      )}
                      {customer.notes && (
                        <div className="space-y-1 col-span-2">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Notes</span>
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg">{customer.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Middle Column - Stats & Status */}
                <div className="space-y-6">
                  {/* Customer Status Summary */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Status Overview</h3>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Loyalty Level</span>
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
                          <Star className="w-3 h-3" />
                          {customer.loyaltyLevel || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Devices</span>
                        <span className="text-sm font-bold text-gray-900">{devices.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Active Repairs</span>
                        <span className="text-sm font-bold text-orange-600">
                          {devices.filter(d => ['assigned', 'diagnosis-started', 'awaiting-parts', 'in-repair', 'reassembled-testing'].includes(d.status)).length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Completed</span>
                        <span className="text-sm font-bold text-green-600">
                          {devices.filter(d => d.status === 'done').length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions - Prominent */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-blue-200 mb-4">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Quick Actions</h3>
                    </div>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          setShowSmsModal(true);
                          trackActivity('sms_opened');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Send SMS
                      </button>
                      <button
                        onClick={() => {
                          setShowWhatsAppModal(true);
                          trackActivity('whatsapp_opened');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </button>
                      <button
                        onClick={() => setShowPointsModal(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                      >
                        <Gift className="w-4 h-4" />
                        Manage Points
                      </button>
                      <button
                        onClick={() => {
                          setShowAppointmentModal(true);
                          trackActivity('appointment_modal_opened');
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                      >
                        <CalendarDays className="w-4 h-4" />
                        Book Appointment
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Status & Actions */}
                <div className="space-y-6">
                  {/* Customer Tags & Segmentation */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4">
                      <Tag className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Customer Tags</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {customer.colorTag && (
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                          customer.colorTag === 'vip' ? 'bg-emerald-100 text-emerald-700' : 
                          customer.colorTag === 'complainer' ? 'bg-rose-100 text-rose-700' : 
                          customer.colorTag === 'purchased' ? 'bg-blue-100 text-blue-700' : 
                          customer.colorTag === 'new' ? 'bg-purple-100 text-purple-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          <Tag className="w-3 h-3" />
                          {customer.colorTag}
                        </span>
                      )}
                      {customer.callLoyaltyLevel && (
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          customer.callLoyaltyLevel === 'VIP' ? 'bg-purple-100 text-purple-800' :
                          customer.callLoyaltyLevel === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                          customer.callLoyaltyLevel === 'Silver' ? 'bg-gray-100 text-gray-800' :
                          customer.callLoyaltyLevel === 'Bronze' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          <Phone className="w-3 h-3 mr-1" />
                          {customer.callLoyaltyLevel}
                        </span>
                      )}
                      {customer.branchName && customer.isShared && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Globe className="w-3 h-3 mr-1" />
                          Shared
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call Analytics - Only if applicable */}
                  {(customer.totalCalls || 0) > 0 && (
                    <CallAnalyticsCard customer={customer} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transactions Tab - All Sales & Payments */}
          {activeTab === 'transactions' && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Total Spent</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(customerAnalytics?.totalSpent || customer.totalSpent || 0).replace('Tsh ', '').replace('TZS ', '')}
                  </div>
                </div>
                <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Orders</div>
                  <div className="text-2xl font-bold text-blue-600">{posSales.length}</div>
                </div>
                <div className="bg-white border-2 border-purple-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Payments</div>
                  <div className="text-2xl font-bold text-purple-600">{payments.length}</div>
                </div>
                <div className="bg-white border-2 border-amber-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Points</div>
                  <div className="text-2xl font-bold text-amber-600">{customer.points || 0}</div>
                </div>
              </div>

              {/* Sales/Orders Section */}
              {posSales.length > 0 && (
                <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-6 h-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Sales History</h3>
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {posSales.length} {posSales.length === 1 ? 'order' : 'orders'}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-3 font-medium text-gray-700">Date</th>
                          <th className="text-left p-3 font-medium text-gray-700">Order ID</th>
                          <th className="text-left p-3 font-medium text-gray-700">Items</th>
                          <th className="text-left p-3 font-medium text-gray-700">Total</th>
                          <th className="text-left p-3 font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posSales.slice(0, 10).map((sale: any) => (
                          <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">{new Date(sale.created_at || sale.date).toLocaleDateString()}</td>
                            <td className="p-3 font-medium text-blue-600">#{sale.id || sale.sale_id}</td>
                            <td className="p-3">{sale.items_count || 'N/A'}</td>
                            <td className="p-3 font-medium">{formatCurrency(sale.total_amount || sale.total || 0)}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                sale.status === 'completed' ? 'bg-green-100 text-green-800' :
                                sale.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {sale.status || 'completed'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Repair History Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-800">Repair History</h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-700">Device</th>
                        <th className="text-left p-3 font-medium text-gray-700">Status</th>
                        <th className="text-left p-3 font-medium text-gray-700">Issue</th>
                        <th className="text-left p-3 font-medium text-gray-700">Created</th>
                        <th className="text-left p-3 font-medium text-gray-700">Total Paid</th>
                        <th className="text-left p-3 font-medium text-gray-700">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map(device => {
                        const totalPaid = payments.filter(p => p.deviceId === device.id && p.status === 'completed')
                          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                        return (
                          <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{device.brand} {device.model}</div>
                                <div className="text-xs text-gray-500">{device.serialNumber || 'No serial'}</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                device.status === 'done' ? 'bg-green-100 text-green-800' :
                                device.status === 'failed' ? 'bg-red-100 text-red-800' :
                                ['assigned', 'diagnosis-started', 'awaiting-parts', 'in-repair', 'reassembled-testing'].includes(device.status) ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {device.status.replace(/-/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="max-w-xs truncate" title={device.issueDescription}>
                                {device.issueDescription}
                              </div>
                            </td>
                            <td className="p-3">{new Date(device.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              {totalPaid > 0 ? formatCurrency(totalPaid) : '-'}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {calculatePointsForDevice(device, customer.loyaltyLevel)} pts
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {devices.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-500 py-4">No repair history found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-6 h-6 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Payment History</h3>
                    </div>
                    <div className="text-sm font-medium text-gray-600">
                      {formatCurrency(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0))} total
                    </div>
                  </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-700">Date</th>
                        <th className="text-left p-3 font-medium text-gray-700">Type</th>
                        <th className="text-left p-3 font-medium text-gray-700">Amount</th>
                        <th className="text-left p-3 font-medium text-gray-700">Method</th>
                        <th className="text-left p-3 font-medium text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.slice(0, 10).map(payment => (
                        <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">{new Date(payment.date).toLocaleDateString()}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.type === 'payment' ? 'bg-green-100 text-green-800' :
                              payment.type === 'deposit' ? 'bg-blue-100 text-blue-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {payment.type}
                            </span>
                          </td>
                          <td className="p-3 font-medium">{formatCurrency(payment.amount)}</td>
                          <td className="p-3">{payment.method}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                              payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {payment.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr><td colSpan={5} className="text-center text-gray-500 py-4">No payments found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {payments.length === 0 && posSales.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="font-medium">No transactions found</p>
                  <p className="text-sm">This customer hasn't made any purchases yet</p>
                </div>
              )}
            </div>
          )}

          {/* Repairs Tab - All Device/Repair History */}
          {activeTab === 'repairs' && (
            <div className="space-y-6">
              {/* Stats Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Total Repairs</div>
                  <div className="text-2xl font-bold text-blue-600">{devices.length}</div>
                </div>
                <div className="bg-white border-2 border-orange-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Active</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {devices.filter(d => ['assigned', 'diagnosis-started', 'awaiting-parts', 'in-repair', 'reassembled-testing'].includes(d.status)).length}
                  </div>
                </div>
                <div className="bg-white border-2 border-green-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Completed</div>
                  <div className="text-2xl font-bold text-green-600">
                    {devices.filter(d => d.status === 'done').length}
                  </div>
                </div>
                <div className="bg-white border-2 border-red-200 rounded-xl p-4 shadow-sm">
                  <div className="text-xs font-medium text-gray-500 mb-1">Failed</div>
                  <div className="text-2xl font-bold text-red-600">
                    {devices.filter(d => d.status === 'failed').length}
                  </div>
                </div>
              </div>

              {/* Devices Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Repair History</h3>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left p-3 font-medium text-gray-700">Device</th>
                        <th className="text-left p-3 font-medium text-gray-700">Status</th>
                        <th className="text-left p-3 font-medium text-gray-700">Issue</th>
                        <th className="text-left p-3 font-medium text-gray-700">Created</th>
                        <th className="text-left p-3 font-medium text-gray-700">Total Paid</th>
                        <th className="text-left p-3 font-medium text-gray-700">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {devices.map(device => {
                        const totalPaid = payments.filter(p => p.deviceId === device.id && p.status === 'completed')
                          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                        return (
                          <tr key={device.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <div>
                                <div className="font-medium">{device.brand} {device.model}</div>
                                <div className="text-xs text-gray-500">{device.serialNumber || 'No serial'}</div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                device.status === 'done' ? 'bg-green-100 text-green-800' :
                                device.status === 'failed' ? 'bg-red-100 text-red-800' :
                                ['assigned', 'diagnosis-started', 'awaiting-parts', 'in-repair', 'reassembled-testing'].includes(device.status) ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {device.status.replace(/-/g, ' ')}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="max-w-xs truncate" title={device.issueDescription}>
                                {device.issueDescription}
                              </div>
                            </td>
                            <td className="p-3">{new Date(device.createdAt).toLocaleDateString()}</td>
                            <td className="p-3">
                              {totalPaid > 0 ? formatCurrency(totalPaid) : '-'}
                            </td>
                            <td className="p-3">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {calculatePointsForDevice(device, customer.loyaltyLevel)} pts
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {devices.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-gray-500 py-8">No repair history found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Communications Tab - All Messaging, Calls, Appointments */}
          {activeTab === 'communications' && (
            <div className="space-y-6">
              {/* Quick Actions Bar */}
              <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                <button
                  onClick={() => {
                    setShowSmsModal(true);
                    trackActivity('sms_opened');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  Send SMS
                </button>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(true);
                    trackActivity('whatsapp_opened');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    setShowAppointmentModal(true);
                    trackActivity('appointment_modal_opened');
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
                >
                  <CalendarDays className="w-4 h-4" />
                  Schedule Appointment
                </button>
              </div>

              {/* Messages/Communications Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Message History</h3>
                  </div>
                </div>

                {loadingAdditionalData ? (
                  <div className="text-center py-8 text-gray-500">Loading communication history...</div>
                ) : communicationHistory.length > 0 ? (
                  <div className="space-y-3">
                    {communicationHistory.map((message, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                          <MessageSquare className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900">SMS</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              message.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {message.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-1">{message.message}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No communication history found</p>
                    <p className="text-sm">Start a conversation with this customer</p>
                  </div>
                )}
              </div>

              {/* Appointments Section */}
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-6 h-6 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Appointments</h3>
                  </div>
                </div>

                {loadingAdditionalData ? (
                  <div className="text-center py-8 text-gray-500">Loading appointments...</div>
                ) : appointments.length > 0 ? (
                  <div className="space-y-3">
                    {appointments.map(appointment => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{appointment.service_type}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(appointment.appointment_date).toLocaleDateString()} at {appointment.appointment_time}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                            appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                            appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {appointment.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">{appointment.duration_minutes} min</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No appointments found</p>
                    <p className="text-sm">Schedule the first appointment for this customer</p>
                  </div>
                )}
              </div>

              {/* Call Analytics - If Available */}
              {(customer.totalCalls || 0) > 0 && (
                <CallAnalyticsCard customer={customer} />
              )}
            </div>
          )}

          {/* Journey Tab - Customer Timeline */}
          {activeTab === 'journey' && (
            <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Customer Journey</h3>
                <p className="text-sm text-gray-600">Complete timeline of all interactions and activities</p>
              </div>
              <CustomerJourneyTimeline 
                customerId={customer.id} 
                customerPhone={customer.phone} 
              />
            </div>
          )}

        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  setShowSmsModal(true);
                  trackActivity('sms_opened');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
              >
                <MessageSquare className="w-4 h-4" />
                SMS
              </button>
              
              <button
                onClick={() => {
                  setShowWhatsAppModal(true);
                  trackActivity('whatsapp_opened');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </button>

              <button
                onClick={() => setShowPointsModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
              >
                <Gift className="w-4 h-4" />
                Points
              </button>

              <button
                onClick={() => {
                  setShowAppointmentModal(true);
                  trackActivity('appointment_modal_opened');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg font-medium text-sm"
              >
                <CalendarDays className="w-4 h-4" />
                Schedule
              </button>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl transition-colors text-sm font-medium"
              >
                Close
              </button>
              
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold text-sm"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
      )}

      {/* SMS Modal */}
      <Modal isOpen={showSmsModal} onClose={() => { setShowSmsModal(false); setSmsMessage(''); setSmsResult(null); }} title="Send SMS" maxWidth="400px">
        <form
          onSubmit={async e => {
            e.preventDefault();
            setSmsSending(true);
            setSmsResult(null);
            try {
              const phoneNumber = customer.phone.replace(/\D/g, '');
              console.log('📱 Attempting to send SMS to:', phoneNumber);
              
              const result = await smsService.sendSMS(phoneNumber, smsMessage);
              console.log('📱 SMS Service Result:', result);
              
              if (result.success) {
                // Try to log the SMS to the database (non-blocking)
                let smsLogged = false;
                let commLogged = false;
                
                try {
                  const { data: logData, error: logError } = await supabase
                    .from('sms_logs')
                    .insert({
                      recipient_phone: phoneNumber,
                      message: smsMessage,
                      status: 'sent',
                      sent_by: currentUser?.id,
                      device_id: null,
                      cost: null,
                      sent_at: new Date().toISOString(),
                      created_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                  if (logError) {
                    console.warn('⚠️ Could not log SMS to sms_logs table:', logError.message);
                    console.warn('   This is not critical - SMS was still sent');
                  } else {
                    smsLogged = true;
                    console.log('✅ SMS logged to sms_logs table');
                  }
                } catch (logEx) {
                  console.warn('⚠️ Exception logging SMS:', logEx);
                }

                // Try to log to customer_communications table (non-blocking)
                try {
                  const { data: commData, error: commError } = await supabase
                    .from('customer_communications')
                    .insert({
                      customer_id: customer.id,
                      type: 'sms',
                      message: smsMessage,
                      status: 'sent',
                      phone_number: phoneNumber,
                      sent_by: currentUser?.id,
                      sent_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                  if (commError) {
                    console.warn('⚠️ Could not log to customer_communications table:', commError.message);
                    console.warn('   This is not critical - SMS was still sent');
                  } else {
                    commLogged = true;
                    console.log('✅ SMS logged to customer_communications table');
                  }
                } catch (commEx) {
                  console.warn('⚠️ Exception logging customer communication:', commEx);
                }

                // Show success message regardless of logging
                const logStatus = smsLogged || commLogged ? ' and logged' : ' (logging skipped)';
                setSmsResult(`✅ SMS sent${logStatus} successfully!`);
                setSmsMessage('');
                toast.success('SMS sent successfully!');
                
                // Try to refresh communication history (non-blocking)
                try {
                  await loadAdditionalCustomerData();
                } catch (refreshEx) {
                  console.warn('⚠️ Could not refresh communication history:', refreshEx);
                }
              } else {
                const errorMsg = result.error || 'Unknown error occurred';
                console.error('❌ SMS Failed:', errorMsg);
                setSmsResult(`Failed: ${errorMsg}`);
                toast.error(`SMS Failed: ${errorMsg}`);
              }
            } catch (error: any) {
              console.error('❌ SMS sending error:', error);
              
              // Extract error message from different possible error structures
              let errorMessage = 'Failed to send SMS';
              if (error?.message) {
                errorMessage = error.message;
              } else if (error?.error) {
                errorMessage = typeof error.error === 'string' ? error.error : JSON.stringify(error.error);
              } else if (typeof error === 'string') {
                errorMessage = error;
              }
              
              setSmsResult(`❌ ${errorMessage}`);
              toast.error(errorMessage);
            } finally {
              setSmsSending(false);
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-gray-700 mb-1 font-medium">To</label>
            <div className="py-2 px-4 bg-blue-50 text-blue-700 font-medium rounded">{customer.phone}</div>
          </div>
          <div>
            <label className="block text-gray-700 mb-1 font-medium">Message</label>
            <textarea
              value={smsMessage}
              onChange={e => setSmsMessage(e.target.value)}
              rows={3}
              className="w-full py-2 px-4 bg-white/30 backdrop-blur-md border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Type your message here"
              required
            />
          </div>
          {smsResult && <div className={`text-sm ${smsResult.startsWith('Failed') ? 'text-red-600' : 'text-green-600'}`}>{smsResult}</div>}
          <div className="flex gap-3 justify-end mt-4">
            <GlassButton type="button" variant="secondary" onClick={() => { setShowSmsModal(false); setSmsMessage(''); setSmsResult(null); }}>Cancel</GlassButton>
            <GlassButton type="submit" variant="primary" disabled={smsSending}>{smsSending ? 'Sending...' : 'Send SMS'}</GlassButton>
          </div>
        </form>
      </Modal>

      {/* Points Management Modal */}
      <PointsManagementModal
        isOpen={showPointsModal}
        onClose={() => setShowPointsModal(false)}
        customerId={customer.id}
        customerName={customer.name}
        currentPoints={customer.points || 0}
        loyaltyLevel={customer.loyaltyLevel}
        onPointsUpdated={(newPoints: number) => {
          updateCustomer(customer.id, { points: newPoints });
        }}
      />

      {/* Edit Customer Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Customer" maxWidth="xl">
        <CustomerForm
          onSubmit={async (values) => {
            setIsUpdating(true);
            try {
              const { notes, referralSourceCustom, ...rest } = values;
              
              // Handle notes - if there are notes, add them as a new note
              if (notes && notes.trim()) {
                await addNote(customer.id, notes.trim());
              }
              
              // Handle referral source custom value
              const finalReferralSource = referralSourceCustom && referralSourceCustom.trim() 
                ? referralSourceCustom.trim() 
                : rest.referralSource;
              
              // Update customer with the rest of the data
              const updateData = {
                ...rest,
                referralSource: finalReferralSource
              };
              
              const success = await updateCustomer(customer.id, updateData);
              if (success) {
                setShowEditModal(false);
                // Refresh the customer data
                setCurrentCustomer(prev => ({ ...prev, ...updateData }));
                toast.success('Customer updated successfully!');
              } else {
                toast.error('Failed to update customer');
              }
            } catch (error) {
              console.error('Error updating customer:', error);
              toast.error('Failed to update customer');
            } finally {
              setIsUpdating(false);
            }
          }}
          onCancel={() => setShowEditModal(false)}
          isLoading={isUpdating}
          initialValues={{
            id: customer.id,
            name: customer.name || '',
            email: customer.email || '',
            phone: customer.phone || '',
            whatsapp: customer.whatsapp || customer.phone || '',
            gender: customer.gender === 'male' || customer.gender === 'female' ? customer.gender : 'male',
            city: customer.city || '',
            referralSource: customer.referralSource || '',
            birthMonth: customer.birthMonth || '',
            birthDay: customer.birthDay || '',
            notes: Array.isArray(customer.notes) && customer.notes.length > 0 ? customer.notes[customer.notes.length - 1].content : (typeof customer.notes === 'string' ? customer.notes : ''),
          }}
          renderActionsInModal={true}
        >
          {(actions, formFields) => (<>{formFields}{actions}</>)}
        </CustomerForm>
      </Modal>

      {/* Check-in Modal */}
      {showCheckinModal && (
        <Modal isOpen={showCheckinModal} onClose={() => { setShowCheckinModal(false); setCheckinSuccess(false); }} title="Customer Check-in">
          <div className="p-4">
            {checkinSuccess ? (
              <div className="text-green-600 font-bold text-center mb-4">
                Check-in successful! 20 points awarded.
                {customerStatus && !customerStatus.isActive && (
                  <div className="text-blue-600 text-sm mt-2">
                    Customer has been reactivated automatically.
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center text-gray-700">
                  <p className="text-sm mb-2">Check in this customer:</p>
                  <p className="font-medium text-lg">{customer.name}</p>
                  <p className="text-sm text-gray-500">{customer.phone}</p>
                </div>
                
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      setCheckinLoading(true);
                      try {
                        if (!currentUser?.id) throw new Error('No staff user.');
                        const resp = await checkInCustomerWithReactivation(customer.id, currentUser.id);
                        if (resp.success) {
                          setCheckinSuccess(true);
                          
                          // Show different messages based on whether customer was reactivated
                          if (resp.wasReactivated) {
                            toast.success('Customer checked in and reactivated! Points awarded.');
                          } else {
                            toast.success('Check-in successful! Points awarded.');
                          }
                          
                          // Refresh customer status after successful check-in
                          await loadCustomerStatus();
                          
                          // Update the current customer state to reflect reactivation
                          setCurrentCustomer(prev => ({
                            ...prev,
                            isActive: true,
                            lastVisit: new Date().toISOString()
                          }));
                        } else {
                          toast.error(resp.message);
                        }
                      } catch (e: any) {
                        console.error('Check-in failed:', e);
                        toast.error('Check-in failed: ' + (e.message || 'Unknown error'));
                      } finally {
                        setCheckinLoading(false);
                      }
                    }}
                    disabled={checkinLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors font-medium"
                  >
                    {checkinLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Checking in...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Check In Customer
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowCheckinModal(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppMessageModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        customer={customer}
        onMessageSent={() => {
          // Refresh communication history
          loadAdditionalCustomerData();
        }}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        customer={customer}
        mode="create"
        onSave={async (appointmentData) => {
          try {
            await createAppointment(appointmentData);
            // Refresh appointments
            await loadAdditionalCustomerData();
            // Refresh customer status
            await loadCustomerStatus();
            // Track activity
            await trackActivity('appointment_created');
          } catch (error) {
            console.error('Error creating appointment:', error);
            throw error;
          }
        }}
      />

      {/* Customer Preferences Modal */}
      <Modal isOpen={showPreferencesModal} onClose={() => setShowPreferencesModal(false)} title="Customer Preferences" maxWidth="md">
        <div className="p-6 space-y-6">
          <form id="preferences-form">
            {customerPreferences ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
                    <select 
                      name="preferred_contact_method"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={customerPreferences.preferred_contact_method || 'whatsapp'}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="phone">Phone Call</option>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select 
                      name="language"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      defaultValue={customerPreferences.language || 'en'}
                    >
                      <option value="en">English</option>
                      <option value="sw">Swahili</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notification Preferences</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="repair_updates"
                        defaultChecked={customerPreferences.notification_preferences?.repair_updates} 
                        className="mr-2" 
                      />
                      <span className="text-sm text-gray-700">Repair Updates</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="appointment_reminders"
                        defaultChecked={customerPreferences.notification_preferences?.appointment_reminders} 
                        className="mr-2" 
                      />
                      <span className="text-sm text-gray-700">Appointment Reminders</span>
                    </label>
                    <label className="flex items-center">
                      <input 
                        type="checkbox" 
                        name="promotions"
                        defaultChecked={customerPreferences.notification_preferences?.promotions} 
                        className="mr-2" 
                      />
                      <span className="text-sm text-gray-700">Promotions</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quiet Hours</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input 
                      type="time" 
                      name="quiet_start"
                      defaultValue={customerPreferences.quiet_hours?.start || '22:00'}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <span className="flex items-center justify-center text-gray-500">to</span>
                    <input 
                      type="time" 
                      name="quiet_end"
                      defaultValue={customerPreferences.quiet_hours?.end || '08:00'}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No preferences set for this customer</p>
                <p className="text-sm">Preferences will be created when first saved</p>
              </div>
            )}
          </form>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowPreferencesModal(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                try {
                  // Get form data from the modal
                  const form = document.querySelector('#preferences-form') as HTMLFormElement;
                  if (!form) {
                    toast.error('Form not found');
                    return;
                  }
                  
                  const formData = new FormData(form);
                  const preferences = {
                    customer_id: customer.id,
                    preferred_contact_method: formData.get('preferred_contact_method') as string || 'whatsapp',
                    language: formData.get('language') as string || 'en',
                    notification_preferences: {
                      repair_updates: formData.get('repair_updates') === 'on',
                      appointment_reminders: formData.get('appointment_reminders') === 'on',
                      promotions: formData.get('promotions') === 'on'
                    },
                    quiet_hours: {
                      start: formData.get('quiet_start') as string || '22:00',
                      end: formData.get('quiet_end') as string || '08:00'
                    }
                  };

                  // Save or update customer preferences
                  const { error } = await supabase
                    .from('customer_preferences')
                    .upsert(preferences, { 
                      onConflict: 'customer_id',
                      ignoreDuplicates: false 
                    });

                  if (error) {
                    console.error('Error saving preferences:', error);
                    toast.error('Failed to save preferences');
                    return;
                  }

                  toast.success('Preferences saved successfully!');
                  setShowPreferencesModal(false);
                  
                  // Refresh customer preferences
                  await loadAdditionalCustomerData();
                } catch (error) {
                  console.error('Error saving preferences:', error);
                  toast.error('Failed to save preferences');
                }
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CustomerDetailModal;
