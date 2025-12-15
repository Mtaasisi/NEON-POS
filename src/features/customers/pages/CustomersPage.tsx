import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { CustomerListSkeleton } from '../../../components/ui/SkeletonLoaders';
import { Customer, LoyaltyLevel } from '../../../types';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import SearchBar from '../../../features/shared/components/ui/SearchBar';
import BackgroundSearchIndicator from '../../../features/shared/components/ui/BackgroundSearchIndicator';
import CustomerFilters from '../components/CustomerFilters';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import { 
  Star, UserCheck, Tag, Download, MessageSquare, Trash2, Plus, Grid, List, Filter, SortAsc,
  AlertCircle, UserPlus, FileSpreadsheet, Users, DollarSign, Activity, MessageCircle, BarChart3, Award,
  Clock, Phone, Mail, Edit, Eye, CheckCircle, XCircle, BarChart2, Crown, Calendar, RotateCcw, RefreshCw,
  ChevronLeft, ChevronRight, Gift, CalendarDays, Clock3, UserPlus2, AlertTriangle, X, Upload, Search,
  ChevronDown, ChevronUp, Building, ShoppingBag, Settings, Zap
} from 'lucide-react';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import BulkSMSModal from '../../reports/components/BulkSMSModal';
import CustomerDetailModal from '../components/CustomerDetailModal';
import CustomerImportExportModal from '../components/CustomerImportExportModal';
import { smsService } from '../../../services/smsService';
import { fetchAllCustomers, fetchCustomersPaginated, searchCustomers, searchCustomersFast, searchCustomersBackground, getBackgroundSearchManager, fetchAllAppointments } from '../../../lib/customerApi';
import { formatCurrency } from '../../../lib/customerApi';
import { fetchCustomerStats, CustomerStats } from '../../../lib/customerStatsApi';
import AddCustomerModal from '../components/forms/AddCustomerModal';
import AppointmentModal from '../components/forms/AppointmentModal';
import { supabase } from '../../../lib/supabaseClient';
import useFinancialData from '../../../hooks/useFinancialData';
import BirthdayNotification from '../components/BirthdayNotification';
import BirthdayMessageSender from '../components/BirthdayMessageSender';
import BirthdayCalendar from '../components/BirthdayCalendar';
import BirthdayRewards from '../components/BirthdayRewards';
import { createAppointment, updateAppointment, CreateAppointmentData, UpdateAppointmentData, Appointment } from '../../../lib/customerApi/appointments';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useDialog } from '../../shared/hooks/useDialog';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';

// Helper to escape CSV fields
function escapeCSVField(field: any) {
  if (field == null) return '';
  const str = String(field);
  if (str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  if (str.includes(',') || str.includes('\n')) {
    return '"' + str + '"';
  }
  return str;
}

const LOCAL_STORAGE_KEY = 'customersPagePrefs';

const getInitialPrefs = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const CustomersPage = () => {
  const { currentUser } = useAuth();
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { markCustomerAsRead } = useCustomers();
  const { summary, loading: financialLoading } = useFinancialData();
  const successModal = useSuccessModal();
  // Restore preferences from localStorage
  const prefs = getInitialPrefs();
  // Don't restore search query to prevent automatic searches on page load that might timeout
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [loyaltyFilter, setLoyaltyFilter] = useState<LoyaltyLevel | 'all'>(prefs.loyaltyFilter ?? 'all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>(prefs.statusFilter ?? 'all');
  const [showInactive, setShowInactive] = useState(prefs.showInactive ?? false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(prefs.showAdvancedFilters ?? false);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(prefs.viewMode ?? 'grid');
  const [showBulkSMS, setShowBulkSMS] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sortBy, setSortBy] = useState(prefs.sortBy ?? 'name');
  const [pageLoading, setPageLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Background search state
  const [isBackgroundSearching, setIsBackgroundSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>('pending');
  const [searchProgress, setSearchProgress] = useState(0);
  const [currentSearchJobId, setCurrentSearchJobId] = useState<string | null>(null);
  
  // Pagination state (now for infinite scroll)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  // Add state for multi-select filters
  const [loyaltyFilterMulti, setLoyaltyFilterMulti] = useState<LoyaltyLevel[]>([]);
  const [statusFilterMulti, setStatusFilterMulti] = useState<Array<'active' | 'inactive'>>([]);
  const [tagFilterMulti, setTagFilterMulti] = useState<string[]>([]);
  const [referralFilterMulti, setReferralFilterMulti] = useState<string[]>([]);
  const [birthdayFilter, setBirthdayFilter] = useState(false);
  const [whatsappFilter, setWhatsappFilter] = useState(false);
  
  // New filter states
  const [genderFilter, setGenderFilter] = useState<Array<'male' | 'female' | 'other'>>([]);
  const [minSpent, setMinSpent] = useState('');
  const [maxSpent, setMaxSpent] = useState('');
  const [minPoints, setMinPoints] = useState('');
  const [maxPoints, setMaxPoints] = useState('');
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [minPurchases, setMinPurchases] = useState('');
  const [maxPurchases, setMaxPurchases] = useState('');
  // Date range filters
  const [joinDateFrom, setJoinDateFrom] = useState('');
  const [joinDateTo, setJoinDateTo] = useState('');
  const [lastVisitFrom, setLastVisitFrom] = useState('');
  const [lastVisitTo, setLastVisitTo] = useState('');


  // Appointments state
  const [activeTab, setActiveTab] = useState<'customers' | 'appointments'>('customers');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [appointmentFilters, setAppointmentFilters] = useState({
    status: 'all',
    date: 'all',
    customer: 'all'
  });

  // Device statistics state
  const [totalDevices, setTotalDevices] = useState(0);
  const [devicesInRepair, setDevicesInRepair] = useState(0);

  // Database statistics state
  const [dbStats, setDbStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    todaysBirthdays: 0,
    totalRevenue: 0,
    totalDevices: 0
  });
  const [dbStatsLoading, setDbStatsLoading] = useState(true);

  // Birthday management state
  const [showBirthdayNotification, setShowBirthdayNotification] = useState(true);
  const [showBirthdayMessageSender, setShowBirthdayMessageSender] = useState(false);
      const [showBirthdayCalendar, setShowBirthdayCalendar] = useState(false);
  const [showBirthdayRewards, setShowBirthdayRewards] = useState(false);
  const [showAllBirthdays, setShowAllBirthdays] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Appointment modal state
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentModalMode, setAppointmentModalMode] = useState<'create' | 'edit'>('create');

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // Reduced to 300ms for better responsiveness

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Persist preferences to localStorage on change
  useEffect(() => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        // Don't save searchQuery to prevent auto-search on reload
        loyaltyFilter,
        statusFilter,
        showInactive,
        showAdvancedFilters,
        viewMode,
        sortBy,
      })
    );
  }, [loyaltyFilter, statusFilter, showInactive, showAdvancedFilters, viewMode, sortBy]);

  useEffect(() => {
    let progressInterval: NodeJS.Timeout | null = null;
    let isComponentMounted = true;
    
    const loadCustomers = async () => {
      try {
        if (currentPage === 1) {
          setLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        
        // Cancel any existing background search
        if (currentSearchJobId) {
          const searchManager = getBackgroundSearchManager();
          searchManager.cancelSearchJob(currentSearchJobId);
        }
        
        if (debouncedSearchQuery.trim() && debouncedSearchQuery.trim().length >= 2) {
          // Show search progress bar
          setIsBackgroundSearching(true);
          setSearchStatus('processing');
          setSearchProgress(20);
          setSearchLoading(true);
          
          // Simulate progress while searching
          progressInterval = setInterval(() => {
            setSearchProgress(prev => {
              if (prev < 90) return prev + 10;
              return prev;
            });
          }, 100);
          
          try {
            // Use direct search for better performance and typing experience
            const result = await searchCustomers(debouncedSearchQuery, currentPage, 100);
            
            if (!isComponentMounted) return;
            
            // Clear progress interval
            if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
            }
            
            // For infinite scroll: append to existing customers if loading more, otherwise replace
            let updatedCustomers;
            if (currentPage === 1) {
              updatedCustomers = result.customers;
              setCustomers(result.customers);
            } else {
              updatedCustomers = [...customers, ...result.customers];
              setCustomers(updatedCustomers);
            }
            
            // Fix totalCount if it's 0 but we have customers
            const actualTotalCount = result.total || 0;
            const hasMoreCustomers = result.customers.length >= 100;
            
            setTotalCount(actualTotalCount > 0 ? actualTotalCount : updatedCustomers.length);
            setTotalPages(result.totalPages > 0 ? result.totalPages : (hasMoreCustomers ? currentPage + 1 : currentPage));
            setHasNextPage((currentPage < result.totalPages) || (hasMoreCustomers && actualTotalCount === 0));
            setHasPreviousPage(currentPage > 1);
            
            // Complete search
            setSearchProgress(100);
            setSearchStatus('completed');
            setTimeout(() => {
              if (isComponentMounted) {
                setIsBackgroundSearching(false);
              }
            }, 500);
            setCurrentSearchJobId(null);
          } catch (searchError) {
            // Clear progress interval on search error
            if (progressInterval) {
              clearInterval(progressInterval);
              progressInterval = null;
            }
            throw searchError; // Re-throw to be caught by outer catch
          }
        } else {
          // Use regular pagination when no search query
          setIsBackgroundSearching(false);
          setSearchLoading(false);
          
          const result = await fetchCustomersPaginated(currentPage, 100);
          
          if (!isComponentMounted) return;
          
          // For infinite scroll: append to existing customers if loading more, otherwise replace
          let updatedCustomers;
          if (currentPage === 1) {
            updatedCustomers = result.customers;
            setCustomers(result.customers);
          } else {
            updatedCustomers = [...customers, ...result.customers];
            setCustomers(updatedCustomers);
          }
          
          // Fix totalCount if it's 0 but we have customers
          const actualTotalCount = result.totalCount || 0;
          const hasMoreCustomers = result.customers.length >= 100;
          
          setTotalCount(actualTotalCount > 0 ? actualTotalCount : updatedCustomers.length);
          setTotalPages(result.totalPages > 0 ? result.totalPages : (hasMoreCustomers ? currentPage + 1 : currentPage));
          setHasNextPage(result.hasNextPage || (hasMoreCustomers && actualTotalCount === 0));
          setHasPreviousPage(result.hasPreviousPage);
        }
      } catch (err: unknown) {
        // Clear progress interval on any error
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        if (!isComponentMounted) return;
        
        const errorMessage = err instanceof Error ? err.message : 'Failed to load customers';
        console.error('❌ Error loading customers:', errorMessage);
        
        // Show user-friendly error message
        setError(errorMessage);
        setSearchProgress(0);
        setSearchStatus('failed');
        setIsBackgroundSearching(false); // Hide the progress bar immediately on error
        
        // Show toast notification
        toast.error(`Failed to load customers: ${errorMessage.includes('timed out') ? 'Request timed out. Please try again.' : errorMessage}`, {
          duration: 5000,
          position: 'top-center',
        });
      } finally {
        if (isComponentMounted) {
          setLoading(false);
          setIsLoadingMore(false);
          setSearchLoading(false);
        }
      }
    };
    
    loadCustomers();
    
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      isComponentMounted = false;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [currentPage, debouncedSearchQuery]);

  // Reset modal states on component mount
  useEffect(() => {
    setShowAddCustomerModal(false);
    setShowBulkSMS(false);
  }, []);

  // Infinite Scroll - Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isLoadingMore && !loading) {
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasNextPage, isLoadingMore, loading]);

  // Fetch real appointments data
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const appointmentsData = await fetchAllAppointments();
        setAppointments(appointmentsData);
      } catch (error) {
        console.error('Error fetching appointments:', error);
        // Fallback to empty array if fetch fails
        setAppointments([]);
      }
    };
    
    fetchAppointments();
  }, []);

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // ? - Show keyboard shortcuts help
      if (e.key === '?' && !isTyping) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      // Ctrl/Cmd + N: New Customer
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !isTyping) {
        e.preventDefault();
        setShowAddCustomerModal(true);
        return;
      }

      // Ctrl/Cmd + K or Ctrl/Cmd + F: Focus search
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f') && !isTyping) {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="search"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !isTyping) {
        e.preventDefault();
        handleBulkExport();
        return;
      }

      // Ctrl/Cmd + I: Import Excel (admin only)
      if ((e.ctrlKey || e.metaKey) && e.key === 'i' && !isTyping) {
        if (['admin', 'customer-care'].includes(currentUser?.role || '')) {
          e.preventDefault();
          setShowExcelImport(true);
        }
        return;
      }

      // Esc: Clear search or close modals
      if (e.key === 'Escape' && !isTyping) {
        if (searchQuery) {
          setSearchQuery('');
        }
        // Close any open modals
        if (showAddCustomerModal) setShowAddCustomerModal(false);
        if (showBulkSMS) setShowBulkSMS(false);
        if (showCustomerDetailModal) setShowCustomerDetailModal(false);
        if (showAppointmentModal) setShowAppointmentModal(false);
        if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, currentUser, showAddCustomerModal, showBulkSMS, showCustomerDetailModal, showAppointmentModal, showKeyboardShortcuts]);

  // Fetch total devices count from devices table
  useEffect(() => {
    const fetchDeviceStats = async () => {
      try {
        // Get total devices count with branch filtering
        let devicesCountQuery = supabase
          .from('devices')
          .select('id', { count: 'exact', head: true });
        
        // ✅ Apply branch filtering
        const { addBranchFilter } = await import('../../../lib/branchAwareApi');
        devicesCountQuery = await addBranchFilter(devicesCountQuery, 'devices');
        
        const { count: totalCount, error: totalError } = await devicesCountQuery;

        if (totalError) {
          console.error('Error fetching total devices count:', totalError);
        } else {
          setTotalDevices(totalCount || 0);
        }

        // Get devices in repair count with branch filtering
        let devicesRepairQuery = supabase
          .from('devices')
          .select('id', { count: 'exact', head: true })
          .in('status', ['in-repair', 'diagnosis-started']);
        
        // ✅ Apply branch filtering
        devicesRepairQuery = await addBranchFilter(devicesRepairQuery, 'devices');
        
        const { count: repairCount, error: repairError } = await devicesRepairQuery;

        if (repairError) {
          console.error('Error fetching devices in repair count:', repairError);
        } else {
          setDevicesInRepair(repairCount || 0);
        }
      } catch (error) {
        console.error('Error fetching device statistics:', error);
      }
    };

    fetchDeviceStats();
  }, []);

  // Fetch database statistics
  useEffect(() => {
    const fetchDatabaseStats = async () => {
      try {
        setDbStatsLoading(true);
        const stats = await fetchCustomerStats();
        setDbStats(stats);
      } catch (error) {
        console.error('Error fetching database statistics:', error);
      } finally {
        setDbStatsLoading(false);
      }
    };

    fetchDatabaseStats();
  }, []);

  // Calculate statistics from current page data and financial data
  const stats = useMemo(() => {
    // Ensure customers is an array to prevent undefined errors
    if (!customers || !Array.isArray(customers)) {
      return {
        totalCustomers: dbStats.totalCustomers,
        pageCustomers: 0,
        activeCustomers: dbStats.activeCustomers,
        vipCustomers: 0,
        totalRevenue: dbStats.totalRevenue,
        deviceRevenue: 0,
        posRevenue: 0,
        totalPoints: 0,
        platinumCustomers: 0,
        goldCustomers: 0,
        silverCustomers: 0,
        bronzeCustomers: 0,
        totalDevices: dbStats.totalDevices,
        devicesInRepair,
        todaysBirthdays: dbStats.todaysBirthdays
      };
    }
    
    const pageCustomers = customers.length;
    
    // For now, set device and POS revenue to 0 - this should be fetched separately
    const deviceRevenue = 0;
    const posRevenue = 0;
    
    const totalPoints = customers.reduce((sum, c) => sum + (c.points || 0), 0);
    const vipCustomers = customers.filter(c => c.loyaltyLevel === 'vip').length;
    const premiumCustomers = customers.filter(c => c.loyaltyLevel === 'premium').length;
    const regularCustomers = customers.filter(c => c.loyaltyLevel === 'regular').length;
    const activeCustomers = customers.filter(c => c.loyaltyLevel === 'active').length;
    const paymentCustomers = customers.filter(c => c.loyaltyLevel === 'payment_customer').length;
    const engagedCustomers = customers.filter(c => c.loyaltyLevel === 'engaged').length;
    const interestedCustomers = customers.filter(c => c.loyaltyLevel === 'interested').length;

    return {
      totalCustomers: dbStats.totalCustomers, // Use database stats
      pageCustomers, // Customers on current page
      activeCustomers: dbStats.activeCustomers, // Use database stats
      totalRevenue: dbStats.totalRevenue, // Use database stats
      deviceRevenue,
      posRevenue,
      totalPoints,
      vipCustomers,
      premiumCustomers,
      regularCustomers,
      paymentCustomers,
      engagedCustomers,
      interestedCustomers,
      totalDevices: dbStats.totalDevices, // Use database stats
      devicesInRepair,
      todaysBirthdays: dbStats.todaysBirthdays // Use database stats
    };
  }, [customers, dbStats, devicesInRepair]);

  // Calculate appointments statistics
  const appointmentStats = useMemo(() => {
    // Ensure appointments is an array to prevent undefined errors
    if (!appointments || !Array.isArray(appointments)) {
      return {
        totalAppointments: 0,
        confirmedAppointments: 0,
        pendingAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        todaysAppointments: 0,
        thisWeeksAppointments: 0
      };
    }
    
    const totalAppointments = appointments.length;
    const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').length;
    const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
    
    // Today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todaysAppointments = appointments.filter(a => a.appointment_date === today).length;
    
    // This week's appointments
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date();
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
    
    const thisWeeksAppointments = appointments.filter(a => {
      const appointmentDate = new Date(a.appointment_date);
      return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
    }).length;

          return {
        totalAppointments,
        confirmedAppointments,
        pendingAppointments,
        completedAppointments,
        cancelledAppointments,
        todaysAppointments,
        thisWeeksAppointments
      };
    }, [appointments]);

  // Calculate today's birthdays and upcoming birthdays
  const todaysBirthdays = useMemo(() => {
    // For now, return empty array since we're using database stats
    // The actual birthday customers list would need to be fetched separately if needed
    return [];
  }, []);

  // Calculate upcoming birthdays (next 7 days)
  const upcomingBirthdays = useMemo(() => {
    if (!customers || !Array.isArray(customers)) {
      return [];
    }
    
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    return customers.filter(customer => {
      if (!customer.birthMonth || !customer.birthDay) return false;
      
      let customerMonth: number;
      let customerDay: number;
      
      // Handle different month formats
      if (typeof customer.birthMonth === 'string') {
        if (customer.birthMonth.trim() === '') return false;
        
        // Check if it's a numeric month (1-12)
        const numericMonth = parseInt(customer.birthMonth);
        if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
          customerMonth = numericMonth;
        } else {
          // Convert month name to number
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          customerMonth = monthNames.indexOf(customer.birthMonth.toLowerCase()) + 1;
        }
      } else {
        return false;
      }
      
      // Handle different day formats
      if (typeof customer.birthDay === 'string') {
        if (customer.birthDay.trim() === '') return false;
        
        // Extract day from formats like "14 00:00:00" or "14"
        const dayMatch = customer.birthDay.match(/^(\d+)/);
        if (dayMatch) {
          customerDay = parseInt(dayMatch[1]);
        } else {
          customerDay = parseInt(customer.birthDay);
        }
      } else {
        customerDay = parseInt(customer.birthDay);
      }
      
      // Create birthday date for this year
      const birthdayThisYear = new Date(today.getFullYear(), customerMonth - 1, customerDay);
      
      // If birthday has passed this year, check next year
      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(today.getFullYear() + 1);
      }
      
      return birthdayThisYear >= today && birthdayThisYear <= nextWeek;
    }).sort((a, b) => {
      // Sort by upcoming birthday date
      let aMonth: number, bMonth: number, aDay: number, bDay: number;
      
      // Parse month and day for customer a
      if (typeof a.birthMonth === 'string' && a.birthMonth.trim() !== '') {
        const numericMonth = parseInt(a.birthMonth);
        if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
          aMonth = numericMonth;
        } else {
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          aMonth = monthNames.indexOf(a.birthMonth.toLowerCase()) + 1;
        }
      } else {
        aMonth = 1;
      }
      
      if (typeof a.birthDay === 'string' && a.birthDay.trim() !== '') {
        const dayMatch = a.birthDay.match(/^(\d+)/);
        aDay = dayMatch ? parseInt(dayMatch[1]) : parseInt(a.birthDay);
      } else {
        aDay = 1;
      }
      
      // Parse month and day for customer b
      if (typeof b.birthMonth === 'string' && b.birthMonth.trim() !== '') {
        const numericMonth = parseInt(b.birthMonth);
        if (!isNaN(numericMonth) && numericMonth >= 1 && numericMonth <= 12) {
          bMonth = numericMonth;
        } else {
          const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
          ];
          bMonth = monthNames.indexOf(b.birthMonth.toLowerCase()) + 1;
        }
      } else {
        bMonth = 1;
      }
      
      if (typeof b.birthDay === 'string' && b.birthDay.trim() !== '') {
        const dayMatch = b.birthDay.match(/^(\d+)/);
        bDay = dayMatch ? parseInt(dayMatch[1]) : parseInt(b.birthDay);
      } else {
        bDay = 1;
      }
      
      const aDate = new Date(today.getFullYear(), aMonth - 1, aDay);
      const bDate = new Date(today.getFullYear(), bMonth - 1, bDay);
      
      if (aDate < today) aDate.setFullYear(today.getFullYear() + 1);
      if (bDate < today) bDate.setFullYear(today.getFullYear() + 1);
      
      return aDate.getTime() - bDate.getTime();
    });
  }, [customers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery, loyaltyFilterMulti, statusFilterMulti, tagFilterMulti, referralFilterMulti, birthdayFilter, showInactive, sortBy]);

  // Handle customerId parameter from URL
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (customerId && customers.length > 0) {
      const customer = customers.find(c => c.id === customerId);
      if (customer) {
        setSelectedCustomer(customer);
        setShowCustomerDetailModal(true);
        markCustomerAsRead(customerId);
        // Clean up the URL parameter
        navigate('/customers', { replace: true });
      }
    }
  }, [searchParams, customers, markCustomerAsRead, navigate]);

  // Clean filter implementation - now works with server-side search
  const filteredCustomers = useMemo(() => {
    // Ensure customers is an array to prevent undefined errors
    if (!customers || !Array.isArray(customers)) {
      return [];
    }
    
    let filtered = customers;

    // Note: Search is now handled server-side when searchQuery is provided
    // This client-side filtering is only for additional filters

    // Loyalty filter
    if (loyaltyFilterMulti.length > 0) {
      filtered = filtered.filter(customer => 
        customer.loyaltyLevel && loyaltyFilterMulti.includes(customer.loyaltyLevel)
      );
    }

    // Status filter
    if (statusFilterMulti.length > 0) {
      filtered = filtered.filter(customer => {
        const status = customer.isActive ? 'active' : 'inactive';
        return statusFilterMulti.includes(status);
      });
    }

    // Tag filter
    if (tagFilterMulti.length > 0) {
      filtered = filtered.filter(customer => 
        customer.colorTag && tagFilterMulti.includes(customer.colorTag)
      );
    }

    // Referral source filter
    if (referralFilterMulti.length > 0) {
      filtered = filtered.filter(customer => 
        customer.referralSource && referralFilterMulti.includes(customer.referralSource)
      );
    }

    // Birthday filter
    if (birthdayFilter) {
      filtered = filtered.filter(customer => 
        customer.birthMonth || customer.birthDay
      );
    }

    // WhatsApp filter
    if (whatsappFilter) {
      filtered = filtered.filter(customer => 
        customer.hasWhatsApp || customer.whatsapp || customer.phone
      );
    }

    // Gender filter
    if (genderFilter.length > 0) {
      filtered = filtered.filter(customer => 
        customer.gender && genderFilter.includes(customer.gender)
      );
    }

    // Spending range filter
    if (minSpent && minSpent.trim() !== '') {
      const minAmount = parseFloat(minSpent);
      if (!isNaN(minAmount) && minAmount >= 0) {
        filtered = filtered.filter(customer => 
          (customer.totalSpent || 0) >= minAmount
        );
      }
    }
    if (maxSpent && maxSpent.trim() !== '') {
      const maxAmount = parseFloat(maxSpent);
      if (!isNaN(maxAmount) && maxAmount >= 0) {
        filtered = filtered.filter(customer => 
          (customer.totalSpent || 0) <= maxAmount
        );
      }
    }

    // Points range filter
    if (minPoints && minPoints.trim() !== '') {
      const minPts = parseInt(minPoints);
      if (!isNaN(minPts) && minPts >= 0) {
        filtered = filtered.filter(customer => 
          (customer.points || 0) >= minPts
        );
      }
    }
    if (maxPoints && maxPoints.trim() !== '') {
      const maxPts = parseInt(maxPoints);
      if (!isNaN(maxPts) && maxPts >= 0) {
        filtered = filtered.filter(customer => 
          (customer.points || 0) <= maxPts
        );
      }
    }

    // City filter
    if (cityFilter.length > 0) {
      filtered = filtered.filter(customer => 
        customer.city && cityFilter.includes(customer.city)
      );
    }

    // Purchase count range filter
    if (minPurchases && minPurchases.trim() !== '') {
      const minPurch = parseInt(minPurchases);
      if (!isNaN(minPurch) && minPurch >= 0) {
        filtered = filtered.filter(customer => 
          (customer.totalPurchases || 0) >= minPurch
        );
      }
    }
    if (maxPurchases && maxPurchases.trim() !== '') {
      const maxPurch = parseInt(maxPurchases);
      if (!isNaN(maxPurch) && maxPurch >= 0) {
        filtered = filtered.filter(customer => 
          (customer.totalPurchases || 0) <= maxPurch
        );
      }
    }

    // Join date range filter
    if (joinDateFrom && joinDateFrom.trim() !== '') {
      const fromDate = new Date(joinDateFrom);
      if (!isNaN(fromDate.getTime())) {
        filtered = filtered.filter(customer => {
          if (!customer.joinedDate) return false;
          const joinDate = new Date(customer.joinedDate);
          return !isNaN(joinDate.getTime()) && joinDate >= fromDate;
        });
      }
    }
    if (joinDateTo && joinDateTo.trim() !== '') {
      const toDate = new Date(joinDateTo);
      if (!isNaN(toDate.getTime())) {
        filtered = filtered.filter(customer => {
          if (!customer.joinedDate) return false;
          const joinDate = new Date(customer.joinedDate);
          return !isNaN(joinDate.getTime()) && joinDate <= toDate;
        });
      }
    }

    // Last visit date range filter
    if (lastVisitFrom && lastVisitFrom.trim() !== '') {
      const fromDate = new Date(lastVisitFrom);
      if (!isNaN(fromDate.getTime())) {
        filtered = filtered.filter(customer => {
          if (!customer.lastVisit) return false;
          const lastVisitDate = new Date(customer.lastVisit);
          return !isNaN(lastVisitDate.getTime()) && lastVisitDate >= fromDate;
        });
      }
    }
    if (lastVisitTo && lastVisitTo.trim() !== '') {
      const toDate = new Date(lastVisitTo);
      if (!isNaN(toDate.getTime())) {
        filtered = filtered.filter(customer => {
          if (!customer.lastVisit) return false;
          const lastVisitDate = new Date(customer.lastVisit);
          return !isNaN(lastVisitDate.getTime()) && lastVisitDate <= toDate;
        });
      }
    }

    // Inactive filter
    if (showInactive) {
      filtered = filtered.filter(customer => {
        if (!customer.lastVisit) return false;
        const lastVisitDate = new Date(customer.lastVisit);
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        return lastVisitDate < ninetyDaysAgo;
      });
    }

    // Sort customers
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        case 'recent':
          return new Date(b.joinedDate || 0).getTime() - new Date(a.joinedDate || 0).getTime();
        case 'spent':
          const spentA = a.totalSpent ?? (a.payments ? a.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0);
          const spentB = b.totalSpent ?? (b.payments ? b.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0);
          return spentB - spentA;
        case 'points':
          return (b.points || 0) - (a.points || 0);
        default:
          return 0;
      }
    });
  }, [
    customers, 
    debouncedSearchQuery, 
    loyaltyFilterMulti, 
    statusFilterMulti, 
    tagFilterMulti, 
    referralFilterMulti, 
    birthdayFilter, 
    genderFilter,
    minSpent,
    maxSpent,
    minPoints,
    maxPoints,
    cityFilter,
    minPurchases,
    maxPurchases,
    joinDateFrom,
    joinDateTo,
    lastVisitFrom,
    lastVisitTo,
    showInactive, 
    sortBy
  ]);

  const getColorTagStyle = (tag: Customer['colorTag']) => {
    switch (tag) {
      case 'vip':
        return 'bg-emerald-500/20 text-emerald-700 border-emerald-300/30';
      case 'complainer':
        return 'bg-rose-500/20 text-rose-700 border-rose-300/30';
      case 'purchased':
        return 'bg-blue-500/20 text-blue-700 border-blue-300/30';
      case 'new':
        return 'bg-purple-500/20 text-purple-700 border-purple-300/30';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-300/30';
    }
  };

  const getLoyaltyStyle = (level: LoyaltyLevel) => {
    switch (level) {
      case 'vip':
        return 'bg-purple-500/20 text-purple-700 border-purple-300/30';
      case 'premium':
        return 'bg-amber-500/20 text-amber-700 border-amber-300/30';
      case 'regular':
        return 'bg-blue-500/20 text-blue-700 border-blue-300/30';
      case 'active':
        return 'bg-green-500/20 text-green-700 border-green-300/30';
      case 'payment_customer':
        return 'bg-teal-500/20 text-teal-700 border-teal-300/30';
      case 'engaged':
        return 'bg-indigo-500/20 text-indigo-700 border-indigo-300/30';
      case 'interested':
        return 'bg-gray-400/20 text-gray-700 border-gray-300/30';
      default:
        return 'bg-orange-500/20 text-orange-700 border-orange-300/30';
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCustomers.length === 0) {
      toast.error('Please select customers first');
      return;
    }
    
    switch (action) {
      case 'export':
        handleBulkExport();
        break;
      case 'message':
        handleBulkMessage();
        break;
      case 'delete':
        await handleBulkDelete();
        break;
    }
  };

  // Handle bulk export to CSV - Enhanced
  const handleBulkExport = () => {
    try {
      // If customers are selected, export only those; otherwise export all filtered customers
      const customersToExport = selectedCustomers.length > 0 
        ? customers.filter(c => selectedCustomers.includes(c.id))
        : filteredCustomers;
      
      if (customersToExport.length === 0) {
        toast.error('No customers to export');
        return;
      }
      
      // CSV Headers - Enhanced
      const headers = [
        'Name', 'Phone', 'Email', 'Gender', 'City', 'WhatsApp',
        'Loyalty Level', 'Points', 'Total Spent', 'Orders',
        'Color Tag', 'Status', 'Branch', 'Referral Source',
        'Birth Month', 'Birth Day', 'Join Date', 'Last Visit'
      ];
      
      // CSV Rows - Enhanced
      const rows = customersToExport.map(customer => [
        escapeCSVField(customer.name),
        escapeCSVField(customer.phone),
        escapeCSVField(customer.email || ''),
        escapeCSVField(customer.gender || ''),
        escapeCSVField(customer.city || ''),
        escapeCSVField(customer.whatsapp || ''),
        escapeCSVField(customer.loyaltyLevel || ''),
        escapeCSVField(customer.points?.toString() || '0'),
        escapeCSVField(getCustomerTotalSpent(customer.id).toString()),
        escapeCSVField(customer.orders?.toString() || '0'),
        escapeCSVField(customer.colorTag || ''),
        escapeCSVField(customer.isActive ? 'Active' : 'Inactive'),
        escapeCSVField(customer.branchName || ''),
        escapeCSVField(customer.referralSource || ''),
        escapeCSVField(customer.birthMonth || ''),
        escapeCSVField(customer.birthDay?.toString() || ''),
        escapeCSVField(customer.joinDate ? new Date(customer.joinDate).toLocaleDateString() : ''),
        escapeCSVField(customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : '')
      ]);
      
      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${customersToExport.length} customer${customersToExport.length !== 1 ? 's' : ''} to CSV`);
      if (selectedCustomers.length > 0) {
        setSelectedCustomers([]);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export customers');
    }
  };

  // Handle bulk message - open SMS modal with selected customers
  const handleBulkMessage = () => {
    const selectedCustomerData = customers.filter(c => selectedCustomers.includes(c.id));
    if (selectedCustomerData.length === 0) {
      toast.error('No customers selected');
      return;
    }
    setShowBulkSMS(true);
  };

  // Handle bulk delete with confirmation
  const handleBulkDelete = async () => {
    const confirmed = await confirm(
      `Are you sure you want to delete ${selectedCustomers.length} customer${selectedCustomers.length !== 1 ? 's' : ''}? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      // Delete from database
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('id', selectedCustomers);
      
      if (error) throw error;
      
      // Update local state
      setCustomers(prev => prev.filter(c => !selectedCustomers.includes(c.id)));
      
      toast.success(`Successfully deleted ${selectedCustomers.length} customer${selectedCustomers.length !== 1 ? 's' : ''}`);
      setSelectedCustomers([]);
      
      // Reload customers to refresh counts
      const result = await fetchCustomersPaginated(currentPage, 100);
      setCustomers(result.customers);
      
      // Fix totalCount if it's 0 but we have customers
      const actualTotalCount = result.totalCount || 0;
      const hasMoreCustomers = result.customers.length >= 100;
      
      setTotalCount(actualTotalCount > 0 ? actualTotalCount : result.customers.length);
      setTotalPages(result.totalPages > 0 ? result.totalPages : (hasMoreCustomers ? currentPage + 1 : currentPage));
      setHasNextPage(result.hasNextPage || (hasMoreCustomers && actualTotalCount === 0));
      setHasPreviousPage(result.hasPreviousPage);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete customers');
    }
  };

  const toggleCustomerSelection = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  // Add this handler for sending SMS
  const handleBulkSMSSend = async (recipients: Customer[], message: string) => {
    if (!currentUser) {
      toast.error('You must be logged in to send SMS');
      return;
    }

    setSendingSMS(true);
    try {
      const result = await smsService.sendBulkSMS({
        recipients: recipients.map(c => c.phone),
        message: message,
        created_by: currentUser.id
      });

      if (result.success) {
        toast.success(`SMS sent successfully to all ${result.sent} customers!`);
      } else if (result.sent > 0) {
        toast.success(`SMS sent to ${result.sent} customers, ${result.failed} failed.`);
      } else {
        toast.error(`Failed to send SMS to any customers. ${result.failed} errors.`);
      }

      // Log detailed results
              // Bulk SMS completed
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('BulkSMS Error:', errorMessage);
      toast.error(`Failed to send bulk SMS: ${errorMessage}`);
    } finally {
      setSendingSMS(false);
      setShowBulkSMS(false);
    }
  };


  // Handle appointment creation
  const handleCreateAppointment = async (data: CreateAppointmentData) => {
    try {
      await createAppointment(data);
      toast.success('Appointment created successfully!');
      
      // Refresh appointments list
      const updatedAppointments = await fetchAllAppointments();
      setAppointments(updatedAppointments);
      
      setShowAppointmentModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error creating appointment:', error);
      throw error; // Let the modal handle the error display
    }
  };

  // Handle appointment update
  const handleUpdateAppointment = async (data: UpdateAppointmentData) => {
    if (!selectedAppointment) return;
    
    try {
      await updateAppointment(selectedAppointment.id, data);
      toast.success('Appointment updated successfully!');
      
      // Refresh appointments list
      const updatedAppointments = await fetchAllAppointments();
      setAppointments(updatedAppointments);
      
      setShowAppointmentModal(false);
      setSelectedAppointment(null);
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error; // Let the modal handle the error display
    }
  };

  // Handle appointment save (create or update)
  const handleAppointmentSave = async (data: CreateAppointmentData | UpdateAppointmentData) => {
    if (appointmentModalMode === 'create') {
      await handleCreateAppointment(data as CreateAppointmentData);
    } else {
      await handleUpdateAppointment(data as UpdateAppointmentData);
    }
  };

  // Helper: get total spent for a customer from their payments
  const getCustomerTotalSpent = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.payments) return 0;
    return customer.payments.filter(p => p.status === 'completed').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  // Helper: get customer devices count and last activity
  const getCustomerDeviceInfo = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.devices) return { count: 0, lastActivity: 'No devices' };
    
    const deviceCount = customer.devices.length;
    let lastActivity = '';
    
    if (deviceCount > 0) {
      const lastDevice = customer.devices.reduce((latest, device) => {
        const deviceDate = new Date(device.updatedAt || device.createdAt);
        const latestDate = new Date(latest.updatedAt || latest.createdAt);
        return deviceDate > latestDate ? device : latest;
      }, customer.devices[0]);
      
      const lastDate = new Date(lastDevice.updatedAt || lastDevice.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) lastActivity = 'Today';
      else if (diffDays === 1) lastActivity = '1 day ago';
      else lastActivity = `${diffDays} days ago`;
    } else {
      lastActivity = 'No devices';
    }
    
    return { count: deviceCount, lastActivity };
  };

  // Helper: get purchase summary for a customer
  const getCustomerPurchaseSummary = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.payments) return { totalPurchases: 0, totalItems: 0, lastPurchase: null };
    
    // Only device payments now
    const devicePayments = customer.payments.filter(p => p.source === 'device_payment' && p.status === 'completed');
    const totalPurchases = devicePayments.length;
    const totalItems = totalPurchases; // Each payment represents one device
    
    let lastPurchase = null;
    if (devicePayments.length > 0) {
      const latestPayment = devicePayments.reduce((latest, payment) => {
        const paymentDate = new Date(payment.date);
        const latestDate = new Date(latest.date);
        return paymentDate > latestDate ? payment : latest;
      }, devicePayments[0]);
      lastPurchase = latestPayment;
    }
    
    return { totalPurchases, totalItems, lastPurchase };
  };

  // Appointments helper functions
  const getAppointmentStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAppointments = useMemo(() => {
    // Ensure appointments is an array to prevent undefined errors
    if (!appointments || !Array.isArray(appointments)) {
      return [];
    }
    
    let filtered = appointments;

    // Status filter
    if (appointmentFilters.status !== 'all') {
      filtered = filtered.filter(a => a.status === appointmentFilters.status);
    }

    // Date filter
    if (appointmentFilters.date !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      switch (appointmentFilters.date) {
        case 'today':
          filtered = filtered.filter(a => a.appointment_date === today);
          break;
        case 'tomorrow':
          filtered = filtered.filter(a => a.appointment_date === tomorrow);
          break;
        case 'this-week':
          const startOfWeek = new Date();
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          const endOfWeek = new Date();
          endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
          
          filtered = filtered.filter(a => {
            const appointmentDate = new Date(a.appointment_date);
            return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
          });
          break;
      }
    }

    // Customer filter
    if (appointmentFilters.customer !== 'all') {
      filtered = filtered.filter(a => a.customer_id === appointmentFilters.customer);
    }

    return filtered;
  }, [appointments, appointmentFilters]);

  if (error) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">Error loading customers: {error}</p>
            <GlassButton onClick={() => window.location.reload()}>
              Try Again
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton while loading initial data
  if (loading && customers.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Management</h1>
                  <p className="text-sm text-gray-600">Manage your customer relationships, track loyalty, and schedule appointments</p>
                </div>
              </div>
              <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto flex items-center justify-center py-12">
            <LoadingSpinner size="sm" color="blue" />
          </div>
        </div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="p-2 sm:p-4 md:p-6 max-w-none sm:max-w-7xl mx-auto">
      {isOffline && (
        <div className="scale-50 sm:scale-100 origin-top-left sm:origin-center mb-4 sm:mb-0" style={{ background: '#fbbf24', color: 'black', padding: '8px', textAlign: 'center', borderRadius: '0.5rem' }}>
          You are offline. Data is loaded from cache.
        </div>
      )}
      {/* Combined Container - All sections in one */}
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[190vh] sm:max-h-[95vh] scale-50 sm:scale-100 origin-top-left sm:origin-center">
        {/* Fixed Header Section - Enhanced Modal Style */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left: Icon + Text */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Customer Management</h1>
                <p className="text-sm text-gray-600">Manage your customer relationships, track loyalty, and schedule appointments</p>
              </div>
            </div>

            {/* Right: Back Button */}
            <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
          </div>
        </div>

        {/* Action Bar - Enhanced Design */}
        <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
          <div className="flex gap-3 flex-wrap">
            {activeTab === 'customers' ? (
              <>
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700 group relative"
                  title="Add new customer (Ctrl/Cmd + N)"
                >
                  <UserPlus size={18} />
                  <span>New Customer</span>
                  <span className="hidden group-hover:inline-block absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    Ctrl/Cmd + N
                  </span>
                </button>
                {['admin', 'customer-care'].includes(currentUser?.role || '') && (
                  <>
                    <button
                      onClick={() => setShowImportExportModal(true)}
                      className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700 group relative"
                      title="Import/Export customers (Ctrl/Cmd + I)"
                    >
                      <Upload size={18} />
                      <span>Import/Export</span>
                      <span className="hidden group-hover:inline-block absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                        Ctrl/Cmd + I
                      </span>
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAppointmentModalMode('create');
                    setSelectedAppointment(null);
                    setShowAppointmentModal(true);
                  }}
                  className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
                >
                  <UserPlus2 size={18} />
                  <span>New Appointment</span>
                </button>
                <button
                  onClick={() => navigate('/appointments')}
                  className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg hover:from-purple-600 hover:to-indigo-700"
                >
                  <CalendarDays size={18} />
                  <span>Calendar View</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Tab Navigation */}
          <div className="p-6 pb-0 flex-shrink-0">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl border-2 border-gray-200">
              <button
                onClick={() => setActiveTab('customers')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'customers'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Users size={18} />
                Customers ({stats.totalCustomers})
              </button>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  activeTab === 'appointments'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <CalendarDays size={18} />
                Appointments ({appointmentStats.totalAppointments})
              </button>
            </div>
          </div>

      {/* Conditional Content Based on Active Tab */}
      {activeTab === 'customers' ? (
        <React.Fragment>
              {/* Fixed Statistics Section */}
              <div className="p-6 pb-0 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Customer Statistics</h2>
                  <button
                    onClick={async () => {
                      try {
                        setDbStatsLoading(true);
                        const stats = await fetchCustomerStats();
                        setDbStats(stats);
                      } catch (error) {
                        console.error('Error refreshing statistics:', error);
                        toast.error('Failed to refresh statistics');
                      } finally {
                        setDbStatsLoading(false);
                      }
                    }}
                    disabled={dbStatsLoading}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-4 h-4 ${dbStatsLoading ? 'animate-spin' : ''}`} />
                    Refresh Stats
                  </button>
                </div>
                
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
                        {dbStatsLoading ? (
                          <LoadingSpinner size="sm" color="blue" />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <UserCheck className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Active Customers</p>
                        {dbStatsLoading ? (
                          <LoadingSpinner size="sm" color="green" />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{stats.activeCustomers}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <DollarSign className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Total Revenue</p>
                        {dbStatsLoading ? (
                          <LoadingSpinner size="sm" color="purple" />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 hover:bg-amber-100 hover:border-amber-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Activity className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Total Devices</p>
                        {dbStatsLoading ? (
                          <LoadingSpinner size="sm" color="orange" />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{stats.totalDevices}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div 
                    className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-5 hover:bg-pink-100 hover:border-pink-300 transition-all shadow-sm hover:shadow-md cursor-pointer"
                    onClick={() => setShowAllBirthdays(true)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Today's Birthdays</p>
                        {dbStatsLoading ? (
                          <LoadingSpinner size="sm" color="purple" />
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{stats.todaysBirthdays}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
        </React.Fragment>
      ) : (
        <React.Fragment>
              {/* Appointments Statistics Dashboard */}
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
                        <CalendarDays className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Total Appointments</p>
                        <p className="text-2xl font-bold text-gray-900">{appointmentStats.totalAppointments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <CheckCircle className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Confirmed</p>
                        <p className="text-2xl font-bold text-gray-900">{appointmentStats.confirmedAppointments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-5 hover:bg-yellow-100 hover:border-yellow-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Clock3 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{appointmentStats.pendingAppointments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-5 hover:bg-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Today's</p>
                        <p className="text-2xl font-bold text-gray-900">{appointmentStats.todaysAppointments}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-pink-50 border-2 border-pink-200 rounded-2xl p-5 hover:bg-pink-100 hover:border-pink-300 transition-all shadow-sm hover:shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-1">Birthdays</p>
                        <p className="text-2xl font-bold text-gray-900">{todaysBirthdays.length}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointments Filters */}
              <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={appointmentFilters.status}
                        onChange={(e) => setAppointmentFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                      >
                        <option value="all">All Status</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <select
                        value={appointmentFilters.date}
                        onChange={(e) => setAppointmentFilters(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                      >
                        <option value="all">All Dates</option>
                        <option value="today">Today</option>
                        <option value="tomorrow">Tomorrow</option>
                        <option value="this-week">This Week</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                      <select
                        value={appointmentFilters.customer}
                        onChange={(e) => setAppointmentFilters(prev => ({ ...prev, customer: e.target.value }))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-gray-900 bg-white font-medium"
                      >
                        <option value="all">All Customers</option>
                        {customers.slice(0, 10).map(customer => (
                          <option key={customer.id} value={customer.id}>{customer.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointments List */}
              <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200/50">
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Customer</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Service</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Date & Time</th>
                    <th className="text-left py-4 px-4 font-medium text-gray-700">Technician</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-700">Status</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-700">Priority</th>
                    <th className="text-center py-4 px-4 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(appointment => (
                    <tr key={appointment.id} className="border-b border-gray-200/30 hover:bg-blue-50 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{appointment.customer_name}</p>
                          <p className="text-sm text-gray-600">{appointment.customer_phone}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{appointment.service_type}</p>
                          <p className="text-sm text-gray-600">{appointment.notes}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {new Date(appointment.appointment_date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-gray-600">{appointment.appointment_time} ({appointment.duration_minutes} min)</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-900">{appointment.technician_name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getAppointmentStatusStyle(appointment.status)}`}>
                          {appointment.status === 'confirmed' && <CheckCircle size={12} className="mr-1" />}
                          {appointment.status === 'pending' && <Clock3 size={12} className="mr-1" />}
                          {appointment.status === 'completed' && <CheckCircle size={12} className="mr-1" />}
                          {appointment.status === 'cancelled' && <XCircle size={12} className="mr-1" />}
                          {appointment.status}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityStyle(appointment.priority)}`}>
                          {appointment.priority === 'high' && <AlertTriangle size={12} className="mr-1" />}
                          {appointment.priority}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              setAppointmentModalMode('edit');
                              setSelectedAppointment(appointment);
                              setShowAppointmentModal(true);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600 transition-colors"
                            title="Edit Appointment"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const appointmentCustomer = customers.find(c => c.id === appointment.customer_id);
                              if (appointmentCustomer) {
                                setSelectedCustomer(appointmentCustomer);
                                setShowCustomerDetailModal(true);
                                markCustomerAsRead(appointmentCustomer.id);
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-green-600 transition-colors"
                            title="View Customer Details"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => {
                              if (appointment.customer_phone) {
                                window.open(`tel:${appointment.customer_phone}`);
                              } else {
                                toast.error('No phone number available');
                              }
                            }}
                            className="p-1 text-gray-500 hover:text-purple-600 transition-colors"
                            title="Call Customer"
                          >
                            <Phone size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredAppointments.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <CalendarDays className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No appointments found</h3>
                      <p className="text-gray-600 mb-6">Try adjusting your filters or create a new appointment</p>
                      <button
                        onClick={() => {
                          setAppointmentModalMode('create');
                          setSelectedAppointment(null);
                          setShowAppointmentModal(true);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                      >
                        <UserPlus2 className="w-4 h-4" />
                        <span>Create Appointment</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
        </React.Fragment>
      )}

      {/* Customer-specific content - only show when customers tab is active */}
      {activeTab === 'customers' && (
        <React.Fragment>
          {/* Daily Birthday Card - DISABLED */}
          {/* {todaysBirthdays.length > 0 && (
            <div className="relative overflow-hidden">
              ... birthday widget content removed ...
            </div>
          )} */}

              {/* Revenue Breakdown */}
              {(stats.deviceRevenue > 0 || stats.posRevenue > 0) && (
                <div className="p-6 pb-0 flex-shrink-0">
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Revenue Breakdown</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <Activity className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1">Device Repairs</p>
                              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.deviceRevenue)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 hover:bg-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                              <ShoppingBag className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-600 mb-1">POS Sales</p>
                              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.posRevenue)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Statistics */}
              <div className="p-6 pb-0 flex-shrink-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5 text-purple-600" />
                      Loyalty Distribution
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-xl border border-purple-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-900">Platinum</span>
                        </div>
                        <span className="text-sm font-bold text-purple-600">{stats.platinumCustomers} customers</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-900">Gold</span>
                        </div>
                        <span className="text-sm font-bold text-amber-600">{stats.goldCustomers} customers</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-400 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-900">Silver</span>
                        </div>
                        <span className="text-sm font-bold text-gray-600">{stats.silverCustomers} customers</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-200">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                          <span className="text-sm font-semibold text-gray-900">Bronze</span>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{stats.bronzeCustomers} customers</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-blue-600" />
                      Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          if (selectedCustomers.length > 0) {
                            setShowBulkSMS(true);
                          } else {
                            toast.error('Please select customers first');
                          }
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm hover:shadow-md font-semibold text-sm border-2 border-blue-200"
                      >
                        <MessageCircle size={16} />
                        Send SMS
                        {selectedCustomers.length > 0 && (
                          <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                            {selectedCustomers.length}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => handleBulkExport()}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-all shadow-sm hover:shadow-md font-semibold text-sm border-2 border-green-200"
                      >
                        <Download size={16} />
                        Export CSV
                      </button>
                      <button
                        onClick={() => navigate('/customer-analytics')}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all shadow-sm hover:shadow-md font-semibold text-sm border-2 border-purple-200"
                      >
                        <BarChart3 size={16} />
                        Analytics
                      </button>
                      <button
                        onClick={() => {
                          setActiveTab('appointments');
                          setAppointmentModalMode('create');
                          setSelectedAppointment(null);
                          setShowAppointmentModal(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition-all shadow-sm hover:shadow-md font-semibold text-sm border-2 border-orange-200"
                      >
                        <CalendarDays size={16} />
                        New Appointment
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fixed Search and Filters Section - Enhanced */}
              <div className="p-6 pb-0 flex-shrink-0 border-t border-gray-100 bg-white">
                <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 shadow-sm">
                  <CustomerFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    loyaltyFilter={loyaltyFilterMulti}
                    onLoyaltyFilterChange={setLoyaltyFilterMulti}
                    statusFilter={statusFilterMulti}
                    onStatusFilterChange={setStatusFilterMulti}
                    tagFilter={tagFilterMulti}
                    onTagFilterChange={setTagFilterMulti}
                    referralFilter={referralFilterMulti}
                    onReferralFilterChange={setReferralFilterMulti}
                    birthdayFilter={birthdayFilter}
                    onBirthdayFilterChange={setBirthdayFilter}
                    whatsappFilter={whatsappFilter}
                    onWhatsappFilterChange={setWhatsappFilter}
                    showInactive={showInactive}
                    onShowInactiveChange={setShowInactive}
                    sortBy={sortBy}
                    onSortByChange={setSortBy}
                    customers={customers}
                    searchLoading={searchLoading}
                    filteredCount={filteredCustomers.length}
                    // New filters
                    genderFilter={genderFilter}
                    onGenderFilterChange={setGenderFilter}
                    minSpent={minSpent}
                    onMinSpentChange={setMinSpent}
                    maxSpent={maxSpent}
                    onMaxSpentChange={setMaxSpent}
                    minPoints={minPoints}
                    onMinPointsChange={setMinPoints}
                    maxPoints={maxPoints}
                    onMaxPointsChange={setMaxPoints}
                    cityFilter={cityFilter}
                    onCityFilterChange={setCityFilter}
                    minPurchases={minPurchases}
                    onMinPurchasesChange={setMinPurchases}
                    maxPurchases={maxPurchases}
                    onMaxPurchasesChange={setMaxPurchases}
                    // Date range filters
                    joinDateFrom={joinDateFrom}
                    onJoinDateFromChange={setJoinDateFrom}
                    joinDateTo={joinDateTo}
                    onJoinDateToChange={setJoinDateTo}
                    lastVisitFrom={lastVisitFrom}
                    onLastVisitFromChange={setLastVisitFrom}
                    lastVisitTo={lastVisitTo}
                    onLastVisitToChange={setLastVisitTo}
                  />
                </div>
              </div>

              {/* Beautiful Search Progress Bar */}
              {isBackgroundSearching && (
                <div className="p-6 pb-0">
                  <BackgroundSearchIndicator
                    isSearching={isBackgroundSearching}
                    searchStatus={searchStatus}
                    searchProgress={searchProgress}
                    resultCount={totalCount}
                    onCancel={() => {
                      if (currentSearchJobId) {
                        const searchManager = getBackgroundSearchManager();
                        searchManager.cancelSearchJob(currentSearchJobId);
                        setIsBackgroundSearching(false);
                        setCurrentSearchJobId(null);
                      }
                    }}
                  />
                </div>
              )}

              {/* Bulk Actions */}
              {selectedCustomers.length > 0 && (
                <div className="p-6 pb-0">
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <span className="text-sm font-semibold text-blue-900">
                          {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBulkAction('message')}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                        >
                          <MessageCircle size={16} />
                          Send Message
                        </button>
                        <button
                          onClick={() => handleBulkAction('export')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
                        >
                          <Download size={16} />
                          Export
                        </button>
                        <button
                          onClick={() => setSelectedCustomers([])}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
                        >
                          <XCircle size={16} />
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

          {/* Scrollable Customers List */}
          <div className="flex-1 overflow-y-auto px-6 py-6 border-t border-gray-100">
            {/* Customers Display */}
            {viewMode === 'list' ? (
              <div className="space-y-3">
                {pageLoading && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="sm" color="blue" />
                  </div>
                )}
                {filteredCustomers.map(customer => {
                  const deviceInfo = getCustomerDeviceInfo(customer.id);
                  const isExpanded = expandedCustomerId === customer.id;
                  
                  return (
                    <div
                      key={customer.id}
                      className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg ${
                        isExpanded ? 'border-purple-500 shadow-xl' : 'border-gray-200 hover:border-blue-400'
                      }`}
                    >
                      {/* Desktop Card View */}
                      <div className="hidden md:block w-full">
                        <div 
                          className="flex items-start justify-between p-6 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedCustomerId(isExpanded ? null : customer.id);
                          }}
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(customer.id)}
                              onChange={e => { e.stopPropagation(); toggleCustomerSelection(customer.id); }}
                              className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onClick={e => e.stopPropagation()}
                            />
                            
                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              {/* Customer Name and Tier Row */}
                              <div className="flex items-center gap-3 mb-4 flex-wrap">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                                  {customer.name.charAt(0)}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 truncate">{customer.name}</h3>
                                
                                {/* Loyalty Badge */}
                                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-base font-bold ${getLoyaltyStyle(customer.loyaltyLevel)} flex items-center gap-2 flex-shrink-0`}>
                                  <Star className="w-5 h-5" />
                                  <span className="capitalize">{customer.loyaltyLevel}</span>
                                </span>
                              </div>
                              
                              {/* Info Badges Row */}
                              <div className="flex items-center gap-3 flex-wrap">
                                {/* Contact Badge */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0">
                                  <Phone className="w-5 h-5" />
                                  <span className="text-base font-semibold">{customer.phone}</span>
                                </div>

                                {/* Total Spent */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 text-green-700 border border-green-200">
                                  <DollarSign className="w-5 h-5" />
                                  <span className="text-base font-semibold">{formatCurrency(getCustomerTotalSpent(customer.id))}</span>
                                </div>

                                {/* Devices & Points Combined Card */}
                                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-50 border border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-teal-600" />
                                    <span className="text-base font-semibold text-teal-700">{deviceInfo.count}</span>
                                    <span className="text-sm text-teal-600 font-medium">devices</span>
                                  </div>
                                  <div className="w-px h-5 bg-gray-300"></div>
                                  <div className="flex items-center gap-2">
                                    <Award className="w-5 h-5 text-pink-600" />
                                    <span className="text-base font-semibold text-pink-700">{customer.points}</span>
                                    <span className="text-sm text-pink-600 font-medium">points</span>
                                  </div>
                                </div>

                                {/* Branch Badge */}
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                                  <Building className="w-5 h-5" />
                                  <span className="text-sm font-medium">{customer.branchName}</span>
                                </div>

                                {/* Status Badge */}
                                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                                  customer.isActive 
                                    ? 'bg-green-50 text-green-700 border border-green-200' 
                                    : 'bg-gray-50 text-gray-700 border border-gray-200'
                                }`}>
                                  <CheckCircle className="w-5 h-5" />
                                  <span className="text-sm font-medium capitalize">{customer.colorTag}</span>
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
                          
                          {/* Expand/Collapse Icon */}
                          <div className="ml-4 flex-shrink-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                              isExpanded ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
                            }`}>
                              <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>
                        </div>
                        
                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-gray-200 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Customer Information</h4>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{customer.phone}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      Joined: {customer.joinedDate ? new Date(customer.joinedDate).toLocaleDateString() : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">
                                      Last Purchase: {customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString() : 'Never'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-4">
                                <h4 className="font-semibold text-gray-900">Statistics</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <p className="text-xs text-gray-600 mb-1">Total Orders</p>
                                    <p className="text-lg font-bold text-gray-900">{customer.orders || 0}</p>
                                  </div>
                                  <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <p className="text-xs text-gray-600 mb-1">Total Spent</p>
                                    <p className="text-lg font-bold text-gray-900">{formatCurrency(getCustomerTotalSpent(customer.id))}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons - Styled like Products */}
                            <div className="flex flex-wrap items-center gap-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle adjust points
                                  const points = prompt('Enter points to add (positive) or subtract (negative):');
                                  if (points !== null) {
                                    const pointsNum = parseInt(points);
                                    if (!isNaN(pointsNum)) {
                                      // Add your points adjustment logic here
                                      toast.success(`Points adjustment: ${pointsNum > 0 ? '+' : ''}${pointsNum}`);
                                    }
                                  }
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                                title="Adjust Points"
                              >
                                <Zap className="w-4 h-4" />
                                <span>Adjust Points</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCustomer(customer);
                                  setShowBulkSMS(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
                                title="Send SMS"
                              >
                                <Phone className="w-4 h-4" />
                                <span>SMS</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/customer-analytics?customer=${customer.id}`);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm shadow-sm"
                                title="View Analytics"
                              >
                                <BarChart2 className="w-4 h-4" />
                                <span>Analytics</span>
                              </button>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle redeem points
                                  toast.info('Redeem functionality coming soon');
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium text-sm shadow-sm"
                                title="Redeem Points"
                              >
                                <Gift className="w-4 h-4" />
                                <span>Redeem</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Mobile Card View */}
                      <div className="md:hidden p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={selectedCustomers.includes(customer.id)}
                                onChange={e => { e.stopPropagation(); toggleCustomerSelection(customer.id); }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-md">
                                {customer.name.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-bold text-gray-900 text-sm">{customer.name}</h3>
                                <p className="text-xs text-gray-500">{customer.phone}</p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm ${getLoyaltyStyle(customer.loyaltyLevel)}`}>
                              <Star size={12} />
                              <span className="capitalize">{customer.loyaltyLevel}</span>
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs text-gray-600">Total Spent</p>
                              <p className="text-lg font-bold text-gray-900">{formatCurrency(getCustomerTotalSpent(customer.id))}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-600">Points</p>
                              <p className="text-lg font-bold text-gray-900">{customer.points}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCustomer(customer);
                                setShowCustomerDetailModal(true);
                                markCustomerAsRead(customer.id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/sms-control?customer=${customer.id}`);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 bg-green-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>Message</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Grid View */
              <div>
                {pageLoading && (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner size="sm" color="blue" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCustomers.map(customer => {
                    const deviceInfo = getCustomerDeviceInfo(customer.id);
                    return (
                      <div
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerDetailModal(true);
                          markCustomerAsRead(customer.id);
                        }}
                        className="border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 hover:shadow-lg cursor-pointer border-gray-200 hover:border-blue-400"
                      >
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                              {customer.name.charAt(0)}
                            </div>
                            <div className={`
                              px-3 py-1.5 rounded-xl text-xs font-semibold border-2
                              ${getColorTagStyle(customer.colorTag)}
                            `}>
                              {customer.colorTag}
                            </div>
                          </div>
                          
                          <h3 className="font-bold text-gray-900 text-lg mb-1">{customer.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{customer.city}</p>
                          
                          <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-600 font-semibold">{customer.phone}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700 font-medium">{customer.branchName}</span>
                            </div>
                            
                            {customer.referralSource && (
                              <div className="flex items-center gap-2 text-xs text-purple-600">
                                <Tag className="w-3 h-3" />
                                <span>From: {customer.referralSource}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                              <p className="text-xs text-gray-600 mb-1">Devices</p>
                              <p className="text-sm font-bold text-gray-900">{deviceInfo.count}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded-lg border border-green-200">
                              <p className="text-xs text-gray-600 mb-1">Spent</p>
                              <p className="text-sm font-bold text-gray-900">{formatCurrency(getCustomerTotalSpent(customer.id))}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className={`
                              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2
                              ${getLoyaltyStyle(customer.loyaltyLevel)}
                            `}>
                              <Star size={14} />
                              <span className="capitalize">{customer.loyaltyLevel}</span>
                            </div>
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl px-3 py-1.5 shadow-md">
                              <p className="text-xs font-medium text-blue-100 mb-0.5">Points</p>
                              <p className="text-base font-bold text-white">{customer.points}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                            <button
                              onClick={e => { 
                                e.stopPropagation(); 
                                setSelectedCustomer(customer);
                                setShowCustomerDetailModal(true);
                                markCustomerAsRead(customer.id);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-blue-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                              <span>View</span>
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); navigate(`/sms-control?customer=${customer.id}`); }}
                              className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 bg-green-600 text-white rounded-xl transition-all shadow-md hover:shadow-lg text-xs font-semibold"
                              title="Send Message"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>Message</span>
                            </button>
                          </div>
                        </div>
                      </div>
            );
          })}
                </div>
              </div>
            )}

          {/* Infinite Scroll Loading Indicator */}
          {filteredCustomers.length > 0 && (
            <div className="mt-6 text-center space-y-4">
              {/* Progress Counter */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">
                    Showing {filteredCustomers.length.toLocaleString()} of {totalCount.toLocaleString()}
                  </span>
                </div>
                {(hasNextPage || filteredCustomers.length < totalCount) && (
                  <span className="text-xs text-gray-500">
                    • Scroll for more
                  </span>
                )}
              </div>
              
              {/* Load More Button - Show when there are more customers to load */}
              {!isLoadingMore && (hasNextPage || filteredCustomers.length < totalCount) && filteredCustomers.length > 0 && (
                <div className="flex flex-col items-center gap-3 py-6 bg-gradient-to-b from-transparent via-blue-50/30 to-transparent">
                  {/* Prominent Load More button */}
                  <button
                    onClick={() => {
                      if (!isLoadingMore) {
                        setIsLoadingMore(true);
                        setCurrentPage(prev => prev + 1);
                      }
                    }}
                    className="group relative px-10 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-lg font-bold shadow-2xl hover:shadow-blue-500/50 transform hover:scale-110 flex items-center gap-3 border-2 border-blue-400/50"
                  >
                    <span>Load More Customers</span>
                    <svg 
                      className="w-6 h-6 group-hover:translate-y-1 transition-transform duration-300" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="text-sm font-medium text-gray-600">
                    Click to load {Math.min(100, totalCount - filteredCustomers.length)} more customers
                  </div>
                </div>
              )}

              {/* Loading State */}
              {isLoadingMore && (
                <div className="flex flex-col items-center justify-center gap-3 py-6">
                  <div className="relative">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    <div className="absolute inset-0 bg-blue-400 blur-lg opacity-30 animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Loading more customers...</p>
                    <p className="text-xs text-gray-500 mt-1">Please wait</p>
                  </div>
                </div>
              )}

              {/* All Loaded State */}
              {!isLoadingMore && !hasNextPage && filteredCustomers.length > 0 && (
                <div className="flex flex-col items-center gap-2 py-6">
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-full border border-green-200">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">
                      All {totalCount.toLocaleString()} customers loaded
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">You've reached the end of the list</p>
                </div>
              )}

              {/* Loader element for intersection observer - Hidden but needed for auto-scroll */}
              <div ref={loaderRef} className="h-1"></div>
            </div>
          )}

          {/* Empty State */}
          {filteredCustomers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No customers found</h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || loyaltyFilterMulti.length > 0 || statusFilterMulti.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first customer'
                }
              </p>
              {!searchQuery && loyaltyFilterMulti.length === 0 && statusFilterMulti.length === 0 && (
                <button
                  onClick={() => setShowAddCustomerModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add Your First Customer</span>
                </button>
              )}
            </div>
          )}
          </div>
        </React.Fragment>
      )}
        </div>
      </div>

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerCreated={(customer) => {
          // Add the new customer to the top of the list immediately
          setCustomers(prevCustomers => [customer, ...prevCustomers]);
          setTotalCount(prev => prev + 1);
          
          setShowAddCustomerModal(false);
          markCustomerAsRead(customer.id);
          
          // Show success modal with actions
          successModal.show(`Customer "${customer.name}" has been added successfully!`, {
            title: 'Customer Added',
            actionButtons: [
              {
                label: 'View Details',
                onClick: () => {
                  setSelectedCustomer(customer);
                  setShowCustomerDetailModal(true);
                },
                variant: 'primary'
              },
              {
                label: 'Add Another',
                onClick: () => setShowAddCustomerModal(true),
                variant: 'secondary'
              }
            ]
          });
        }}
      />

      {/* Modals - Shared between tabs */}
      <BulkSMSModal
        open={showBulkSMS}
        onClose={() => setShowBulkSMS(false)}
        customers={customers}
        onSend={handleBulkSMSSend}
        sending={sendingSMS}
      />


      <AppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => {
          setShowAppointmentModal(false);
          setSelectedAppointment(null);
        }}
        customer={appointmentModalMode === 'create' ? (selectedCustomer || undefined) : undefined}
        appointment={appointmentModalMode === 'edit' ? (selectedAppointment || undefined) : undefined}
        onSave={handleAppointmentSave}
        mode={appointmentModalMode}
      />

      <CustomerImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onImportComplete={(importedCustomers) => {
          setCustomers(prev => [...prev, ...importedCustomers]);
        }}
        onUpdateComplete={(updatedCustomers) => {
          setCustomers(prev => 
            prev.map(customer => {
              const updatedCustomer = updatedCustomers.find(uc => uc.id === customer.id);
              return updatedCustomer || customer;
            })
          );
        }}
      />

      {/* Birthday Components */}
      {showBirthdayNotification && todaysBirthdays.length > 0 && (
        <BirthdayNotification
          todaysBirthdays={todaysBirthdays}
          onClose={() => setShowBirthdayNotification(false)}
          onViewCustomers={() => setShowBirthdayCalendar(true)}
        />
      )}

      {showBirthdayMessageSender && (
        <BirthdayMessageSender
          todaysBirthdays={todaysBirthdays}
          onClose={() => setShowBirthdayMessageSender(false)}
        />
      )}

      {showBirthdayCalendar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Birthday Calendar</h2>
                  <button
                    onClick={() => setShowBirthdayCalendar(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <BirthdayCalendar
                  customers={customers}
                  onCustomerClick={(customer) => {
                    setSelectedCustomer(customer);
                    setShowCustomerDetailModal(true);
                    markCustomerAsRead(customer.id);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {showBirthdayRewards && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Birthday Rewards</h2>
                  <button
                    onClick={() => setShowBirthdayRewards(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <BirthdayRewards
                  todaysBirthdays={todaysBirthdays}
                  onApplyReward={(customerId, rewardType) => {
                    toast.success('Birthday reward applied successfully!');
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Birthday Customers Modal */}
      {showAllBirthdays && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
              <div className="p-6 bg-gradient-to-r from-pink-50 to-rose-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Gift size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">All Birthday Customers</h2>
                      <p className="text-sm text-gray-600">{todaysBirthdays.length} customers celebrating today</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAllBirthdays(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              <div className="p-6">
              
              {/* All Birthday Customers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {todaysBirthdays.map((customer) => (
                  <div key={customer.id} className="group relative">
                    <div className="relative bg-gradient-to-br from-white to-gray-50/50 rounded-xl p-4 border border-gray-100/60 shadow-sm hover:shadow-md transition-all duration-500 hover:scale-105 hover:-translate-y-1 overflow-hidden">
                      {/* Subtle Background Pattern */}
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-50/20 via-transparent to-fuchsia-50/20"></div>
                      
                      {/* Customer Info */}
                      <div className="relative z-10 flex items-center gap-3 mb-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                            <span className="text-lg font-bold text-white relative z-10">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-sm animate-bounce">
                            <span className="text-xs">🎂</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate text-base">
                            {customer.name}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {customer.birthMonth} {customer.birthDay}
                          </p>
                          {customer.phone && (
                            <p className="text-xs text-blue-500 font-medium mt-1">
                              📞 {customer.phone}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="relative z-10 flex items-center gap-2">
                        {customer.phone && (
                          <button 
                            onClick={() => window.open(`tel:${customer.phone}`)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-rose-500 to-fuchsia-600 text-white text-sm font-semibold rounded-lg hover:from-rose-600 hover:to-fuchsia-700 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                            title="Call customer"
                          >
                            <Phone size={14} />
                            Call
                          </button>
                        )}
                        <button 
                          onClick={() => { setSelectedCustomer(customer); setShowCustomerDetailModal(true); markCustomerAsRead(customer.id); }}
                          className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-600 hover:text-gray-800 rounded-lg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                          title="View customer details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                      
                      {/* Birthday Actions */}
                      <div className="relative z-10 flex gap-2 mt-3">
                        <button
                          onClick={() => setShowBirthdayMessageSender(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                        >
                          <span className="text-sm">💬</span>
                          Send Message
                        </button>
                        <button
                          onClick={() => setShowBirthdayRewards(true)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105"
                        >
                          <span className="text-sm">🎁</span>
                          Give Reward
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Quick Actions:</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowAllBirthdays(false);
                        setShowBirthdayMessageSender(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white text-sm font-semibold rounded-lg hover:from-rose-600 hover:to-rose-700 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <MessageSquare size={16} />
                      Send All Messages
                    </button>
                    <button
                      onClick={() => {
                        setShowAllBirthdays(false);
                        setShowBirthdayRewards(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 text-white text-sm font-semibold rounded-lg hover:from-fuchsia-600 hover:to-fuchsia-700 transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <Gift size={16} />
                      Apply All Rewards
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          isOpen={showCustomerDetailModal}
          onClose={() => {
            setShowCustomerDetailModal(false);
            setSelectedCustomer(null);
          }}
          customer={selectedCustomer}
          onEdit={(customer) => {
            // Handle edit if needed

          }}
        />
      )}

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </div>
  );
};

export default CustomersPage;