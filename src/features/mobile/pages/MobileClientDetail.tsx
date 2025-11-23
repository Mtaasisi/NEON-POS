import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  MessageCircle, 
  Phone, 
  ShoppingBag,
  Clock,
  Gift,
  CheckCircle,
  Calendar,
  Users,
  Smartphone,
  Edit,
  Package,
  DollarSign,
  RotateCcw,
  UserPlus,
  Tag
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../../../context/AuthContext';
import { smsService } from '../../../services/smsService';
import { getCustomerStatus, trackCustomerActivity, checkInCustomerWithReactivation } from '../../../lib/customerStatusService';
import { fetchCustomerAppointments } from '../../../lib/customerApi/appointments';
import { fetchCustomerReturns } from '../../../lib/customerApi/returns';
import { formatCurrency } from '../../../lib/customerApi';

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  notes?: string | any[];
  created_at: string;
  createdAt?: string;
  updatedAt?: string;
  joinedDate?: string;
  
  // Loyalty & Points
  points?: number;
  loyaltyPoints?: number;
  loyalty_points?: number;
  loyaltyLevel?: string;
  
  // Financial
  totalSpent?: number;
  total_purchases?: number;
  totalPurchases?: number;
  lastPurchaseDate?: string;
  
  // Call Analytics
  totalCalls?: number;
  incomingCalls?: number;
  outgoingCalls?: number;
  missedCalls?: number;
  avgCallDurationMinutes?: number;
  lastCallDate?: string;
  callLoyaltyLevel?: string;
  
  // Personal Info
  gender?: string;
  birthday?: string;
  birthMonth?: string;
  birthDay?: string;
  profileImage?: string;
  
  // Status & Activity
  isActive?: boolean;
  lastVisit?: string;
  colorTag?: string;
  
  // Referrals
  referredBy?: string;
  referralSource?: string;
  referrals?: any[];
  
  // Branch Info
  branchName?: string;
  createdByBranchName?: string;
  createdBy?: string;
  isShared?: boolean;
}

const MobileClientDetail: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activity' | 'info' | 'journey'>('activity');
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  
  // Enhanced customer data state
  const [devices, setDevices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
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
  const [loadingAdditionalData, setLoadingAdditionalData] = useState(false);
  
  // Customer status state
  const [customerStatus, setCustomerStatus] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  
  // Modal states
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsMessage, setSmsMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsReason, setPointsReason] = useState('');
  const [pointsLoading, setPointsLoading] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Appointment form state
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentService, setAppointmentService] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [appointmentLoading, setAppointmentLoading] = useState(false);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState<any>({});

  // Load all client data
  useEffect(() => {
    if (clientId) {
      loadClient();
      loadEnhancedCustomerData();
      loadAdditionalCustomerData();
      loadCustomerStatus();
    }
  }, [clientId]);

  // Load basic client data
  const loadClient = async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      
      // Transform to use consistent camelCase naming
      const transformedClient = {
        ...clientData,
        totalSpent: clientData.total_spent,
        createdAt: clientData.created_at,
        updatedAt: clientData.updated_at,
      };
      
      setClient(transformedClient);

      // Fetch recent sales/activity
      const { data: salesData } = await supabase
        .from('lats_sales')
        .select('*')
        .eq('customer_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (salesData) {
        setRecentActivity(salesData);
      }
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Failed to load client details');
    } finally {
      setIsLoading(false);
    }
  };

  // Load enhanced customer data (devices, payments, sales, spare parts)
  const loadEnhancedCustomerData = async () => {
    if (!clientId) return;
    
    setLoadingEnhancedData(true);
    try {
      // Fetch devices
      const { data: devicesData } = await supabase
        .from('devices')
        .select('*')
        .eq('customer_id', clientId)
        .order('created_at', { ascending: false });
      
      if (devicesData) {
        // Transform devices to use consistent naming
        const transformedDevices = devicesData.map((device: any) => ({
          ...device,
          customerId: device.customer_id,
          createdAt: device.created_at
        }));
        setDevices(transformedDevices);
      }

      // Fetch payments from customer_payments table
      const { data: paymentsData } = await supabase
        .from('customer_payments')
        .select('*')
        .eq('customer_id', clientId)
        .order('payment_date', { ascending: false });

      if (paymentsData) {
        const transformedPayments = paymentsData.map((payment: any) => ({
          id: payment.id,
          customerId: payment.customer_id,
          deviceId: payment.device_id,
          amount: payment.amount,
          method: payment.method,
          type: payment.payment_type,
          status: payment.status,
          date: payment.payment_date,
          createdAt: payment.created_at,
        }));
        setPayments(transformedPayments);
      }

      // Fetch POS sales
      const { data: posData } = await supabase
        .from('lats_sales')
        .select('*')
        .eq('customer_id', clientId)
        .order('created_at', { ascending: false });

      if (posData) {
        setPosSales(posData);
        
        // Fetch sale items separately
        if (posData.length > 0) {
          const saleIds = posData.map((sale: any) => sale.id);
          
          const { data: saleItemsData } = await supabase
            .from('lats_sale_items')
            .select('*')
            .in('sale_id', saleIds);
          
          if (saleItemsData) {
            setSaleItems(saleItemsData.map((item: any) => item));
          }
        }
      }

      // Fetch spare part usage (optional)
      try {
        // Fetch device IDs for this customer first
        const { data: devicesData } = await supabase
          .from('devices')
          .select('id')
          .eq('customer_id', clientId);
        
        const deviceIds = devicesData?.map(d => d.id) || [];
        
        let spareData: any[] = [];
        if (deviceIds.length > 0) {
          const result = await supabase
            .from('lats_spare_part_usage')
            .select('*')
            .in('device_id', deviceIds)
            .order('created_at', { ascending: false });
          
          spareData = result.data || [];
        }

        if (spareData) {
          setSparePartUsage(spareData);
        }
      } catch (error) {
        // Spare parts data is optional
        console.log('Spare parts data not available');
      }

      // Calculate analytics
      const analytics = calculateCustomerAnalytics(clientId, posData || [], devicesData || [], paymentsData || []);
      setCustomerAnalytics(analytics);

    } catch (error) {
      console.error('Error fetching enhanced customer data:', error);
    } finally {
      setLoadingEnhancedData(false);
    }
  };

  // Load additional customer data (appointments, returns, communications, referrals)
  const loadAdditionalCustomerData = async () => {
    if (!clientId) return;
    
    setLoadingAdditionalData(true);
    try {
      // Fetch appointments
      try {
        const appointmentsData = await fetchCustomerAppointments(clientId);
        setAppointments(appointmentsData || []);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        setAppointments([]);
      }

      // Fetch returns
      try {
        const returnsData = await fetchCustomerReturns(clientId);
        setReturns(returnsData || []);
      } catch (error) {
        console.error('Error fetching returns:', error);
        setReturns([]);
      }

      // Fetch communication history
      try {
        const { data: commData } = await supabase
          .from('customer_communications')
          .select('*')
          .eq('customer_id', clientId)
          .order('sent_at', { ascending: false })
          .limit(50);

        if (commData) {
          setCommunicationHistory(commData);
        }
      } catch (error) {
        console.error('Error fetching communication history:', error);
        setCommunicationHistory([]);
      }

      // Fetch referrals
      try {
        const { data: referralsData } = await supabase
          .from('customers')
          .select('id, name, phone, created_at, total_spent')
          .eq('referred_by', clientId)
          .order('created_at', { ascending: false });

        if (referralsData) {
          setReferrals(referralsData);
        }
      } catch (error) {
        console.error('Error fetching referrals:', error);
        setReferrals([]);
      }

    } catch (error) {
      console.error('Error loading additional customer data:', error);
    } finally {
      setLoadingAdditionalData(false);
    }
  };

  // Load customer status information
  const loadCustomerStatus = async () => {
    if (!clientId) return;
    
    setLoadingStatus(true);
    try {
      const status = await getCustomerStatus(clientId);
      setCustomerStatus(status);
    } catch (error) {
      console.error('Error fetching customer status:', error);
      setCustomerStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Calculate customer analytics
  const calculateCustomerAnalytics = (customerId: string, posSales: any[], devices: any[], payments: any[]) => {
    const totalPosSpent = posSales.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
    
    const customerDevices = devices.filter(device => device.customer_id === customerId);
    const customerDeviceIds = customerDevices.map(device => device.id);
    
    const customerDevicePayments = payments.filter(payment => 
      payment.deviceId && customerDeviceIds.includes(payment.deviceId)
    );
    
    const totalDevicePayments = customerDevicePayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const totalDeposits = customerDevicePayments.filter(payment => payment.type === 'deposit')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalRepairPayments = customerDevicePayments.filter(payment => payment.type === 'payment')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    const totalRefunds = customerDevicePayments.filter(payment => payment.type === 'refund')
      .reduce((sum, payment) => sum + (payment.amount || 0), 0);
    
    const totalSpent = totalPosSpent + totalDevicePayments;
    
    const averageOrderValue = posSales.length > 0 ? totalPosSpent / posSales.length : 0;
    
    const lastPurchaseDate = posSales.length > 0 ? new Date(posSales[0].created_at) : null;
    const daysSinceLastPurchase = lastPurchaseDate ? Math.floor((Date.now() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    // Calculate unique products and total items
    const uniqueProducts = new Set(saleItems.map(item => item.product_id)).size;
    const totalItems = saleItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Calculate purchase frequency (purchases per month since joining)
    const joinDate = client?.createdAt || client?.created_at || Date.now();
    const daysSinceJoining = Math.floor((Date.now() - new Date(joinDate).getTime()) / (1000 * 60 * 60 * 24));
    const monthsSinceJoining = Math.max(1, Math.floor(daysSinceJoining / 30));
    const purchaseFrequency = posSales.length / monthsSinceJoining;
    
    // Calculate customer ranking based on spending (using TSH values)
    let customerRanking = 'Regular Customer';
    if (totalSpent > 10000000) customerRanking = 'Diamond Customer';
    else if (totalSpent > 5000000) customerRanking = 'Platinum Customer';
    else if (totalSpent > 1000000) customerRanking = 'Gold Customer';
    else if (totalSpent > 500000) customerRanking = 'VIP Customer';
    else if (totalSpent > 100000) customerRanking = 'Top Customer';
    
    return {
      totalSpent,
      totalPosSpent,
      totalDeviceSpent: totalDevicePayments,
      deviceBreakdown: {
        payments: totalRepairPayments,
        deposits: totalDeposits,
        refunds: totalRefunds,
        totalPayments: totalDevicePayments
      },
      averageOrderValue,
      lastPurchaseDate,
      daysSinceLastPurchase,
      totalOrders: posSales.length,
      totalDevices: devices.length,
      activeRepairs: devices.filter(d => ['assigned', 'diagnosis-started', 'awaiting-parts', 'in-repair', 'reassembled-testing'].includes(d.status)).length,
      completedRepairs: devices.filter(d => d.status === 'done').length,
      uniqueProducts,
      totalItems,
      purchaseFrequency: Number(purchaseFrequency.toFixed(2)),
      customerRanking
    };
  };

  // Handle activity tracking
  const trackActivity = async (activityType: string) => {
    if (!clientId) return;
    
    try {
      await trackCustomerActivity(clientId, activityType);
      await loadCustomerStatus();
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  };

  // Handle actions
  const handleCall = () => {
    if (client?.phone) {
      window.location.href = `tel:${client.phone}`;
    }
  };

  // Handle SMS sending
  const handleSendSMS = async () => {
    if (!smsMessage.trim() || !client) return;
    
    setSmsSending(true);
    try {
      const phoneNumber = client.phone.replace(/\D/g, '');
      const result = await smsService.sendSMS(phoneNumber, smsMessage);
      
      if (result.success) {
        // Log SMS to database
        try {
          await supabase
            .from('customer_communications')
            .insert({
              customer_id: clientId,
              type: 'sms',
              message: smsMessage,
              status: 'sent',
              phone_number: phoneNumber,
              sent_by: currentUser?.id,
              sent_at: new Date().toISOString()
            });
        } catch (error) {
          console.warn('Could not log SMS:', error);
        }
        
        toast.success('SMS sent successfully!');
        setSmsMessage('');
        setShowSmsModal(false);
        await loadAdditionalCustomerData();
        await trackActivity('sms_sent');
      } else {
        toast.error(`SMS Failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send SMS');
    } finally {
      setSmsSending(false);
    }
  };

  // Handle points addition
  const handleAddPoints = async () => {
    if (!pointsAmount || !client) return;
    
    setPointsLoading(true);
    try {
      const amount = parseInt(pointsAmount);
      if (isNaN(amount)) {
        toast.error('Invalid points amount');
        return;
      }

      const newPoints = (client.points || 0) + amount;
      
      const { error } = await supabase
        .from('customers')
        .update({ points: newPoints })
        .eq('id', clientId);

      if (error) throw error;

      // Log points transaction
      try {
        await supabase
          .from('loyalty_points_transactions')
          .insert({
            customer_id: clientId,
            points: amount,
            transaction_type: amount > 0 ? 'earned' : 'redeemed',
            reason: pointsReason || 'Manual adjustment',
            created_by: currentUser?.id,
            created_at: new Date().toISOString()
          });
      } catch (error) {
        console.warn('Could not log points transaction:', error);
      }

      toast.success(`${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} points!`);
      setClient({ ...client, points: newPoints });
      setPointsAmount('');
      setPointsReason('');
      setShowPointsModal(false);
      await trackActivity('points_updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update points');
    } finally {
      setPointsLoading(false);
    }
  };

  // Handle check-in
  const handleCheckIn = async () => {
    if (!clientId || !currentUser) return;
    
    setCheckinLoading(true);
    try {
      const resp = await checkInCustomerWithReactivation(clientId, currentUser.id);
      if (resp.success) {
        setCheckinSuccess(true);
        
        if (resp.wasReactivated) {
          toast.success('Customer checked in and reactivated! Points awarded.');
        } else {
          toast.success('Check-in successful! Points awarded.');
        }
        
        await loadCustomerStatus();
        await loadClient();
        
        if (client) {
          setClient({
            ...client,
            isActive: true,
            lastVisit: new Date().toISOString()
          });
        }
      } else {
        toast.error(resp.message || 'Check-in failed');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Check-in failed');
    } finally {
      setCheckinLoading(false);
    }
  };

  // Handle appointment creation
  const handleCreateAppointment = async () => {
    if (!appointmentDate || !appointmentTime || !appointmentService) {
      toast.error('Please fill in all required fields');
      return;
    }

    setAppointmentLoading(true);
    try {
      const { error } = await supabase
        .from('appointments')
        .insert({
          customer_id: clientId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          service_type: appointmentService,
          notes: appointmentNotes,
          status: 'pending',
          created_by: currentUser?.id,
          created_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Appointment created successfully!');
      setShowAppointmentModal(false);
      setAppointmentDate('');
      setAppointmentTime('');
      setAppointmentService('');
      setAppointmentNotes('');
      await loadAdditionalCustomerData();
      await trackActivity('appointment_created');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to create appointment');
    } finally {
      setAppointmentLoading(false);
    }
  };

  // Handle customer edit
  const handleEditCustomer = async () => {
    if (!editFormData.name || !editFormData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: editFormData.name,
          phone: editFormData.phone,
          email: editFormData.email,
          whatsapp: editFormData.whatsapp,
          address: editFormData.address,
          city: editFormData.city,
          country: editFormData.country,
          notes: editFormData.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      if (error) throw error;

      toast.success('Customer updated successfully!');
      setShowEditModal(false);
      await loadClient();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update customer');
    }
  };

  // Initialize edit form when modal opens
  useEffect(() => {
    if (showEditModal && client) {
      setEditFormData({
        name: client.name || '',
        phone: client.phone || '',
        email: client.email || '',
        whatsapp: client.whatsapp || '',
        address: client.address || '',
        city: client.city || '',
        country: client.country || '',
        notes: typeof client.notes === 'string' ? client.notes : ''
      });
    }
  }, [showEditModal, client]);


  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-500">Loading client...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-3">👤</div>
            <p className="text-gray-500">Client not found</p>
            <button
              onClick={() => navigate('/mobile/clients')}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              Back to Clients
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header - iOS Style */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate('/mobile/clients')}
            className="flex items-center gap-1 text-blue-500"
          >
            <ArrowLeft size={20} />
            <span className="text-[17px]">Back</span>
          </button>
          <h1 className="text-[17px] font-semibold text-gray-900 absolute left-1/2 transform -translate-x-1/2">
            {client.name}
          </h1>
          <button
            onClick={() => navigate(`/mobile/clients/${clientId}/edit`)}
            className="text-blue-500 text-[17px]"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Action Buttons Row - iOS Style */}
      <div className="bg-white px-2 py-4 border-b border-gray-200">
        <div className="grid grid-cols-6 gap-2">
          <button
            onClick={() => {
              setShowSmsModal(true);
              trackActivity('sms_opened');
            }}
            className="flex flex-col items-center gap-1"
          >
            <MessageCircle size={24} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[9px] text-gray-600">SMS</span>
          </button>

          <button
            onClick={handleCall}
            className="flex flex-col items-center gap-1"
          >
            <Phone size={24} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[9px] text-gray-600">call</span>
          </button>

          <button
            onClick={() => setShowPointsModal(true)}
            className="flex flex-col items-center gap-1"
          >
            <Gift size={24} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[9px] text-gray-600">points</span>
          </button>

          <button
            onClick={() => {
              setShowCheckinModal(true);
              trackActivity('checkin_opened');
            }}
            className="flex flex-col items-center gap-1"
          >
            <CheckCircle size={24} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[9px] text-gray-600">check-in</span>
          </button>

          <button
            onClick={() => {
              setShowAppointmentModal(true);
              trackActivity('appointment_opened');
            }}
            className="flex flex-col items-center gap-1"
          >
            <Calendar size={24} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[9px] text-gray-600">schedule</span>
          </button>

          <button
            onClick={() => setShowEditModal(true)}
            className="flex flex-col items-center gap-1"
          >
            <Edit size={24} className="text-blue-500" strokeWidth={1.5} />
            <span className="text-[9px] text-gray-600">edit</span>
          </button>
        </div>
      </div>

      {/* Segmented Control Tabs - iOS Style */}
      <div className="bg-white px-4 py-3">
        <div className="bg-gray-100 rounded-lg p-0.5 flex">
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-2 text-center text-[12px] font-medium rounded-md transition-all ${
              activeTab === 'activity'
                ? 'bg-white text-gray-900 font-semibold shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-2 text-center text-[12px] font-medium rounded-md transition-all ${
              activeTab === 'info'
                ? 'bg-white text-gray-900 font-semibold shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Info
          </button>
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex-1 py-2 text-center text-[12px] font-medium rounded-md transition-all ${
              activeTab === 'journey'
                ? 'bg-white text-gray-900 font-semibold shadow-sm'
                : 'text-gray-600'
            }`}
          >
            Journey
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-20">
        {/* Activity Tab - iOS Style */}
        {activeTab === 'activity' && (
          <div className="bg-white space-y-4 pb-6">
            {/* Customer Status Banner */}
            {customerStatus && (
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">
                      {customerStatus.statusReason || 'Active Customer'}
                    </div>
                    {customerStatus.daysSinceActivity !== null && (
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        Last activity: {customerStatus.daysSinceActivity === 0 ? 'Today' : `${customerStatus.daysSinceActivity} days ago`}
                      </div>
                    )}
                  </div>
                  {customerAnalytics?.customerRanking && (
                    <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-semibold">
                      {customerAnalytics.customerRanking}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Summary Stats */}
            <div className="px-4 py-4 grid grid-cols-4 gap-2 border-b border-gray-200">
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{customerAnalytics?.totalOrders || posSales.length}</div>
                <div className="text-[10px] text-gray-500 mt-1">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{customerAnalytics?.totalDevices || devices.length}</div>
                <div className="text-[10px] text-gray-500 mt-1">Devices</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-gray-900">{formatCurrency(customerAnalytics?.totalSpent || 0).replace('Tsh ', '')}</div>
                <div className="text-[10px] text-gray-500 mt-1">Spent</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-semibold text-blue-500">{client.points || client.loyaltyPoints || 0}</div>
                <div className="text-[10px] text-gray-500 mt-1">Points</div>
              </div>
            </div>

            {/* Financial Breakdown - iOS 17 */}
            {customerAnalytics && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <DollarSign size={16} className="text-green-500" />
                  Financial Breakdown
                </h3>
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
                    <span className="text-[15px] text-gray-600">POS Sales</span>
                    <span className="text-[16px] font-semibold text-gray-900">{formatCurrency(customerAnalytics.totalPosSpent || 0)}</span>
                  </div>
                  <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100">
                    <span className="text-[15px] text-gray-600">Device Payments</span>
                    <span className="text-[16px] font-semibold text-gray-900">{formatCurrency(customerAnalytics.totalDeviceSpent || 0)}</span>
                  </div>
                  {customerAnalytics.deviceBreakdown && (
                    <div className="px-4 py-2 bg-gray-50 space-y-2">
                      <div className="flex justify-between text-[13px]">
                        <span className="text-gray-500 ml-3">• Deposits</span>
                        <span className="text-blue-600 font-medium">{formatCurrency(customerAnalytics.deviceBreakdown.deposits || 0)}</span>
                      </div>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-gray-500 ml-3">• Payments</span>
                        <span className="text-green-600 font-medium">{formatCurrency(customerAnalytics.deviceBreakdown.payments || 0)}</span>
                      </div>
                      {customerAnalytics.deviceBreakdown.refunds > 0 && (
                        <div className="flex justify-between text-[13px]">
                          <span className="text-gray-500 ml-3">• Refunds</span>
                          <span className="text-red-600 font-medium">-{formatCurrency(customerAnalytics.deviceBreakdown.refunds || 0)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="px-4 py-3 bg-green-50 flex justify-between items-center">
                    <span className="text-[16px] font-semibold text-gray-900">Total Spent</span>
                    <span className="text-[18px] font-bold text-green-600">{formatCurrency(customerAnalytics.totalSpent || 0)}</span>
                  </div>
                </div>

                {/* Metrics Grid - iOS 17 Cards */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Avg Order</div>
                    <div className="text-[17px] font-bold text-gray-900">{formatCurrency(customerAnalytics.averageOrderValue || 0).replace('Tsh ', '')}</div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                    <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Frequency</div>
                    <div className="text-[17px] font-bold text-gray-900">{customerAnalytics.purchaseFrequency}/mo</div>
                  </div>
                  {customerAnalytics.uniqueProducts > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Products</div>
                      <div className="text-[17px] font-bold text-gray-900">{customerAnalytics.uniqueProducts}</div>
                    </div>
                  )}
                  {customerAnalytics.totalItems > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
                      <div className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">Total Items</div>
                      <div className="text-[17px] font-bold text-gray-900">{customerAnalytics.totalItems}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Devices/Repairs Section - iOS 17 */}
            {devices.length > 0 && (
              <div className="px-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Smartphone size={16} className="text-blue-500" />
                    Repairs ({devices.length})
                  </h3>
                  <span className="text-[11px] px-2 py-1 bg-blue-100 text-blue-600 rounded-full font-semibold">{customerAnalytics?.activeRepairs || 0} active</span>
                </div>
                <div className="space-y-2">
                  {devices.slice(0, 5).map((device) => {
                    const totalPaid = payments.filter(p => p.deviceId === device.id && p.status === 'completed')
                      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    return (
                      <div key={device.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="text-[15px] font-semibold text-gray-900">{device.brand} {device.model}</div>
                            <div className="text-[13px] text-gray-600 mt-1 line-clamp-2">{device.issueDescription}</div>
                          </div>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                            device.status === 'done' ? 'bg-green-100 text-green-700' :
                            device.status === 'failed' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {device.status.replace(/-/g, ' ')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[12px] text-gray-500">{new Date(device.createdAt).toLocaleDateString()}</span>
                          {totalPaid > 0 && <span className="text-[13px] text-green-600 font-semibold">{formatCurrency(totalPaid)}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {devices.length > 5 && (
                    <button className="w-full text-center text-[14px] text-blue-500 py-2 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors font-medium">
                      View all {devices.length} devices
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Recent Sales - iOS 17 */}
            <div className="px-4">
              <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                <ShoppingBag size={16} className="text-green-500" />
                Recent Sales ({posSales.length})
              </h3>
              {posSales.length > 0 ? (
                <div className="space-y-2">
                  {posSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900">Sale #{sale.sale_number || sale.id.slice(0, 8)}</div>
                          <div className="text-[13px] text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(sale.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[16px] font-bold text-green-600">TSh {(sale.total_amount || 0).toLocaleString()}</div>
                          <div className="text-[12px] text-gray-500 capitalize mt-1">{sale.payment_method}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {posSales.length > 5 && (
                    <button className="w-full text-center text-[14px] text-blue-500 py-2 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors font-medium">
                      View all {posSales.length} sales
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ShoppingBag size={36} className="mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-[14px]">No sales yet</p>
                </div>
              )}
            </div>

            {/* Appointments - iOS 17 */}
            {appointments.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Calendar size={16} className="text-purple-500" />
                  Appointments ({appointments.length})
                </h3>
                <div className="space-y-2">
                  {appointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900 capitalize">{appointment.service_type}</div>
                          <div className="text-[13px] text-gray-500 mt-1">
                            {new Date(appointment.appointment_date).toLocaleDateString()} • {appointment.appointment_time}
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                          appointment.status === 'completed' ? 'bg-green-100 text-green-700' :
                          appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {appointment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Communications - iOS 17 */}
            {communicationHistory.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MessageCircle size={16} className="text-green-500" />
                  Messages ({communicationHistory.length})
                </h3>
                <div className="space-y-2">
                  {communicationHistory.slice(0, 3).map((msg, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{msg.type || 'SMS'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          msg.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          msg.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <div className="text-[14px] text-gray-900 mb-2 line-clamp-2">{msg.message}</div>
                      <div className="text-[12px] text-gray-500">{new Date(msg.created_at || msg.sent_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Communications - iOS 17 */}
            {communicationHistory.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <MessageCircle size={16} className="text-green-500" />
                  Messages ({communicationHistory.length})
                </h3>
                <div className="space-y-2">
                  {communicationHistory.slice(0, 3).map((msg, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{msg.type || 'SMS'}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          msg.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          msg.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {msg.status}
                        </span>
                      </div>
                      <div className="text-[14px] text-gray-900 mb-2 line-clamp-2">{msg.message}</div>
                      <div className="text-[12px] text-gray-500">{new Date(msg.created_at || msg.sent_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sale Items - iOS 17 */}
            {saleItems.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Package size={16} className="text-indigo-500" />
                  Purchased Products ({saleItems.length})
                </h3>
                <div className="space-y-2">
                  {saleItems.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900">Product #{item.product_id?.slice(0, 8)}</div>
                          <div className="text-[13px] text-gray-500 mt-1">Qty: {item.quantity} × {formatCurrency(item.unit_price || 0)}</div>
                        </div>
                        <div className="text-[16px] font-bold text-gray-900">{formatCurrency(item.total_price || 0)}</div>
                      </div>
                    </div>
                  ))}
                  {saleItems.length > 5 && (
                    <button className="w-full text-center text-[14px] text-blue-500 py-2 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors font-medium">
                      View all {saleItems.length} items
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Spare Parts - iOS 17 */}
            {sparePartUsage.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Tag size={16} className="text-orange-500" />
                  Spare Parts Used ({sparePartUsage.length})
                </h3>
                <div className="space-y-2">
                  {sparePartUsage.slice(0, 5).map((usage: any) => (
                    <div key={usage.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900">{usage.spare_part_name || 'Spare Part'}</div>
                          <div className="text-[13px] text-gray-500 mt-1">Qty: {usage.quantity || 1} • {new Date(usage.created_at || usage.used_at).toLocaleDateString()}</div>
                        </div>
                        {usage.cost && <div className="text-[16px] font-bold text-gray-900">{formatCurrency(usage.cost)}</div>}
                      </div>
                    </div>
                  ))}
                  {sparePartUsage.length > 5 && (
                    <button className="w-full text-center text-[14px] text-blue-500 py-2 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors font-medium">
                      View all {sparePartUsage.length} parts
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Returns - iOS 17 */}
            {returns.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <RotateCcw size={16} className="text-red-500" />
                  Returns & Warranty ({returns.length})
                </h3>
                <div className="space-y-2">
                  {returns.map((returnItem: any) => (
                    <div key={returnItem.id} className="bg-white rounded-xl border border-red-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900">{returnItem.reason || 'Product Return'}</div>
                          <div className="text-[13px] text-gray-500 mt-1">{new Date(returnItem.created_at).toLocaleDateString()}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                          returnItem.status === 'completed' ? 'bg-green-100 text-green-700' :
                          returnItem.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {returnItem.status}
                        </span>
                      </div>
                      {returnItem.refund_amount && (
                        <div className="pt-2 border-t border-gray-100">
                          <div className="text-[14px] text-red-600 font-semibold">Refund: {formatCurrency(returnItem.refund_amount)}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Referrals - iOS 17 */}
            {referrals.length > 0 && (
              <div className="px-4">
                <h3 className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <UserPlus size={16} className="text-purple-500" />
                  Customers Referred ({referrals.length})
                </h3>
                <div className="space-y-2">
                  {referrals.slice(0, 3).map((referral: any) => (
                    <div key={referral.id} className="bg-white rounded-xl border border-purple-200 p-3 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-[15px] font-semibold text-gray-900">{referral.name}</div>
                          <div className="text-[13px] text-gray-500 mt-1">{referral.phone}</div>
                          <div className="text-[12px] text-gray-400 mt-1">Joined {new Date(referral.created_at).toLocaleDateString()}</div>
                        </div>
                        {referral.total_spent > 0 && (
                          <div className="text-[16px] font-bold text-purple-600">{formatCurrency(referral.total_spent)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {referrals.length > 3 && (
                    <button className="w-full text-center text-[14px] text-blue-500 py-2 hover:bg-gray-50 active:bg-gray-100 rounded-lg transition-colors font-medium">
                      View all {referrals.length} referrals
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Tab - iOS Style */}
        {activeTab === 'info' && (
          <div className="bg-white">
            {/* Contact Information */}
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Name</span>
              <span className="text-gray-900 text-[15px] text-right font-medium">{client.name}</span>
            </div>

            {client.phone && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">mobile</span>
                <a href={`tel:${client.phone}`} className="text-blue-500 text-[15px]">
                  {client.phone}
                </a>
              </div>
            )}

            {client.whatsapp && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">WhatsApp</span>
                <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`} className="text-blue-500 text-[15px]">
                  {client.whatsapp}
                </a>
              </div>
            )}

            {client.email && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">email</span>
                <a href={`mailto:${client.email}`} className="text-blue-500 text-[15px]">
                  {client.email}
                </a>
              </div>
            )}

            {client.gender && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Gender</span>
                <span className="text-gray-900 text-[15px] capitalize">{client.gender}</span>
              </div>
            )}

            {(client.birthMonth && client.birthDay) && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Birthday</span>
                <span className="text-gray-900 text-[15px]">
                  {client.birthMonth}/{client.birthDay}
                </span>
              </div>
            )}

            {client.address && (
              <div className="px-5 py-4 flex justify-between items-start border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Address</span>
                <span className="text-gray-900 text-[15px] text-right max-w-[60%]">
                  {client.address}
                </span>
              </div>
            )}

            {client.city && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">City</span>
                <span className="text-gray-900 text-[15px]">{client.city}</span>
              </div>
            )}

            {client.country && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Country</span>
                <span className="text-gray-900 text-[15px]">{client.country}</span>
              </div>
            )}

            {client.website && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Website</span>
                <a 
                  href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 text-[15px]"
                >
                  {client.website}
                </a>
              </div>
            )}

            {/* Loyalty & Status */}
            {client.loyaltyLevel && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Loyalty Level</span>
                <span className="text-gray-900 text-[15px] font-medium">{client.loyaltyLevel}</span>
              </div>
            )}

            {client.colorTag && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Tag</span>
                <span className="text-gray-900 text-[15px] capitalize">{client.colorTag}</span>
              </div>
            )}

            {(client.points !== undefined || client.loyaltyPoints !== undefined || client.loyalty_points !== undefined) && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Loyalty Points</span>
                <span className="text-blue-500 text-[15px]">
                  {client.points || client.loyaltyPoints || client.loyalty_points || 0} pts
                </span>
              </div>
            )}

            {/* Financial Information */}
            {(client.totalSpent !== undefined || client.total_purchases !== undefined) && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Total Spent</span>
                <span className="text-gray-900 text-[15px]">
                  TSh {(client.totalSpent || client.total_purchases || 0).toLocaleString()}
                </span>
              </div>
            )}

            {(client.totalPurchases !== undefined) && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Total Purchases</span>
                <span className="text-gray-900 text-[15px]">
                  {client.totalPurchases}
                </span>
              </div>
            )}

            {client.lastPurchaseDate && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Last Purchase</span>
                <span className="text-gray-900 text-[15px]">
                  {new Date(client.lastPurchaseDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Call Analytics */}
            {(client.totalCalls !== undefined && client.totalCalls > 0) && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Total Calls</span>
                <span className="text-gray-900 text-[15px]">{client.totalCalls}</span>
              </div>
            )}

            {client.callLoyaltyLevel && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Call Level</span>
                <span className="text-gray-900 text-[15px] font-medium">{client.callLoyaltyLevel}</span>
              </div>
            )}

            {client.lastCallDate && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Last Call</span>
                <span className="text-gray-900 text-[15px]">
                  {new Date(client.lastCallDate).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Branch Information */}
            {client.branchName && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Branch</span>
                <span className="text-gray-900 text-[15px]">{client.branchName}</span>
              </div>
            )}

            {client.referralSource && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Referral Source</span>
                <span className="text-gray-900 text-[15px]">{client.referralSource}</span>
              </div>
            )}

            {/* Account Status */}
            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Status</span>
              <span className={`text-[15px] font-medium ${client.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {client.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
              <span className="text-gray-900 text-[15px]">Customer Since</span>
              <span className="text-gray-900 text-[15px]">
                {new Date(client.createdAt || client.joinedDate || client.created_at).toLocaleDateString()}
              </span>
            </div>

            {client.lastVisit && (
              <div className="px-5 py-4 flex justify-between items-center border-b border-gray-200">
                <span className="text-gray-900 text-[15px]">Last Visit</span>
                <span className="text-gray-900 text-[15px]">
                  {new Date(client.lastVisit).toLocaleDateString()}
                </span>
              </div>
            )}

            {/* Notes */}
            {client.notes && (
              <div className="px-5 py-4 border-b border-gray-200">
                <div className="text-gray-900 text-[15px] mb-2">Notes</div>
                <div className="text-gray-600 text-[15px]">
                  {typeof client.notes === 'string' 
                    ? client.notes 
                    : Array.isArray(client.notes) && client.notes.length > 0
                    ? client.notes[client.notes.length - 1].content || client.notes[client.notes.length - 1]
                    : ''}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Journey Tab - iOS 17 Timeline */}
        {activeTab === 'journey' && (
          <div className="bg-[#f2f2f7] space-y-3 pb-6">
            <div className="px-4 py-4 bg-white">
              <h2 className="text-[17px] font-semibold text-gray-900 mb-1">Customer Journey</h2>
              <p className="text-[14px] text-gray-500">Complete timeline of all interactions</p>
            </div>

            <div className="px-4">
              {/* Timeline */}
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 via-purple-200 to-green-200 rounded-full"></div>

                <div className="space-y-3">
                  {/* Customer Created */}
                  <div className="relative flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                      <Users size={18} className="text-white" strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="font-semibold text-[15px] text-gray-900">Customer Created</div>
                      <div className="text-[13px] text-gray-500 mt-1">
                        {new Date(client.createdAt || client.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Devices */}
                  {devices.slice(0, 5).map((device) => (
                    <div key={device.id} className="relative flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                        <Smartphone size={18} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                        <div className="font-semibold text-[15px] text-gray-900">
                          {device.brand} {device.model}
                        </div>
                        <div className="text-[13px] text-gray-600 mt-1 line-clamp-2">
                          {device.issueDescription}
                        </div>
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                          <span className="text-[12px] text-gray-500">
                            {new Date(device.createdAt).toLocaleDateString()}
                          </span>
                          <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                            device.status === 'done' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {device.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Sales */}
                  {posSales.slice(0, 5).map((sale) => (
                    <div key={sale.id} className="relative flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                        <ShoppingBag size={18} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                        <div className="font-semibold text-[15px] text-gray-900">
                          Sale #{sale.sale_number || sale.id.slice(0, 8)}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[13px] text-gray-500">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-[15px] font-bold text-green-600">
                            TSh {(sale.total_amount || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Appointments */}
                  {appointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="relative flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                        <Calendar size={18} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                        <div className="font-semibold text-[15px] text-gray-900 capitalize">
                          {apt.service_type}
                        </div>
                        <div className="text-[13px] text-gray-500 mt-1">
                          {new Date(apt.appointment_date).toLocaleDateString()} • {apt.appointment_time}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Communications */}
                  {communicationHistory.slice(0, 3).map((msg, index) => (
                    <div key={index} className="relative flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center flex-shrink-0 z-10 shadow-md">
                        <MessageCircle size={18} className="text-white" strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                        <div className="font-semibold text-[15px] text-gray-900">
                          {msg.type?.toUpperCase() || 'SMS'} Message
                        </div>
                        <div className="text-[13px] text-gray-600 mt-1 line-clamp-2">
                          {msg.message}
                        </div>
                        <div className="text-[12px] text-gray-500 mt-2">
                          {new Date(msg.sent_at || msg.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SMS Modal - iOS 17 */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowSmsModal(false)}>
          <div className="w-full bg-white rounded-t-[20px] max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
              <button onClick={() => setShowSmsModal(false)} className="text-blue-500 text-[17px]">
                Cancel
              </button>
              <h3 className="text-[17px] font-semibold text-gray-900">Send SMS</h3>
              <button 
                onClick={handleSendSMS}
                disabled={smsSending || !smsMessage.trim()}
                className="text-blue-500 text-[17px] font-semibold disabled:text-gray-400"
              >
                {smsSending ? 'Sending...' : 'Send'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Recipient */}
              <div className="border-t border-b border-gray-200 -mx-4">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900 text-[15px]">To</span>
                  <span className="text-gray-900 text-[15px] font-medium">{client?.phone}</span>
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Message</label>
                <textarea
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Type your message..."
                  style={{ WebkitAppearance: 'none' }}
                  autoFocus
                />
                <div className="text-[13px] text-gray-400 mt-2 px-1">
                  {smsMessage.length} characters
                </div>
              </div>

              {/* Quick Templates */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Quick Templates</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSmsMessage(`Hi ${client?.name}, your order is ready for pickup!`)}
                    className="w-full p-3 bg-gray-50 rounded-lg text-left text-[14px] text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    📦 Order Ready
                  </button>
                  <button
                    onClick={() => setSmsMessage(`Hi ${client?.name}, thank you for your purchase!`)}
                    className="w-full p-3 bg-gray-50 rounded-lg text-left text-[14px] text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                  >
                    🙏 Thank You
                  </button>
                </div>
              </div>
            </div>

            {/* Send Button */}
            <div className="px-4 pb-4 pt-2">
              <button
                onClick={handleSendSMS}
                disabled={smsSending || !smsMessage.trim()}
                className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold text-[17px] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 active:bg-blue-700 transition-all shadow-sm"
              >
                {smsSending ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </span>
                ) : (
                  'Send SMS'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Modal - iOS 17 */}
      {showPointsModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowPointsModal(false)}>
          <div className="w-full bg-white rounded-t-[20px] max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
              <button onClick={() => setShowPointsModal(false)} className="text-blue-500 text-[17px]">
                Cancel
              </button>
              <h3 className="text-[17px] font-semibold text-gray-900">Manage Points</h3>
              <button 
                onClick={handleAddPoints}
                disabled={pointsLoading || !pointsAmount}
                className="text-blue-500 text-[17px] font-semibold disabled:text-gray-400"
              >
                {pointsLoading ? 'Saving...' : 'Done'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Current Points Display */}
              <div className="text-center py-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl">
                <div className="text-[13px] text-blue-100 uppercase tracking-wide mb-2">Current Points</div>
                <div className="text-[48px] font-bold text-white">
                  {client?.points || 0}
                </div>
                <div className="text-[15px] text-blue-100">loyalty points</div>
              </div>

              {/* Add/Remove Input */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Adjust Points</label>
                <div className="relative">
                  <input
                    type="number"
                    value={pointsAmount}
                    onChange={(e) => setPointsAmount(e.target.value)}
                    className="w-full px-4 py-4 bg-[#f2f2f7] border-0 rounded-xl text-[20px] font-semibold text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    style={{ WebkitAppearance: 'none' }}
                    autoFocus
                  />
                </div>
                <div className="text-[13px] text-gray-500 mt-2 text-center px-1">
                  Use positive numbers to add, negative to remove
                </div>
              </div>

              {/* Quick Amounts */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Quick Add</label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setPointsAmount(amount.toString())}
                      className="py-3 bg-gray-100 text-gray-900 rounded-xl text-[15px] font-semibold hover:bg-gray-200 active:bg-gray-300 transition-colors"
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Reason (Optional)</label>
                <input
                  type="text"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="E.g., Bonus points, Purchase return"
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>

              {/* Preview */}
              {pointsAmount && (
                <div className={`p-4 rounded-xl ${parseInt(pointsAmount) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-center">
                    <div className={`text-[13px] ${parseInt(pointsAmount) >= 0 ? 'text-green-600' : 'text-red-600'} font-medium mb-1`}>
                      {parseInt(pointsAmount) >= 0 ? 'Adding Points' : 'Removing Points'}
                    </div>
                    <div className={`text-[24px] font-bold ${parseInt(pointsAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {parseInt(pointsAmount) >= 0 ? '+' : ''}{pointsAmount}
                    </div>
                    <div className="text-[15px] text-gray-600 mt-2">
                      New balance: {(client?.points || 0) + parseInt(pointsAmount || '0')} points
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Check-in Modal - iOS 17 */}
      {showCheckinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowCheckinModal(false)}>
          <div className="w-[90%] max-w-sm bg-white rounded-2xl overflow-hidden shadow-2xl animate-scale-up" onClick={(e) => e.stopPropagation()}>
            {checkinSuccess ? (
              <div className="text-center py-8 px-6">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-green-600" strokeWidth={2.5} />
                </div>
                <h4 className="text-[20px] font-bold text-gray-900 mb-2">Check-in Successful!</h4>
                <p className="text-[16px] text-gray-600 mb-1">20 points awarded</p>
                <p className="text-[14px] text-gray-500">to {client?.name}</p>
                <button
                  onClick={() => {
                    setShowCheckinModal(false);
                    setCheckinSuccess(false);
                  }}
                  className="mt-6 w-full py-3.5 bg-blue-500 text-white rounded-xl font-semibold text-[17px] hover:bg-blue-600 active:bg-blue-700 transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="p-6">
                <h3 className="text-[20px] font-bold text-gray-900 mb-1 text-center">Customer Check-in</h3>
                <div className="text-center mb-6 mt-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={32} className="text-blue-600" strokeWidth={2.5} />
                  </div>
                  <p className="text-[18px] font-semibold text-gray-900">{client?.name}</p>
                  <p className="text-[15px] text-gray-500 mt-1">{client?.phone}</p>
                </div>

                <button
                  onClick={handleCheckIn}
                  disabled={checkinLoading}
                  className="w-full py-4 bg-green-500 text-white rounded-xl font-semibold text-[17px] disabled:bg-gray-300 disabled:cursor-not-allowed mb-3 hover:bg-green-600 active:bg-green-700 transition-all shadow-sm"
                >
                  {checkinLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Checking in...
                    </span>
                  ) : (
                    '✓ Check In Now'
                  )}
                </button>

                <button
                  onClick={() => setShowCheckinModal(false)}
                  className="w-full py-3 text-gray-700 rounded-xl font-medium text-[16px] hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Modal - iOS 17 */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowAppointmentModal(false)}>
          <div className="w-full bg-white rounded-t-[20px] max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
              <button onClick={() => setShowAppointmentModal(false)} className="text-blue-500 text-[17px]">
                Cancel
              </button>
              <h3 className="text-[17px] font-semibold text-gray-900">New Appointment</h3>
              <button 
                onClick={handleCreateAppointment}
                disabled={appointmentLoading || !appointmentDate || !appointmentTime || !appointmentService}
                className="text-blue-500 text-[17px] font-semibold disabled:text-gray-400"
              >
                {appointmentLoading ? 'Saving...' : 'Done'}
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer Info */}
              <div className="border-t border-b border-gray-200 -mx-4">
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-gray-900 text-[15px]">Customer</span>
                  <span className="text-gray-900 text-[15px] font-medium">{client?.name}</span>
                </div>
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <span className="text-gray-900 text-[15px]">Phone</span>
                  <span className="text-gray-900 text-[15px] font-mono">{client?.phone}</span>
                </div>
              </div>

              {/* Date & Time */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Date & Time</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    className="flex-1 px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <input
                    type="time"
                    value={appointmentTime}
                    onChange={(e) => setAppointmentTime(e.target.value)}
                    className="px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ WebkitAppearance: 'none', width: '140px' }}
                  />
                </div>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Service Type</label>
                <select
                  value={appointmentService}
                  onChange={(e) => setAppointmentService(e.target.value)}
                  className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ WebkitAppearance: 'none' }}
                >
                  <option value="">Select service</option>
                  <option value="repair">🔧 Repair</option>
                  <option value="consultation">💬 Consultation</option>
                  <option value="pickup">📦 Pickup</option>
                  <option value="delivery">🚚 Delivery</option>
                  <option value="other">📝 Other</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Notes (Optional)</label>
                <textarea
                  value={appointmentNotes}
                  onChange={(e) => setAppointmentNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Additional notes..."
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal - iOS 17 */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }} onClick={() => setShowEditModal(false)}>
          <div className="w-full bg-white rounded-t-[20px] max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
              <button onClick={() => setShowEditModal(false)} className="text-blue-500 text-[17px]">
                Cancel
              </button>
              <h3 className="text-[17px] font-semibold text-gray-900">Edit Customer</h3>
              <button 
                onClick={handleEditCustomer}
                disabled={!editFormData.name || !editFormData.phone}
                className="text-blue-500 text-[17px] font-semibold disabled:text-gray-400"
              >
                Save
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Basic Information</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editFormData.name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Customer name"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <input
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                    style={{ WebkitAppearance: 'none' }}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Contact Details</label>
                <div className="space-y-2">
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Email address"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <input
                    type="tel"
                    value={editFormData.whatsapp || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, whatsapp: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="WhatsApp number"
                    style={{ WebkitAppearance: 'none' }}
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Location</label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editFormData.address || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street address"
                    style={{ WebkitAppearance: 'none' }}
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editFormData.city || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                      className="flex-1 px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="City"
                      style={{ WebkitAppearance: 'none' }}
                    />
                    <input
                      type="text"
                      value={editFormData.country || ''}
                      onChange={(e) => setEditFormData({ ...editFormData, country: e.target.value })}
                      className="flex-1 px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Country"
                      style={{ WebkitAppearance: 'none' }}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[13px] text-gray-500 uppercase tracking-wide mb-2 px-1">Notes</label>
                <textarea
                  value={editFormData.notes || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 bg-[#f2f2f7] border-0 rounded-xl text-[16px] text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Additional notes..."
                  style={{ WebkitAppearance: 'none' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileClientDetail;

// Add animation styles
const styles = `
  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
  @keyframes scaleUp {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  .animate-slide-up {
    animation: slideUp 0.3s ease-out;
  }
  .animate-scale-up {
    animation: scaleUp 0.3s ease-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('mobile-client-detail-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'mobile-client-detail-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
}

