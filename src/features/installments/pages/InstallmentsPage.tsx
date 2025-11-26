import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useBranch } from '../../../context/BranchContext';
import { installmentService } from '../../../lib/installmentService';
import { installmentCacheService } from '../../../lib/installmentCacheService';
import { supabase } from '../../../lib/supabaseClient';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import {
  InstallmentPlan,
  InstallmentPlanStatus,
  CreateInstallmentPlanInput,
  RecordInstallmentPaymentInput,
  UpdateInstallmentPlanInput,
  InstallmentsStats,
  InstallmentSchedule,
  PaymentFrequency
} from '../../../types/specialOrders';
import { BackButton } from '../../shared/components/ui/BackButton';
import { 
  CreditCard, 
  Plus, 
  DollarSign,
  Filter,
  Search,
  Calendar,
  Trash2,
  CheckCircle,
  Clock,
  X as XIcon,
  AlertTriangle,
  TrendingUp,
  Bell,
  Eye,
  Send,
  Edit,
  FileText,
  Printer,
  History,
  Package,
  Building,
  AlertCircle,
  User,
  Link
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { financeAccountService } from '../../../lib/financeAccountService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { TableSkeleton } from '../../../components/ui/SkeletonLoaders';
import InstallmentManagementModal from '../../lats/components/pos/InstallmentManagementModal';

const InstallmentsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { customers } = useCustomers();
  const { currentBranch } = useBranch();
  const successModal = useSuccessModal();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [stats, setStats] = useState<InstallmentsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [showInstallmentManagementModal, setShowInstallmentManagementModal] = useState(false);

  // Fetch plans and stats
  const fetchPlans = useCallback(async () => {
    if (!currentBranch?.id) {
      setIsLoading(false);
      return;
    }

    const jobId = startLoading('Loading installment plans...');
    setIsLoading(true);
    try {
      // Check if we have cached installment plans (from InstallmentPreloader)
      const cachedPlans = installmentCacheService.getInstallments(currentBranch.id);
      let fetchedPlans: any[] = [];
      
      if (cachedPlans && cachedPlans.length > 0) {
        console.log(`⚡ [InstallmentsPage] Using ${cachedPlans.length} cached installment plans - instant load!`);
        fetchedPlans = cachedPlans;
        setPlans(fetchedPlans);
        
        // Still refresh in background (non-blocking)
        installmentService.getAllInstallmentPlans(currentBranch.id)
          .then(freshPlans => {
            console.log(`✅ [InstallmentsPage] Background refresh completed (${freshPlans.length} plans)`);
            installmentCacheService.saveInstallments(freshPlans, currentBranch.id);
            setPlans(freshPlans);
          })
          .catch(err => {
            console.warn('⚠️ [InstallmentsPage] Background refresh failed (non-critical):', err);
          });
      } else {
        console.log('📡 [InstallmentsPage] No cache found, loading from database...');
        fetchedPlans = await installmentService.getAllInstallmentPlans(currentBranch.id);
        console.log('Fetched plans:', fetchedPlans);
        setPlans(fetchedPlans);
        // Save to cache for next time
        installmentCacheService.saveInstallments(fetchedPlans, currentBranch.id);
      }
      
      const fetchedStats = await installmentService.getStatistics(currentBranch.id);
      console.log('Fetched stats:', fetchedStats);
      setStats(fetchedStats);
      completeLoading(jobId);
    } catch (error) {
      console.error('Error fetching installment plans:', error);
      failLoading(jobId, 'Failed to load installment plans');
      toast.error('Failed to load installment plans');
    } finally {
      setIsLoading(false);
    }
  }, [currentBranch?.id, startLoading, completeLoading, failLoading]);

  // Fetch payment accounts
  const fetchPaymentAccounts = useCallback(async () => {
    try {
      console.log('Fetching payment accounts...');
      const accounts = await financeAccountService.getPaymentMethods();
      console.log('Fetched payment accounts:', accounts);
      setPaymentAccounts(accounts);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
    }
  }, []);

  useEffect(() => {
    console.log('InstallmentsPage mounted/branch changed:', currentBranch);
    fetchPlans();
    fetchPaymentAccounts();
  }, [fetchPlans, fetchPaymentAccounts, currentBranch]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
      const matchesSearch = searchQuery === '' || 
        plan.plan_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.customer?.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date range filter
      const planDate = new Date(plan.created_at);
      const matchesDateFrom = !dateFrom || planDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || planDate <= new Date(dateTo + 'T23:59:59');
      
      return matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo;
    });
  }, [plans, statusFilter, searchQuery, dateFrom, dateTo]);

  // Status badge styling
  const getStatusColor = (status: InstallmentPlanStatus) => {
    const colors: Record<InstallmentPlanStatus, string> = {
      active: 'bg-green-100 text-green-700',
      completed: 'bg-gray-100 text-gray-700',
      defaulted: 'bg-red-100 text-red-700',
      cancelled: 'bg-orange-100 text-orange-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // Check if payment is overdue
  const isOverdue = (plan: InstallmentPlan) => {
    return plan.status === 'active' && new Date(plan.next_payment_date) < new Date();
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Send reminder
  const handleSendReminder = async (planId: string) => {
    const result = await installmentService.sendPaymentReminder(planId, currentUser?.id);
    if (result.success) {
      toast.success('Payment reminder sent successfully!');
      fetchPlans();
    } else {
      toast.error(result.error || 'Failed to send reminder');
    }
  };

  // Cancel plan
  const handleCancel = async (planId: string) => {
    if (!confirm('Are you sure you want to cancel this installment plan?')) return;
    
    const result = await installmentService.cancelPlan(planId);
    if (result.success) {
      toast.success('Installment plan cancelled successfully');
      fetchPlans();
    } else {
      toast.error(result.error || 'Failed to cancel plan');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Installment Plans</h1>
            <p className="text-gray-600 mt-1">Manage customer payment plans</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowInstallmentManagementModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm"
          >
            <CreditCard size={18} />
            Manage Installments
          </button>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={18} />
          New Installment Plan
        </button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-600">Total Plans</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-xs text-green-600">Active</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-2xl font-bold text-red-600">{stats.overdue_count}</div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-600">{stats.due_this_week}</div>
            <div className="text-xs text-yellow-600">Due This Week</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.total_balance_due)}
            </div>
            <div className="text-xs text-purple-600">Balance Due</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search plans, customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="defaulted">Defaulted</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Date From */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Date To */}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Clear Filters */}
          {(dateFrom || dateTo || searchQuery || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
            <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">No installment plans found</p>
            <p className="text-gray-500 text-sm mt-2">Create your first installment plan to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm inline-flex items-center gap-2"
            >
              <Plus size={18} />
              New Installment Plan
            </button>
          </div>
        ) : (
          filteredPlans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-lg p-5 border-2 transition-shadow ${
              isOverdue(plan) ? 'border-red-300 bg-red-50/30' : 'border-gray-200 hover:shadow-md'
            }`}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Plan Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${isOverdue(plan) ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <CreditCard className={`w-5 h-5 ${isOverdue(plan) ? 'text-red-600' : 'text-blue-600'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-gray-900">{plan.plan_number}</h3>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(plan.status)}`}>
                          {plan.status.toUpperCase()}
                        </span>
                        {isOverdue(plan) && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 font-medium mt-1">{plan.customer?.name}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>
                          {Number(plan.installment_amount).toFixed(2)} TZS / {plan.payment_frequency}
                        </span>
                        <span>•</span>
                        <span>{plan.installments_paid} / {plan.number_of_installments} paid</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          Next: {new Date(plan.next_payment_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex flex-col lg:items-end gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">Total: <span className="font-bold text-gray-900">{formatCurrency(plan.total_amount)}</span></div>
                    <div className="text-xs text-green-600">Paid: <span className="font-bold">{formatCurrency(plan.total_paid)}</span></div>
                    <div className="text-xs text-red-600">Balance: <span className="font-bold">{formatCurrency(plan.balance_due)}</span></div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all"
                        style={{ width: `${(plan.total_paid / plan.total_amount) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowDetailsModal(true);
                      }}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <Eye size={14} />
                      Details
                    </button>
                    {plan.status === 'active' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowPaymentModal(true);
                          }}
                          className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <DollarSign size={14} />
                          Pay
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPlan(plan);
                            setShowEditModal(true);
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Edit size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleSendReminder(plan.id)}
                          className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs font-medium flex items-center gap-1"
                        >
                          <Send size={14} />
                          Remind
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowScheduleModal(true);
                      }}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <Calendar size={14} />
                      Schedule
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPlan(plan);
                        setShowPaymentHistoryModal(true);
                      }}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium flex items-center gap-1"
                    >
                      <History size={14} />
                      History
                    </button>
                    {plan.status === 'active' && (
                      <button
                        onClick={() => handleCancel(plan.id)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateInstallmentPlanModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchPlans();
          }}
          customers={customers}
          paymentAccounts={paymentAccounts}
          currentUser={currentUser}
        />
      )}

      {showDetailsModal && selectedPlan && (
        <ViewPlanDetailsModal
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
        />
      )}

      {showEditModal && selectedPlan && (
        <EditInstallmentPlanModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedPlan(null);
            fetchPlans();
          }}
          plan={selectedPlan}
        />
      )}

      {showPaymentModal && selectedPlan && (
        <RecordInstallmentPaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          onSuccess={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
            fetchPlans();
          }}
          plan={selectedPlan}
          paymentAccounts={paymentAccounts}
          currentUser={currentUser}
        />
      )}

      {showScheduleModal && selectedPlan && (
        <ViewScheduleModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
        />
      )}

      {showPaymentHistoryModal && selectedPlan && (
        <PaymentHistoryModal
          isOpen={showPaymentHistoryModal}
          onClose={() => {
            setShowPaymentHistoryModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
        />
      )}
    </div>
  );
};

// ================================================
// CREATE INSTALLMENT PLAN MODAL
// ================================================

interface CreateInstallmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: any[];
  paymentAccounts: any[];
  currentUser: any;
}

const CreateInstallmentPlanModal: React.FC<CreateInstallmentPlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  paymentAccounts,
  currentUser
}) => {
  const { currentBranch } = useBranch();
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  
  const [formData, setFormData] = useState<Partial<CreateInstallmentPlanInput>>({
    customer_id: '',
    sale_id: '',
    total_amount: 0,
    down_payment: 0,
    number_of_installments: 3,
    payment_frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    late_fee_amount: 0,
    notes: '',
    payment_method: 'cash',
    account_id: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    // Remove .00 for whole numbers
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Fetch recent unpaid/partial sales
  useEffect(() => {
    const fetchSales = async () => {
      if (!isOpen || !currentBranch?.id) {
        setSales([]);
        return;
      }
      
      setLoadingSales(true);
      try {
        const { data, error } = await supabase
          .from('lats_sales')
          .select(`
            id,
            sale_number,
            customer_id,
            total_amount,
            payment_status,
            created_at,
            customers (name, phone)
          `)
          .eq('branch_id', currentBranch.id)
          .in('payment_status', ['unpaid', 'partial'])
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) {
          console.error('Error fetching sales:', error);
          toast.error('Failed to load sales');
          setSales([]);
        } else {
          setSales(data || []);
        }
      } catch (error) {
        console.error('Error fetching sales:', error);
        toast.error('Failed to load sales');
        setSales([]);
      } finally {
        setLoadingSales(false);
      }
    };

    fetchSales();
  }, [isOpen, currentBranch?.id]);

  // Handle sale selection
  const handleSaleSelect = (saleId: string) => {
    const selectedSale = sales.find(s => s.id === saleId);
    if (selectedSale) {
      setFormData(prev => ({
        ...prev,
        sale_id: saleId,
        customer_id: selectedSale.customer_id,
        total_amount: selectedSale.total_amount,
        notes: `Linked to sale ${selectedSale.sale_number}`
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        sale_id: '',
        total_amount: 0,
        notes: ''
      }));
    }
  };

  const amountFinanced = (formData.total_amount || 0) - (formData.down_payment || 0);
  const installmentAmount = amountFinanced / (formData.number_of_installments || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_id || !formData.account_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await installmentService.createInstallmentPlan(
        formData as CreateInstallmentPlanInput,
        currentUser?.id,
        currentBranch?.id
      );

      if (result.success) {
        onSuccess();
        successModal.show('Installment plan has been created successfully!', {
          title: 'Plan Created',
          actionButtons: [
            {
              label: 'View Plans',
              onClick: () => {},
              variant: 'primary'
            }
          ]
        });
      } else {
        toast.error(result.error || 'Failed to create installment plan');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[100000]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="installment-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <XIcon className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="installment-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Create Installment Plan</h3>
              <p className="text-sm text-gray-600">Set up payment plan for customer</p>
            </div>
          </div>
        </div>

        {/* Form Wrapper */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            {/* Scrollable Form Section */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Link to Existing Sale (Optional) */}
            <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Link className="w-5 h-5 text-blue-600" />
                <label className="block text-sm font-bold text-blue-900">
              Link to Existing Sale (Optional)
            </label>
              </div>
              {loadingSales ? (
                <div className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl bg-white flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-600">Loading sales...</span>
                </div>
              ) : (
                <>
            <select
              value={formData.sale_id}
              onChange={(e) => handleSaleSelect(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-blue-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white font-medium"
            >
              <option value="">-- Create New Installment (No Sale Link) --</option>
                    {sales.length > 0 ? (
                      sales.map(sale => (
                <option key={sale.id} value={sale.id}>
                          {sale.sale_number} - {sale.customers?.name || 'Unknown Customer'} - {formatPrice(sale.total_amount)} TZS ({sale.payment_status})
                </option>
                      ))
                    ) : (
                      <option value="" disabled>No unpaid or partial sales found</option>
                    )}
            </select>
                  {sales.length === 0 && !loadingSales && (
                    <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      No unpaid or partial sales available to link
                    </p>
                  )}
                </>
              )}
          </div>

          {/* Customer */}
          <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_id: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
              required
              disabled={!!formData.sale_id}
            >
              <option value="">Select Customer</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.phone}
                </option>
              ))}
            </select>
              </div>
            {formData.sale_id && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Auto-selected from linked sale
                </p>
            )}
          </div>

          {/* Total Amount and Down Payment */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Total Amount <span className="text-red-500">*</span>
              </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                    type="text"
                    value={formatPrice(formData.total_amount || 0)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setFormData(prev => ({ ...prev, total_amount: numValue }));
                    }}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={!!formData.sale_id}
              />
                </div>
              {formData.sale_id && (
                  <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Auto-populated from linked sale
                  </p>
              )}
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Down Payment <span className="text-red-500">*</span>
              </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                    type="text"
                    value={formatPrice(formData.down_payment || 0)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setFormData(prev => ({ ...prev, down_payment: numValue }));
                    }}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white"
                required
              />
                </div>
            </div>
          </div>

            {/* Summary Box - Polished Design */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border-2 border-blue-200 shadow-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
              <div>
                    <p className="text-xs font-medium text-gray-600 mb-0.5">Amount to Finance</p>
                    <p className="text-lg font-bold text-blue-900">
                      {formatPrice(amountFinanced)} TZS
                    </p>
                </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                    <p className="text-xs font-medium text-gray-600 mb-0.5">Per Installment</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {formatPrice(installmentAmount)} TZS
                    </p>
                </div>
              </div>
            </div>
          </div>

          {/* Number of Installments and Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Number of Installments <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.number_of_installments}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_installments: parseInt(e.target.value) || 1 }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white"
                min="1"
                required
              />
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Payment Frequency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_frequency}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_frequency: e.target.value as PaymentFrequency }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                required
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>

          {/* Start Date and Late Fee */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                required
              />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Late Fee Amount</label>
                <div className="relative">
                  <AlertTriangle className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-orange-400" />
              <input
                    type="text"
                    value={formatPrice(formData.late_fee_amount || 0)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      const numValue = parseFloat(value) || 0;
                      setFormData(prev => ({ ...prev, late_fee_amount: numValue }));
                    }}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-gray-900 font-medium bg-white"
              />
                </div>
            </div>
          </div>

          {/* Payment Method and Account */}
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Payment Method <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                required
              >
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                Payment Account <span className="text-red-500">*</span>
              </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={formData.account_id}
                onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                required
              >
                <option value="">Select Account</option>
                {paymentAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
                </div>
            </div>
          </div>

          {/* Notes */}
          <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">Notes</label>
              <div className="relative">
                <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white resize-none"
              placeholder="Plan details..."
                  rows={3}
            />
              </div>
            </div>
          </div>

          {/* Fixed Action Buttons Footer */}
          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
                className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
                disabled={isSubmitting || !formData.customer_id || !formData.account_id}
                  className="flex-1 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                    </span>
                  ) : (
                  'Create Installment Plan'
                  )}
                </button>
              </div>
            </div>
        </form>
          </div>
    </div>,
    document.body
  );
};

// ================================================
// RECORD INSTALLMENT PAYMENT MODAL
// ================================================

interface RecordInstallmentPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: InstallmentPlan;
  paymentAccounts: any[];
  currentUser: any;
}

const RecordInstallmentPaymentModal: React.FC<RecordInstallmentPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  plan,
  paymentAccounts,
  currentUser
}) => {
  // Calculate the installment amount properly
  // Use the smaller of: installment_amount or balance_due (for final payment)
  const calculatePaymentAmount = () => {
    const installmentAmount = Number(plan.installment_amount || 0);
    const balanceDue = Number(plan.balance_due || 0);
    
    // If balance due is less than regular installment, use balance due (final payment)
    if (balanceDue > 0 && balanceDue < installmentAmount) {
      return Number(balanceDue.toFixed(2));
    }
    
    // Otherwise use the regular installment amount
    return Number(installmentAmount.toFixed(2));
  };
  
  const roundedAmount = calculatePaymentAmount();
  
  const [formData, setFormData] = useState<Partial<RecordInstallmentPaymentInput>>({
    installment_plan_id: plan.id,
    customer_id: plan.customer_id,
    amount: roundedAmount,
    payment_method: 'cash',
    account_id: '',
    reference_number: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens or plan changes
  useEffect(() => {
    if (isOpen) {
      const paymentAmount = calculatePaymentAmount();
      console.log('💰 [Installment Payment Modal] Setting payment amount:', {
        planId: plan.id,
        planNumber: plan.plan_number,
        installmentAmount: plan.installment_amount,
        balanceDue: plan.balance_due,
        calculatedPaymentAmount: paymentAmount
      });
      
      setFormData({
        installment_plan_id: plan.id,
        customer_id: plan.customer_id,
        amount: paymentAmount,
        payment_method: 'cash',
        account_id: '',
        reference_number: '',
        notes: ''
      });
    }
  }, [isOpen, plan.id, plan.customer_id, plan.installment_amount, plan.balance_due]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.account_id) {
      toast.error('Please select a payment account');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await installmentService.recordPayment(
        formData as RecordInstallmentPaymentInput,
        currentUser?.id
      );

      if (result.success) {
        toast.success('Payment recorded successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
              <p className="text-sm text-gray-600">{plan.plan_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Plan Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Customer:</span>
              <span className="font-medium text-gray-900">{plan.customer?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Installments Paid:</span>
              <span className="font-medium text-gray-900">{plan.installments_paid} / {plan.number_of_installments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining Balance:</span>
              <span className="font-bold text-red-600">
                {plan.balance_due.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
              <span className="text-gray-600">Calculated Installment Amount:</span>
              <span className="font-bold text-blue-600">
                {Number(plan.installment_amount).toFixed(2)} TZS
              </span>
            </div>
            {/* Show if this is the final payment with a different amount */}
            {plan.balance_due > 0 && plan.balance_due < plan.installment_amount && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-yellow-800">Final Payment</p>
                    <p className="text-xs text-yellow-700 mt-1">
                      This is the last payment. Amount set to remaining balance: <strong>{plan.balance_due.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter payment amount"
                min="0"
                max={plan.balance_due}
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="cash">Cash</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Account <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.account_id}
              onChange={(e) => setFormData(prev => ({ ...prev, account_id: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select Account</option>
              {paymentAccounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Transaction reference"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Payment notes..."
              rows={2}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================================
// VIEW SCHEDULE MODAL
// ================================================

interface ViewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InstallmentPlan;
}

const ViewScheduleModal: React.FC<ViewScheduleModalProps> = ({
  isOpen,
  onClose,
  plan
}) => {
  const [schedule, setSchedule] = useState<InstallmentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      setIsLoading(true);
      const scheduleData = await installmentService.getPaymentSchedule(plan.id);
      setSchedule(scheduleData);
      setIsLoading(false);
    };

    if (isOpen) {
      fetchSchedule();
    }
  }, [isOpen, plan.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Schedule</h3>
              <p className="text-sm text-gray-600">{plan.plan_number} - {plan.customer?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Schedule */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading schedule...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {schedule.map((item) => (
                <div
                  key={item.installment_number}
                  className={`p-4 rounded-lg border-2 ${
                    item.status === 'paid'
                      ? 'bg-green-50 border-green-200'
                      : item.status === 'overdue'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        item.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : item.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        #{item.installment_number}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          Due: {new Date(item.due_date).toLocaleDateString()}
                        </div>
                        {item.paid_date && (
                          <div className="text-xs text-gray-600">
                            Paid: {new Date(item.paid_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-gray-900">
                        {item.amount.toLocaleString('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 })}
                      </div>
                      <div className={`text-xs font-semibold uppercase ${
                        item.status === 'paid'
                          ? 'text-green-600'
                          : item.status === 'overdue'
                          ? 'text-red-600'
                          : 'text-gray-600'
                      }`}>
                        {item.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================================
// VIEW PLAN DETAILS MODAL
// ================================================

interface ViewPlanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InstallmentPlan;
}

const ViewPlanDetailsModal: React.FC<ViewPlanDetailsModalProps> = ({
  isOpen,
  onClose,
  plan
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState(plan);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [creatorInfo, setCreatorInfo] = useState<any>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!isOpen || !plan.id) return;
      
      console.log('🔍 [Details Modal] Fetching plan details for:', plan.id);
      setIsLoading(true);
      const fullPlan = await installmentService.getInstallmentPlanById(plan.id);
      if (fullPlan) {
        console.log('✅ [Details Modal] Loaded plan:', {
          planNumber: fullPlan.plan_number,
          installmentsPaid: fullPlan.installments_paid,
          amountPaid: fullPlan.amount_paid,
          balanceDue: fullPlan.balance_due,
          paymentsCount: fullPlan.payments?.length || 0
        });
        setCurrentPlan(fullPlan);
        setPayments(fullPlan.payments || []);
        
        // Fetch sale items if sale_id exists
        if (fullPlan.sale_id) {
          const { data: saleItemsData } = await supabase
            .from('lats_sale_items')
            .select('*')
            .eq('sale_id', fullPlan.sale_id);
          
          if (saleItemsData && saleItemsData.length > 0) {
            // Fetch product and variant details separately to avoid nested relationship issues
            const productIds = [...new Set(saleItemsData.map(item => item.product_id).filter(Boolean))];
            const variantIds = [...new Set(saleItemsData.map(item => item.variant_id).filter(Boolean))];

            const [productsResult, variantsResult] = await Promise.all([
              productIds.length > 0 ? supabase.from('lats_products').select('id, name, sku').in('id', productIds) : { data: [] },
              variantIds.length > 0 ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds) : { data: [] }  // 🔧 FIX: Select both name columns
            ]);

            const productsMap = new Map((productsResult.data || []).map((p: any) => [p.id, p]));
            const variantsMap = new Map((variantsResult.data || []).map((v: any) => [v.id, { ...v, name: v.name || v.variant_name || 'Unnamed' }]));  // 🔧 FIX: Prioritize 'name' first

            // Attach product and variant data to sale items
            const enhancedItems = saleItemsData.map(item => ({
              ...item,
              lats_products: productsMap.get(item.product_id),
              lats_product_variants: variantsMap.get(item.variant_id)
            }));

            setSaleItems(enhancedItems);
          }
        }
        
        // Fetch branch info if branch_id exists
        if (fullPlan.branch_id) {
          const { data: branchData } = await supabase
            .from('store_locations')
            .select('id, name, address')
            .eq('id', fullPlan.branch_id)
            .single();
          
          if (branchData) {
            setBranchInfo(branchData);
          }
        }
        
        // Fetch creator info if created_by exists
        if (fullPlan.created_by) {
          const { data: userData } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', fullPlan.created_by)
            .single();
          
          if (userData) {
            setCreatorInfo(userData);
          }
        }
      } else {
        console.warn('⚠️ [Details Modal] Failed to load plan');
      }
      setIsLoading(false);
    };

    fetchPayments();
  }, [isOpen, plan.id, plan.updated_at]); // Added plan.updated_at to trigger refresh when plan updates

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate installment schedule
  const generateInstallmentSchedule = () => {
    const schedule = [];
    const startDate = new Date(currentPlan.start_date);
    
    for (let i = 0; i < currentPlan.number_of_installments; i++) {
      const dueDate = new Date(startDate);
      
      // Calculate due date based on payment frequency
      if (currentPlan.payment_frequency === 'weekly') {
        dueDate.setDate(startDate.getDate() + (i * 7));
      } else if (currentPlan.payment_frequency === 'monthly') {
        dueDate.setMonth(startDate.getMonth() + i);
      } else if (currentPlan.payment_frequency === 'bi-weekly') {
        dueDate.setDate(startDate.getDate() + (i * 14));
      }
      
      // Find matching payment
      const payment = payments.find(p => p.installment_number === i + 1);
      
      const isPaid = payment && payment.status === 'paid';
      const isOverdue = !isPaid && new Date() > dueDate;
      
      schedule.push({
        installmentNumber: i + 1,
        dueDate: dueDate.toISOString(),
        amount: currentPlan.installment_amount,
        status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        payment: payment,
        daysOverdue: isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
    }
    
    return schedule;
  };

  const installmentSchedule = generateInstallmentSchedule();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{currentPlan.plan_number}</h3>
              <p className="text-sm text-indigo-100">Installment Plan Details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <XIcon size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer & Status Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Customer Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Name:</span>
                  <span className="font-medium text-gray-900">{currentPlan.customer?.name}</span>
            </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium text-gray-900">{currentPlan.customer?.phone}</span>
                </div>
                    {currentPlan.customer?.email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{currentPlan.customer.email}</span>
                      </div>
                    )}
            </div>
          </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <h4 className="text-sm font-semibold text-purple-900 mb-3">Plan Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-bold uppercase px-2 py-1 rounded text-xs ${
                    currentPlan.status === 'active' ? 'bg-green-100 text-green-700' :
                    currentPlan.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    currentPlan.status === 'defaulted' ? 'bg-red-100 text-red-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>{currentPlan.status}</span>
            </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium text-gray-900">{formatDate(currentPlan.created_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Reminders Sent:</span>
                  <span className="font-medium text-gray-900">{currentPlan.reminder_count}</span>
              </div>
                </div>
              </div>
            </div>

          {/* Financial Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
            <h4 className="text-lg font-semibold text-green-900 mb-4">Financial Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrency(currentPlan.total_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Down Payment</p>
                <p className="text-lg font-bold text-blue-600">{formatCurrency(currentPlan.down_payment)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(currentPlan.total_paid || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Balance Due</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(currentPlan.balance_due)}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-green-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Payment Progress</span>
                <span className="text-sm font-semibold text-gray-900">
                  {(((currentPlan.total_paid || 0) / currentPlan.total_amount) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all"
                  style={{ width: `${((currentPlan.total_paid || 0) / currentPlan.total_amount) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Payment Schedule Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Installment Amount</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(currentPlan.installment_amount)}</p>
              <p className="text-xs text-gray-500 mt-1">per {currentPlan.payment_frequency}</p>
                </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Installments</p>
              <p className="text-xl font-bold text-gray-900">{currentPlan.installments_paid} / {currentPlan.number_of_installments}</p>
              <p className="text-xs text-gray-500 mt-1">paid</p>
                </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Next Payment</p>
              <p className="text-xl font-bold text-gray-900">{currentPlan.next_payment_date ? formatDate(currentPlan.next_payment_date) : 'Completed'}</p>
              <p className="text-xs text-gray-500 mt-1">due date</p>
            </div>
          </div>

          {/* Installment Schedule Breakdown */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                Installment Schedule
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Due Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Paid On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {installmentSchedule.map((installment) => (
                    <tr 
                      key={installment.installmentNumber}
                      className={`
                        ${installment.status === 'paid' ? 'bg-green-50' : ''}
                        ${installment.status === 'overdue' ? 'bg-red-50' : ''}
                        hover:bg-gray-50 transition-colors
                      `}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {installment.installmentNumber}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                          {formatDate(installment.dueDate)}
                        {installment.status === 'overdue' && (
                          <span className="ml-2 text-xs text-red-600">
                            ({installment.daysOverdue} days late)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatCurrency(installment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          installment.status === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : installment.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {installment.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {installment.payment ? formatDate(installment.payment.payment_date) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Product Details */}
          {saleItems.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-cyan-50">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Package size={16} className="text-blue-600" />
                  Product Details {currentPlan.sale?.sale_number && (
                    <span className="text-xs text-gray-600 ml-2">
                      (Sale: {currentPlan.sale.sale_number})
                    </span>
                  )}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {saleItems.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <div className="font-medium">{item.lats_products?.name || 'Unknown Product'}</div>
                            {item.lats_product_variants?.name && (
                              <div className="text-xs text-gray-500">{item.lats_product_variants.name}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                            {item.lats_product_variants?.sku || item.lats_products?.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                            {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                          {formatCurrency(item.unit_price || item.price || 0)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          {formatCurrency(item.total_price || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Business Context */}
          {(branchInfo || creatorInfo) && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building size={16} className="text-purple-600" />
                Business Context
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branchInfo && (
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Branch</p>
                    <p className="text-sm font-medium text-gray-900">{branchInfo.name}</p>
                      {branchInfo.address && (
                        <p className="text-xs text-gray-500 mt-1">{branchInfo.address}</p>
                      )}
                  </div>
                )}
                {creatorInfo && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Created By</p>
                    <p className="text-sm font-medium text-gray-900">
                      {creatorInfo.full_name}
                    </p>
                      {creatorInfo.email && (
                        <p className="text-xs text-gray-500 mt-1">{creatorInfo.email}</p>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Important Dates</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Start Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(currentPlan.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600">End Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(currentPlan.end_date)}</p>
              </div>
              {currentPlan.completion_date && (
                <div>
                  <p className="text-xs text-gray-600">Completed On</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(currentPlan.completion_date)}</p>
                </div>
              )}
              {currentPlan.last_reminder_sent && (
                <div>
                  <p className="text-xs text-gray-600">Last Reminder</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(currentPlan.last_reminder_sent)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Terms & Late Fees */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-600" />
              Payment Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-orange-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Late Fee Rate</p>
                <p className="text-lg font-bold text-orange-600">{formatCurrency(currentPlan.late_fee_amount || 0)}</p>
                <p className="text-xs text-gray-500 mt-1">per missed payment</p>
                </div>
              <div className={`p-3 rounded-lg ${currentPlan.late_fee_applied > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-600 mb-1">Late Fees Applied</p>
                <p className={`text-lg font-bold ${currentPlan.late_fee_applied > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  {formatCurrency(currentPlan.late_fee_applied || 0)}
                  </p>
                <p className="text-xs text-gray-500 mt-1">accumulated</p>
                </div>
              <div className={`p-3 rounded-lg ${currentPlan.days_overdue > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-600 mb-1">Days Overdue</p>
                <p className={`text-lg font-bold ${currentPlan.days_overdue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {currentPlan.days_overdue || 0}
                  </p>
                <p className="text-xs text-gray-500 mt-1">{currentPlan.days_overdue > 0 ? 'action required' : 'on track'}</p>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-amber-50">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Bell size={16} className="text-yellow-600" />
                Activity & Reminders
              </h4>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Reminders Sent</p>
                  <p className="text-xs text-gray-500 mt-1">WhatsApp notifications to customer</p>
                </div>
                <span className="text-2xl font-bold text-blue-600">{currentPlan.reminder_count || 0}</span>
              </div>
              
              {currentPlan.last_reminder_sent && (
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Last Reminder Sent</p>
                    <p className="text-xs text-blue-600 mt-1">{formatDate(currentPlan.last_reminder_sent)}</p>
                  </div>
                  <CheckCircle className="text-blue-600" size={20} />
                </div>
              )}
              
              {currentPlan.terms_accepted && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm font-medium text-green-900">Terms Accepted</p>
                    <p className="text-xs text-green-600 mt-1">
                      {formatDate(currentPlan.terms_accepted_date || currentPlan.created_at)}
                    </p>
                  </div>
                  <CheckCircle className="text-green-600" size={20} />
                </div>
              )}
              
              {!currentPlan.terms_accepted && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm font-medium text-red-900">Terms Not Accepted</p>
                    <p className="text-xs text-red-600 mt-1">Customer agreement pending</p>
                  </div>
                  <AlertCircle className="text-red-600" size={20} />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {currentPlan.notes && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h4 className="text-sm font-semibold text-yellow-900 mb-2">Notes</h4>
              <p className="text-sm text-gray-700">{currentPlan.notes}</p>
            </div>
          )}

          {/* Recent Payments */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <History size={16} />
                Recent Payments ({payments.length})
              </h4>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : payments.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No payments recorded yet
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {payments.map((payment, index) => (
                    <div key={payment.id || index} className="p-4 hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">
                            Payment #{payment.installment_number}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            {formatDate(payment.payment_date)} • {payment.payment_method}
                          </p>
                          {payment.reference_number && (
                            <p className="text-xs text-gray-500 mt-1">
                              Ref: {payment.reference_number}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(payment.amount)}
                          </p>
                          <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded">
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-3">
            {/* Record Payment Button */}
            {currentPlan.status === 'active' && currentPlan.balance_due > 0 && (
              <button
                onClick={() => {
                  // This will be handled by parent component
                  onClose();
                }}
                className="flex-1 min-w-[200px] px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                Record Payment
              </button>
            )}
            
            {/* Send Reminder Button */}
            {currentPlan.status === 'active' && currentPlan.customer?.phone && (
              <button
                onClick={async () => {
                  try {
                    await installmentService.sendPaymentReminder(currentPlan.id);
                    toast.success('Reminder sent successfully!');
                    // Refresh the plan data
                    const updatedPlan = await installmentService.getInstallmentPlanById(currentPlan.id);
                    if (updatedPlan) {
                      setCurrentPlan(updatedPlan);
                    }
                  } catch (error: any) {
                    toast.error(error.message || 'Failed to send reminder');
                  }
                }}
                className="flex-1 min-w-[200px] px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Bell size={18} />
                Send Reminder
              </button>
            )}
            
            {/* Print/Export Button */}
            <button
              onClick={() => {
                window.print();
              }}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <Printer size={18} />
              Print
            </button>
            
            {/* View Customer Button */}
            {currentPlan.customer?.id && (
              <button
                onClick={() => {
                  // Navigate to customer details
                  window.location.href = `/customers?id=${currentPlan.customer.id}`;
                }}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <User size={18} />
                View Customer
              </button>
            )}
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================================
// EDIT INSTALLMENT PLAN MODAL
// ================================================

interface EditInstallmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: InstallmentPlan;
}

const EditInstallmentPlanModal: React.FC<EditInstallmentPlanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  plan
}) => {
  const [formData, setFormData] = useState<UpdateInstallmentPlanInput>({
    late_fee_amount: plan.late_fee_amount,
    notes: plan.notes || '',
    status: plan.status
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    try {
      const result = await installmentService.updateInstallmentPlan(
        plan.id,
        formData
      );

      if (result.success) {
        toast.success('Installment plan updated successfully!');
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to update installment plan');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Edit className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Installment Plan</h3>
              <p className="text-sm text-gray-600">{plan.plan_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as InstallmentPlanStatus }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="defaulted">Defaulted</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Late Fee Amount
            </label>
            <input
              type="number"
              value={formData.late_fee_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, late_fee_amount: parseFloat(e.target.value) || 0 }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Plan notes..."
              rows={3}
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Updating...' : 'Update Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ================================================
// PAYMENT HISTORY MODAL
// ================================================

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: InstallmentPlan;
}

const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  plan
}) => {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!isOpen || !plan.id) return;
      
      setIsLoading(true);
      const fullPlan = await installmentService.getInstallmentPlanById(plan.id);
      if (fullPlan?.payments) {
        setPayments(fullPlan.payments);
      }
      setIsLoading(false);
    };

    fetchPayments();
  }, [isOpen, plan.id]);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <History className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <p className="text-sm text-gray-600">{plan.plan_number} - {plan.customer?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Print"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total Payments</p>
              <p className="text-2xl font-bold text-gray-900">{payments.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">Balance</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(plan.balance_due)}</p>
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment history...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">No payments recorded yet</p>
              <p className="text-gray-500 text-sm mt-2">Payment history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={payment.id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-700 font-bold">#{payment.installment_number}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          Installment Payment {payment.installment_number}
                        </p>
                        <p className="text-xs text-gray-600">{formatDate(payment.payment_date)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-semibold rounded ${
                        payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                        payment.status === 'late' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {payment.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Payment Method:</span>
                      <span className="font-medium text-gray-900 ml-2">{payment.payment_method}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {new Date(payment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                    {payment.reference_number && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Reference:</span>
                        <span className="font-medium text-gray-900 ml-2">{payment.reference_number}</span>
                      </div>
                    )}
                    {payment.late_fee > 0 && (
                      <div className="col-span-2">
                        <span className="text-red-600">Late Fee:</span>
                        <span className="font-medium text-red-600 ml-2">{formatCurrency(payment.late_fee)}</span>
                      </div>
                    )}
                    {payment.notes && (
                      <div className="col-span-2">
                        <span className="text-gray-600">Notes:</span>
                        <p className="text-gray-700 mt-1 text-sm">{payment.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />

      {/* Installment Management Modal */}
      <InstallmentManagementModal
        isOpen={showInstallmentManagementModal}
        onClose={() => setShowInstallmentManagementModal(false)}
      />
    </div>
  );
};

export default InstallmentsPage;

