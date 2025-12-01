import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Eye, Edit, Trash2, CheckSquare,
  RefreshCw, FileText, Clock, History,
  ChevronDown, ChevronUp, CreditCard, Download, Filter,
  Calendar, TrendingUp, DollarSign, Users,
  MessageSquare, Bell, Check, XCircle, Loader,
  Plus, Minus, Info, Building, AlertTriangle, AlertCircle, Share2, CheckCircle, User, Send, Phone, Mail, Link, Package, Printer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { useCustomers } from '../../../../context/CustomersContext';
import { useBranch } from '../../../../context/BranchContext';
import { installmentService } from '../../../../lib/installmentService';
import { installmentCacheService } from '../../../../lib/installmentCacheService';
import { financeAccountService } from '../../../../lib/financeAccountService';
import { supabase } from '../../../../lib/supabaseClient';
import { useLoadingJob } from '../../../../hooks/useLoadingJob';
import { useSuccessModal } from '../../../../hooks/useSuccessModal';
import SuccessModal from '../../../../components/ui/SuccessModal';
import LoadingSpinner from '../../../../components/ui/LoadingSpinner';
import { useBodyScrollLock } from '../../../../hooks/useBodyScrollLock';
import {
  InstallmentPlan,
  InstallmentPlanStatus,
  CreateInstallmentPlanInput,
  RecordInstallmentPaymentInput,
  UpdateInstallmentPlanInput,
  InstallmentsStats,
  PaymentFrequency,
  InstallmentSchedule
} from '../../../../types/specialOrders';
import CustomerTooltip from './CustomerTooltip';

interface InstallmentManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InstallmentManagementModal: React.FC<InstallmentManagementModalProps> = ({ isOpen, onClose }) => {
  console.log('🔵 [InstallmentManagementModal] Rendering, isOpen:', isOpen);
  const { currentUser } = useAuth();
  const { customers } = useCustomers();
  const { currentBranch } = useBranch();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  const successModal = useSuccessModal();
  const loadingJobIdRef = useRef<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'installments' | 'future'>('installments');

  // Database state
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [stats, setStats] = useState<InstallmentsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | InstallmentPlanStatus>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'plan_number' | 'total_amount' | 'next_payment_date'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selection and bulk actions
  const [selectedPlans, setSelectedPlans] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null);

  // Expanded and visible count
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [visiblePlanCount, setVisiblePlanCount] = useState(6);
  const planListRef = useRef<HTMLDivElement | null>(null);
  const planCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const modalRef = useRef<HTMLDivElement | null>(null);
  const actionDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showActionDropdown, setShowActionDropdown] = useState(false);

  // Prevent body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElement = modalRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElement) {
        focusableElement.focus();
      }
    }
  }, [isOpen]);

  // Close action dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionDropdownRef.current && !actionDropdownRef.current.contains(event.target as Node)) {
        setShowActionDropdown(false);
      }
    };

    if (showActionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionDropdown]);

  // Exit selection mode when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isClickOnPlanList = planListRef.current?.contains(target);
      const isClickOnActionsDropdown = actionDropdownRef.current?.contains(target);
      const isClickOnCheckbox = (target as HTMLElement).tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox';

      if (isSelectionMode && !isClickOnPlanList && !isClickOnActionsDropdown && !isClickOnCheckbox) {
        setIsSelectionMode(false);
        setSelectedPlans(new Set());
        setShowBulkActions(false);
      }
    };

    if (isSelectionMode) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSelectionMode]);

  // Fetch plans and stats
  const fetchPlans = useCallback(async (forceRefresh = false) => {
    if (!currentBranch?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // If force refresh, clear cache first
      if (forceRefresh) {
        console.log('🔄 [InstallmentManagementModal] Force refresh - clearing cache');
        installmentCacheService.clearInstallments(currentBranch.id);
      }
      
      // Check if we have cached installment plans (from InstallmentPreloader)
      const cachedPlans = forceRefresh ? null : installmentCacheService.getInstallments(currentBranch.id);
      let allPlans: InstallmentPlan[] = [];
      
      if (cachedPlans && cachedPlans.length > 0) {
        console.log(`⚡ [InstallmentManagementModal] Using ${cachedPlans.length} cached installment plans - instant load!`);
        allPlans = cachedPlans;
        // Still refresh in background (non-blocking)
        installmentService.getAllInstallmentPlans(currentBranch.id)
          .then(freshPlans => {
            console.log(`✅ [InstallmentManagementModal] Background refresh completed (${freshPlans.length} plans)`);
            installmentCacheService.saveInstallments(freshPlans, currentBranch.id);
            // Update plans if modal is still open
            if (isOpen) {
              // Re-apply filters to fresh plans
              let filtered = freshPlans;
              if (searchQuery) {
                filtered = filtered.filter(plan => 
                  plan.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  plan.plan_number?.toLowerCase().includes(searchQuery.toLowerCase())
                );
              }
              if (statusFilter !== 'all') {
                filtered = filtered.filter(plan => plan.status === statusFilter);
              }
              if (dateFrom) {
                filtered = filtered.filter(plan => {
                  const planDate = new Date(plan.created_at);
                  return planDate >= new Date(dateFrom);
                });
              }
              if (dateTo) {
                filtered = filtered.filter(plan => {
                  const planDate = new Date(plan.created_at);
                  return planDate <= new Date(dateTo);
                });
              }
              // Apply sorting
              filtered.sort((a, b) => {
                let aValue: any, bValue: any;
                switch (sortBy) {
                  case 'plan_number':
                    aValue = a.plan_number || '';
                    bValue = b.plan_number || '';
                    break;
                  case 'total_amount':
                    aValue = a.total_amount || 0;
                    bValue = b.total_amount || 0;
                    break;
                  case 'next_payment_date':
                    aValue = a.next_payment_date ? new Date(a.next_payment_date).getTime() : 0;
                    bValue = b.next_payment_date ? new Date(b.next_payment_date).getTime() : 0;
                    break;
                  default:
                    aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
                    bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
                }
                return sortOrder === 'asc' ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
              });
              setPlans(filtered);
              // Recalculate stats
              const totalOutstanding = filtered.reduce((sum, plan) => sum + (plan.balance_due || 0), 0);
              const totalPaid = filtered.reduce((sum, plan) => sum + (plan.total_paid || 0), 0);
              const totalValue = filtered.reduce((sum, plan) => sum + (plan.total_amount || 0), 0);
              const totalPlans = filtered.length;
              const activePlans = filtered.filter(p => p.status === 'active').length;
              const completedPlans = filtered.filter(p => p.status === 'completed').length;
              const defaultedPlans = filtered.filter(p => p.status === 'defaulted').length;
              const cancelledPlans = filtered.filter(p => p.status === 'cancelled').length;
              const overduePlans = filtered.filter(p => {
                if (!p.next_payment_date || p.status !== 'active') return false;
                return new Date(p.next_payment_date) < new Date();
              }).length;
              const now = new Date();
              const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const thisMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
              const dueThisWeek = filtered.filter(p => {
                if (!p.next_payment_date || p.status !== 'active') return false;
                const dueDate = new Date(p.next_payment_date);
                return dueDate >= now && dueDate <= thisWeek;
              }).length;
              const dueThisMonth = filtered.filter(p => {
                if (!p.next_payment_date || p.status !== 'active') return false;
                const dueDate = new Date(p.next_payment_date);
                return dueDate >= now && dueDate <= thisMonth;
              }).length;
              setStats({
                total: totalPlans,
                active: activePlans,
                completed: completedPlans,
                defaulted: defaultedPlans,
                cancelled: cancelledPlans,
                total_value: totalValue,
                total_paid: totalPaid,
                total_balance_due: totalOutstanding,
                overdue_count: overduePlans,
                due_this_week: dueThisWeek,
                due_this_month: dueThisMonth
              });
            }
          })
          .catch(err => {
            console.warn('⚠️ [InstallmentManagementModal] Background refresh failed (non-critical):', err);
          });
      } else {
        console.log('📡 [InstallmentManagementModal] No cache found, loading from database...');
        allPlans = await installmentService.getAllInstallmentPlans(currentBranch.id);
        // Save to cache for next time
        installmentCacheService.saveInstallments(allPlans, currentBranch.id);
      }
      
      // Apply client-side filtering
      let filtered = allPlans;
      
      // Filter by search query
      if (searchQuery) {
        filtered = filtered.filter(plan => 
          plan.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plan.plan_number?.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Filter by status
      if (statusFilter !== 'all') {
        filtered = filtered.filter(plan => plan.status === statusFilter);
      }
      
      // Filter by date range
      if (dateFrom) {
        filtered = filtered.filter(plan => {
          const planDate = new Date(plan.created_at);
          return planDate >= new Date(dateFrom);
        });
      }
      
      if (dateTo) {
        filtered = filtered.filter(plan => {
          const planDate = new Date(plan.created_at);
          return planDate <= new Date(dateTo);
        });
      }
      
      // Sort
      filtered.sort((a, b) => {
        let aValue: any, bValue: any;
        switch (sortBy) {
          case 'plan_number':
            aValue = a.plan_number || '';
            bValue = b.plan_number || '';
            break;
          case 'total_amount':
            aValue = a.total_amount || 0;
            bValue = b.total_amount || 0;
            break;
          case 'next_payment_date':
            aValue = a.next_payment_date ? new Date(a.next_payment_date).getTime() : 0;
            bValue = b.next_payment_date ? new Date(b.next_payment_date).getTime() : 0;
            break;
          default:
            aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
            bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
        }
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      setPlans(filtered);
      
      // Calculate stats
      const totalOutstanding = filtered.reduce((sum, plan) => sum + (plan.balance_due || 0), 0);
      const totalPaid = filtered.reduce((sum, plan) => sum + (plan.total_paid || 0), 0);
      const totalValue = filtered.reduce((sum, plan) => sum + (plan.total_amount || 0), 0);
      const totalPlans = filtered.length;
      const activePlans = filtered.filter(p => p.status === 'active').length;
      const completedPlans = filtered.filter(p => p.status === 'completed').length;
      const defaultedPlans = filtered.filter(p => p.status === 'defaulted').length;
      const cancelledPlans = filtered.filter(p => p.status === 'cancelled').length;
      const overduePlans = filtered.filter(p => {
        if (!p.next_payment_date || p.status !== 'active') return false;
        return new Date(p.next_payment_date) < new Date();
      }).length;
      
      const now = new Date();
      const thisWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const thisMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const dueThisWeek = filtered.filter(p => {
        if (!p.next_payment_date || p.status !== 'active') return false;
        const dueDate = new Date(p.next_payment_date);
        return dueDate >= now && dueDate <= thisWeek;
      }).length;
      
      const dueThisMonth = filtered.filter(p => {
        if (!p.next_payment_date || p.status !== 'active') return false;
        const dueDate = new Date(p.next_payment_date);
        return dueDate >= now && dueDate <= thisMonth;
      }).length;
      
      setStats({
        total: totalPlans,
        active: activePlans,
        completed: completedPlans,
        defaulted: defaultedPlans,
        cancelled: cancelledPlans,
        total_value: totalValue,
        total_paid: totalPaid,
        total_balance_due: totalOutstanding,
        overdue_count: overduePlans,
        due_this_week: dueThisWeek,
        due_this_month: dueThisMonth
      });
    } catch (error) {
      console.error('Error fetching installment plans:', error);
      toast.error('Failed to load installment plans');
    } finally {
      setIsLoading(false);
    }
  }, [currentBranch?.id, searchQuery, statusFilter, dateFrom, dateTo, sortBy, sortOrder]);

  // Fetch payment accounts
  const fetchPaymentAccounts = useCallback(async () => {
    if (!currentBranch?.id) return;

    try {
      const accounts = await financeAccountService.getPOSPaymentMethods();
      setPaymentAccounts(accounts || []);
    } catch (error) {
      console.error('Error fetching payment accounts:', error);
    }
  }, [currentBranch?.id]);

  // Load data on mount and when filters change
  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      fetchPaymentAccounts();
    }
  }, [isOpen, fetchPlans, fetchPaymentAccounts]);

  // Handle plan actions
  const handleViewPlan = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    setShowDetailsModal(true);
  };

  const handleEditPlan = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    setShowEditModal(true);
  };

  const handleRecordPayment = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleViewSchedule = (plan: InstallmentPlan) => {
    // Schedule view can be added later - for now show details
    setSelectedPlan(plan);
    setShowDetailsModal(true);
  };

  const handleViewPaymentHistory = (plan: InstallmentPlan) => {
    setSelectedPlan(plan);
    setShowPaymentHistoryModal(true);
  };

  const handleSendReminder = async (planId: string) => {
    const jobId = startLoading('Sending reminder...');
    loadingJobIdRef.current = jobId;
    try {
      const result = await installmentService.sendPaymentReminder(planId, currentUser?.id || '');
      if (result.success) {
        toast.success('Payment reminder sent successfully');
        completeLoading(jobId);
      } else {
        failLoading(jobId, result.error || 'Failed to send reminder');
      }
    } catch (error: any) {
      failLoading(jobId, error.message || 'Failed to send payment reminder');
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (selectedPlans.size === 0) return;

    if (!confirm(`Delete ${selectedPlans.size} installment plan(s)? This action cannot be undone.`)) {
      return;
    }

    const jobId = startLoading('Deleting plans...');
    loadingJobIdRef.current = jobId;
    try {
      const results = await Promise.allSettled(
        Array.from(selectedPlans).map(planId =>
          installmentService.cancelPlan(planId)
        )
      );

      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failureCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(`Successfully cancelled ${successCount} plan(s)`);
      }
      if (failureCount > 0) {
        toast.error(`Failed to cancel ${failureCount} plan(s)`);
      }

      setSelectedPlans(new Set());
      setIsSelectionMode(false);
      setShowBulkActions(false);
      fetchPlans();
      completeLoading(jobId);
    } catch (error: any) {
      failLoading(jobId, error.message || 'Failed to delete plans');
    }
  };

  // Utility functions
  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return 'TZS 0';
    }
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Status helpers
  const getStatusColor = (status: InstallmentPlanStatus) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'completed': return 'text-blue-600 bg-blue-100';
      case 'defaulted': return 'text-red-600 bg-red-100';
      case 'cancelled': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: InstallmentPlanStatus) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'completed': return <CheckSquare className="w-4 h-4" />;
      case 'defaulted': return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const isOverdue = (plan: InstallmentPlan) => {
    return plan.status === 'active' && new Date(plan.next_payment_date) < new Date();
  };

  const handleCancelPlan = async (planId: string) => {
    if (!confirm('Are you sure you want to cancel this installment plan?')) return;
    const jobId = startLoading('Cancelling plan...');
    loadingJobIdRef.current = jobId;
    try {
      const result = await installmentService.cancelPlan(planId);
      if (result.success) {
        toast.success('Installment plan cancelled successfully');
        fetchPlans();
        completeLoading(jobId);
      } else {
        failLoading(jobId, result.error || 'Failed to cancel plan');
      }
    } catch (error: any) {
      failLoading(jobId, error.message || 'Failed to cancel installment plan');
    }
  };

  const handleDeletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this installment plan? This action cannot be undone.')) return;
    const jobId = startLoading('Deleting plan...');
    loadingJobIdRef.current = jobId;
    try {
      const result = await installmentService.cancelPlan(planId);
      if (result.success) {
        toast.success('Installment plan cancelled successfully');
        fetchPlans();
        completeLoading(jobId);
      } else {
        failLoading(jobId, result.error || 'Failed to cancel plan');
      }
    } catch (error: any) {
      failLoading(jobId, error.message || 'Failed to delete installment plan');
    }
  };

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      const matchesSearch = !searchQuery ||
        plan.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plan.plan_number?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [plans, searchQuery]);

  // Stats calculations
  const totalOutstanding = useMemo(() => {
    return filteredPlans.reduce((sum, plan) => sum + (plan.balance_due || 0), 0);
  }, [filteredPlans]);

  const totalPlans = filteredPlans.length;
  const activePlans = filteredPlans.filter(p => p.status === 'active').length;
  const overduePlans = filteredPlans.filter(p => {
    if (!p.next_payment_date) return false;
    return new Date(p.next_payment_date) < new Date();
  }).length;

  // Early return - must be after hooks
  if (!isOpen) {
    return null;
  }

  // Ensure document.body exists
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  // Debug log
  console.log('🔵 [InstallmentManagementModal] Rendering modal with z-index 999999');

  // Return the actual modal using createPortal
  return createPortal(
    <>
      <div 
        className="fixed bg-black/60 flex items-center justify-center p-4 z-[999999]" 
        style={{ 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          overflow: 'hidden',
          overscrollBehavior: 'none',
          position: 'fixed',
          zIndex: 999999
        }}
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="installment-management-modal-title"
        onClick={(e) => {
          // Only close if clicking the backdrop itself, not the modal content
          if (e.target === e.currentTarget) {
            console.log('🔵 [InstallmentManagementModal] Backdrop clicked, closing modal');
            onClose();
          }
        }}
      >
        <div 
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden relative z-[999999]"
          style={{ zIndex: 999999 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Icon Header - Fixed - Matching OrderManagementModal */}
          <div className="p-8 pr-20 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
              {/* Icon */}
              <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <CreditCard className="w-8 h-8 text-white" />
              </div>
              
              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <h2 id="installment-management-modal-title" className="text-2xl font-bold text-gray-900 mb-2">
                  Installment Plans Management
                </h2>
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <p className="text-sm text-gray-600">
                    Showing <span className="font-semibold text-gray-900">{filteredPlans.slice(0, visiblePlanCount).length}</span> of <span className="font-semibold text-gray-900">{filteredPlans.length}</span> filtered plans
                    {selectedPlans.size > 0 && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                        {selectedPlans.size} selected
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Controls - Matching OrderManagementModal */}
          <div className="p-6 pb-0 flex-shrink-0">
            {/* Status Quick Stats - Clickable Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {/* All Status Card */}
              <div
                className={`p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                  statusFilter === 'all' 
                    ? 'text-purple-600 bg-purple-100 shadow-lg scale-105 ring-2 ring-offset-2 ring-purple-400' 
                    : 'bg-white hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md'
                }`}
                onClick={() => setStatusFilter('all')}
                title="Click to show all plans"
              >
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 mb-1">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs font-medium capitalize">All</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{totalPlans}</span>
                  </div>
                </div>
              </div>

              {['active', 'completed', 'defaulted', 'cancelled'].map(status => {
                const count = filteredPlans.filter(plan => plan.status === status).length;
                const totalCount = plans.filter(plan => plan.status === status).length;
                return (
                  <div
                    key={status}
                    className={`p-3 rounded-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
                      statusFilter === status 
                        ? getStatusColor(status as InstallmentPlanStatus) + ' shadow-lg scale-105 ring-2 ring-offset-2 ring-purple-400' 
                        : 'bg-white hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-300 shadow-sm hover:shadow-md'
                    }`}
                    onClick={() => setStatusFilter(statusFilter === status ? 'all' : status as InstallmentPlanStatus)}
                    title={`Click to filter by ${status}`}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1 mb-1">
                        {getStatusIcon(status as InstallmentPlanStatus)}
                        <span className="text-xs font-medium capitalize">{status}</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">{count}</span>
                        {count !== totalCount && (
                          <span className="text-xs text-gray-500">/ {totalCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <Plus size={18} />
                    New Plan
                  </button>

                  {isSelectionMode && (
                    <button
                      onClick={handleBulkDelete}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      <Trash2 size={18} />
                      Delete Selected ({selectedPlans.size})
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={async () => {
                      const toastId = toast.loading('Refreshing installment plans...');
                      try {
                        await fetchPlans(true);
                        toast.success('Installment plans refreshed!', { id: toastId });
                      } catch (error) {
                        toast.error('Failed to refresh plans', { id: toastId });
                      }
                    }}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Refresh installment plans"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search plans..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | InstallmentPlanStatus)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="defaulted">Defaulted</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                  <button
                    onClick={() => setIsSelectionMode(!isSelectionMode)}
                    className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                      isSelectionMode
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-4 border-b border-gray-200 bg-white">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('installments')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'installments'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Installments
                </button>
                <button
                  onClick={() => setActiveTab('future')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'future'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Future
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4" ref={planListRef}>
              {activeTab === 'installments' ? (
                <>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <LoadingSpinner />
                      <span className="ml-2 text-gray-600">Loading installment plans...</span>
                    </div>
                  ) : filteredPlans.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No installment plans found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchQuery ? 'Try adjusting your search criteria' : 'Create your first installment plan to get started'}
                      </p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium inline-flex items-center gap-2"
                      >
                        <Plus size={18} />
                        Create Installment Plan
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPlans.slice(0, visiblePlanCount).map((plan) => (
                        <InstallmentPlanCard
                          key={plan.id}
                          plan={plan}
                          isSelected={selectedPlans.has(plan.id)}
                          isSelectionMode={isSelectionMode}
                          onToggleSelect={() => {
                            setSelectedPlans(prev => {
                              const newSelection = new Set(prev);
                              if (newSelection.has(plan.id)) {
                                newSelection.delete(plan.id);
                              } else {
                                newSelection.add(plan.id);
                              }
                              return newSelection;
                            });
                          }}
                          isExpanded={expandedPlan === plan.id}
                          onToggleExpanded={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                          formatCurrency={formatCurrency}
                          formatDate={formatDate}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          isOverdue={isOverdue}
                          handleViewPlan={handleViewPlan}
                          handleRecordPayment={handleRecordPayment}
                          handleEditPlan={handleEditPlan}
                          handleSendReminder={handleSendReminder}
                          handleViewSchedule={handleViewSchedule}
                          handleViewPaymentHistory={handleViewPaymentHistory}
                          handleCancelPlan={handleCancelPlan}
                        />
                      ))}

                      {filteredPlans.length > visiblePlanCount && (
                        <div className="text-center py-4">
                          <button
                            onClick={() => setVisiblePlanCount(prev => prev + 6)}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                          >
                            Load More Plans
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                // Future Tab Content
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock className="w-10 h-10 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Coming Soon</h3>
                    <p className="text-gray-600 mb-6">
                      This section is reserved for future features and enhancements to the installment management system.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-3">Potential Features:</h4>
                      <ul className="text-sm text-gray-600 space-y-2 text-left">
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Advanced analytics and reporting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Bulk operations and batch processing</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Automated payment reminders</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Export and print capabilities</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span>Custom payment schedules</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer - Simple & Clean */}
          <div className="border-t border-gray-200 bg-white flex-shrink-0">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8 text-sm">
                  <span className="text-gray-600">
                    <span className="font-semibold text-gray-900">{filteredPlans.length}</span> plans
                  </span>
                  <span className="text-gray-600">
                    <span className="font-semibold text-green-600">{activePlans}</span> active
                  </span>
                  <span className="text-gray-600">
                    <span className="font-semibold text-orange-600">{formatCurrency(totalOutstanding)}</span> outstanding
                  </span>
                  {overduePlans > 0 && (
                    <span className="text-gray-600">
                      <span className="font-semibold text-red-600">{overduePlans}</span> overdue
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {/* Sub-modals */}
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

          {showPaymentModal && selectedPlan && (
            <RecordPaymentModal
              isOpen={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={() => {
                setShowPaymentModal(false);
                // Force refresh to get latest statuses after payment
                fetchPlans(true);
              }}
              plan={selectedPlan}
              paymentAccounts={paymentAccounts}
              currentUser={currentUser}
            />
          )}

          {showDetailsModal && selectedPlan && (
            <ViewPlanDetailsModal
              isOpen={showDetailsModal}
              onClose={() => setShowDetailsModal(false)}
              plan={selectedPlan}
            />
          )}

          {showEditModal && selectedPlan && (
            <EditInstallmentPlanModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              onSuccess={() => {
                setShowEditModal(false);
                // Force refresh to get latest statuses after status change
                fetchPlans(true);
              }}
              plan={selectedPlan}
              paymentAccounts={paymentAccounts}
              currentUser={currentUser}
            />
          )}

          {showPaymentHistoryModal && selectedPlan && (
            <PaymentHistoryModal
              isOpen={showPaymentHistoryModal}
              onClose={() => setShowPaymentHistoryModal(false)}
              plan={selectedPlan}
            />
          )}

          {/* Success Modal */}
          <SuccessModal {...successModal.props} />
        </div>
      </div>
    </>,
    document.body
  );
};

// ================================================
// SUB-MODAL COMPONENTS
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
  const successModal = useSuccessModal();
  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [firstPayment, setFirstPayment] = useState(0);
  const [customInstallmentDates, setCustomInstallmentDates] = useState<string[]>([]);
  const [planStartDate, setPlanStartDate] = useState(new Date().toISOString().split('T')[0]);
  
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

  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Initialize next payment date when modal opens
      const today = new Date().toISOString().split('T')[0];
      setPlanStartDate(today);
      const frequency = formData.payment_frequency || 'monthly';
      const initialNextPaymentDate = calculateNextPaymentDate(today, frequency);
      setFormData(prev => ({ ...prev, start_date: initialNextPaymentDate }));
    } else {
      document.body.style.overflow = '';
      // Reset form when modal closes
      setCurrentStep(1);
      setFirstPayment(0);
      setUseCustomDates(false);
      setCustomInstallmentDates([]);
      setPlanStartDate(new Date().toISOString().split('T')[0]);
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

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

  // Calculate amounts accounting for down payment and first payment
  const amountFinanced = (formData.total_amount || 0) - (formData.down_payment || 0) - (firstPayment || 0);
  const installmentAmount = amountFinanced / (formData.number_of_installments || 1);

  // Calculate next payment date based on plan start date and frequency
  const calculateNextPaymentDate = useCallback((startDate: string, frequency: PaymentFrequency): string => {
    const start = new Date(startDate);
    const nextPayment = new Date(start);

    switch (frequency) {
      case 'weekly':
        nextPayment.setDate(start.getDate() + 7);
        break;
      case 'bi_weekly':
        nextPayment.setDate(start.getDate() + 14);
        break;
      case 'monthly':
        nextPayment.setMonth(start.getMonth() + 1);
        break;
      default:
        nextPayment.setMonth(start.getMonth() + 1);
    }

    return nextPayment.toISOString().split('T')[0];
  }, []);

  // Generate dates based on frequency (starting from next payment date)
  const generateDates = useCallback((nextPaymentDate: string, numberOfInstallments: number, frequency: PaymentFrequency) => {
    const dates: string[] = [];
    const start = new Date(nextPaymentDate);

    for (let i = 0; i < numberOfInstallments; i++) {
      const dueDate = new Date(start);
      if (frequency === 'monthly') {
        dueDate.setMonth(start.getMonth() + i);
      } else if (frequency === 'weekly') {
        dueDate.setDate(start.getDate() + (i * 7));
      } else if (frequency === 'bi_weekly') {
        dueDate.setDate(start.getDate() + (i * 14));
      }
      dates.push(dueDate.toISOString().split('T')[0]);
    }

    return dates;
  }, []);

  // Calculate next payment date when plan start date or frequency changes
  useEffect(() => {
    if (planStartDate && formData.payment_frequency) {
      const nextPaymentDate = calculateNextPaymentDate(planStartDate, formData.payment_frequency);
      setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
    }
  }, [planStartDate, formData.payment_frequency, calculateNextPaymentDate]);

  // Update custom dates when number of installments, next payment date, or frequency changes
  useEffect(() => {
    if (isOpen && !useCustomDates && formData.number_of_installments && formData.start_date && formData.payment_frequency) {
      const generatedDates = generateDates(
        formData.start_date,
        formData.number_of_installments,
        formData.payment_frequency
      );
      setCustomInstallmentDates(generatedDates);
    }
  }, [isOpen, formData.number_of_installments, formData.start_date, formData.payment_frequency, useCustomDates, generateDates]);

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!formData.customer_id || !formData.total_amount || formData.number_of_installments < 1) {
        toast.error('Please fill in all required fields');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate step 2 - dates
      if (!formData.start_date) {
        toast.error('Please set the next payment date');
        return;
      }
      if (useCustomDates && customInstallmentDates.some(date => !date)) {
        toast.error('Please fill in all installment dates');
        return;
      }
      setCurrentStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer_id || !formData.account_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate payment balance: Down Payment + First Payment + (All Installments) must equal Total Amount
    const totalInstallmentAmounts = installmentAmount * (formData.number_of_installments || 1);
    const totalPayments = (formData.down_payment || 0) + (firstPayment || 0) + totalInstallmentAmounts;
    const balanceDifference = Math.abs(totalPayments - (formData.total_amount || 0));
    
    // Allow small rounding differences (less than 0.01)
    if (balanceDifference > 0.01) {
      console.error('❌ [InstallmentManagementModal] Payment balance mismatch:', {
        totalAmount: formData.total_amount,
        downPayment: formData.down_payment,
        firstPayment: firstPayment,
        totalInstallments: totalInstallmentAmounts,
        totalPayments,
        difference: balanceDifference
      });
      toast.error(
        `Payment amounts don't balance!\n\n` +
        `Total Amount: ${formatPrice(formData.total_amount || 0)} TZS\n` +
        `Down Payment: ${formatPrice(formData.down_payment || 0)} TZS\n` +
        `First Payment: ${formatPrice(firstPayment || 0)} TZS\n` +
        `Installments Total: ${formatPrice(totalInstallmentAmounts)} TZS\n` +
        `Total Payments: ${formatPrice(totalPayments)} TZS\n\n` +
        `Difference: ${formatPrice(balanceDifference)} TZS\n\n` +
        `Please adjust the amounts so they equal the total amount.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // For now, we'll use the standard createInstallmentPlan
      // In the future, we might need to extend it to support custom dates and first payment
      const result = await installmentService.createInstallmentPlan(
        formData as CreateInstallmentPlanInput,
        currentUser?.id,
        currentBranch?.id
      );

      if (result.success) {
        // Record first payment if any
        if (firstPayment > 0 && result.plan) {
          // TODO: Record first payment separately if needed
          // This might require extending the service
        }

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
        // Reset form
        setCurrentStep(1);
        setFirstPayment(0);
        setUseCustomDates(false);
        setCustomInstallmentDates([]);
      } else {
        toast.error(result.error || 'Failed to create installment plan');
      }
    } catch (error: any) {
      console.error('❌ [InstallmentManagementModal] Error creating installment plan:', error);
      console.error('❌ [InstallmentManagementModal] Error Details:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        name: error?.name,
        formData
      });

      // Categorize and handle different error types
      let errorMessage = 'An error occurred while creating the installment plan.';
      let errorTitle = 'Error';

      // Network errors
      if (error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('NetworkError') ||
          error?.message?.includes('timeout') ||
          error?.code === 'NETWORK_ERROR') {
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to the server. Please check your internet connection and try again.';
      }
      // Database errors
      else if (error?.code === '23505' || error?.message?.includes('duplicate') || error?.message?.includes('unique')) {
        errorTitle = 'Duplicate Entry';
        errorMessage = 'An installment plan with these details already exists. Please check and try again.';
      }
      // Validation errors
      else if (error?.code === '23502' || error?.message?.includes('null value') || error?.message?.includes('required')) {
        errorTitle = 'Validation Error';
        errorMessage = 'Some required information is missing. Please check all fields and try again.';
      }
      // Permission errors
      else if (error?.code === '42501' || error?.message?.includes('permission') || error?.message?.includes('unauthorized')) {
        errorTitle = 'Permission Denied';
        errorMessage = 'You do not have permission to create installment plans. Please contact your administrator.';
      }
      // Service result errors
      else if (error?.message?.includes('Payment amounts don\'t balance')) {
        errorTitle = 'Payment Balance Error';
        errorMessage = error.message;
      }
      // Generic error with message
      else if (error?.message) {
        errorMessage = error.message;
      }

      // Show user-friendly error
      toast.error(`${errorTitle}: ${errorMessage}`, {
        duration: 6000,
      });

      // Log detailed error for debugging
      if (import.meta.env.MODE === 'development') {
        console.group('🔍 [InstallmentManagementModal] Detailed Error Information');
        console.error('Error Type:', error?.constructor?.name || 'Unknown');
        console.error('Error Message:', error?.message);
        console.error('Error Code:', error?.code);
        console.error('Error Status:', error?.status);
        console.error('Error Name:', error?.name);
        console.error('Stack Trace:', error?.stack);
        console.error('Context:', {
          customerId: formData.customer_id,
          totalAmount: formData.total_amount,
          numberOfInstallments: formData.number_of_installments,
          downPayment: formData.down_payment,
          firstPayment: firstPayment
        });
        console.groupEnd();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[1000000]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000000 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="installment-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 id="installment-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Create Installment Plan</h3>
              <p className="text-sm text-gray-600">Set up payment plan for customer</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Step Indicator */}
          <div className="px-6 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center gap-2">
              <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {currentStep > 1 ? <Check className="w-5 h-5" /> : '1'}
                </div>
                <span className="text-sm font-medium">Basic Info</span>
              </div>
              <div className={`w-12 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {currentStep > 2 ? <Check className="w-5 h-5" /> : '2'}
                </div>
                <span className="text-sm font-medium">Payment Dates</span>
              </div>
              <div className={`w-12 h-0.5 ${currentStep >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`} />
              <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  3
                </div>
                <span className="text-sm font-medium">Payment Details</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <>
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

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    First Payment <span className="text-gray-500">(Optional)</span>
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formatPrice(firstPayment || 0)}
                      onChange={(e) => {
                        const value = e.target.value.replace(/,/g, '');
                        const numValue = parseFloat(value) || 0;
                        setFirstPayment(numValue);
                      }}
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-lg font-bold bg-white"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Additional payment after down payment</p>
                </div>

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
                      onChange={(e) => {
                        const frequency = e.target.value as PaymentFrequency;
                        setFormData(prev => ({ ...prev, payment_frequency: frequency }));
                        // Recalculate next payment date when frequency changes
                        if (planStartDate) {
                          const nextPaymentDate = calculateNextPaymentDate(planStartDate, frequency);
                          setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                      required
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi_weekly">Bi-Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Payment Dates */}
            {currentStep === 2 && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Plan Start Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        value={planStartDate}
                        onChange={(e) => {
                          setPlanStartDate(e.target.value);
                          // Recalculate next payment date
                          if (formData.payment_frequency) {
                            const nextPaymentDate = calculateNextPaymentDate(e.target.value, formData.payment_frequency);
                            setFormData(prev => ({ ...prev, start_date: nextPaymentDate }));
                          }
                        }}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">When the installment plan starts</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Next Payment Date <span className="text-red-500">*</span>
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
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.payment_frequency === 'weekly' && 'Calculated: 1 week from start date'}
                      {formData.payment_frequency === 'bi_weekly' && 'Calculated: 2 weeks from start date'}
                      {formData.payment_frequency === 'monthly' && 'Calculated: 1 month from start date'}
                    </p>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="useCustomDates"
                      checked={useCustomDates}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseCustomDates(checked);
                        // If unchecking, regenerate dates based on frequency
                        if (!checked && formData.start_date && formData.number_of_installments && formData.payment_frequency) {
                          const generatedDates = generateDates(
                            formData.start_date,
                            formData.number_of_installments,
                            formData.payment_frequency
                          );
                          setCustomInstallmentDates(generatedDates);
                        }
                      }}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="useCustomDates" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Use custom dates for each installment
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 ml-8">
                    Enable this to set individual dates for each payment instead of using the frequency-based schedule
                  </p>
                </div>

                {formData.number_of_installments > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      Installment Payment Dates
                    </h4>
                    <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                      {Array.from({ length: formData.number_of_installments }, (_, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-700">{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Installment {index + 1} Due Date
                            </label>
                            <input
                              type="date"
                              value={customInstallmentDates[index] || ''}
                              onChange={(e) => {
                                const newDates = [...customInstallmentDates];
                                newDates[index] = e.target.value;
                                setCustomInstallmentDates(newDates);
                              }}
                              disabled={!useCustomDates}
                              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 font-medium bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            />
                          </div>
                          <div className="flex-shrink-0">
                            <span className="text-sm font-bold text-gray-700">
                              {formatPrice(installmentAmount)} TZS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Payment Details */}
            {currentStep === 3 && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
              </>
            )}
          </div>

          <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={currentStep === 1 ? onClose : handlePreviousStep}
                className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm"
              >
                {currentStep === 1 ? 'Cancel' : 'Previous'}
              </button>
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl text-lg"
                >
                  Next
                </button>
              ) : (
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
              )}
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

// ================================================
// RECORD PAYMENT MODAL
// ================================================

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: InstallmentPlan;
  paymentAccounts: any[];
  currentUser: any;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  plan,
  paymentAccounts,
  currentUser
}) => {
  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return 'TZS 0';
    }
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const calculatePaymentAmount = () => {
    const installmentAmount = Number(plan.installment_amount || 0);
    const balanceDue = Number(plan.balance_due || 0);
    
    // Always cap the payment amount at the remaining balance
    // If balance is less than installment amount, use balance
    // Otherwise, use installment amount (but never exceed balance)
    const calculatedAmount = Math.min(installmentAmount, balanceDue);
    
    // Return 0 if balance is 0 or negative, otherwise return the calculated amount
    return balanceDue > 0 ? Number(calculatedAmount.toFixed(2)) : 0;
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

  useEffect(() => {
    if (isOpen) {
      const paymentAmount = calculatePaymentAmount();
      setFormData({
        installment_plan_id: plan.id,
        customer_id: plan.customer_id,
        amount: paymentAmount,
        account_id: '',
        reference_number: '',
        notes: ''
      });
    }
  }, [isOpen, plan.id, plan.customer_id, plan.installment_amount, plan.balance_due]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if there are unpaid installments
    const installmentsPaid = Number(plan.installments_paid || 0);
    const totalInstallments = Number(plan.number_of_installments || 0);
    const hasUnpaidInstallments = installmentsPaid < totalInstallments;
    const balanceDue = Number(plan.balance_due || 0);

    // Validate plan status
    // Allow payments if there are unpaid installments OR balance due, even if status is 'completed'
    // This ensures users can always receive payments until everything is fully paid
    if (plan.status === 'cancelled') {
      toast.error('This installment plan has been cancelled. Payments cannot be recorded.');
      return;
    }

    // Check if plan is truly completed (all installments paid AND balance is zero)
    const isTrulyCompleted = !hasUnpaidInstallments && balanceDue <= 0;
    
    if (plan.status === 'completed' && isTrulyCompleted) {
      toast.error('This installment plan is already completed. All payments have been received.');
      return;
    }
    
    // Allow payment if there are unpaid installments or balance due, regardless of status
    // This fixes data inconsistency issues where status was incorrectly set to completed

    // Validate payment amount
    const paymentAmount = Number(formData.amount || 0);

    if (paymentAmount <= 0) {
      toast.error('Payment amount must be greater than zero.');
      return;
    }

    // Allow payment if there are unpaid installments, even if balance_due calculation seems wrong
    // The database trigger will recalculate the balance correctly after payment
    if (!hasUnpaidInstallments && paymentAmount > balanceDue && balanceDue > 0) {
      toast.error(`Payment amount (${formatCurrency(paymentAmount)}) cannot exceed the remaining balance (${formatCurrency(balanceDue)}).`);
      return;
    }
    
    if (!formData.account_id) {
      toast.error('Please select a payment account');
      return;
    }

    // Get payment method from selected account
    const selectedAccount = paymentAccounts.find(acc => acc.id === formData.account_id);
    const paymentMethod = selectedAccount?.type || 'cash';

    setIsSubmitting(true);
    try {
      const result = await installmentService.recordPayment(
        {
          ...formData,
          payment_method: paymentMethod
        } as RecordInstallmentPaymentInput,
        currentUser?.id
      );

      if (result.success) {
        toast.success('Payment recorded successfully!');
        
        // If the plan was completed, wait a moment for database triggers to update all statuses
        // then refresh to ensure all installment statuses are up-to-date
        if (result.planCompleted) {
          // Wait 500ms for database triggers to complete status updates
          // The onSuccess callback will handle cache clearing via fetchPlans(true)
          setTimeout(() => {
            onSuccess();
          }, 500);
        } else {
          onSuccess();
        }
      } else {
        toast.error(result.error || 'Failed to record payment');
      }
    } catch (error: any) {
      console.error('Payment recording error:', error);
      toast.error(error.message || 'An error occurred while recording the payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Helper function to format numbers with comma separators
  const formatPrice = (price: number | string): string => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num) || num === null || num === undefined) {
      return '0';
    }
    // Remove .00 for whole numbers
    if (num % 1 === 0) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[1000000]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000000 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="record-payment-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="record-payment-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Record Payment</h3>
              <p className="text-sm text-gray-600 font-medium">{plan.plan_number}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          <div className="py-4">
            {/* Plan Summary Card */}
            <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200 shadow-sm">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Customer:</span>
                  <span className="text-base font-bold text-gray-900">{plan.customer?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Installments Paid:</span>
                  <span className="text-base font-bold text-gray-900">{plan.installments_paid || 0} / {plan.number_of_installments}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Remaining Balance:</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(plan.balance_due || 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-600">Calculated Installment Amount:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatPrice(plan.installment_amount || 0)} TZS
                  </span>
                </div>
                {plan.balance_due && plan.balance_due > 0 && plan.balance_due < (plan.installment_amount || 0) && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-yellow-800">Final Payment</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          This is the last payment. Amount set to remaining balance: <strong>{formatCurrency(plan.balance_due)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formatPrice(formData.amount || 0)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    const numValue = parseFloat(value) || 0;
                    const balanceDue = Number(plan.balance_due || 0);
                    // Cap the amount at the remaining balance
                    const cappedAmount = Math.min(numValue, balanceDue);
                    setFormData(prev => ({ ...prev, amount: cappedAmount }));
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white"
                  placeholder="Enter payment amount"
                  min="0"
                  max={plan.balance_due || 0}
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Payment Account <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {paymentAccounts.length === 0 ? (
                    <div className="col-span-2 p-4 text-center text-sm text-gray-500 border-2 border-gray-200 rounded-xl bg-gray-50">
                      No payment accounts available
                    </div>
                  ) : (
                    paymentAccounts.map((account, index) => {
                      const isSelected = formData.account_id === account.id;
                      // Use different colors for each account to make them easily distinguishable
                      const colorVariants = [
                        { selected: 'bg-blue-600 border-blue-700 text-white', unselected: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
                        { selected: 'bg-green-600 border-green-700 text-white', unselected: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
                        { selected: 'bg-purple-600 border-purple-700 text-white', unselected: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
                        { selected: 'bg-orange-600 border-orange-700 text-white', unselected: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
                        { selected: 'bg-indigo-600 border-indigo-700 text-white', unselected: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
                        { selected: 'bg-pink-600 border-pink-700 text-white', unselected: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100' },
                      ];
                      const colors = colorVariants[index % colorVariants.length];
                      
                      return (
                        <button
                          key={account.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, account_id: account.id }))}
                          className={`px-4 py-4 rounded-xl font-bold text-sm transition-all border-2 shadow-sm ${
                            isSelected
                              ? `${colors.selected} shadow-lg scale-105 ring-2 ring-offset-2 ring-offset-white`
                              : `${colors.unselected} hover:shadow-md`
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            {isSelected && (
                              <CheckCircle className="w-5 h-5" />
                            )}
                            <span className="font-semibold">{account.name}</span>
                          </div>
                          {account.account_type && (
                            <div className={`mt-1 text-xs font-medium ${
                              isSelected ? 'text-white/80' : 'opacity-70'
                            }`}>
                              {account.account_type}
                            </div>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
                {!formData.account_id && paymentAccounts.length > 0 && (
                  <p className="mt-2 text-xs text-red-600 font-medium">Please select a payment account</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={formData.reference_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white"
                  placeholder="Transaction reference"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 font-medium bg-white resize-none"
                  placeholder="Payment notes..."
                  rows={3}
                />
              </div>
            </form>
          </div>
        </div>

        {/* Fixed Action Buttons Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <form onSubmit={handleSubmit}>
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
                disabled={isSubmitting}
                className="flex-1 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recording...
                  </span>
                ) : (
                  'Record Payment'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
};

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
      
      setIsLoading(true);
      const fullPlan = await installmentService.getInstallmentPlanById(plan.id);
      if (fullPlan) {
        setCurrentPlan(fullPlan);
        setPayments(fullPlan.payments || []);
        
        if (fullPlan.sale_id) {
          const { data: saleItemsData } = await supabase
            .from('lats_sale_items')
            .select('*')
            .eq('sale_id', fullPlan.sale_id);
          
          if (saleItemsData && saleItemsData.length > 0) {
            const productIds = [...new Set(saleItemsData.map(item => item.product_id).filter(Boolean))];
            const variantIds = [...new Set(saleItemsData.map(item => item.variant_id).filter(Boolean))];

            const [productsResult, variantsResult] = await Promise.all([
              productIds.length > 0 ? supabase.from('lats_products').select('id, name, sku').in('id', productIds) : { data: [] },
              variantIds.length > 0 ? supabase.from('lats_product_variants').select('id, name, variant_name, sku').in('id', variantIds) : { data: [] }
            ]);

            const productsMap = new Map((productsResult.data || []).map((p: any) => [p.id, p]));
            const variantsMap = new Map((variantsResult.data || []).map((v: any) => [v.id, { ...v, name: v.name || v.variant_name || 'Unnamed' }]));

            const enhancedItems = saleItemsData.map(item => ({
              ...item,
              lats_products: productsMap.get(item.product_id),
              lats_product_variants: variantsMap.get(item.variant_id)
            }));

            setSaleItems(enhancedItems);
          }
        }
        
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
      }
      setIsLoading(false);
    };

    fetchPayments();
  }, [isOpen, plan.id, plan.updated_at]);

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

  const generateInstallmentSchedule = () => {
    const schedule = [];
    const planStartDate = currentPlan.down_payment > 0 
      ? new Date(currentPlan.start_date) // If down payment exists, plan starts on start_date
      : new Date(currentPlan.start_date);
    
    // Calculate balanced installment amounts
    const calculateBalancedInstallments = (
      totalAmount: number,
      firstPayment: number,
      numInstallments: number
    ): number[] => {
      const remaining = totalAmount - firstPayment;
      const numRemainingPayments = firstPayment > 0 ? numInstallments - 1 : numInstallments;
      
      if (numRemainingPayments <= 0) return [];
      
      const amounts: number[] = [];
      const baseAmount = remaining / numRemainingPayments;
      
      // Calculate all installments except the last one as rounded amounts
      let totalCalculated = 0;
      for (let i = 0; i < numRemainingPayments - 1; i++) {
        const rounded = Math.round(baseAmount * 100) / 100;
        amounts.push(rounded);
        totalCalculated += rounded;
      }
      
      // Last installment is the remainder to ensure perfect balance
      const lastAmount = Math.round((remaining - totalCalculated) * 100) / 100;
      amounts.push(lastAmount);
      
      return amounts;
    };
    
    // Calculate balanced installment amounts
    const balancedAmounts = calculateBalancedInstallments(
      currentPlan.total_amount,
      currentPlan.down_payment || 0,
      currentPlan.number_of_installments
    );
    
    // Add first payment (down payment) if it exists
    if (currentPlan.down_payment > 0) {
      // Check for payment with installment_number === 1 (new) or === 0 (legacy/backward compatibility)
      const firstPayment = payments.find(p => 
        (p.installment_number === 1 || p.installment_number === 0) && 
        Math.abs(Number(p.amount) - currentPlan.down_payment) < 0.01
      );
      // Also check if total_paid indicates first payment was made (for backward compatibility)
      const isPaidFromTotalPaid = (currentPlan.total_paid || 0) >= currentPlan.down_payment;
      const isPaid = (firstPayment && firstPayment.status === 'paid') || isPaidFromTotalPaid;
      const dueDate = new Date(planStartDate); // First payment is due on plan start date
      const isOverdue = !isPaid && new Date() > dueDate;
      
      schedule.push({
        installmentNumber: 1,
        dueDate: dueDate.toISOString(),
        amount: currentPlan.down_payment,
        status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        payment: firstPayment,
        daysOverdue: isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
    }
    
    // Calculate remaining installments
    const numberOfRemainingPayments = currentPlan.down_payment > 0 
      ? currentPlan.number_of_installments - 1 
      : currentPlan.number_of_installments;
    
    // Start date for remaining installments (if down payment exists, start from next payment date)
    const nextPaymentStartDate = currentPlan.down_payment > 0 
      ? new Date(currentPlan.next_payment_date || currentPlan.start_date)
      : new Date(currentPlan.start_date);
    
    // Add remaining installments with balanced amounts
    for (let i = 0; i < numberOfRemainingPayments; i++) {
      const dueDate = new Date(nextPaymentStartDate);
      
      // Calculate due date based on payment frequency
      if (currentPlan.payment_frequency === 'weekly') {
        dueDate.setDate(nextPaymentStartDate.getDate() + (i * 7));
      } else if (currentPlan.payment_frequency === 'monthly') {
        dueDate.setMonth(nextPaymentStartDate.getMonth() + i);
      } else if (currentPlan.payment_frequency === 'bi_weekly' || currentPlan.payment_frequency === 'bi-weekly') {
        dueDate.setDate(nextPaymentStartDate.getDate() + (i * 14));
      }
      
      const installmentNumber = currentPlan.down_payment > 0 ? i + 2 : i + 1; // Number continues from first payment
      const payment = payments.find(p => p.installment_number === installmentNumber);
      const isPaid = payment && payment.status === 'paid';
      const isOverdue = !isPaid && new Date() > dueDate;
      
      // Use balanced amount for this installment
      const amount = balancedAmounts[i] || currentPlan.installment_amount;
      
      schedule.push({
        installmentNumber: installmentNumber,
        dueDate: dueDate.toISOString(),
        amount: amount,
        status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        payment: payment,
        daysOverdue: isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
    }
    
    return schedule;
  };

  const installmentSchedule = generateInstallmentSchedule();
  
  // Sort schedule: unpaid/pending/overdue first, then paid at the end
  const sortedInstallmentSchedule = [...installmentSchedule].sort((a, b) => {
    // Paid items go to the end
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;
    // If both have same status, maintain original order (by installment number)
    return a.installmentNumber - b.installmentNumber;
  });

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[1000000]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000000 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="view-plan-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="view-plan-modal-title" className="text-2xl font-bold text-gray-900 mb-2">{currentPlan.plan_number}</h3>
              <p className="text-sm text-gray-600 font-medium">Installment Plan Details</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {isLoading ? (
            <div className="py-12 text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Loading plan details...</p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {/* Plan Summary Card - Matching RecordPaymentModal style */}
              <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200 shadow-sm">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Customer:</span>
                    <span className="text-base font-bold text-gray-900">{currentPlan.customer?.name || 'N/A'}</span>
                  </div>
                  {currentPlan.customer?.phone && (
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-600">Phone:</span>
                      <span className="text-base font-bold text-gray-900">{currentPlan.customer.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <span className={`font-bold uppercase px-3 py-1.5 rounded-lg text-xs ${
                      currentPlan.status === 'active' ? 'bg-green-100 text-green-700' :
                      currentPlan.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                      currentPlan.status === 'defaulted' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>{currentPlan.status}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <span className="text-base font-bold text-gray-900">{formatDate(currentPlan.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Financial Summary Card - Matching RecordPaymentModal style */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Financial Summary
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Amount</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(currentPlan.total_amount)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Down Payment</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(currentPlan.down_payment)}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(currentPlan.total_paid || 0)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Balance Due</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(currentPlan.balance_due)}</p>
                  </div>
                </div>
              </div>

              {/* Installment Schedule - Modern Card Design */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Installment Schedule
                  </h4>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-xs font-semibold text-purple-700">
                      {payments.filter(p => p.status === 'paid' && p.installment_number > 0).length} / {currentPlan.number_of_installments} Paid
                    </span>
                  </div>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {sortedInstallmentSchedule.map((installment, index) => {
                    const isPaid = installment.status === 'paid';
                    const isOverdue = installment.status === 'overdue';
                    const isPending = installment.status === 'pending';
                    
                    return (
                      <div
                        key={installment.installmentNumber}
                        className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 ${
                          isPaid
                            ? 'bg-white border-green-300 shadow-md hover:shadow-lg'
                            : isOverdue
                            ? 'bg-white border-red-300 shadow-md hover:shadow-lg'
                            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {/* Left Section */}
                          <div className="flex items-center gap-4 flex-1">
                            {/* Installment Number - Circular Badge */}
                            <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                              isPaid
                                ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                                : isOverdue
                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                                : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                            }`}>
                              {installment.installmentNumber}
                              {isPaid && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            {/* Date and Status Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className={`w-4 h-4 flex-shrink-0 ${
                                  isPaid ? 'text-green-600' : isOverdue ? 'text-red-600' : 'text-gray-500'
                                }`} />
                                <div className="text-base font-bold text-gray-900">
                                  {formatDate(installment.dueDate)}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                                  isPaid
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : isOverdue
                                    ? 'bg-red-100 text-red-800 border border-red-200'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                                }`}>
                                  {isPaid && <CheckCircle className="w-3.5 h-3.5" />}
                                  {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                                  {installment.status}
                                </span>
                                {isOverdue && installment.daysOverdue && (
                                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                                    {installment.daysOverdue} days late
                                  </span>
                                )}
                                {isPaid && installment.payment && (
                                  <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                    Paid on {formatDate(installment.payment.payment_date)}
                                  </span>
                                )}
                              </div>
                              
                              {/* Reference Number for Paid */}
                              {isPaid && installment.payment && installment.payment.reference_number && (
                                <div className="mt-2 text-xs text-gray-600">
                                  <span className="font-medium">Ref:</span> {installment.payment.reference_number}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Right Section - Amount */}
                          <div className="flex-shrink-0 text-right ml-4">
                            <div className={`text-2xl font-bold mb-1 ${
                              isPaid ? 'text-green-700' : isOverdue ? 'text-red-700' : 'text-gray-900'
                            }`}>
                              {formatCurrency(installment.amount)}
                            </div>
                            {isPaid && (
                              <div className="flex items-center justify-end gap-1 text-xs text-green-600 font-medium">
                                <CheckCircle className="w-3 h-3" />
                                <span>Completed</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Connecting Line */}
                        {index < sortedInstallmentSchedule.length - 1 && (
                          <div className={`absolute left-7 top-full w-0.5 h-3 ${
                            isPaid ? 'bg-green-300' : isOverdue ? 'bg-red-300' : 'bg-gray-300'
                          }`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl text-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

interface EditInstallmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  plan: InstallmentPlan;
  paymentAccounts: any[];
  currentUser: any;
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
        
        // If status was changed to completed, wait a moment for database triggers to update all statuses
        // then refresh to ensure all installment statuses are up-to-date
        const statusChanged = formData.status !== plan.status;
        const statusCompleted = formData.status === 'completed';
        
        if (statusChanged && statusCompleted) {
          // Wait 500ms for database triggers to complete status updates
          // The onSuccess callback will handle cache clearing via fetchPlans(true)
          setTimeout(() => {
            onSuccess();
          }, 500);
        } else {
          onSuccess();
        }
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

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000000] p-4" style={{ zIndex: 1000000 }}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
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
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee Amount</label>
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
    </div>,
    document.body
  );
};

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

  return createPortal(
    <div 
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[1000000]" 
      style={{ top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000000 }}
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="payment-history-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center shadow-lg">
              <History className="w-8 h-8 text-white" />
            </div>
            
            {/* Text */}
            <div>
              <h3 id="payment-history-modal-title" className="text-2xl font-bold text-gray-900 mb-2">Payment History</h3>
              <p className="text-sm text-gray-600 font-medium">{plan.plan_number} - {plan.customer?.name}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          {isLoading ? (
            <div className="py-12 text-center">
              <LoadingSpinner />
              <p className="mt-4 text-gray-600">Loading payment history...</p>
            </div>
          ) : (
            <div className="py-4 space-y-4">
              {/* Summary Card - Matching RecordPaymentModal style */}
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Payment Summary
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Payments</p>
                    <p className="text-xl font-bold text-gray-900">{payments.length}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Total Paid</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                    <p className="text-xs font-medium text-gray-600 mb-1">Balance Due</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(plan.balance_due || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Payment History List */}
              {payments.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-lg font-medium">No payments recorded yet</p>
                  <p className="text-gray-500 text-sm mt-2">Payment history will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment, index) => (
                    <div
                      key={payment.id || index}
                      className="relative p-4 rounded-xl border-2 bg-gradient-to-r from-green-50 to-green-100/50 border-green-300 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left Section - Number and Date */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Payment Number Badge */}
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow-sm bg-green-500 text-white">
                            {payment.installment_number === 0 ? 'DP' : `#${payment.installment_number}`}
                          </div>
                          
                          {/* Date and Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-4 h-4 flex-shrink-0 text-green-600" />
                              <div className="text-sm font-bold text-gray-900">
                                {payment.installment_number === 0 
                                  ? 'Down Payment' 
                                  : `Installment Payment ${payment.installment_number}`}
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-600 mb-2">
                              {formatDate(payment.payment_date)}
                            </div>
                            
                            {/* Payment Details */}
                            <div className="space-y-1 mt-2">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-600">Method:</span>
                                <span className="font-semibold text-gray-900">{payment.payment_method}</span>
                              </div>
                              {payment.reference_number && (
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-600">Reference:</span>
                                  <span className="font-semibold text-gray-900">{payment.reference_number}</span>
                                </div>
                              )}
                              {payment.notes && (
                                <div className="text-xs mt-2 p-2 bg-white rounded-lg border border-gray-200">
                                  <span className="text-gray-600">Notes: </span>
                                  <span className="text-gray-700">{payment.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right Section - Amount */}
                        <div className="flex-shrink-0 text-right">
                          <div className="text-lg font-bold text-green-700">
                            {formatCurrency(payment.amount)}
                          </div>
                          <span className={`inline-block mt-2 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            payment.status === 'paid' ? 'bg-green-200 text-green-800' :
                            payment.status === 'late' ? 'bg-red-200 text-red-800' :
                            'bg-gray-200 text-gray-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Indicator Line */}
                      {index < payments.length - 1 && (
                        <div className="absolute left-6 top-full w-0.5 h-2 bg-green-300" style={{ transform: 'translateY(-2px)' }} />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <Printer className="w-5 h-5" />
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl text-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ================================================
// INSTALLMENT PLAN CARD COMPONENT
// ================================================

interface InstallmentPlanCardProps {
  plan: InstallmentPlan;
  isSelected: boolean;
  isSelectionMode: boolean;
  onToggleSelect: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: InstallmentPlanStatus) => string;
  getStatusIcon: (status: InstallmentPlanStatus) => React.ReactNode;
  isOverdue: (plan: InstallmentPlan) => boolean;
  handleViewPlan: (plan: InstallmentPlan) => void;
  handleRecordPayment: (plan: InstallmentPlan) => void;
  handleEditPlan: (plan: InstallmentPlan) => void;
  handleSendReminder: (planId: string) => void;
  handleViewSchedule: (plan: InstallmentPlan) => void;
  handleViewPaymentHistory: (plan: InstallmentPlan) => void;
  handleCancelPlan: (planId: string) => void;
}

const InstallmentPlanCard: React.FC<InstallmentPlanCardProps> = ({
  plan,
  isSelected,
  isSelectionMode,
  onToggleSelect,
  isExpanded,
  onToggleExpanded,
  formatCurrency,
  formatDate,
  getStatusColor,
  getStatusIcon,
  isOverdue,
  handleViewPlan,
  handleRecordPayment,
  handleEditPlan,
  handleSendReminder,
  handleViewSchedule,
  handleViewPaymentHistory,
  handleCancelPlan
}) => {
  const [scheduleCollapsed, setScheduleCollapsed] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const [showCustomerTooltip, setShowCustomerTooltip] = useState(false);
  const customerBadgeRef = useRef<HTMLDivElement>(null);

  // Close tooltip when plan is collapsed
  useEffect(() => {
    if (!isExpanded && showCustomerTooltip) {
      setShowCustomerTooltip(false);
    }
  }, [isExpanded, showCustomerTooltip]);

  useEffect(() => {
    if (isExpanded) {
      setScheduleCollapsed(true);
      // Load payment history when expanded
      const loadPayments = async () => {
        setIsLoadingPayments(true);
        try {
          const fullPlan = await installmentService.getInstallmentPlanById(plan.id);
          if (fullPlan?.payments) {
            setPayments(fullPlan.payments);
          }
        } catch (error) {
          console.error('Error loading payments:', error);
        } finally {
          setIsLoadingPayments(false);
        }
      };
      loadPayments();
    }
  }, [isExpanded, plan.id]);

  const planIsOverdue = isOverdue(plan);
  const isPlanComplete = plan.status === 'completed';
  const needsAction = plan.status === 'active' && planIsOverdue;
  const paymentProgress = ((plan.total_paid || 0) / plan.total_amount) * 100;

  // Calculate actual unique paid installments from payments array
  // Exclude down payment (installment_number 0) to match database logic
  const uniquePaidInstallments = useMemo(() => {
    if (!payments || payments.length === 0) return 0;
    const paidInstallmentNumbers = new Set(
      payments
        .filter(p => p.status === 'paid' && p.installment_number > 0)
        .map(p => p.installment_number)
    );
    return paidInstallmentNumbers.size;
  }, [payments]);

  // Use the calculated unique count, but fallback to plan.installments_paid if payments not loaded yet
  const actualInstallmentsPaid = payments.length > 0 ? uniquePaidInstallments : plan.installments_paid;

  // Generate installment schedule
  const generateSchedule = () => {
    const schedule = [];
    
    // Calculate balanced installment amounts
    const calculateBalancedInstallments = (
      totalAmount: number,
      firstPayment: number,
      numInstallments: number
    ): number[] => {
      const remaining = totalAmount - firstPayment;
      const numRemainingPayments = firstPayment > 0 ? numInstallments - 1 : numInstallments;
      
      if (numRemainingPayments <= 0) return [];
      
      const amounts: number[] = [];
      const baseAmount = remaining / numRemainingPayments;
      
      // Calculate all installments except the last one as rounded amounts
      let totalCalculated = 0;
      for (let i = 0; i < numRemainingPayments - 1; i++) {
        const rounded = Math.round(baseAmount * 100) / 100;
        amounts.push(rounded);
        totalCalculated += rounded;
      }
      
      // Last installment is the remainder to ensure perfect balance
      const lastAmount = Math.round((remaining - totalCalculated) * 100) / 100;
      amounts.push(lastAmount);
      
      return amounts;
    };
    
    const balancedAmounts = calculateBalancedInstallments(
      plan.total_amount,
      plan.down_payment || 0,
      plan.number_of_installments
    );
    
    const planStartDate = new Date(plan.start_date);
    
    // Add first payment (down payment) if it exists
    if (plan.down_payment > 0) {
      // Check for payment with installment_number === 1 (new) or === 0 (legacy/backward compatibility)
      const installmentPayments = payments.filter(p => 
        (p.installment_number === 1 || p.installment_number === 0) && 
        Math.abs(Number(p.amount) - plan.down_payment) < 0.01
      );
      const payment = installmentPayments.length > 0
        ? installmentPayments.sort((a, b) => new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime())[0]
        : null;
      // Also check if total_paid indicates first payment was made (for backward compatibility)
      const isPaidFromTotalPaid = (plan.total_paid || 0) >= plan.down_payment;
      const isPaid = (payment && payment.status === 'paid') || isPaidFromTotalPaid;
      const dueDate = new Date(planStartDate);
      const isOverdue = !isPaid && new Date() > dueDate && plan.status === 'active';
      
      schedule.push({
        installmentNumber: 1,
        dueDate: dueDate.toISOString(),
        amount: plan.down_payment,
        status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        payment: payment,
        daysOverdue: isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
    }
    
    // Calculate remaining installments
    const numberOfRemainingPayments = plan.down_payment > 0 
      ? plan.number_of_installments - 1 
      : plan.number_of_installments;
    
    const nextPaymentStartDate = plan.down_payment > 0 
      ? new Date(plan.next_payment_date || plan.start_date)
      : new Date(plan.start_date);
    
    for (let i = 0; i < numberOfRemainingPayments; i++) {
      const dueDate = new Date(nextPaymentStartDate);
      
      if (plan.payment_frequency === 'weekly') {
        dueDate.setDate(nextPaymentStartDate.getDate() + (i * 7));
      } else if (plan.payment_frequency === 'monthly') {
        dueDate.setMonth(nextPaymentStartDate.getMonth() + i);
      } else if (plan.payment_frequency === 'bi_weekly' || plan.payment_frequency === 'bi-weekly') {
        dueDate.setDate(nextPaymentStartDate.getDate() + (i * 14));
      }
      
      const installmentNumber = plan.down_payment > 0 ? i + 2 : i + 1;
      
      // Find the most recent payment for this installment number (in case of duplicates)
      const installmentPayments = payments.filter(p => p.installment_number === installmentNumber);
      const payment = installmentPayments.length > 0
        ? installmentPayments.sort((a, b) => new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime())[0]
        : null;
      const isPaid = payment && payment.status === 'paid';
      const isOverdue = !isPaid && new Date() > dueDate && plan.status === 'active';
      
      // Use balanced amount for this installment
      const amount = balancedAmounts[i] || plan.installment_amount;
      
      schedule.push({
        installmentNumber: installmentNumber,
        dueDate: dueDate.toISOString(),
        amount: amount,
        status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
        payment: payment,
        daysOverdue: isOverdue ? Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0
      });
    }
    
    return schedule;
  };

  const installmentSchedule = generateSchedule();
  
  // Sort schedule: unpaid/pending/overdue first, then paid at the end
  const sortedSchedule = [...installmentSchedule].sort((a, b) => {
    // Paid items go to the end
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;
    // If both have same status, maintain original order (by installment number)
    return a.installmentNumber - b.installmentNumber;
  });
  
  const previewCount = 3;
  const hasMoreSchedule = sortedSchedule.length > previewCount;
  const displayedSchedule = scheduleCollapsed && hasMoreSchedule
    ? sortedSchedule.slice(0, previewCount)
    : sortedSchedule;

  return (
    <div
      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
        isExpanded 
          ? 'border-purple-500 shadow-xl' 
          : isPlanComplete
            ? 'border-green-200 hover:border-green-300 hover:shadow-md'
            : needsAction
              ? 'border-red-300 hover:border-red-400 hover:shadow-md'
              : 'border-gray-200 hover:border-purple-400 hover:shadow-md'
      } ${isSelected ? 'ring-2 ring-offset-2 ring-purple-400' : ''}`}
    >
      {/* Header - Clickable */}
      <div 
        className="flex items-start justify-between p-6 cursor-pointer"
        onClick={onToggleExpanded}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelect();
              }}
              onClick={(e) => e.stopPropagation()}
              className="mt-1 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500 cursor-pointer flex-shrink-0"
              title="Select this plan"
            />
          )}
          
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
            {/* Plan Number and Status Row */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h3 className="text-2xl font-bold text-gray-900 truncate">{plan.plan_number}</h3>
              
              {/* Status Badge */}
              {isPlanComplete ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold bg-green-500 text-white shadow-sm flex-shrink-0">
                  <CheckSquare className="w-5 h-5" />
                  Complete
                </span>
              ) : needsAction ? (
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold bg-red-500 text-white shadow-sm animate-pulse flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue
                </span>
              ) : (
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${getStatusColor(plan.status)} flex items-center gap-2 flex-shrink-0`}>
                  {getStatusIcon(plan.status)}
                  <span>{plan.status.toUpperCase()}</span>
                </span>
              )}
            </div>
            
            {/* Info Badges Row */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Customer Badge */}
              <div 
                ref={customerBadgeRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCustomerTooltip(!showCustomerTooltip);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0 cursor-pointer hover:bg-blue-100 transition-colors"
              >
                <User className="w-5 h-5" />
                <span className="text-base font-semibold truncate max-w-[140px]">{plan.customer?.name || 'Unknown Customer'}</span>
              </div>
              
              {/* Customer Tooltip */}
              {plan.customer && (
                <CustomerTooltip
                  customer={plan.customer}
                  plan={plan}
                  anchorRef={customerBadgeRef}
                  isOpen={showCustomerTooltip}
                  onClose={() => setShowCustomerTooltip(false)}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              )}
              
              {/* Installment Info Card */}
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                  <span className="text-base font-semibold text-purple-700">{actualInstallmentsPaid}</span>
                  <span className="text-sm text-purple-600 font-medium">/ {plan.number_of_installments}</span>
                </div>
                <div className="w-px h-5 bg-gray-300"></div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <span className="text-base font-medium text-gray-600">
                    {plan.next_payment_date ? formatDate(plan.next_payment_date) : 'Completed'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment & Amount Card */}
        <div className="ml-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Total Amount */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500 font-medium uppercase tracking-wide">Total Amount</span>
              </div>
              <div className="flex flex-col">
                <span className="text-4xl font-bold text-gray-900 leading-tight">{formatCurrency(plan.total_amount)}</span>
              </div>
            </div>
            
            {/* Payment Status Badge */}
            <div className="flex-shrink-0">
              <span className={`inline-flex items-center gap-1.5 px-5 py-3 rounded-xl text-base font-bold shadow-sm ${
                paymentProgress >= 100
                  ? 'bg-green-500 text-white'
                  : paymentProgress > 0
                    ? 'bg-yellow-500 text-white'
                    : 'bg-red-500 text-white'
              }`}>
                {paymentProgress >= 100 ? (
                  <CheckCircle className="w-5 h-5" />
                ) : paymentProgress > 0 ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                {paymentProgress >= 100 
                  ? 'Paid'
                  : paymentProgress > 0
                    ? 'Partial'
                    : 'Unpaid'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Separator Line - Only show when expanded */}
      {isExpanded && (
        <div className="mt-5 pt-5 border-t-2 border-gray-200 relative">
          <div className="absolute top-0 left-0 right-0 flex items-center justify-center -mt-3">
            <span className="bg-white px-5 py-1.5 text-xs text-gray-500 font-semibold uppercase tracking-wider rounded-full border border-gray-200 shadow-sm">Plan Details</span>
          </div>
        </div>
      )}

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 pt-2">
          {/* Payment Progress Section */}
          <div className="mb-4">
            <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Payment Progress
            </h4>
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                <div className="text-xs text-green-600 font-medium mb-1">Total Paid</div>
                <div className="text-2xl font-bold text-green-700">{formatCurrency(plan.total_paid || 0)}</div>
              </div>
              <div className="bg-red-50 p-4 rounded-xl border border-red-200">
                <div className="text-xs text-red-600 font-medium mb-1">Balance Due</div>
                <div className="text-2xl font-bold text-red-700">{formatCurrency(plan.balance_due || 0)}</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="text-xs text-blue-600 font-medium mb-1">Progress</div>
                <div className="text-2xl font-bold text-blue-700">{paymentProgress.toFixed(0)}%</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  paymentProgress >= 100
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                    : paymentProgress > 0
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                      : 'bg-gray-300'
                }`}
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Payment Schedule - Redesigned */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Installment Schedule
              </h4>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="text-xs font-semibold text-purple-700">
                  {actualInstallmentsPaid} / {plan.number_of_installments} Paid
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1 items-start">
              {displayedSchedule.map((installment, index) => {
                const isPaid = installment.status === 'paid';
                const isOverdue = installment.status === 'overdue';
                const isPending = installment.status === 'pending';
                
                return (
                  <div
                    key={installment.installmentNumber}
                    className={`group relative p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col ${
                      isPaid
                        ? 'bg-white border-green-300 shadow-md hover:shadow-lg'
                        : isOverdue
                        ? 'bg-white border-red-300 shadow-md hover:shadow-lg'
                        : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    {/* Top Section - Number and Amount */}
                    <div className="flex items-start justify-between mb-4">
                      {/* Installment Number Badge */}
                      <div className={`relative flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                        isPaid
                          ? 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                          : isOverdue
                          ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                          : 'bg-gradient-to-br from-gray-400 to-gray-500 text-white'
                      }`}>
                        {installment.installmentNumber}
                      </div>
                      
                      {/* Amount - Top Right */}
                      <div className="flex-shrink-0 text-right">
                        <div className={`text-xl font-bold ${
                          isPaid ? 'text-green-700' : isOverdue ? 'text-red-700' : 'text-gray-900'
                        }`}>
                          {formatCurrency(installment.amount)}
                        </div>
                      </div>
                    </div>
                    
                    {/* Date and Status Info - Bottom Section */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <Calendar className={`w-4 h-4 flex-shrink-0 ${
                          isPaid ? 'text-green-600' : isOverdue ? 'text-red-600' : 'text-gray-500'
                        }`} />
                        <div className="text-base font-bold text-gray-900">
                          {formatDate(installment.dueDate)}
                        </div>
                        
                        {/* Status Badge - On same line as date */}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                          isPaid
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : isOverdue
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                          {isPaid && <CheckCircle className="w-3.5 h-3.5" />}
                          {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                          {installment.status}
                        </span>
                      </div>
                      
                      {/* Overdue Days - Below if present */}
                      {isOverdue && installment.daysOverdue && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                            {installment.daysOverdue} days late
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {hasMoreSchedule && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setScheduleCollapsed(!scheduleCollapsed);
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-purple-700 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 rounded-xl transition-all"
              >
                {scheduleCollapsed ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    View More Installments
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    View Less
                  </>
                )}
              </button>
            )}
          </div>

          {/* Customer Information - Email Only */}
          {plan.customer?.email && (
            <div className="mb-4">
              <h4 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-3">
                <User className="w-5 h-5 text-blue-600" />
                Customer Information
              </h4>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    window.location.href = `mailto:${plan.customer.email}`;
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-all text-sm font-medium"
                  title="Send email"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons Section - Matching OrderManagementModal */}
          <div className="mt-5 pt-5 border-t-2 border-gray-200">
            {/* Get Smart Actions */}
            {(() => {
              const actions = [];
              
              // Always show View Details
              actions.push({
                type: 'view',
                label: 'View Details',
                icon: <Eye className="w-4 h-4" />,
                color: 'bg-blue-600 hover:bg-blue-700',
                onClick: () => handleViewPlan(plan)
              });

              // Check if there are unpaid installments
              // Use actual installments paid from payments array if available, otherwise use plan.installments_paid
              const actualInstallmentsPaidCount = payments.length > 0 
                ? uniquePaidInstallments 
                : Number(plan.installments_paid || 0);
              const totalInstallments = Number(plan.number_of_installments || 0);
              const hasUnpaidInstallments = actualInstallmentsPaidCount < totalInstallments;
              const balanceDue = Number(plan.balance_due || 0);
              
              // Show payment button if there are unpaid installments OR balance due
              // NEVER mark as complete if installments are not all paid
              // Keep showing "Receive Money" until ALL installments are fully paid
              const canRecordPayment = hasUnpaidInstallments || balanceDue > 0;
              const isTrulyCompleted = !hasUnpaidInstallments && balanceDue <= 0 && plan.status === 'completed';

              // Show payment button if there are unpaid installments or balance, regardless of status
              // This ensures users can always receive payments until everything is fully paid
              if (canRecordPayment && !isTrulyCompleted) {
                actions.push({
                  type: 'pay',
                  label: 'Record Payment',
                  icon: <DollarSign className="w-4 h-4" />,
                  color: 'bg-green-600 hover:bg-green-700',
                  onClick: () => handleRecordPayment(plan)
                });
              }
                
                // Allow editing, reminders, and cancellation only for active plans
                // Even if status is incorrectly set to 'completed', allow these actions if not truly completed
                if (plan.status === 'active' || (plan.status === 'completed' && !isTrulyCompleted)) {
                  // Only show edit/cancel if plan is active (not if it was incorrectly marked completed)
                  if (plan.status === 'active') {
                    actions.push({
                      type: 'edit',
                      label: 'Edit Plan',
                      icon: <Edit className="w-4 h-4" />,
                      color: 'bg-purple-600 hover:bg-purple-700',
                      onClick: () => handleEditPlan(plan)
                    });
                    actions.push({
                      type: 'cancel',
                      label: 'Cancel Plan',
                      icon: <Trash2 className="w-4 h-4" />,
                      color: 'bg-red-600 hover:bg-red-700',
                      onClick: () => handleCancelPlan(plan.id)
                    });
                  }
                  
                  // Allow sending reminders if there are unpaid installments
                  if (hasUnpaidInstallments && plan.customer?.phone) {
                    actions.push({
                      type: 'remind',
                      label: 'Send Reminder',
                      icon: <Bell className="w-4 h-4" />,
                      color: 'bg-orange-600 hover:bg-orange-700',
                      onClick: () => handleSendReminder(plan.id)
                    });
                  }
                }

              // Always available actions
              actions.push({
                type: 'history',
                label: 'Payment History',
                icon: <History className="w-4 h-4" />,
                color: 'bg-gray-600 hover:bg-gray-700',
                onClick: () => handleViewPaymentHistory(plan)
              });

              // Communication actions (if customer has phone)
              if (plan.customer?.phone) {
                actions.push({
                  type: 'whatsapp',
                  label: 'WhatsApp',
                  icon: <MessageSquare className="w-4 h-4" />,
                  color: 'bg-green-600 hover:bg-green-700',
                  onClick: () => {
                    window.open(`https://wa.me/${plan.customer.phone.replace(/\D/g, '')}`, '_blank');
                  }
                });
                actions.push({
                  type: 'call',
                  label: 'Call',
                  icon: <Phone className="w-4 h-4" />,
                  color: 'bg-blue-600 hover:bg-blue-700',
                  onClick: () => {
                    window.location.href = `tel:${plan.customer.phone}`;
                  }
                });
              }

              // Primary Actions (first 4)
              const primaryActions = actions.slice(0, 4);
              const secondaryActions = actions.slice(4);

              return (
                <>
                  {/* Primary Actions */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    {primaryActions.map((action, index) => (
                      <button
                        key={`${action.type}-${index}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          try {
                            action.onClick();
                          } catch (error) {
                            toast.error(`Failed to execute ${action.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                          }
                        }}
                        className={`flex items-center justify-center gap-2 px-4 py-3 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-semibold text-sm ${action.color}`}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>

                  {/* Secondary Actions */}
                  {secondaryActions.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {secondaryActions.map((action, index) => (
                        <button
                          key={`${action.type}-${index + 4}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            try {
                              action.onClick();
                            } catch (error) {
                              toast.error(`Failed to execute ${action.label}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                          }}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all hover:scale-105 hover:shadow-lg font-medium text-sm ${action.color}`}
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default InstallmentManagementModal;

