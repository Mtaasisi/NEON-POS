import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import {
  Package, Edit, Save, X, AlertCircle,
  FileText, Clock, CheckSquare, Send,
  DollarSign, Printer, Download,
  PackageCheck, Building, MapPin,
  TrendingUp, BarChart3, Calculator,
  Copy, History, Store, Info,
  RotateCcw, Shield, Layers, QrCode, Eye, MessageSquare,
  CheckCircle2, CheckCircle, AlertTriangle,
  Zap, CreditCard,
  XSquare, XCircle, FileSpreadsheet,
  Truck, RefreshCw, Settings, Trash2, Share2, Receipt
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { logPurchaseOrderError, validateProductId } from '../lib/errorLogger';
import { useDialog } from '../../shared/hooks/useDialog';
// XLSX will be imported dynamically when needed
import { useInventoryStore } from '../stores/useInventoryStore';
import { PurchaseOrder } from '../types/inventory';
import { PurchaseOrderService } from '../services/purchaseOrderService';
import { QualityCheckService } from '../services/qualityCheckService';
import { supabase } from '../../../lib/supabaseClient';
import { serialNumberService } from '../services/serialNumberService';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

// Import components for Option B workflow
import PaymentsPopupModal from '../../../components/PaymentsPopupModal';
import SerialNumberReceiveModal from '../components/purchase-order/SerialNumberReceiveModal';
import SetPricingModal from '../components/purchase-order/SetPricingModal';
import PurchaseOrderActionsService from '../services/purchaseOrderActionsService';
import ConsolidatedReceiveModal from '../components/purchase-order/ConsolidatedReceiveModal';

// Import enhanced inventory components - REMOVED: These components don't exist
// import InventoryItemActions from '../components/inventory/InventoryItemActions';
// import StatusUpdateModal from '../components/inventory/StatusUpdateModal';
// import LocationAssignmentModal from '../components/inventory/LocationAssignmentModal';
// import ItemDetailsModal from '../components/inventory/ItemDetailsModal';
// import ItemHistoryModal from '../components/inventory/ItemHistoryModal';
// import BulkActionsToolbar from '../components/inventory/BulkActionsToolbar';
// import InventorySearchFilters from '../components/inventory/InventorySearchFilters';

// Import Quality Check components
import { QualityCheckModal, QualityCheckSummary, QualityCheckDetailsModal } from '../components/quality-check';

// Simple ShippingTracker component
const ShippingTracker: React.FC<{
  shippingInfo: any;
  purchaseOrder: any;
  compact?: boolean;
  debugMode?: boolean;
  onRefresh?: () => void;
}> = ({ shippingInfo, onRefresh }) => {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">Shipping Status</h4>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Refresh
          </button>
        )}
      </div>
      <div className="text-sm text-gray-600">
        {shippingInfo?.status || 'No shipping information available'}
      </div>
    </div>
  );
};

interface PurchaseOrderDetailPageProps {
  editMode?: boolean;
}

const PurchaseOrderDetailPage: React.FC<PurchaseOrderDetailPageProps> = ({ editMode = false }) => {
  const { currentUser } = useAuth();
  const { confirm } = useDialog();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Database state management
  const { 
    updatePurchaseOrder,
  } = useInventoryStore();

  // Local state
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | null>(null);
  const [isEditing, setIsEditing] = useState(editMode);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Action-specific loading states
  const [isApproving, setIsApproving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isShipping, setIsShipping] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Autoloading state
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [, setRefreshCount] = useState(0);
  const [autoRefreshEnabled] = useState(false); // Temporarily disabled to prevent connection overload
  const [refreshInterval] = useState(30); // seconds
  const [showAutoRefreshSettings, setShowAutoRefreshSettings] = useState(false);
  
  // State for Option B workflow
  const [activeTab, setActiveTab] = useState('overview');
  const [showSerialNumberReceiveModal, setShowSerialNumberReceiveModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showPurchaseOrderPaymentModal, setShowPurchaseOrderPaymentModal] = useState(false);
  const [showConsolidatedReceiveModal, setShowConsolidatedReceiveModal] = useState(false);
  const [showPartialReceiveModal, setShowPartialReceiveModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [receiveMode, setReceiveMode] = useState<'full' | 'partial'>('partial');
  const [hasPendingPricingItems, setHasPendingPricingItems] = useState(false);
  const [tempSerialNumberData, setTempSerialNumberData] = useState<any[]>([]);  // Store serial numbers temporarily
  const [tempPricingData, setTempPricingData] = useState<Map<string, any>>(new Map());  // Store pricing data temporarily
  const [hasRestoredProgress, setHasRestoredProgress] = useState(false); // Track if we've already restored progress
  
  // Helper functions for localStorage persistence
  const getStorageKey = (suffix: string) => `po_receive_${id}_${suffix}`;
  
  const saveReceiveProgress = (data: {
    receiveMode?: 'full' | 'partial';
    serialNumberData?: any[];
    pricingData?: Map<string, any>;
  }) => {
    if (!id) return;
    
    if (data.receiveMode) {
      localStorage.setItem(getStorageKey('mode'), data.receiveMode);
    }
    if (data.serialNumberData) {
      localStorage.setItem(getStorageKey('serials'), JSON.stringify(data.serialNumberData));
    }
    if (data.pricingData) {
      const pricingArray = Array.from(data.pricingData.entries());
      localStorage.setItem(getStorageKey('pricing'), JSON.stringify(pricingArray));
    }
  };
  
  const loadReceiveProgress = () => {
    if (!id) return null;
    
    const mode = localStorage.getItem(getStorageKey('mode')) as 'full' | 'partial' | null;
    const serialsStr = localStorage.getItem(getStorageKey('serials'));
    const pricingStr = localStorage.getItem(getStorageKey('pricing'));
    
    return {
      receiveMode: mode,
      serialNumberData: serialsStr ? JSON.parse(serialsStr) : null,
      pricingData: pricingStr ? new Map(JSON.parse(pricingStr)) : null
    };
  };
  
  const clearReceiveProgress = () => {
    if (!id) return;
    
    localStorage.removeItem(getStorageKey('mode'));
    localStorage.removeItem(getStorageKey('serials'));
    localStorage.removeItem(getStorageKey('pricing'));
  };
  
  const [showQualityCheckModal, setShowQualityCheckModal] = useState(false);
  const [showQualityCheckDetailsModal, setShowQualityCheckDetailsModal] = useState(false);
  const [selectedQualityCheckId, setSelectedQualityCheckId] = useState<string>('');
  const [showShippingTracker, setShowShippingTracker] = useState(false);
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAddToInventoryModal, setShowAddToInventoryModal] = useState(false);
  const [profitMargin, setProfitMargin] = useState(30);
  const [inventoryLocation, setInventoryLocation] = useState('');
  
  // Enhanced error handling and confirmation states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmDialogState, setConfirmDialogState] = useState<'confirming' | 'processing' | 'success'>('confirming');
  
  // Lazy load data only when needed
  const [auditHistory, setAuditHistory] = useState<any[]>([]);
  const [communicationHistory, setCommunicationHistory] = useState<any[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [expenseHistory, setExpenseHistory] = useState<any[]>([]);
  const [paymentsCacheTime, setPaymentsCacheTime] = useState<number>(0);
  const [expensesCacheTime, setExpensesCacheTime] = useState<number>(0);
  const PAYMENTS_CACHE_DURATION = 30000; // 30 seconds cache
  const [qualityCheckItems, setQualityCheckItems] = useState<any[]>([]);
  const [, setIsLoadingQualityCheckItems] = useState(false);
  const [receivedItems, setReceivedItems] = useState<any[]>([]);
  const [isLoadingReceivedItems, setIsLoadingReceivedItems] = useState(false);
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkSelectedItems, setBulkSelectedItems] = useState<string[]>([]);
  const [showReturnOrderModal, setShowReturnOrderModal] = useState(false);
  const [purchaseOrderItems, setPurchaseOrderItems] = useState<any[]>([]);
  const [isLoadingPurchaseOrderItems, setIsLoadingPurchaseOrderItems] = useState(false);
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set(['overview']));
  
  // Completion summary modal state
  const [showCompletionSummaryModal, setShowCompletionSummaryModal] = useState(false);

  // Enhanced inventory management state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [, setInventoryStats] = useState<any[]>([]);
  const [filteredReceivedItems, setFilteredReceivedItems] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    location: '',
    dateFrom: '',
    dateTo: ''
  });

  // Permission check helper function - now checks user.permissions array first!
  const hasPermission = (action: 'approve' | 'delete' | 'cancel' | 'edit' | 'create') => {
    if (!currentUser) return false;
    
    // Check user permissions array first
    const userPermissions = currentUser.permissions || [];
    
    // If user has 'all' permission, they can do anything
    if (userPermissions.includes('all')) {
      return true;
    }
    
    // Check specific permissions
    const permissionMap = {
      'approve': 'approve_purchase_orders',
      'delete': 'delete_purchase_orders',
      'cancel': 'delete_purchase_orders',
      'edit': 'edit_purchase_orders',
      'create': 'create_purchase_orders'
    };
    
    const requiredPermission = permissionMap[action];
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }
    
    // Fallback to role-based check
    // Admin and manager have all permissions
    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
      return true;
    }
    
    // Staff can edit and create but not approve, delete, or cancel
    if (currentUser.role === 'staff') {
      return action === 'edit' || action === 'create';
    }
    
    // Default: no permission
    return false;
  };

  // Enhanced load purchase order function with comprehensive error handling and debugging
  // 🚀 OPTIMIZED: Batch load all purchase order data in parallel
  const loadPurchaseOrder = useCallback(async () => {
    console.log(`🔄 [PurchaseOrderDetailPage] Starting OPTIMIZED loadPurchaseOrder for ID: ${id}`);
    const startTime = Date.now();

    if (!id) {
      console.error('❌ [PurchaseOrderDetailPage] No purchase order ID provided');
      toast.error('Purchase order ID is required');
      navigate('/lats/purchase-orders');
      return;
    }

    // Fast input validation
    const trimmedId = id.trim();
    console.log(`🔍 Validated purchase order ID: "${trimmedId}"`);

    setIsLoadingOrder(true);

    try {
      if (import.meta.env.MODE === 'development') {
        console.log('🔄 [PurchaseOrderDetailPage] Starting parallel data loading...');
      }

      // 🚀 OPTIMIZED: Load main PO data and related data in parallel
      const [poResponse, statusCheckPromise, pricingCheckPromise] = await Promise.allSettled([
        // Main PO data
        (async () => {
          const { getPurchaseOrder: getPO } = useInventoryStore.getState();
          return await getPO(trimmedId);
        })(),

        // Status auto-fix (non-blocking)
        PurchaseOrderService.fixOrderStatusIfNeeded(trimmedId, currentUser?.id || '').catch(err => {
          console.warn('⚠️ Status auto-fix failed (non-critical):', err);
          return { success: false };
        }),

        // Pending pricing check (only for non-completed orders)
        (async () => {
          try {
            // We'll check this after we get the PO data to avoid extra queries
            return null;
          } catch (err) {
            console.warn('⚠️ Pricing check prep failed (non-critical):', err);
            return false;
          }
        })()
      ]);

      // Extract main PO data
      const response = poResponse.status === 'fulfilled' ? poResponse.value : null;
      const statusFixResult = statusCheckPromise.status === 'fulfilled' ? statusCheckPromise.value : null;
      
      if (response.ok) {
        console.log('🔍 [PurchaseOrderDetailPage] DEBUG - Purchase order data received:', {
          id: response.data?.id,
          orderNumber: response.data?.orderNumber,
          status: response.data?.status,
          paymentStatus: response.data?.paymentStatus,
          itemsCount: response.data?.items?.length || 0,
          hasSupplier: !!response.data?.supplier,
          supplierName: response.data?.supplier?.name || 'No supplier',
          supplierId: response.data?.supplierId,
          items: response.data?.items?.map(item => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            product: item.product,
            variant: item.variant,
            quantity: item.quantity,
            receivedQuantity: item.receivedQuantity || 0,
            hasProductData: !!item.product,
            hasVariantData: !!item.variant
          }))
        });
        if (response.data) {
          // Fix missing or zero totalAmount by calculating from items
          if ((!response.data.totalAmount || response.data.totalAmount === 0) && response.data.items && response.data.items.length > 0) {
            const calculatedTotal = response.data.items.reduce((sum: number, item: any) => {
              const quantity = item.quantity || item.quantityOrdered || 0;
              const costPrice = item.costPrice || item.unitCost || 0;
              return sum + (quantity * costPrice);
            }, 0);
            response.data.totalAmount = calculatedTotal;
            console.log('✅ Calculated missing totalAmount from items:', calculatedTotal);
          }
          
          // Ensure items have the quantity property (map from quantityOrdered if needed)
          if (response.data.items) {
            response.data.items = response.data.items.map((item: any) => ({
              ...item,
              quantity: item.quantity || item.quantityOrdered || 0,
              costPrice: item.costPrice || item.unitCost || 0
            }));
          }
          
          // FIX: Recalculate and correct payment status if mismatched
          // Ensure values are numbers for proper comparison
          const totalAmount = Number(response.data.totalAmount) || 0;
          const totalPaid = Number(response.data.totalPaid) || 0;
          let correctPaymentStatus = response.data.paymentStatus;
          
          if (totalAmount > 0) {
            if (totalPaid >= totalAmount) {
              correctPaymentStatus = 'paid';
            } else if (totalPaid > 0) {
              correctPaymentStatus = 'partial';
            } else {
              correctPaymentStatus = 'unpaid';
            }
            
            // If status is incorrect, update it in the database
            if (correctPaymentStatus !== response.data.paymentStatus) {
              // ✅ FIX: Use debug level instead of warn since we're auto-fixing it
              // This prevents console noise for expected data corrections
              if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
                console.debug('ℹ️ Payment status auto-corrected:', {
                  totalAmount,
                  totalPaid,
                  previousStatus: response.data.paymentStatus,
                  correctedStatus: correctPaymentStatus,
                  note: 'Status automatically corrected based on payment amounts'
                });
              }
              
              // Update the local data immediately for UI
              response.data.paymentStatus = correctPaymentStatus;
              
              // Update in database asynchronously (don't wait for it)
              supabase
                .from('lats_purchase_orders')
                .update({ 
                  payment_status: correctPaymentStatus,
                  updated_at: new Date().toISOString()
                })
                .eq('id', response.data.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('❌ Failed to update payment status:', error);
                  } else {
                    // Only log success in development to reduce console noise
                    if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
                      console.debug('✅ Payment status corrected in database:', correctPaymentStatus);
                    }
                  }
                });
            }
          }
          
          setPurchaseOrder(response.data);
          const endTime = Date.now();
          console.log(`✅ [PurchaseOrderDetailPage] Purchase order loaded successfully in ${endTime - startTime}ms`);
          console.log('📊 [PurchaseOrderDetailPage] Order summary:', {
            orderNumber: response.data.orderNumber,
            status: response.data.status,
            totalAmount: response.data.totalAmount,
            currency: response.data.currency,
            itemsCount: response.data.items?.length || 0,
            supplierName: response.data.supplier?.name
          });

          // Load payments and expenses immediately after PO data is loaded
          console.log('💰 [PurchaseOrderDetailPage] Loading payment and expense data for PO:', response.data.id);
          const now = Date.now();
          await Promise.allSettled([
            // Load payments
            PurchaseOrderService.getPayments(response.data.id).then(_payments => {
              console.log(`💰 [PurchaseOrderDetailPage] Setting payment history:`, _payments);
              setPaymentHistory(_payments);
              setPaymentsCacheTime(now);
              console.log(`✅ [PurchaseOrderDetailPage] Payment history state updated with ${_payments.length} payments`);
            }).catch(error => {
              console.warn('❌ [PurchaseOrderDetailPage] Failed to load payments:', error);
            }),

            // Load expenses
            PurchaseOrderService.getExpenses(response.data.id).then(_expenses => {
              console.log(`💰 [PurchaseOrderDetailPage] Setting expense history:`, _expenses);
              setExpenseHistory(_expenses);
              setExpensesCacheTime(now);
              console.log(`✅ [PurchaseOrderDetailPage] Expense history state updated with ${_expenses.length} expenses`);
            }).catch(error => {
              console.warn('❌ [PurchaseOrderDetailPage] Failed to load expenses:', error);
            })
          ]);
        }
        
        // Fix order status if needed (for existing orders created before auto-status logic)
        if (currentUser?.id && response.data?.id) {
          try {
            const fixResult = await PurchaseOrderService.fixOrderStatusIfNeeded(response.data.id, currentUser.id);
            if (fixResult.success && fixResult.statusChanged) {
              console.log('✅ Order status automatically corrected:', fixResult.message);
              // Reload the order to get the updated status
              const { getPurchaseOrder: getPO } = useInventoryStore.getState();
              const updatedResponse = await getPO(id);
              if (updatedResponse.ok && updatedResponse.data) {
                setPurchaseOrder(updatedResponse.data);
              }
            } else if (!fixResult.success) {
              console.warn('⚠️ Could not auto-fix order status:', fixResult.message);
              // Don't block the page load - this is a non-critical operation
            }
          } catch (error) {
            console.error('⚠️ Error during auto-fix order status (non-critical):', error);
            // Don't block the page load - this is a non-critical operation
          }
          
          // Check for pending pricing items (only for orders that aren't completed)
          try {
            // Skip check for completed orders to avoid unnecessary warnings
            if (response.data.status !== 'completed') {
              const hasPending = await PurchaseOrderService.hasPendingPricingItems(response.data.id);
              setHasPendingPricingItems(hasPending);
              if (hasPending) {
                console.log('⚠️ Purchase order has items pending pricing');
              }
            } else {
              // For completed orders, assume no pending pricing items
              setHasPendingPricingItems(false);
            }
          } catch (error) {
            console.error('⚠️ Error checking pending pricing items (non-critical):', error);
          }
        }
      } else {
        const errorMessage = response.message || 'Failed to load purchase order from server';
        console.error('❌ Failed to load purchase order:', {
          error: errorMessage,
          response: response,
          purchaseOrderId: trimmedId
        });
        
        // Log detailed error
        logPurchaseOrderError('load_purchase_order', new Error(errorMessage), {
          purchaseOrderId: trimmedId,
          operation: 'load_purchase_order'
        });
        
        toast.error(errorMessage);
        navigate('/lats/purchase-orders');
      }
    } catch (error) {
      console.error('❌ Exception loading purchase order:', {
        error,
        purchaseOrderId: id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Log detailed error
      logPurchaseOrderError('load_purchase_order_exception', error, {
        purchaseOrderId: id,
        operation: 'load_purchase_order'
      });
      
      let errorMessage = 'Failed to load purchase order';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your internet connection and try again';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout: The server is taking too long to respond';
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          errorMessage = 'Permission denied: You do not have access to this purchase order';
        } else if (error.message.includes('not found')) {
          errorMessage = `Purchase order with ID "${id}" not found`;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
      navigate('/lats/purchase-orders');
    } finally {
      console.log('✅ loadPurchaseOrder completed');
      setIsLoadingOrder(false);
    }
  }, [id, navigate, currentUser?.id]);

  // Load purchase order data on component mount
  useEffect(() => {
    if (id) {
      loadPurchaseOrder();
    }
  }, [id, loadPurchaseOrder]);

  // Load saved progress when page loads - only once
  useEffect(() => {
    if (id && purchaseOrder && !hasRestoredProgress) {
      const savedProgress = loadReceiveProgress();
      if (savedProgress && (savedProgress.receiveMode || savedProgress.serialNumberData || savedProgress.pricingData)) {
        // Restore saved data
        if (savedProgress.receiveMode) {
          setReceiveMode(savedProgress.receiveMode);
        }
        if (savedProgress.serialNumberData) {
          setTempSerialNumberData(savedProgress.serialNumberData);
        }
        if (savedProgress.pricingData) {
          setTempPricingData(savedProgress.pricingData);
        }
        
        // Mark as restored to prevent repeated execution
        setHasRestoredProgress(true);
        
        // Auto-resume from the last step
        if (savedProgress.pricingData && savedProgress.pricingData.size > 0) {
          // User was on pricing step
          toast.success('Resuming from pricing step...');
          setTimeout(() => setShowPricingModal(true), 500);
        } else if (savedProgress.serialNumberData && savedProgress.serialNumberData.length > 0) {
          // User was on serial numbers step
          toast.success('Resuming from serial numbers step...');
          setTimeout(() => setShowSerialNumberReceiveModal(true), 500);
        } else if (savedProgress.receiveMode) {
          // User only selected receive mode
          toast.success('Resuming receive process...');
          setTimeout(() => setShowConsolidatedReceiveModal(true), 500);
        }
      } else {
        // No saved progress, mark as checked
        setHasRestoredProgress(true);
      }
    }
  }, [id, purchaseOrder, hasRestoredProgress]);

  // Handle URL action parameters (e.g., ?action=receive)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'receive' && purchaseOrder && !showConsolidatedReceiveModal) {
      // Auto-open receive modal when action=receive in URL
      setShowConsolidatedReceiveModal(true);
      // Clear the action param to avoid reopening
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, purchaseOrder, showConsolidatedReceiveModal]);

  // Handle editMode prop changes
  useEffect(() => {
    setIsEditing(editMode);
  }, [editMode]);

  // Filter received items based on search criteria
  useEffect(() => {
    if (!receivedItems.length) {
      setFilteredReceivedItems([]);
      return;
    }

    const filtered = receivedItems.filter(item => {
      const matchesSearch = !filters.search || 
        item.product?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.variant?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.serial_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.imei?.toLowerCase().includes(filters.search.toLowerCase()) ||
        item.product?.sku?.toLowerCase().includes(filters.search.toLowerCase());

      const matchesStatus = !filters.status || item.status === filters.status;
      
      const matchesLocation = !filters.location || 
        item.location?.toLowerCase().includes(filters.location.toLowerCase()) ||
        item.shelf?.toLowerCase().includes(filters.location.toLowerCase()) ||
        item.bin?.toLowerCase().includes(filters.location.toLowerCase());

      const matchesDateFrom = !filters.dateFrom || new Date(item.created_at) >= new Date(filters.dateFrom);
      const matchesDateTo = !filters.dateTo || new Date(item.created_at) <= new Date(filters.dateTo);

      return matchesSearch && matchesStatus && matchesLocation && matchesDateFrom && matchesDateTo;
    });

    setFilteredReceivedItems(filtered);
  }, [receivedItems, filters]);

  // Autoloading functionality
  const refreshPurchaseOrderData = useCallback(async (isBackground = false) => {
    if (!id || !purchaseOrder) return;
    
    try {
      if (isBackground) {
        setIsBackgroundLoading(true);
      }
      
      console.log(`🔄 [Autoload] ${isBackground ? 'Background' : 'Manual'} refresh started for PO: ${id}`);
      
      // Load purchase order data
      const { getPurchaseOrder } = useInventoryStore.getState();
      const response = await getPurchaseOrder(id);
      
      if (response.ok && response.data) {
        setPurchaseOrder(response.data);
        setLastRefreshTime(new Date());
        setRefreshCount((prev: number) => prev + 1);
        
        if (isBackground) {
          console.log(`✅ [Autoload] Background refresh completed for PO: ${id}`);
        }
      }
      
      // Load additional data in background (in parallel for speed)
      if (isBackground) {
        await Promise.allSettled([
          // Load messages
          PurchaseOrderService.getMessages(purchaseOrder.id).catch(error => {
            console.warn('Failed to refresh messages:', error);
          }),
          
          // Load payments and update cache
          PurchaseOrderService.getPayments(purchaseOrder.id).then(_payments => {
            setPaymentHistory(_payments);
            setPaymentsCacheTime(Date.now());
          }).catch(error => {
            console.warn('Failed to refresh payments:', error);
          }),

          // Load expenses and update cache
          PurchaseOrderService.getExpenses(purchaseOrder.id).then(_expenses => {
            setExpenseHistory(_expenses);
            setExpensesCacheTime(Date.now());
          }).catch(error => {
            console.warn('Failed to refresh expenses:', error);
          }),
          
          // Load received items
          PurchaseOrderService.getReceivedItems(purchaseOrder.id).then(receivedData => {
            if (receivedData.success && receivedData.data) {
              setReceivedItems(receivedData.data);
            }
          }).catch(error => {
            console.warn('Failed to refresh received items:', error);
          })
        ]);
      }
      
    } catch (error) {
      console.error(`❌ [Autoload] Failed to refresh data:`, error);
      if (!isBackground) {
        toast.error('Failed to refresh purchase order data');
      }
    } finally {
      if (isBackground) {
        setIsBackgroundLoading(false);
      }
    }
  }, [id, purchaseOrder]);

  // Auto-refresh effect
  useEffect(() => {
    if (!id || !purchaseOrder || !autoRefreshEnabled) return;
    
    // Set up auto-refresh interval
    const interval = setInterval(() => {
      refreshPurchaseOrderData(true);
    }, refreshInterval * 1000);
    
    setAutoRefreshInterval(interval);
    
    // Cleanup on unmount or when dependencies change
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [id, purchaseOrder, refreshPurchaseOrderData, autoRefreshEnabled, refreshInterval]);

  // Cleanup auto-refresh on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  // Load inventory stats when received items are loaded
  useEffect(() => {
    if (receivedItems.length > 0) {
      const loadStats = async () => {
        if (!id) return;
        try {
          const response = await PurchaseOrderService.getPurchaseOrderInventoryStats(id);
          if (response.success) {
            setInventoryStats(response.data || []);
          }
        } catch (error) {
          console.error('Failed to load inventory stats:', error);
        }
      };
      loadStats();
    }
  }, [receivedItems.length, id]);

  // Handle tab switching with lazy loading
  const handleTabChange = useCallback(async (tabName: string, forceRefresh = false) => {
    console.log('🔄 [PurchaseOrderDetailPage] Tab changed to:', tabName, forceRefresh ? '(force refresh)' : '');
    console.log('📊 [PurchaseOrderDetailPage] Current state:', {
      activeTab,
      loadedTabs: Array.from(loadedTabs),
      purchaseOrderId: purchaseOrder?.id,
      orderNumber: purchaseOrder?.orderNumber
    });
    setActiveTab(tabName);
    
    // Load data when tab is first accessed or when force refresh is requested
    if (!loadedTabs.has(tabName) || forceRefresh) {
      console.log('📥 [PurchaseOrderDetailPage] Loading data for tab:', tabName);
      if (!forceRefresh) {
        setLoadedTabs(prev => new Set(Array.from(prev).concat(tabName)));
      }
      
      // Load specific data based on tab
      switch (tabName) {
        case 'analytics':
          // Load analytics data
          break;
        case 'history':
          // Load audit history from database
          if (purchaseOrder) {
            try {
              const auditData = await PurchaseOrderService.getAuditHistory(purchaseOrder.id);
              setAuditHistory(auditData);
            } catch (error) {
              console.error('Failed to load audit history:', error);
            }
          }
          break;
        case 'items':
          // Load both purchase order items and received items from database
          if (purchaseOrder) {
            setIsLoadingPurchaseOrderItems(true);
            setIsLoadingReceivedItems(true);
            try {
              console.log('🔍 [PurchaseOrderDetailPage] Loading purchase order items and received items for PO:', purchaseOrder.id);
              
              // Load purchase order items
              const itemsData = await PurchaseOrderService.getPurchaseOrderItemsWithProducts(purchaseOrder.id);
              console.log('🔍 [PurchaseOrderDetailPage] Purchase order items response:', itemsData);
              if (itemsData.success) {
                setPurchaseOrderItems(itemsData.data || []);
                console.log('✅ [PurchaseOrderDetailPage] Purchase order items loaded:', itemsData.data?.length || 0, 'items');
              } else {
                console.error('❌ Failed to load purchase order items:', itemsData.message);
                toast.error('Failed to load purchase order items');
              }
              
              // Load received items
              const receivedData = await PurchaseOrderService.getReceivedItems(purchaseOrder.id);
              console.log('🔍 [PurchaseOrderDetailPage] Received items response:', receivedData);
              if (receivedData.success) {
                setReceivedItems(receivedData.data || []);
                console.log('✅ [PurchaseOrderDetailPage] Received items loaded:', receivedData.data?.length || 0, 'items');
              } else {
                console.error('❌ Failed to load received items:', receivedData.message);
                toast.error('Failed to load received items');
              }
            } catch (error) {
              console.error('❌ Failed to load items data:', error);
              toast.error('Failed to load items data');
            } finally {
              setIsLoadingPurchaseOrderItems(false);
              setIsLoadingReceivedItems(false);
            }
          }
          break;
        case 'received':
          // Load received items and quality check items from database
          if (purchaseOrder) {
            setIsLoadingReceivedItems(true);
            setIsLoadingQualityCheckItems(true);
            try {
              // Load received items
              console.log('🔍 [PurchaseOrderDetailPage] Loading received items for PO:', purchaseOrder.id);
              const receivedData = await PurchaseOrderService.getReceivedItems(purchaseOrder.id);
              console.log('🔍 [PurchaseOrderDetailPage] Received items response:', receivedData);
              if (receivedData.success) {
                setReceivedItems(receivedData.data || []);
                console.log('✅ [PurchaseOrderDetailPage] Received items loaded:', receivedData.data?.length || 0, 'items');
              } else {
                console.error('❌ Failed to load received items:', receivedData.message);
                toast.error('Failed to load received items');
              }
              
              // Load quality check items to show what's already checked
              console.log('🔍 [PurchaseOrderDetailPage] Loading quality check summary for PO:', purchaseOrder.id);
              const qcSummary = await QualityCheckService.getQualityCheckSummary(purchaseOrder.id);
              if (qcSummary.success && qcSummary.data) {
                console.log('✅ [PurchaseOrderDetailPage] Quality check summary loaded:', qcSummary.data);
                // Load detailed quality check items only if qualityCheckId exists
                if (qcSummary.data.qualityCheckId) {
                  const qcItemsData = await QualityCheckService.getQualityCheckItems(qcSummary.data.qualityCheckId);
                  if (qcItemsData.success) {
                    setQualityCheckItems(qcItemsData.data || []);
                    console.log('✅ [PurchaseOrderDetailPage] Quality check items loaded:', qcItemsData.data?.length || 0, 'items');
                  }
                } else {
                  console.log('ℹ️ [PurchaseOrderDetailPage] No quality check ID available for this purchase order');
                  setQualityCheckItems([]);
                }
              }
            } catch (error) {
              console.error('❌ Failed to load received/quality check items:', error);
              toast.error('Failed to load items');
            } finally {
              setIsLoadingReceivedItems(false);
              setIsLoadingQualityCheckItems(false);
            }
          }
          break;
        case 'supplier':
          // Load supplier performance data
          break;
        default:
          break;
      }
    }
  }, [loadedTabs, currentUser, purchaseOrder]);

  // Memoized refresh function to prevent infinite re-renders
  const handleRefresh = useCallback(() => {
    loadPurchaseOrder();
  }, [loadPurchaseOrder]); // Use loadPurchaseOrder dependency

  // Function to reload received items
  const handleRefreshReceivedItems = useCallback(async () => {
    if (!purchaseOrder) return;
    
    setIsLoadingReceivedItems(true);
    try {
      console.log('🔄 [PurchaseOrderDetailPage] Refreshing received items for PO:', purchaseOrder.id);
      const receivedData = await PurchaseOrderService.getReceivedItems(purchaseOrder.id);
      console.log('🔄 [PurchaseOrderDetailPage] Received items refresh response:', receivedData);
      if (receivedData.success) {
        setReceivedItems(receivedData.data || []);
        console.log('✅ [PurchaseOrderDetailPage] Received items refreshed:', receivedData.data?.length || 0, 'items');
        toast.success('Received items refreshed');
      } else {
        console.error('❌ Failed to refresh received items:', receivedData.message);
        toast.error('Failed to refresh received items');
      }
    } catch (error) {
      console.error('❌ Failed to refresh received items:', error);
      toast.error('Failed to refresh received items');
    } finally {
      setIsLoadingReceivedItems(false);
    }
  }, [purchaseOrder]);

  // Enhanced inventory management handlers
  // serialNumberService is imported from the service file

  // Update inventory item handler
  const handleUpdateInventoryItem = async (itemId: string, updates: any) => {
    try {
      await serialNumberService.updateInventoryItem(itemId, updates);
      toast.success('Item updated successfully');
      // Refresh the items list
      await handleRefreshReceivedItems();
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Failed to update item');
    }
  };

  // Update serial number
  const handleUpdateSerialNumber = async (itemId: string, currentSerial?: string) => {
    const serialNumber = prompt('Enter serial number:', currentSerial || '');
    if (serialNumber !== null && serialNumber.trim()) {
      await handleUpdateInventoryItem(itemId, {
        serial_number: serialNumber.trim(),
        updated_at: new Date().toISOString()
      });
    }
  };

  // Update IMEI
  const handleUpdateIMEI = async (itemId: string, currentImei?: string) => {
    const imei = prompt('Enter IMEI:', currentImei || '');
    if (imei !== null && imei.trim()) {
      await handleUpdateInventoryItem(itemId, {
        imei: imei.trim(),
        updated_at: new Date().toISOString()
      });
    }
  };

  // Update status
  const handleUpdateStatus = async (itemId: string, newStatus: string, oldStatus: string) => {
    if (newStatus === oldStatus) return;
    
    await handleUpdateInventoryItem(itemId, {
      status: newStatus,
      updated_at: new Date().toISOString()
    });
  };

  // Update location
  const handleUpdateLocation = async (itemId: string, currentLocation?: string, currentShelf?: string, currentBin?: string) => {
    const location = prompt('Enter location:', currentLocation || '');
    if (location !== null && location.trim()) {
      const shelf = prompt('Enter shelf (optional):', currentShelf || '');
      const bin = prompt('Enter bin (optional):', currentBin || '');
      
      await handleUpdateInventoryItem(itemId, {
        location: location.trim() || null,
        shelf: shelf?.trim() || null,
        bin: bin?.trim() || null,
        updated_at: new Date().toISOString()
      });
    }
  };

  // Update selling price
  const handleUpdateSellingPrice = async (itemId: string, currentPrice?: number) => {
    const priceStr = prompt('Enter selling price (TZS):', currentPrice?.toString() || '');
    if (priceStr !== null) {
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price >= 0) {
        await handleUpdateInventoryItem(itemId, {
          selling_price: price,
          updated_at: new Date().toISOString()
        });
      } else {
        toast.error('Please enter a valid price');
      }
    }
  };

  // Confirmation dialog helper
  const showConfirmation = (title: string, message: string, onConfirm: () => void) => {
    setConfirmAction({ title, message, onConfirm });
    setShowConfirmDialog(true);
  };



  const handleExport = async (exportFilters?: any) => {
    try {
      const response = await PurchaseOrderService.exportInventoryToCSV(id || '', exportFilters);
      if (response.success && response.data) {
        // Create download link
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success('Export completed successfully');
      } else {
        toast.error(response.message || 'Failed to export data');
      }
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export data');
    }
  };


  const handleSave = async () => {
    if (!purchaseOrder) return;
    
    console.log('💾 [PurchaseOrderDetailPage] Saving purchase order...');
    console.log('📝 [PurchaseOrderDetailPage] Update data:', {
      orderId: purchaseOrder.id,
      orderNumber: purchaseOrder.orderNumber,
      supplierId: purchaseOrder.supplierId,
      itemsCount: purchaseOrder.items?.length || 0
    });
    
    setIsSaving(true);
    const response = await updatePurchaseOrder(purchaseOrder.id, {
      supplierId: purchaseOrder.supplierId,
      expectedDeliveryDate: purchaseOrder.expectedDeliveryDate,
      notes: purchaseOrder.notes,
      items: purchaseOrder.items?.map(item => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        costPrice: item.costPrice,
      }))
    });
    
    if (response.ok) {
      console.log('✅ [PurchaseOrderDetailPage] Purchase order updated successfully');
      toast.success('Purchase order updated successfully');
      setIsEditing(false);
      await loadPurchaseOrder();
    } else {
      console.error('❌ [PurchaseOrderDetailPage] Failed to update purchase order:', response.message);
      toast.error(response.message || 'Failed to update purchase order');
    }
    setIsSaving(false);
  };


  const handleDelete = async () => {
    if (!purchaseOrder) return;
    
    // Permission check
    if (!hasPermission('delete')) {
      toast.error('You do not have permission to delete purchase orders');
      return;
    }
    
    // Validation: Only draft orders can be deleted
    if (purchaseOrder.status !== 'draft') {
      toast.error('Only draft orders can be deleted');
      return;
    }
    
    if (await confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      try {
        setIsDeleting(true);
        const result = await PurchaseOrderActionsService.deleteOrder(purchaseOrder.id);
        if (result.success) {
          toast.success(result.message);
          navigate('/lats/purchase-orders');
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        console.error('Error deleting purchase order:', error);
        toast.error('Failed to delete purchase order');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  // Simplified workflow functions - Combined Approve & Send
  const handleApproveAndSend = async () => {
    if (!purchaseOrder) return;
    
    // Permission check
    if (!hasPermission('approve')) {
      toast.error('You do not have permission to approve orders');
      return;
    }
    
    // Validation: Only draft orders can be approved
    if (purchaseOrder.status !== 'draft') {
      toast.error('Only draft orders can be approved');
      return;
    }
    
    // Validation: Check if order has items
    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      toast.error('Cannot approve order without items');
      return;
    }
    
    try {
      setIsApproving(true);
      
      // Approve the order
      const approveResponse = await PurchaseOrderService.approvePurchaseOrder(
        purchaseOrder.id, 
        currentUser?.id || '', 
        'Approved and sent to supplier'
      );
      
      if (approveResponse.success) {
        // Automatically update status to sent
        const sendResponse = await PurchaseOrderService.updateOrderStatus(
          purchaseOrder.id,
          'sent',
          currentUser?.id || ''
        );
        
        if (sendResponse) {
          await loadPurchaseOrder();
          toast.success('Order approved and sent to supplier');
        } else {
          await loadPurchaseOrder();
          toast.success('Order approved (mark as sent manually)');
        }
      } else {
        toast.error(approveResponse.message);
      }
    } catch (error) {
      console.error('Error approving and sending order:', error);
      toast.error('Failed to approve and send order');
    } finally {
      setIsApproving(false);
    }
  };





  // Handler functions for Option B workflow
  const handlePrintOrder = async () => {
    if (!purchaseOrder) {
      toast.error('No purchase order to print');
      return;
    }
    
    try {
      setIsPrinting(true);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printContent = await generatePrintContent(purchaseOrder);
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
        toast.success('Purchase order sent to printer');
      } else {
        toast.error('Could not open print window. Please check popup settings.');
      }
    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Failed to print purchase order');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = () => {
    if (!purchaseOrder) {
      toast.error('No purchase order to export');
      return;
    }
    
    try {
      setIsExporting(true);
      const pdfContent = generatePDFContent(purchaseOrder);
      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Purchase_Order_${purchaseOrder.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (!purchaseOrder) {
      toast.error('No purchase order to export');
      return;
    }
    
    try {
      setIsExporting(true);
      const XLSX = await import('xlsx');
      const workbook = generateExcelContent(purchaseOrder, XLSX);
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Purchase_Order_${purchaseOrder.orderNumber || 'Unknown'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Excel file exported successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel file');
    } finally {
      setIsExporting(false);
    }
  };


  const handleViewCommunication = async () => {
    setShowCommunicationModal(true);
    
    // Load communication history from database
    if (purchaseOrder) {
      try {
        const _messages = await PurchaseOrderService.getMessages(purchaseOrder.id);
        setCommunicationHistory(_messages);
      } catch (error) {
        console.error('Failed to load communication history:', error);
      }
    }
  };

  const handleQualityControl = () => {
    setShowQualityCheckModal(true);
  };



  const handleQualityCheckComplete = async () => {
    if (!purchaseOrder) return;
    
    try {
      // Reload purchase order to get latest data
      await loadPurchaseOrder();
      
      // Quality check complete - status stays as 'received'
      // Quality checks are tracked separately, no status change needed
      if (purchaseOrder.status === 'received') {
        toast.success('Quality check completed successfully');
        console.log('✅ Quality check completed for received order');
      } else {
        console.warn('⚠️ Quality check called on non-received status:', purchaseOrder.status);
        toast.success('Quality check recorded');
      }
    } catch (error) {
      console.error('Error during quality check:', error);
      toast.error('Failed to complete quality check');
    }
  };


  const handleAddToInventory = async () => {
    if (!purchaseOrder || !currentUser) return;
    
    // Get the latest quality check
    if (qualityCheckItems.length === 0) {
      toast.error('No quality check found');
      return;
    }
    
    // Assuming we want the most recent quality check
    const latestQualityCheckId = qualityCheckItems[0].qualityCheckId;
    
    setIsSaving(true);
    try {
      console.log('🔄 Adding items to inventory...', {
        qualityCheckId: latestQualityCheckId,
        purchaseOrderId: purchaseOrder.id,
        profitMargin,
        location: inventoryLocation
      });

      const { data, error } = await supabase.rpc('add_quality_items_to_inventory_v2', {
        p_quality_check_id: latestQualityCheckId,
        p_purchase_order_id: purchaseOrder.id,
        p_user_id: currentUser.id,
        p_profit_margin_percentage: profitMargin,
        p_default_location: inventoryLocation || null
      });

      if (error) {
        console.error('❌ RPC Error:', error);
        throw error;
      }

      const result = data as any;
      console.log('📦 Add to inventory result:', result);

      if (result && result.success) {
        console.log('✅ Items added to inventory successfully:', result);
        toast.success(result.message || `Successfully added ${result.items_added} items to inventory`);
        setShowAddToInventoryModal(false);
        
        // Reload purchase order and switch to received tab to see the items
        await loadPurchaseOrder();
        
        // Force refresh received items
        const receivedData = await PurchaseOrderService.getReceivedItems(purchaseOrder.id);
        if (receivedData.success) {
          setReceivedItems(receivedData.data || []);
          console.log('✅ Received items refreshed:', receivedData.data?.length || 0);
        }
        
        // Switch to received tab to show the newly added items
        setActiveTab('received');
        
        toast.success('Items are now in inventory! Check the "Received" tab.');
      } else {
        console.error('❌ Failed to add to inventory:', result?.message);
        toast.error(result?.message || 'Failed to add items to inventory');
      }
    } catch (error) {
      console.error('❌ Error adding to inventory:', error);
      toast.error(`Error adding items to inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewPayments = async () => {
    setShowPaymentModal(true);

    // Load payment history from database with caching
    if (purchaseOrder) {
      const now = Date.now();
      const isCacheValid = (now - paymentsCacheTime) < PAYMENTS_CACHE_DURATION;

      // Use cached data if available and fresh
      if (paymentHistory.length > 0 && isCacheValid) {
        console.log('✅ Using cached payment data');
        return;
      }

      try {
        console.log('🔄 Fetching fresh payment data...');
        const _payments = await PurchaseOrderService.getPayments(purchaseOrder.id);
        setPaymentHistory(_payments);
        setPaymentsCacheTime(now);
        console.log(`✅ Loaded ${_payments.length} payments`);
      } catch (error) {
        console.error('Failed to load payment history:', error);
      }
    }
  };

  const handleViewExpenses = async () => {
    // Load expense history from database with caching
    if (purchaseOrder) {
      const now = Date.now();
      const isCacheValid = (now - expensesCacheTime) < PAYMENTS_CACHE_DURATION;

      // Use cached data if available and fresh
      if (expenseHistory.length > 0 && isCacheValid) {
        console.log('✅ Using cached expense data');
        return;
      }

      try {
        console.log('🔄 Fetching fresh expense data...');
        const _expenses = await PurchaseOrderService.getExpenses(purchaseOrder.id);
        setExpenseHistory(_expenses);
        setExpensesCacheTime(now);
        console.log(`✅ Loaded ${_expenses.length} expenses`);
      } catch (error) {
        console.error('Failed to load expense history:', error);
      }
    }
  };

  const handleSendWhatsApp = () => {
    if (!purchaseOrder?.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    const message = `Hello, I'm contacting you about Purchase Order #${purchaseOrder.orderNumber}. Please let me know the status.`;
    const whatsappUrl = `https://wa.me/${purchaseOrder.supplier.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSendSMS = async () => {
    if (!purchaseOrder?.supplier?.phone) {
      toast.error('Supplier phone number not available');
      return;
    }
    
    try {
      const message = `Purchase Order #${purchaseOrder.orderNumber} - Please provide status update.`;
      const result = await PurchaseOrderActionsService.sendSMS(
        purchaseOrder.supplier.phone,
        message,
        purchaseOrder.id
      );
      
      if (result.success) {
        toast.success(result.message);
        await PurchaseOrderActionsService.logAction(purchaseOrder.id, 'sms_sent', { phone: purchaseOrder.supplier.phone });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    }
  };

  const handleDuplicateOrder = async () => {
    if (!purchaseOrder) return;
    
    // Validation: Check if order has items
    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      toast.error('Cannot duplicate order without items');
      return;
    }
    
    try {
      setIsDuplicating(true);
      const result = await PurchaseOrderActionsService.duplicateOrder(purchaseOrder.id);
      
      if (result.success) {
        toast.success(result.message);
        await PurchaseOrderActionsService.logAction(purchaseOrder.id, 'order_duplicated', { new_order_id: result.data?.id });
        navigate(`/lats/purchase-orders/${result.data.id}`);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error duplicating order:', error);
      toast.error('Failed to duplicate order');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleViewNotes = async () => {
    setShowNotesModal(true);
    
    // Load notes from database
    if (purchaseOrder) {
      try {
        const result = await PurchaseOrderActionsService.getNotes(purchaseOrder.id);
        if (result.success) {
          setOrderNotes(result.data || []);
        }
      } catch (error) {
        console.error('Failed to load notes:', error);
      }
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim() || !purchaseOrder) return;
    
    try {
      const result = await PurchaseOrderActionsService.addNote(
        purchaseOrder.id,
        newNote.trim(),
        currentUser?.name || 'Unknown'
      );
      
      if (result.success) {
        setOrderNotes(prev => [result.data, ...prev]);
        setNewNote('');
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  const handleBulkSelectItem = (itemId: string) => {
    setBulkSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleBulkAction = async (action: string) => {
    if (bulkSelectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }

    try {
      let result;
      switch (action) {
        case 'update_status':
          result = await PurchaseOrderActionsService.bulkUpdateStatus(bulkSelectedItems, 'shipped');
          break;
        case 'assign_location':
          // Show location input modal for bulk assignment
          const location = prompt('Enter location for selected items:');
          if (location) {
            result = await PurchaseOrderActionsService.bulkAssignLocation(bulkSelectedItems, location);
          } else {
            return; // User cancelled
          }
          break;
        case 'export_selected':
          toast.success('Selected items exported successfully');
          return;
        default:
          toast.error('Invalid bulk action');
          return;
      }

      if (result?.success) {
        toast.success(result.message);
        setBulkSelectedItems([]);
        setShowBulkActions(false);
        await loadPurchaseOrder();
        if (purchaseOrder) {
          await PurchaseOrderActionsService.logAction(purchaseOrder.id, 'bulk_action', { action, item_count: bulkSelectedItems.length });
        }
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  const handleReturnOrder = async (returnData: any) => {
    if (!purchaseOrder) return;
    
    try {
      const result = await PurchaseOrderActionsService.createReturnOrder(purchaseOrder.id, returnData);
      
      if (result.success) {
        toast.success(result.message);
        setShowReturnOrderModal(false);
        await loadPurchaseOrder();
        await PurchaseOrderActionsService.logAction(purchaseOrder.id, 'return_order_created', { return_id: result.data?.id });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error creating return order:', error);
      toast.error('Failed to create return order');
    }
  };

  const handleMakePayment = () => {
    // Prevent payment if order is already fully paid
    if (purchaseOrder?.paymentStatus === 'paid') {
      toast.error('This purchase order has already been fully paid');
      return;
    }
    
    // Calculate remaining amount
    const totalAmount = purchaseOrder?.totalAmount || 0;
    const totalPaid = purchaseOrder?.totalPaid || 0;
    let remainingAmount = totalAmount - totalPaid;
    
    // Handle foreign currency conversion for display
    if (purchaseOrder?.currency && purchaseOrder.currency !== 'TZS' && purchaseOrder.exchangeRate && purchaseOrder.exchangeRate > 1) {
      const paidInOriginalCurrency = totalPaid / purchaseOrder.exchangeRate;
      remainingAmount = totalAmount - paidInOriginalCurrency;
    }
    
    // Check if there's nothing left to pay
    if (totalAmount === 0) {
      toast.error('Cannot make payment: Purchase order has no total amount. Please add items to the order first.');
      return;
    }
    
    if (remainingAmount <= 0) {
      toast.error(`This purchase order has been fully paid. Total: ${totalAmount.toLocaleString()}, Paid: ${totalPaid.toLocaleString()}`);
      return;
    }
    
    console.log('💳 Opening payment modal:', {
      totalAmount,
      totalPaid,
      remainingAmount,
      currency: purchaseOrder?.currency,
      exchangeRate: purchaseOrder?.exchangeRate
    });
    
    setShowPurchaseOrderPaymentModal(true);
  };

  const handlePurchaseOrderPaymentComplete = async (paymentData: any[], _totalPaid?: number) => {
    try {
      // Import the payment service
      const { purchaseOrderPaymentService } = await import('../lib/purchaseOrderPaymentService');
      
      // Process each payment using the enhanced service
      const results = await Promise.all(
        paymentData.map(async (payment) => {
          const result = await purchaseOrderPaymentService.processPayment({
            purchaseOrderId: purchaseOrder?.id || '',
            paymentAccountId: payment.paymentAccountId,
            amount: payment.amount,
            currency: payment.currency || 'TZS',  // Use currency from payment (always TZS after conversion)
            paymentMethod: payment.paymentMethod,
            paymentMethodId: payment.paymentMethodId,
            reference: payment.reference,
            notes: payment.notes,
            createdBy: currentUser?.id || null
          });
          return result;
        })
      );

      // Check if all payments were successful
      const failedPayments = results.filter(result => !result.success);
      
      if (failedPayments.length > 0) {
        const errorMessages = failedPayments.map(result => result.message).join('; ');
        toast.error(`Some payments failed: ${errorMessages}`);
      } else {
        toast.success('All payments processed successfully');

        // Update the purchase order's payment status and total paid
        try {
          if (purchaseOrder?.id) {
            await PurchaseOrderService.updatePaymentStatus(purchaseOrder.id);
            console.log('✅ Purchase order payment status updated');
          }
        } catch (updateError) {
          console.warn('⚠️ Failed to update payment status:', updateError);
          // Don't block the success flow for this non-critical update
        }
      }

      setShowPurchaseOrderPaymentModal(false);

      // Invalidate payment cache to ensure fresh data on next view
      setPaymentsCacheTime(0);

      // Reload purchase order to reflect payment changes
      await loadPurchaseOrder();
      
      // Force reload the entire page to refresh all account balances
      // This ensures the UI shows updated balances immediately
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Failed to process payment. Please try again.');
    }
  };

  // Enhanced handler functions with full functionality

  const handleCancelOrder = async () => {
    if (!purchaseOrder) return;
    
    // Permission check
    if (!hasPermission('cancel')) {
      toast.error('You do not have permission to cancel purchase orders');
      return;
    }
    
    // Validation: Cannot cancel completed or already cancelled orders
    if (purchaseOrder.status === 'completed') {
      toast.error('Cannot cancel a completed order');
      return;
    }
    
    if (purchaseOrder.status === 'cancelled') {
      toast.error('Order is already cancelled');
      return;
    }
    
    // Check if order has been paid
    if (purchaseOrder.paymentStatus === 'paid') {
      if (!confirm('This order has been fully paid. Cancelling will require a refund. Are you sure you want to continue?')) {
        return;
      }
    }
    
    if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      setIsCancelling(true);
      const result = await PurchaseOrderActionsService.cancelOrder(purchaseOrder.id);
      
      if (result.success) {
        toast.success(result.message);
        setPurchaseOrder({ ...purchaseOrder, status: 'cancelled' });
        await loadPurchaseOrder();
        await PurchaseOrderActionsService.logAction(purchaseOrder.id, 'order_cancelled', { reason: 'user_cancelled' });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      toast.error('Failed to cancel purchase order');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReceive = async () => {
    if (!purchaseOrder) return;
    
    // Validation: Check if order is in a receivable status (RELAXED - allows more statuses)
    const receivableStatuses = ['shipped', 'partial_received', 'confirmed', 'sent'];
    if (!receivableStatuses.includes(purchaseOrder.status)) {
      toast.error(`Cannot receive order in status: ${purchaseOrder.status}. Order must be in: ${receivableStatuses.join(', ')}`);
      return;
    }
    
    // RELAXED: Allow receiving even if not fully paid (warehouse can receive before payment)
    // Just show a warning instead of blocking
    if (purchaseOrder.paymentStatus !== 'paid') {
      console.warn('⚠️ Receiving order that is not fully paid:', purchaseOrder.paymentStatus);
      toast.success('Note: Receiving order before full payment', { duration: 3000 });
    }
    
    // Validation: Check if order has items
    if (!purchaseOrder.items || purchaseOrder.items.length === 0) {
      toast.error('Cannot receive order without items');
      return;
    }
    
    // Check if already fully received
    const totalOrdered = purchaseOrder.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalReceived = purchaseOrder.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    
    // Only block if we have valid totals and order is fully received
    if (totalOrdered > 0 && totalReceived >= totalOrdered) {
      toast.error(`Order already fully received: ${totalReceived}/${totalOrdered} items`);
      return;
    }
    
    // Warn if total ordered is 0 (data issue)
    if (totalOrdered === 0) {
      console.warn('⚠️ Purchase order has 0 total quantity ordered. This may indicate a data issue.');
      toast.error('Cannot receive order: No items to receive (total quantity is 0). Please check the order data.');
      return;
    }
    
    console.log('📦 Starting receive process - Opening pricing modal:', {
      orderId: purchaseOrder.id,
      orderNumber: purchaseOrder.orderNumber,
      status: purchaseOrder.status,
      paymentStatus: purchaseOrder.paymentStatus,
      totalOrdered,
      totalReceived,
      remaining: totalOrdered - totalReceived
    });
    
    // Open pricing modal to set prices before receiving
    setShowPricingModal(true);
  };

  const handleConfirmPricingAndReceive = async (pricingData: Map<string, any>) => {
    if (!purchaseOrder || !currentUser) return;
    
    // Step 3 → Step 4: Store pricing data and show "Add to Inventory" confirmation
    console.log('💰 Pricing data confirmed:', pricingData);
    console.log('📦 Serial numbers to include:', tempSerialNumberData);
    
    // Save pricing progress to localStorage
    setTempPricingData(pricingData);
    saveReceiveProgress({ pricingData });
    
    setShowPricingModal(false);
    
    // Calculate total items being received
    const totalItemsReceiving = tempSerialNumberData.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const uniqueProducts = tempSerialNumberData.filter(item => item.receivedQuantity > 0).length;
    
    // Show confirmation dialog with "Add to Inventory" button
    setConfirmDialogState('confirming');
    setShowConfirmDialog(true); // ← BUG FIX: This was missing!
    setConfirmAction({
      title: 'Ready to Add to Inventory',
      message: `You're about to add ${totalItemsReceiving} items (${uniqueProducts} products) to inventory${tempSerialNumberData.some(i => i.serialNumbers?.length > 0) ? ' with serial numbers' : ''}.`,
      onConfirm: async () => {
        try {
          setIsReceiving(true);
          setConfirmDialogState('processing');
          
          // First, update the variant prices in the database
          let priceUpdateCount = 0;
          for (const [itemId, pricing] of pricingData.entries()) {
            const item = purchaseOrder.items.find(i => i.id === itemId);
            if (item && item.variantId) {
              try {
                console.log(`💰 Updating variant ${item.variantId} with selling price: ${pricing.selling_price}`);
                
                const { error: variantError } = await supabase
                  .from('lats_product_variants')
                  .update({
                    selling_price: pricing.selling_price,
                    cost_price: pricing.cost_price,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', item.variantId);
                
                if (variantError) {
                  console.error('Error updating variant price:', variantError);
                  toast.error(`Failed to update price for ${item.product?.name || 'item'}`);
                } else {
                  console.log(`✅ Variant ${item.variantId} price updated successfully`);
                  priceUpdateCount++;
                }
              } catch (error) {
                console.error('Error updating variant:', error);
                toast.error(`Error updating variant prices`);
              }
            }
          }
          
          console.log(`💰 Updated ${priceUpdateCount} variant prices`);
          
          // If serial numbers were provided, save them first
          if (tempSerialNumberData.length > 0) {
            console.log('📦 Saving serial numbers...');
            const serialResult = await PurchaseOrderService.updateReceivedQuantities(
              purchaseOrder.id,
              tempSerialNumberData,
              currentUser.id
            );
            
            if (serialResult.success) {
              toast.success('Serial numbers saved!');
            }
          }
          
          // Small delay to ensure database commits
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Calculate what we're receiving
          const receivingQuantities = new Map<string, number>();
          tempSerialNumberData.forEach(item => {
            receivingQuantities.set(item.id, item.receivedQuantity);
          });
          
          // Check if this is a full or partial receive
          let allItemsFullyReceived = true;
          let totalOrdered = 0;
          let totalReceiving = 0;
          let totalAlreadyReceived = 0;
          
          for (const item of purchaseOrder.items) {
            const ordered = item.quantity;
            const alreadyReceived = item.receivedQuantity || 0;
            const nowReceiving = receivingQuantities.get(item.id) || 0;
            const willHaveReceived = alreadyReceived + nowReceiving;
            
            totalOrdered += ordered;
            totalReceiving += nowReceiving;
            totalAlreadyReceived += alreadyReceived;
            
            if (willHaveReceived < ordered) {
              allItemsFullyReceived = false;
            }
          }
          
          const isPartialReceive = receiveMode === 'partial' && !allItemsFullyReceived;
          
          console.log('📊 Receiving stats:', {
            mode: receiveMode,
            totalOrdered,
            totalAlreadyReceived,
            totalReceiving,
            totalAfterReceiving: totalAlreadyReceived + totalReceiving,
            allItemsFullyReceived,
            isPartialReceive
          });
          
          // Now proceed with receiving the items
          console.log(isPartialReceive ? '📦 Processing partial receive...' : '📦 Processing full/final receive...');
          const result = await PurchaseOrderService.completeReceive(
            purchaseOrder.id,
            currentUser.id,
            isPartialReceive 
              ? `Partial receive: ${totalReceiving} of ${totalOrdered} items`
              : 'Complete receive of purchase order with pricing and serial numbers'
          );
          
          console.log('📦 Receive result:', result);
          
          if (result.success) {
            // Update inventory items with selling prices
            try {
              const { data: inventoryItems, error: inventoryError } = await supabase
                .from('inventory_items')
                .select('id, variant_id')
                .eq('purchase_order_id', purchaseOrder.id);
              
              if (!inventoryError && inventoryItems) {
                for (const invItem of inventoryItems) {
                  const poItem = purchaseOrder.items.find(i => i.variantId === invItem.variant_id);
                  if (poItem) {
                    const pricing = pricingData.get(poItem.id);
                    if (pricing) {
                      await supabase
                        .from('inventory_items')
                        .update({
                          selling_price: pricing.selling_price,
                          cost_price: pricing.cost_price,
                          status: 'available', // Change status from 'pending_pricing' to 'available'
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', invItem.id);
                      
                      console.log(`✅ Updated inventory item ${invItem.id} with selling price: ${pricing.selling_price} and status: available`);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error updating inventory item prices:', error);
            }
            
            // Check result from database function - it already updated the status
            const dbStatus = result.data?.new_status;
            const dbIsComplete = result.data?.is_complete;
            
            console.log('📊 Database result:', {
              status: dbStatus,
              isComplete: dbIsComplete,
              totalReceived: result.data?.total_received,
              totalOrdered: result.data?.total_ordered
            });
            
            // Show appropriate message based on completion
            if (dbIsComplete || allItemsFullyReceived) {
              toast.success(`🎉 All items received! Purchase order complete!`, { duration: 6000 });
              
              // Clear temp data
              setTempSerialNumberData([]);
              setTempPricingData(new Map());
              clearReceiveProgress();
              
              // Show success state briefly
              setConfirmDialogState('success');
              
              // Navigate back to purchase orders list after 2 seconds
              setTimeout(() => {
                setShowConfirmDialog(false);
                setConfirmAction(null);
                setConfirmDialogState('confirming');
                
                // Navigate back to purchase orders list
                toast.success('Returning to purchase orders list...', { duration: 2000 });
                setTimeout(() => {
                  navigate('/lats/purchase-orders');
                }, 500);
              }, 2000);
              
            } else {
              const remaining = totalOrdered - (totalAlreadyReceived + totalReceiving);
              toast.success(`✅ Items added to inventory! ${remaining} items remaining to receive.`, { duration: 5000 });
              
              if (result.summary) {
                console.log('Receive summary:', result.summary);
                
                // Show detailed summary in toast
                const summary = result.summary;
                toast.success(
                  `Received: ${summary.total_received || 0}/${summary.total_ordered || 0} items (${summary.percent_received || 0}% complete)`,
                  { duration: 5000 }
                );
              }
              
              // Clear temp serial number data
              setTempSerialNumberData([]);
              setTempPricingData(new Map());
              
              // Clear saved progress from localStorage
              clearReceiveProgress();
              
              // Reload purchase order data to get updated quantities
              await loadPurchaseOrder();
              
              // Refresh received items tab if it's currently active
              if (activeTab === 'received') {
                console.log('🔄 Refreshing received items tab after receive operation');
                await handleRefreshReceivedItems();
              }
              
              // Switch to received tab to show the results with force refresh
              await handleTabChange('received', true);
              console.log('📋 Switched to received tab to show received items');
              
              // Show success state
              setConfirmDialogState('success');
              
              // Auto-close after showing success for 2 seconds
              setTimeout(() => {
                setShowConfirmDialog(false);
                setConfirmAction(null);
                setConfirmDialogState('confirming');
              }, 2000);
            }
            
          } else {
            console.error('❌ Receive failed:', result);
            toast.error(`Receive failed: ${result.message || 'Unknown error'}`);
            
            // If the error suggests a status issue, provide guidance
            if (result.message && result.message.includes('status')) {
              toast.error(
                `Current status: ${purchaseOrder.status}. Try changing status to 'shipped' first.`,
                { duration: 6000 }
              );
            }
            
            setConfirmDialogState('confirming');
            setShowConfirmDialog(false);
          }
        } catch (error) {
          console.error('Receive error:', error);
          toast.error(`Failed to receive purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setConfirmDialogState('confirming');
          setShowConfirmDialog(false);
        } finally {
          setIsReceiving(false);
        }
      }
    });
    
    // Show the confirmation dialog
    setConfirmDialogState('confirming');
    setShowConfirmDialog(true);
  };

  const handleCompleteOrder = async () => {
    if (!purchaseOrder) return;
    
    // Validation: Order must be received
    if (purchaseOrder.status !== 'received') {
      toast.error('Order must be received before completing');
      return;
    }
    
    // Validation: Order must be fully paid
    if (purchaseOrder.paymentStatus !== 'paid') {
      toast.error('Order must be fully paid before completing');
      return;
    }
    
    // Show completion summary modal
    setShowCompletionSummaryModal(true);
  };

  // Print receipt handler
  const handlePrintReceipt = () => {
    if (!purchaseOrder) return;
    
    const printContent = `
      ═══════════════════════════════════════
           PURCHASE ORDER RECEIPT
      ═══════════════════════════════════════
      
      Order Number: ${purchaseOrder.orderNumber}
      Supplier: ${purchaseOrder.supplier?.name || 'N/A'}
      Order Date: ${new Date(purchaseOrder.orderDate || purchaseOrder.createdAt).toLocaleDateString()}
      Status: ${purchaseOrder.status.toUpperCase()}
      
      ───────────────────────────────────────
      ITEMS SUMMARY
      ───────────────────────────────────────
      Total Items: ${purchaseOrder.items?.length || 0}
      Total Ordered: ${purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
      Total Received: ${purchaseOrder.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
      
      ───────────────────────────────────────
      FINANCIAL SUMMARY
      ───────────────────────────────────────
      Total Amount: ${purchaseOrder.currency || 'TZS'} ${Number(purchaseOrder.totalAmount || 0).toLocaleString()}
      Payment Status: ${purchaseOrder.paymentStatus?.toUpperCase() || 'UNPAID'}
      
      ═══════════════════════════════════════
      Thank you for your business!
      ═══════════════════════════════════════
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Order Receipt - ${purchaseOrder.orderNumber}</title>
            <style>
              body {
                font-family: 'Courier New', monospace;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              pre {
                white-space: pre-wrap;
                font-size: 14px;
                line-height: 1.6;
              }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <pre>${printContent}</pre>
            <script>
              window.onload = () => {
                window.print();
                // Uncomment to auto-close after printing
                // setTimeout(() => window.close(), 100);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Share on WhatsApp handler
  const handleShareWhatsApp = () => {
    if (!purchaseOrder) return;
    
    const message = `
*PURCHASE ORDER COMPLETED* ✅

*Order Number:* ${purchaseOrder.orderNumber}
*Supplier:* ${purchaseOrder.supplier?.name || 'N/A'}
*Order Date:* ${new Date(purchaseOrder.orderDate || purchaseOrder.createdAt).toLocaleDateString()}
*Status:* ${purchaseOrder.status.toUpperCase()}

*Items Summary:*
━━━━━━━━━━━━━━━━
• Total Items: ${purchaseOrder.items?.length || 0}
• Total Ordered: ${purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
• Total Received: ${purchaseOrder.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}

*Financial Summary:*
━━━━━━━━━━━━━━━━
• Total Amount: ${purchaseOrder.currency || 'TZS'} ${Number(purchaseOrder.totalAmount || 0).toLocaleString()}
• Payment Status: ${purchaseOrder.paymentStatus?.toUpperCase() || 'UNPAID'}

Thank you for your business! 🙏
    `.trim();
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const confirmCompleteOrder = async () => {
    if (!purchaseOrder) return;
    
    try {
      setIsCompleting(true);
      setShowCompletionSummaryModal(false);
      
      // First, check completion status
      const statusResult = await PurchaseOrderService.checkCompletionStatus(purchaseOrder.id);
      if (statusResult.success && statusResult.data) {
        console.log('📊 Current completion status:', statusResult.data);
        
        // If not all items are completed, try to fix the data
        if (!statusResult.data.can_complete && statusResult.data.total_items > 0) {
          console.log('🔧 Attempting to fix received quantities...');
          toast.success('Fixing received quantities...');
          
          const fixResult = await PurchaseOrderService.fixReceivedQuantities(
            purchaseOrder.id,
            currentUser?.id || ''
          );
          
          if (fixResult.success) {
            toast.success('Received quantities fixed successfully!');
            console.log('✅ Fix result:', fixResult.data);
          } else {
            console.warn('⚠️ Fix attempt failed:', fixResult.message);
          }
        }
      }
      
      // Now attempt completion
      const result = await PurchaseOrderService.completePurchaseOrder(
        purchaseOrder.id,
        currentUser?.id || '',
        'Purchase order completed after receiving all items'
      );
      
      if (result.success) {
        toast.success('Purchase order completed successfully!');
        console.log('✅ Order completion details:', result.data);
        
        // Reload purchase order data to show updated status
        await loadPurchaseOrder();
        
        // Show completion summary
        if (result.data) {
          console.log('📊 Completion Summary:', {
            orderNumber: result.data.po_number,
            totalItems: result.data.total_items,
            completedItems: result.data.completed_items,
            completionDate: result.data.completion_date
          });
        }
        
      } else {
        // Handle specific error codes with better messages
        let errorMessage = result.message || 'Completion failed';
        
        if (result.error_code === 'P0001') {
          errorMessage = 'Cannot complete: Not all items have been fully received. Please check the received quantities.';
        } else if (result.error_code === 'P0002') {
          errorMessage = 'Cannot complete: Purchase order is not in received status.';
        } else if (result.error_code === 'P0003') {
          errorMessage = 'Cannot complete: No items found in this purchase order.';
        }
        
        toast.error(errorMessage);
        
        // Log detailed error information
        console.error('❌ Completion failed:', {
          error_code: result.error_code,
          message: result.message,
          data: result.data
        });
      }
    } catch (error) {
      console.error('Completion error:', error);
      toast.error('Failed to complete purchase order');
    } finally {
      setIsCompleting(false);
    }
  };

  const handlePartialReceive = async (receivedItems: any[]) => {
    console.log(`🔄 Starting handlePartialReceive for ${receivedItems.length} items`);
    
    if (!purchaseOrder) {
      console.error('❌ No purchase order available for partial receive');
      toast.error('No purchase order available');
      return;
    }
    
    if (!receivedItems || receivedItems.length === 0) {
      console.error('❌ No items provided for partial receive');
      toast.error('No items provided for receiving');
      return;
    }

    // Validate received items
    const validatedItems = receivedItems.filter(item => {
      if (!item.id) {
        console.warn('⚠️ Item missing ID:', item);
        return false;
      }
      if (typeof item.receivedQuantity !== 'number' || item.receivedQuantity < 0) {
        console.warn('⚠️ Invalid received quantity:', item);
        return false;
      }
      return true;
    });

    if (validatedItems.length === 0) {
      console.error('❌ No valid items found for partial receive');
      toast.error('No valid items found for receiving');
      return;
    }

    console.log(`✅ Validated ${validatedItems.length} items for partial receive`);
    
    try {
      setIsSaving(true);
      
      console.log('🔄 Processing partial receive with new stock update function...');
      
      // ⭐ NEW: Use the database function that properly creates inventory items and updates stock
      const { data, error } = await supabase.rpc('partial_purchase_order_receive', {
        purchase_order_id_param: purchaseOrder.id,
        received_items: validatedItems.map(item => ({
          item_id: item.id,
          quantity: item.receivedQuantity
        })),
        user_id_param: currentUser?.id || '',
        receive_notes: 'Partial receive from UI'
      });
      
      console.log('🔍 Partial receive result:', { data, error });
      
      if (error) {
        console.error('❌ Partial receive error:', error);
        toast.error(`Partial receive failed: ${error.message}`);
        return;
      }
      
      // Check if function returned success
      if (data && data.success) {
        console.log('✅ Partial receive completed successfully');
        
        const statusMessage = data.data?.is_complete
          ? 'All items fully received - Order marked as received' 
          : 'Partial receive completed';
        
        toast.success(`${statusMessage}: ${data.message}`);
        
        console.log('🔄 Reloading purchase order to get updated data...');
        await loadPurchaseOrder(); // Reload to get updated data
        
        // Refresh received items tab if it's currently active
        if (activeTab === 'received') {
          console.log('🔄 Refreshing received items tab after partial receive operation');
          await handleRefreshReceivedItems();
        }
        
        // 🔥 Emit event to refresh inventory
        latsEventBus.emit('lats:purchase-order.received', {
          purchaseOrderId: purchaseOrder.id,
          userId: currentUser?.id,
          notes: 'Partial receive'
        });
        
        setShowPartialReceiveModal(false);
      } else {
        console.error('❌ Function returned failure:', data);
        toast.error(`Partial receive failed: ${data?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Exception in partial receive:', {
        error,
        purchaseOrderId: purchaseOrder.id,
        receivedItemsCount: receivedItems.length,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      // Log detailed error
      logPurchaseOrderError('partial_receive_exception', error, {
        purchaseOrderId: purchaseOrder.id,
        operation: 'partial_receive'
      });
      
      let errorMessage = 'Failed to process partial receive';
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error: Please check your internet connection and try again';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timeout: The server is taking too long to respond';
        } else if (error.message.includes('validation')) {
          errorMessage = `Validation error: ${error.message}`;
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      console.log('✅ handlePartialReceive completed');
      setIsSaving(false);
    }
  };

  const handleSerialNumberReceive = async (receivedItems: any[]) => {
    if (!purchaseOrder || !currentUser) return;
    
    // Step 2 → Step 3: Store serial number data temporarily and go to Pricing Modal
    console.log('📦 Serial numbers captured:', receivedItems);
    setTempSerialNumberData(receivedItems);
    
    // Save progress to localStorage
    saveReceiveProgress({ serialNumberData: receivedItems });
    
    setShowSerialNumberReceiveModal(false);
    toast.success('Serial numbers saved! Now set pricing...');
    
    // Open pricing modal after a short delay
    setTimeout(() => {
      setShowPricingModal(true);
    }, 300);
  };




  const handleSendMessage = async (message: string) => {
    if (!message.trim() || !purchaseOrder) return;
    
    try {
      const success = await PurchaseOrderService.sendMessage({
        purchaseOrderId: purchaseOrder.id,
        sender: currentUser?.name || 'You',
        content: message,
        type: 'user'
      });
      
      if (success) {
        const newMessage = {
          id: Date.now().toString(),
          sender: currentUser?.name || 'You',
          content: message,
          timestamp: new Date().toISOString(),
          type: 'user'
        };
        
        setCommunicationHistory(prev => [newMessage, ...prev]);
        toast.success('Message sent successfully');
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const generatePrintContent = async (order: PurchaseOrder) => {
    // Get business information from settings
    const { businessInfoService } = await import('../../../lib/businessInfoService');
    const businessInfo = await businessInfoService.getBusinessInfo();
    
    const businessInfoForPrint = {
      name: businessInfo.name,
      address: businessInfo.address,
      phone: businessInfo.phone,
      email: businessInfo.email || '',
      website: businessInfo.website || '',
      logo: businessInfo.logo || ''
    };

    // Calculate payment due date based on payment terms
    const getPaymentDueDate = (orderDate: string, paymentTerms?: string) => {
      if (!paymentTerms) return 'N/A';
      
      const date = new Date(orderDate);
      const terms = paymentTerms.toLowerCase();
      
      if (terms.includes('net 30')) {
        date.setDate(date.getDate() + 30);
      } else if (terms.includes('net 15')) {
        date.setDate(date.getDate() + 15);
      } else if (terms.includes('net 7')) {
        date.setDate(date.getDate() + 7);
      } else if (terms.includes('cod')) {
        return 'COD (Cash on Delivery)';
      }
      
      return formatDate(date.toISOString());
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order ${order.orderNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              font-size: 12px;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .business-info {
              text-align: center;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .business-info h1 {
              margin: 0;
              font-size: 24px;
              color: #333;
            }
            .business-info p {
              margin: 2px 0;
              color: #666;
            }
            .business-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-top: 15px;
              text-align: left;
            }
            .business-column {
              background-color: #f8f9fa;
              padding: 10px;
              border-radius: 5px;
            }
            .order-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .order-info, .supplier-info {
              border: 1px solid #ddd;
              padding: 15px;
              background-color: #f9f9f9;
            }
            .order-info h3, .supplier-info h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #333;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .order-info p, .supplier-info p {
              margin: 5px 0;
              font-size: 11px;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
              font-size: 11px;
            }
            .items-table th, .items-table td { 
              border: 1px solid #ddd; 
              padding: 8px; 
              text-align: left; 
            }
            .items-table th { 
              background-color: #f2f2f2; 
              font-weight: bold;
            }
            .items-table td {
              vertical-align: top;
            }
            .totals-section {
              margin-top: 20px;
              text-align: right;
            }
            .totals-table {
              width: 300px;
              margin-left: auto;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 5px 10px;
              border: 1px solid #ddd;
            }
            .totals-table .label {
              background-color: #f2f2f2;
              font-weight: bold;
              text-align: left;
            }
            .totals-table .amount {
              text-align: right;
            }
            .totals-table .total-row {
              background-color: #e9e9e9;
              font-weight: bold;
              font-size: 14px;
            }
            .payment-info {
              margin-top: 20px;
              padding: 15px;
              border: 1px solid #ddd;
              background-color: #f9f9f9;
            }
            .payment-info h3 {
              margin: 0 0 15px 0;
              font-size: 14px;
              color: #333;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .payment-details {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .payment-column {
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .notes-section {
              margin-top: 20px;
              padding: 15px;
              border: 1px solid #ddd;
              background-color: #f9f9f9;
            }
            .notes-section h3 {
              margin: 0 0 10px 0;
              font-size: 14px;
              color: #333;
            }
            .footer {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .signature-box {
              text-align: center;
              border: 1px solid #ddd;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .signature-box .line {
              border-bottom: 1px solid #333;
              height: 40px;
              margin-bottom: 5px;
            }
            .terms {
              margin-top: 20px;
              font-size: 10px;
              color: #666;
              border-top: 1px solid #ddd;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <!-- Business Header -->
          <div class="business-info">
            ${businessInfoForPrint.logo ? `<img src="${businessInfoForPrint.logo}" alt="${businessInfoForPrint.name} Logo" style="height: 60px; width: auto; margin: 0 auto 10px auto; display: block; object-fit: contain;" />` : ''}
            <h1>${businessInfoForPrint.name}</h1>
            <div class="business-details">
              <div class="business-column">
                <p><strong>Address:</strong> ${businessInfoForPrint.address}</p>
                <p><strong>Phone:</strong> ${businessInfoForPrint.phone}</p>
              </div>
              <div class="business-column">
                <p><strong>Email:</strong> ${businessInfoForPrint.email}</p>
                <p><strong>Website:</strong> ${businessInfoForPrint.website}</p>
              </div>
            </div>
          </div>

          <!-- Purchase Order Header -->
          <div class="header">
            <h1>PURCHASE ORDER</h1>
            <h2>Order #${order.orderNumber}</h2>
          </div>
          
          <!-- Order and Supplier Details -->
          <div class="order-details">
            <div class="order-info">
              <h3>Order Information</h3>
              <p><strong>Order Date:</strong> ${formatDate(order.orderDate || order.createdAt)}</p>
              <p><strong>Expected Delivery:</strong> ${order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'TBD'}</p>
              <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
              <p><strong>Currency:</strong> ${order.currency === 'TZS' ? 'Tanzania Shillings (TZS)' : order.currency || 'Tanzania Shillings (TZS)'}</p>
              ${order.receivedDate ? `<p><strong>Received Date:</strong> ${formatDate(order.receivedDate)}</p>` : ''}
            </div>
            
            <div class="supplier-info">
              <h3>Supplier Information</h3>
              <p><strong>Company:</strong> ${order.supplier?.name || 'N/A'}</p>
              ${order.supplier?.contactPerson ? `<p><strong>Contact Person:</strong> ${order.supplier.contactPerson}</p>` : ''}
              ${order.supplier?.phone ? `<p><strong>Phone:</strong> ${order.supplier.phone}</p>` : ''}
              ${order.supplier?.email ? `<p><strong>Email:</strong> ${order.supplier.email}</p>` : ''}
              ${order.supplier?.address ? `<p><strong>Address:</strong> ${order.supplier.address}</p>` : ''}
              ${order.supplier?.city ? `<p><strong>City:</strong> ${order.supplier.city}</p>` : ''}
              ${order.supplier?.country ? `<p><strong>Country:</strong> ${order.supplier.country}</p>` : ''}
            </div>
          </div>
          
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 28%;">Product Description</th>
                <th style="width: 18%;">Variant</th>
                <th style="width: 10%;">Ordered</th>
                <th style="width: 10%;">Received</th>
                <th style="width: 14%;">Unit Price</th>
                <th style="width: 14%;">Price (TZS)</th>
                <th style="width: 14%;">Total (TZS)</th>
                <th style="width: 8%;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${order.items.map(item => {
                const receivedQty = item.receivedQuantity || 0;
                const unitPriceTZS = order.exchangeRate && order.exchangeRate !== 1.0 ? 
                  item.costPrice * order.exchangeRate : item.costPrice;
                const totalPriceTZS = unitPriceTZS * item.quantity;
                
                return `
                <tr>
                  <td>
                    <strong>${item.product?.name || `Product ${item.productId}`}</strong>
                    ${item.product?.description ? `<br><small>${item.product.description}</small>` : ''}
                    ${item.product?.sku ? `<br><small>SKU: ${item.product.sku}</small>` : ''}
                  </td>
                  <td>${item.variant?.name || `Variant ${item.variantId}`}</td>
                  <td style="text-align: center; font-weight: bold;">${item.quantity}</td>
                  <td style="text-align: center; color: ${receivedQty > 0 ? '#28a745' : '#6c757d'};">${receivedQty}</td>
                  <td style="text-align: right;">${formatCurrency(item.costPrice, order.currency)}</td>
                  <td style="text-align: right; color: #2c5aa0; font-weight: bold;">TZS ${unitPriceTZS.toLocaleString()}</td>
                  <td style="text-align: right; color: #2c5aa0; font-weight: bold;">TZS ${totalPriceTZS.toLocaleString()}</td>
                  <td style="text-align: center;">
                    <span style="font-size: 10px; padding: 2px 6px; border-radius: 3px; background-color: ${
                      item.status === 'received' ? '#d4edda' : 
                      item.status === 'shipped' ? '#cfe2ff' : 
                      item.status === 'cancelled' ? '#f8d7da' : '#e2e3e5'
                    }; color: ${
                      item.status === 'received' ? '#155724' : 
                      item.status === 'shipped' ? '#084298' : 
                      item.status === 'cancelled' ? '#721c24' : '#383d41'
                    };">
                      ${(item.status || 'pending').toUpperCase()}
                    </span>
                  </td>
                </tr>
              `;
              }).join('')}
            </tbody>
          </table>
          
          <!-- Totals Section -->
          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td class="label">Subtotal:</td>
                <td class="amount">${formatCurrency(order.totalAmount, order.currency)}</td>
              </tr>
              ${order.exchangeRate && order.exchangeRate !== 1.0 && order.totalAmountBaseCurrency ? `
                <tr>
                  <td class="label">Exchange Rate:</td>
                  <td class="amount">${order.exchangeRate} (${order.exchangeRateSource || 'Manual'})</td>
                </tr>
                <tr>
                  <td class="label">TZS Equivalent:</td>
                  <td class="amount">TZS ${order.totalAmountBaseCurrency.toLocaleString()}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td class="label">TOTAL AMOUNT:</td>
                <td class="amount">${formatCurrency(order.totalAmount, order.currency)}</td>
              </tr>
            </table>
          </div>

          <!-- Payment Information -->
          <div class="payment-info">
            <h3>Payment Information</h3>
            <div class="payment-details">
              <div class="payment-column">
                <p><strong>Payment Terms:</strong> Net 30</p>
                <p><strong>Payment Due Date:</strong> ${getPaymentDueDate(order.orderDate || order.createdAt, 'Net 30')}</p>
                <p><strong>Payment Status:</strong> 
                  <span style="padding: 2px 8px; border-radius: 3px; background-color: ${
                    order.paymentStatus === 'paid' ? '#d4edda' : 
                    order.paymentStatus === 'partial' ? '#fff3cd' : '#f8d7da'
                  }; color: ${
                    order.paymentStatus === 'paid' ? '#155724' : 
                    order.paymentStatus === 'partial' ? '#856404' : '#721c24'
                  };">
                    ${(order.paymentStatus || 'unpaid').toUpperCase()}
                  </span>
                </p>
              </div>
              <div class="payment-column">
                <p><strong>Total Paid:</strong> ${formatCurrency(order.totalPaid || 0, order.currency)}</p>
                <p><strong>Balance Due:</strong> ${formatCurrency((order.totalAmount || 0) - (order.totalPaid || 0), order.currency)}</p>
                <p><strong>Payment Method:</strong> TBD</p>
              </div>
            </div>
          </div>
          
          <!-- Notes Section -->
          ${order.notes ? `
            <div class="notes-section">
              <h3>Order Notes</h3>
              <p>${order.notes}</p>
            </div>
          ` : ''}

          <!-- Footer with Signatures -->
          <div class="footer">
            <div class="signature-box">
              <div class="line"></div>
              <p><strong>Authorized Signature</strong></p>
              <p>Date: _______________</p>
            </div>
            <div class="signature-box">
              <div class="line"></div>
              <p><strong>Supplier Signature</strong></p>
              <p>Date: _______________</p>
            </div>
          </div>

          <!-- Terms and Conditions -->
          <div class="terms">
            <p><strong>Terms and Conditions:</strong></p>
            <p>1. All prices are subject to change without notice.</p>
            <p>2. Payment terms as specified above.</p>
            <p>3. Delivery terms: FOB destination unless otherwise specified.</p>
            <p>4. Any discrepancies must be reported within 48 hours of delivery.</p>
            <p>5. This purchase order is subject to our standard terms and conditions.</p>
          </div>
        </body>
      </html>
    `;
  };

  const generatePDFContent = (order: PurchaseOrder) => {
    // Enhanced PDF content with all the missing information
    const businessInfo = {
      name: 'LATS CHANCE STORE',
      address: 'Dar es Salaam, Tanzania',
      phone: '+255 XXX XXX XXX',
      email: 'info@latschance.com'
    };

    return `
LATS CHANCE STORE
${businessInfo.address}
Phone: ${businessInfo.phone} | Email: ${businessInfo.email}

PURCHASE ORDER #${order.orderNumber}

ORDER INFORMATION:
Date: ${formatDate(order.orderDate || order.createdAt)}
Expected Delivery: ${order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'TBD'}
Status: ${order.status.toUpperCase()}
Currency: ${order.currency === 'TZS' ? 'Tanzania Shillings (TZS)' : order.currency || 'Tanzania Shillings (TZS)'}
${order.receivedDate ? `Received Date: ${formatDate(order.receivedDate)}` : ''}

SUPPLIER INFORMATION:
Company: ${order.supplier?.name || 'N/A'}
${order.supplier?.contactPerson ? `Contact Person: ${order.supplier.contactPerson}` : ''}
${order.supplier?.phone ? `Phone: ${order.supplier.phone}` : ''}
${order.supplier?.email ? `Email: ${order.supplier.email}` : ''}
${order.supplier?.address ? `Address: ${order.supplier.address}` : ''}
${order.supplier?.city ? `City: ${order.supplier.city}` : ''}
${order.supplier?.country ? `Country: ${order.supplier.country}` : ''}

ITEMS:
${order.items.map((item, index) => {
  const receivedQty = item.receivedQuantity || 0;
  const unitPriceTZS = order.exchangeRate && order.exchangeRate !== 1.0 ? 
    item.costPrice * order.exchangeRate : item.costPrice;
  const totalPriceTZS = unitPriceTZS * item.quantity;
  
  return `
${index + 1}. ${item.product?.name || `Product ${item.productId}`}
   Variant: ${item.variant?.name || `Variant ${item.variantId}`}
   ${item.product?.sku ? `SKU: ${item.product.sku}` : ''}
   Ordered: ${item.quantity} | Received: ${receivedQty}
   Unit Price: ${formatCurrency(item.costPrice, order.currency)} (TZS ${unitPriceTZS.toLocaleString()})
   Total: TZS ${totalPriceTZS.toLocaleString()}
   Status: ${(item.status || 'pending').toUpperCase()}
`;
}).join('')}

PAYMENT INFORMATION:
Payment Terms: ${order.paymentTerms || 'Net 30'}
Payment Status: ${(order.paymentStatus || 'unpaid').toUpperCase()}
Total Paid: ${formatCurrency(order.totalPaid || 0, order.currency)}
Balance Due: ${formatCurrency((order.totalAmount || 0) - (order.totalPaid || 0), order.currency)}

TOTALS:
Subtotal: ${formatCurrency(order.totalAmount, order.currency)}
${order.exchangeRate && order.exchangeRate !== 1.0 && order.totalAmountBaseCurrency ? `
Exchange Rate: ${order.exchangeRate} (${order.exchangeRateSource || 'Manual'})
TZS Equivalent: TZS ${order.totalAmountBaseCurrency.toLocaleString()}
` : ''}
TOTAL AMOUNT: ${formatCurrency(order.totalAmount, order.currency)}

${order.notes ? `NOTES:\n${order.notes}\n` : ''}

SIGNATURES:
Authorized Signature: _________________ Date: _______________
Supplier Signature: _________________ Date: _______________

TERMS AND CONDITIONS:
1. All prices are subject to change without notice.
2. Payment terms as specified above.
3. Delivery terms: FOB destination unless otherwise specified.
4. Any discrepancies must be reported within 48 hours of delivery.
5. This purchase order is subject to our standard terms and conditions.
    `;
  };

  const generateExcelContent = (order: PurchaseOrder, XLSX: any) => {
    // Business information

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Purchase Order Summary Sheet with proper column structure
    const summaryData = [
      // Header section
      ['LATS CHANCE STORE', '', '', ''],
      ['Purchase Order Summary', '', '', ''],
      ['', '', '', ''],
      
      // Order Information section
      ['ORDER INFORMATION', '', '', ''],
      ['Order Number:', order.orderNumber, '', ''],
      ['Order Date:', formatDate(order.orderDate || order.createdAt), '', ''],
      ['Expected Delivery:', order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'TBD', '', ''],
      ['Status:', order.status.toUpperCase(), '', ''],
      ['Currency:', order.currency === 'TZS' ? 'Tanzania Shillings (TZS)' : order.currency || 'Tanzania Shillings (TZS)', '', ''],
      ['', '', '', ''],
      
      // Supplier Information section
      ['SUPPLIER INFORMATION', '', '', ''],
      ['Company:', order.supplier?.name || 'N/A', '', ''],
      ['Contact Person:', order.supplier?.contactPerson || '', '', ''],
      ['Phone:', order.supplier?.phone || '', '', ''],
      ['Email:', order.supplier?.email || '', '', ''],
      ['Address:', order.supplier?.address || '', '', ''],
      ['City:', order.supplier?.city || '', '', ''],
      ['Country:', order.supplier?.country || '', '', ''],
      ['', '', '', ''],
      
      // Payment Information section
      ['PAYMENT INFORMATION', '', '', ''],
      ['Payment Terms:', 'Net 30', '', ''],
      ['Payment Status:', (order.paymentStatus || 'unpaid').toUpperCase(), '', ''],
      ['Total Paid:', formatCurrency(order.totalPaid || 0, order.currency), '', ''],
      ['Balance Due:', formatCurrency((Number(order.totalAmount) || 0) - (Number(order.totalPaid) || 0), order.currency), '', ''],
      ['', '', '', ''],
      
      // Totals section
      ['TOTALS', '', '', ''],
      ['Subtotal:', formatCurrency(Number(order.totalAmount) || 0, order.currency), '', ''],
      ...(order.exchangeRate && order.exchangeRate !== 1.0 && order.totalAmountBaseCurrency ? [
        ['Exchange Rate:', `${order.exchangeRate} (${order.exchangeRateSource || 'Manual'})`, '', ''],
        ['TZS Equivalent:', `TZS ${order.totalAmountBaseCurrency.toLocaleString()}`, '', '']
      ] : []),
      ['TOTAL AMOUNT:', formatCurrency(Number(order.totalAmount) || 0, order.currency), '', '']
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    
    // Set column widths for summary sheet
    summarySheet['!cols'] = [
      { wch: 20 }, // Column A - Labels
      { wch: 30 }, // Column B - Values
      { wch: 15 }, // Column C - Empty
      { wch: 15 }  // Column D - Empty
    ];
    
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Items Sheet with proper column structure
    const itemsData = [
      // Header row
      ['Product Description', 'Variant', 'Ordered Qty', 'Received Qty', 'Unit Price', 'Price (TZS)', 'Total (TZS)', 'Status', 'SKU']
    ];

    // Add items data
    order.items.forEach(item => {
      const receivedQty = item.receivedQuantity || 0;
      const unitPriceTZS = order.exchangeRate && order.exchangeRate !== 1.0 ? 
        item.costPrice * order.exchangeRate : item.costPrice;
      const totalPriceTZS = unitPriceTZS * item.quantity;

      itemsData.push([
        item.product?.name || `Product ${item.productId}`,
        item.variant?.name || `Variant ${item.variantId}`,
        item.quantity.toString(),
        receivedQty.toString(),
        formatCurrency(item.costPrice, order.currency),
        `TZS ${unitPriceTZS.toLocaleString()}`,
        `TZS ${totalPriceTZS.toLocaleString()}`,
        (item.status || 'pending').toUpperCase(),
        item.product?.sku || ''
      ]);
    });

    // Add totals row
    const totalOrdered = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = order.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const totalAmountTZS = order.items.reduce((sum, item) => {
      const unitPriceTZS = order.exchangeRate && order.exchangeRate !== 1.0 ? 
        item.costPrice * order.exchangeRate : item.costPrice;
      return sum + (unitPriceTZS * item.quantity);
    }, 0);

    itemsData.push([
      'TOTALS',
      '',
      totalOrdered.toString(),
      totalReceived.toString(),
      '',
      '',
      `TZS ${totalAmountTZS.toLocaleString()}`,
      '',
      ''
    ]);

    const itemsSheet = XLSX.utils.aoa_to_sheet(itemsData);
    
    // Set column widths for items sheet
    itemsSheet['!cols'] = [
      { wch: 30 }, // Product Description
      { wch: 20 }, // Variant
      { wch: 12 }, // Ordered Qty
      { wch: 12 }, // Received Qty
      { wch: 15 }, // Unit Price
      { wch: 15 }, // Price (TZS)
      { wch: 15 }, // Total (TZS)
      { wch: 12 }, // Status
      { wch: 15 }  // SKU
    ];
    
    // Add borders and formatting to header row
    const headerRange = XLSX.utils.decode_range(itemsSheet['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!itemsSheet[cellAddress]) continue;
      
      itemsSheet[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
    
    // Format totals row
    const totalsRowIndex = itemsData.length - 1;
    for (let col = 0; col < itemsData[0].length; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: totalsRowIndex, c: col });
      if (!itemsSheet[cellAddress]) continue;
      
      itemsSheet[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F2F2F2" } },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
    
    XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');

    return workbook;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-yellow-600 bg-yellow-100';
      case 'sent': return 'text-blue-600 bg-blue-100';
      case 'confirmed': return 'text-purple-600 bg-purple-100';
      case 'received': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <FileText className="w-4 h-4" />;
      case 'sent': return <Send className="w-4 h-4" />;
      case 'confirmed': return <CheckSquare className="w-4 h-4" />;
      case 'received': return <CheckSquare className="w-4 h-4" />;
      case 'cancelled': return <XSquare className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currencyCode: string = 'TZS') => {
    // Ensure amount is a valid number
    const safeAmount = isNaN(amount) ? 0 : amount;
    
    // Format the number with proper locale
    const formattedAmount = new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(safeAmount);
    
    // Add currency symbol/code based on currency (excluding CNY)
    switch (currencyCode?.toUpperCase()) {
      case 'TZS':
        return `TZS ${formattedAmount}`;
      case 'USD':
        return `$${formattedAmount}`;
      case 'EUR':
        return `€${formattedAmount}`;
      case 'GBP':
        return `£${formattedAmount}`;
      case 'AED':
        return `AED ${formattedAmount}`;
      case 'CNY':
        // Remove CNY currency display, show only the amount
        return formattedAmount;
      default:
        return `${currencyCode} ${formattedAmount}`;
    }
  };

  // Helper function to safely calculate average cost per item
  const calculateAverageCostPerItem = (totalAmount: number, items: any[]) => {
    if (!items || items.length === 0) return 0;
    
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    if (totalQuantity === 0) return 0;
    
    return totalAmount / totalQuantity;
  };

  // Helper function to validate currency consistency
  const validateCurrencyConsistency = (purchaseOrder: any) => {
    const issues = [];
    
    // Check if currency is properly set
    if (!purchaseOrder.currency) {
      issues.push('Currency not set - defaulting to TZS');
    }
    
    // Check for exchange rate inconsistencies
    if (purchaseOrder.currency && purchaseOrder.currency !== 'TZS') {
      if (!purchaseOrder.exchangeRate || purchaseOrder.exchangeRate === 1.0) {
        issues.push('Exchange rate missing for non-TZS currency');
      }
      if (!purchaseOrder.totalAmountBaseCurrency) {
        issues.push('Base currency amount not calculated');
      }
    }
    
    return issues;
  };


  // Helper function to calculate TZS equivalent
  const calculateTZSEquivalent = (amount: number, currency: string, exchangeRate?: number) => {
    if (currency === 'TZS' || !exchangeRate || exchangeRate === 1.0) {
      return amount;
    }
    return Math.round(amount * exchangeRate);
  };

  // Helper function to format exchange rate display
  const formatExchangeRate = (rate: number) => {
    return rate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not set';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Not set';
    
    return date.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoadingOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading purchase order...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!purchaseOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Purchase Order Not Found</h2>
            <p className="text-gray-600 mb-4">The purchase order you're looking for doesn't exist.</p>
            <GlassButton onClick={() => navigate('/lats/purchase-orders')}>
              Back to Purchase Orders
            </GlassButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={() => navigate('/lats/purchase-orders')}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Header */}
        <div className={`flex items-center justify-between p-6 border-b flex-shrink-0 ${isEditing ? 'border-blue-200 bg-blue-50' : 'border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isEditing ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">{purchaseOrder.orderNumber}</h2>
                {isEditing && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    <Edit className="w-4 h-4" />
                    Editing Mode
                  </div>
                )}
                {/* Autoloading indicator */}
                {isBackgroundLoading && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    Auto-refreshing...
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchaseOrder.status)}`}>
                  {getStatusIcon(purchaseOrder.status)}
                  <span className="capitalize">{purchaseOrder.status}</span>
                </span>
                <span className="ml-2">Created {formatDate(purchaseOrder.createdAt)}</span>
                {lastRefreshTime && (
                  <span className="ml-2 text-xs text-gray-400">
                    • Last updated: {lastRefreshTime.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/lats/purchase-orders')}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex space-x-8 px-6">
            <button
              onClick={() => handleTabChange('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                Overview
              </div>
            </button>
            <button
              onClick={() => handleTabChange('supplier')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'supplier'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Supplier
              </div>
            </button>
            <button
              onClick={() => handleTabChange('items')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'items'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Items & Inventory
                {receivedItems.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    {receivedItems.length}
                  </span>
                )}
              </div>
            </button>
            {/* Received tab merged into Items tab */}
            <button
              onClick={() => handleTabChange('analytics')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'analytics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </div>
            </button>
            <button
              onClick={() => handleTabChange('history')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              {purchaseOrder ? (
                <>

              {/* Main Content Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column - Order Details */}
                <div className="space-y-6">
                  {/* Order Information */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Info className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Order Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Order Number</span>
                        <p className="text-sm font-medium text-gray-900 font-mono">{purchaseOrder.orderNumber}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Status</span>
                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchaseOrder.status)}`}>
                          {getStatusIcon(purchaseOrder.status)}
                          <span className="capitalize">{purchaseOrder.status}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Created Date</span>
                        <p className="text-sm font-medium text-gray-900">{formatDate(purchaseOrder.createdAt)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</span>
                        <p className="text-sm font-medium text-gray-900">{formatDate(purchaseOrder.updatedAt)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Expected Delivery</span>
                        {isEditing ? (
                          <input
                            type="date"
                            value={purchaseOrder.expectedDeliveryDate ? new Date(purchaseOrder.expectedDeliveryDate).toISOString().split('T')[0] : ''}
                            onChange={(e) => setPurchaseOrder(prev => prev ? { ...prev, expectedDeliveryDate: e.target.value ? new Date(e.target.value).toISOString() : undefined } : null)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                          />
                        ) : (
                          <p className="text-sm font-medium text-gray-900">
                            {purchaseOrder.expectedDeliveryDate ? formatDate(purchaseOrder.expectedDeliveryDate) : 'Not set'}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Currency</span>
                        <p className="text-sm font-medium text-gray-900">{purchaseOrder.currency || 'TZS'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Financial Summary</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Total Amount</span>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Items Count</span>
                        <p className="text-lg font-bold text-blue-600">{purchaseOrder.items?.length || 0}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Total Quantity</span>
                        <p className="text-lg font-bold text-orange-600">
                          {purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Received</span>
                        <p className="text-lg font-bold text-purple-600">
                          {purchaseOrder.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
                        </p>
                      </div>
                      {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && purchaseOrder.totalAmountBaseCurrency && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">TZS Equivalent</span>
                          <p className="text-lg font-bold text-blue-600">TZS {purchaseOrder.totalAmountBaseCurrency.toLocaleString()}</p>
                        </div>
                      )}
                      {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && (
                        <div className="col-span-2 space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Exchange Rate</span>
                          <p className="text-sm font-medium text-gray-900">
                            1 {purchaseOrder.currency} = {Math.round(parseFloat(purchaseOrder.exchangeRate.toString()))} TZS
                            {purchaseOrder.exchangeRateSource && purchaseOrder.exchangeRateSource !== 'default' && (
                              <span className="text-xs text-gray-500 ml-2">({purchaseOrder.exchangeRateSource})</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Notes</h3>
                    </div>
                    {isEditing ? (
                      <textarea
                        value={purchaseOrder.notes || ''}
                        onChange={(e) => setPurchaseOrder(prev => prev ? { ...prev, notes: e.target.value } : null)}
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none text-sm"
                        rows={4}
                        placeholder="Add notes for this purchase order..."
                      />
                    ) : (
                      purchaseOrder.notes ? (
                        <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-3">
                          {purchaseOrder.notes}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No notes added</p>
                      )
                    )}
                  </div>
                </div>

                {/* Right Column - Actions & Summary */}
                <div className="space-y-6">
                  {/* Actions */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Zap className="w-5 h-5 text-purple-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Actions</h3>
                    </div>
                    
                    {/* Simplified Primary Actions */}
                    <div className="space-y-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors font-medium text-sm"
                          >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button
                            onClick={() => setIsEditing(false)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium text-sm"
                          >
                            <X className="w-4 h-4" />
                            Cancel Edit
                          </button>
                        </>
                      ) : (
                        <>
                          {/* DRAFT - Approve & Send (combined) */}
                          {purchaseOrder.status === 'draft' && (
                            <>
                              {hasPermission('approve') && (
                                <button
                                  onClick={handleApproveAndSend}
                                  disabled={isApproving || isSaving}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-lg shadow-green-600/20"
                                  aria-label="Approve and send purchase order"
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  {isApproving ? 'Processing...' : 'Approve & Send to Supplier'}
                                </button>
                              )}
                              {hasPermission('delete') && (
                                <button
                                  onClick={handleDelete}
                                  disabled={isDeleting || isSaving}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                                  aria-label="Delete purchase order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {isDeleting ? 'Deleting...' : 'Delete Order'}
                                </button>
                              )}
                            </>
                          )}
                          
                          {/* SENT/SHIPPED - Payment or Receive */}
                          {(purchaseOrder.status === 'sent' || purchaseOrder.status === 'shipped') && (
                            <>
                              {purchaseOrder.paymentStatus !== 'paid' ? (
                                <div className="space-y-3">
                                  <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                      <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-orange-900 mb-1">Payment Required</h4>
                                        <p className="text-sm text-orange-700">
                                          Complete payment before receiving this order
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={handleMakePayment}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-orange-600/20"
                                    aria-label="Make payment for purchase order"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                    Make Payment
                                  </button>
                                  
                                  {hasPermission('cancel') && (
                                    <button
                                      onClick={handleCancelOrder}
                                      disabled={isCancelling}
                                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                                    >
                                      <XCircle className="w-4 h-4" />
                                      {isCancelling ? 'Cancelling...' : 'Cancel Order'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="p-3 bg-green-50 border-2 border-green-200 rounded-lg">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="w-5 h-5 text-green-600" />
                                      <span className="text-sm font-semibold text-green-900">
                                        Payment Complete - Ready to Receive
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <button
                                    onClick={() => setShowConsolidatedReceiveModal(true)}
                                    disabled={isReceiving}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-lg shadow-green-600/20"
                                    aria-label="Receive purchase order"
                                  >
                                    <Package className="w-4 h-4" />
                                    {isReceiving ? 'Receiving...' : 'Receive Order'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* PENDING PRICING - Set prices for received items and complete order */}
                          {/* PARTIAL RECEIVED - Continue receiving */}
                          {(() => {
                            // Only show if there are items left to receive
                            const hasItemsToReceive = purchaseOrder.items?.some(item => {
                              const received = item.receivedQuantity || 0;
                              const ordered = item.quantity || 0;
                              return received < ordered;
                            }) || false;
                            
                            return purchaseOrder.status === 'partial_received' && 
                                   purchaseOrder.paymentStatus === 'paid' && 
                                   hasItemsToReceive && (
                              <button
                                onClick={() => setShowConsolidatedReceiveModal(true)}
                                disabled={isReceiving}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-600/20"
                                aria-label="Continue receiving items"
                              >
                                <Package className="w-4 h-4" />
                                {isReceiving ? 'Receiving...' : 'Continue Receiving'}
                              </button>
                            );
                          })()}

                          {/* RECEIVED - Complete order (Quality Check is optional during receive) */}
                          {purchaseOrder.status === 'received' && (
                            <>
                              <button
                                onClick={handleCompleteOrder}
                                disabled={isCompleting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium shadow-lg shadow-green-600/20"
                                aria-label="Complete purchase order"
                              >
                                <CheckCircle className="w-4 h-4" />
                                {isCompleting ? 'Completing...' : 'Complete Order'}
                              </button>
                              
                              <button
                                onClick={handleQualityControl}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium text-sm"
                              >
                                <PackageCheck className="w-4 h-4" />
                                Quality Check (Optional)
                              </button>
                            </>
                          )}
                          
                          {/* Completed Status - Show completion message */}
                          {purchaseOrder.status === 'completed' && (
                            <div className="text-center py-6">
                              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">Order Completed</h3>
                              <p className="text-gray-600 text-sm">
                                This purchase order has been successfully completed and all items are in inventory
                              </p>
                            </div>
                          )}

                          {/* Cancelled Status - Show cancellation message */}
                          {purchaseOrder.status === 'cancelled' && (
                            <div className="text-center py-6">
                              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                              <h3 className="text-lg font-semibold text-gray-800 mb-2">Order Cancelled</h3>
                              <p className="text-gray-600 text-sm">
                                This purchase order has been cancelled and cannot be processed further
                              </p>
                            </div>
                          )}

                          {/* Return Order - Only show if received */}
                          {(purchaseOrder.status === 'received' || purchaseOrder.status === 'partial_received') && (
                            <button
                              onClick={() => setShowReturnOrderModal(true)}
                              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium text-sm"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Return Order
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Secondary Actions - Simplified */}
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Documents & More</h4>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={handlePrintOrder}
                          disabled={isPrinting}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                          aria-label="Print purchase order"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                        
                        {/* Export Dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Export
                          </button>
                          {showExportMenu && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setShowExportMenu(false)}
                              />
                              <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[160px]">
                                <button
                                  onClick={() => {
                                    handleExportPDF();
                                    setShowExportMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm flex items-center gap-2 text-gray-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  Export as PDF
                                </button>
                                <button
                                  onClick={() => {
                                    handleExportExcel();
                                    setShowExportMenu(false);
                                  }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-t flex items-center gap-2 text-gray-700"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  Export as Excel
                                </button>
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          onClick={handleViewNotes}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium text-sm"
                          aria-label="View and add notes"
                        >
                          <FileText className="w-4 h-4" />
                          Notes
                        </button>

                        {/* Only show Duplicate for completed/cancelled orders, or as a secondary action for active orders */}
                        {(purchaseOrder.status === 'completed' || purchaseOrder.status === 'cancelled') && (
                          <button
                            onClick={handleDuplicateOrder}
                            disabled={isDuplicating}
                            className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium text-sm"
                            aria-label="Duplicate this order"
                          >
                            <Copy className="w-4 h-4" />
                            {isDuplicating ? 'Duplicating...' : 'Duplicate'}
                          </button>
                        )}

                        <button
                          onClick={() => setShowBulkActions(true)}
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
                          aria-label="Bulk actions on items"
                        >
                          <Layers className="w-4 h-4" />
                          Bulk Actions
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Order Summary */}
                  <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800">Order Summary</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{purchaseOrder.items?.length || 0}</div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Items</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-600">
                            {purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                          </div>
                          <div className="text-xs text-gray-600 uppercase tracking-wide">Quantity</div>
                        </div>
                      </div>
                      
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">
                          {purchaseOrder.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
                        </div>
                        <div className="text-xs text-green-700 uppercase tracking-wide">Received</div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-100">
                        <div className="text-center">
                          <div className="text-lg font-bold text-gray-900 mb-1">Total Amount</div>
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}
                          </div>
                          
                          {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && purchaseOrder.totalAmountBaseCurrency && (
                            <div className="mt-2 text-sm text-blue-600">
                              TZS {purchaseOrder.totalAmountBaseCurrency.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Info className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Order Details</h3>
                    <p className="text-gray-500">Please wait while we load the purchase order information...</p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Supplier Tab */}
          {activeTab === 'supplier' && (
            <div className="space-y-6">
              {(() => {
                console.log('🔍 [Supplier Tab] Debug supplier data:', {
                  hasSupplier: !!purchaseOrder.supplier,
                  supplier: purchaseOrder.supplier,
                  supplierId: purchaseOrder.supplierId
                });
                return null;
              })()}
              {purchaseOrder.supplier ? (
                <>
                  {/* Supplier Information */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Building className="w-5 h-5 text-orange-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Supplier Information</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Name</span>
                        <p className="text-sm font-medium text-gray-900">{purchaseOrder.supplier.name}</p>
                      </div>
                      {purchaseOrder.supplier.contactPerson && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Contact Person</span>
                          <p className="text-sm font-medium text-gray-900">{purchaseOrder.supplier.contactPerson}</p>
                        </div>
                      )}
                      {purchaseOrder.supplier.phone && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Phone</span>
                          <p className="text-sm font-medium text-gray-900">{purchaseOrder.supplier.phone}</p>
                        </div>
                      )}
                      {purchaseOrder.supplier.email && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Email</span>
                          <p className="text-sm font-medium text-gray-900">{purchaseOrder.supplier.email}</p>
                        </div>
                      )}
                      {purchaseOrder.supplier.country && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Country</span>
                          <p className="text-sm font-medium text-gray-900">{purchaseOrder.supplier.country}</p>
                        </div>
                      )}
                      {purchaseOrder.supplier.currency && (
                        <div className="space-y-1">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Preferred Currency</span>
                          <p className="text-sm font-medium text-gray-900">{purchaseOrder.supplier.currency}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Supplier Performance */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Supplier Performance</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Rating</span>
                        <p className="text-sm font-medium text-gray-900">
                          {(purchaseOrder.supplier as any).rating ? `${(purchaseOrder.supplier as any).rating}/5` : 'Not Rated'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Lead Time</span>
                        <p className="text-sm font-medium text-gray-900">
                          {(purchaseOrder.supplier as any).leadTime ? `${(purchaseOrder.supplier as any).leadTime} days` : 'Not Set'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">Total Orders</span>
                        <p className="text-sm font-medium text-gray-900">
                          {(purchaseOrder.supplier as any).totalOrders || 0}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-gray-500 uppercase tracking-wide">On-Time Delivery</span>
                        <p className="text-sm font-medium text-gray-900">
                          {(purchaseOrder.supplier as any).onTimeDeliveryRate ? `${(purchaseOrder.supplier as any).onTimeDeliveryRate}%` : 'Not Tracked'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Communication History */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <h3 className="text-sm font-semibold text-gray-800">Communication History</h3>
                      </div>
                      <button
                        onClick={handleViewCommunication}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View All
                      </button>
                    </div>
                    <div className="space-y-2">
                      {communicationHistory.length > 0 ? (
                        communicationHistory.slice(0, 3).map((comm, index) => (
                          <div key={index} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{comm.type}</p>
                                <p className="text-xs text-gray-600">{comm.message}</p>
                              </div>
                              <span className="text-xs text-gray-500">{comm.date ? (typeof comm.date === 'string' ? comm.date : new Date(comm.date).toLocaleString()) : comm.timestamp ? new Date(comm.timestamp).toLocaleString() : 'N/A'}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 text-center py-4">No communication history</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No supplier information available</p>
                </div>
              )}
            </div>
          )}

          {/* Items Tab - Now includes Quality Check and Received Items */}
          {activeTab === 'items' && (
            <div className="space-y-6">
              {/* Quality Check Summary */}
              {purchaseOrder && (
                <QualityCheckSummary 
                  purchaseOrderId={purchaseOrder.id}
                  onViewDetails={(qcId) => {
                    console.log('View quality check details:', qcId);
                    setSelectedQualityCheckId(qcId);
                    setShowQualityCheckDetailsModal(true);
                  }}
                  onItemsReceived={async () => {
                    await loadPurchaseOrder();
                    await handleRefreshReceivedItems();
                  }}
                />
              )}

              {/* Ordered Items Section */}
              {isLoadingPurchaseOrderItems ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading purchase order items...</p>
                  </div>
                </div>
              ) : purchaseOrderItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No items in this order</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Order Items ({purchaseOrderItems.length} items)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-3 font-medium text-gray-700">Product</th>
                          <th className="text-left p-3 font-medium text-gray-700 hidden sm:table-cell">Variant</th>
                          <th className="text-left p-3 font-medium text-gray-700">Quantity</th>
                          <th className="text-left p-3 font-medium text-gray-700 hidden md:table-cell">Cost Price</th>
                          <th className="text-left p-3 font-medium text-gray-700 hidden md:table-cell">Set Price</th>
                          <th className="text-left p-3 font-medium text-gray-700">Total</th>
                          {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && (
                            <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">TZS Total</th>
                          )}
                          <th className="text-left p-3 font-medium text-gray-700">Received</th>
                          <th className="text-left p-3 font-medium text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseOrderItems.map((item, index) => {
                          const receivedPercentage = item.quantity > 0 ? (item.receivedQuantity / item.quantity) * 100 : 0;
                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-3">
                                <div>
                                  <p className="font-medium text-sm text-gray-900">{item.product?.name || `Product ${item.productId}`}</p>
                                  <p className="text-xs text-gray-500 sm:hidden">{item.variant?.name || 'Default'}</p>
                                  <p className="text-xs text-gray-500">SKU: {item.product?.sku || item.productId}</p>
                                </div>
                              </td>
                              <td className="p-3 text-sm hidden sm:table-cell">{item.variant?.name || 'Default'}</td>
                              <td className="p-3">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 1;
                                      const updatedItems = [...purchaseOrderItems];
                                      updatedItems[index] = { ...item, quantity: newQuantity };
                                      setPurchaseOrderItems(updatedItems);
                                    }}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                ) : (
                                  <span className="font-medium text-sm text-gray-900">{item.quantity}</span>
                                )}
                              </td>
                              <td className="p-3 text-sm hidden md:table-cell">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.costPrice}
                                    onChange={(e) => {
                                      const newCostPrice = parseFloat(e.target.value) || 0;
                                      const updatedItems = [...purchaseOrderItems];
                                      updatedItems[index] = { ...item, costPrice: newCostPrice };
                                      setPurchaseOrderItems(updatedItems);
                                    }}
                                    className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                                  />
                                ) : (
                                  formatCurrency(item.costPrice, purchaseOrder.currency)
                                )}
                              </td>
                              <td className="p-3 text-sm hidden md:table-cell">
                                {(() => {
                                  // Calculate average selling price from received items
                                  const itemReceivedItems = receivedItems.filter(ri => 
                                    ri.product_id === item.productId && 
                                    ri.variant_id === item.variantId
                                  );
                                  
                                  if (itemReceivedItems.length === 0) {
                                    return <span className="text-gray-400">Not set</span>;
                                  }
                                  
                                  // Get unique selling prices
                                  const sellingPrices = itemReceivedItems
                                    .map(ri => Number(ri.selling_price) || 0)
                                    .filter(price => price > 0);
                                  
                                  if (sellingPrices.length === 0) {
                                    return <span className="text-gray-400">Not set</span>;
                                  }
                                  
                                  const minPrice = Math.min(...sellingPrices);
                                  const maxPrice = Math.max(...sellingPrices);
                                  
                                  if (minPrice === maxPrice) {
                                    return (
                                      <span className="font-medium text-green-600">
                                        TZS {minPrice.toLocaleString()}
                                      </span>
                                    );
                                  } else {
                                    return (
                                      <div className="text-xs">
                                        <div className="text-green-600 font-medium">
                                          TZS {minPrice.toLocaleString()} - {maxPrice.toLocaleString()}
                                        </div>
                                        <div className="text-gray-500">(Range)</div>
                                      </div>
                                    );
                                  }
                                })()}
                              </td>
                              <td className="p-3">
                                <span className="font-medium text-sm text-gray-900">{formatCurrency((item.quantity || 0) * (item.costPrice || 0), purchaseOrder.currency)}</span>
                              </td>
                              {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && (
                                <td className="p-3 text-sm hidden lg:table-cell">
                                  <span className="text-gray-600">
                                    TZS {(((item.quantity || 0) * (item.costPrice || 0)) * (purchaseOrder.exchangeRate || 1)).toLocaleString()}
                                  </span>
                                </td>
                              )}
                              <td className="p-3">
                                <span className="font-medium text-sm text-gray-900">{item.receivedQuantity}</span>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  receivedPercentage >= 100 ? 'bg-green-100 text-green-700' : 
                                  receivedPercentage > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {receivedPercentage >= 100 ? 'Complete' : receivedPercentage > 0 ? 'Partial' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Received Items Section - Enhanced with Search & Filters */}
              {receivedItems.length > 0 && (
                <div className="space-y-4">
                  {/* Search and Filters */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Search & Filter Inventory</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                        <input
                          type="text"
                          placeholder="Search products, SKU, serial..."
                          value={filters.search}
                          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Status</option>
                          <option value="available">Available</option>
                          <option value="sold">Sold</option>
                          <option value="reserved">Reserved</option>
                          <option value="damaged">Damaged</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                        <input
                          type="text"
                          placeholder="Filter by location..."
                          value={filters.location}
                          onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => setFilters({ search: '', status: '', location: '', dateFrom: '', dateTo: '' })}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Received Items Table */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <PackageCheck className="w-5 h-5 text-green-600" />
                        <h3 className="text-sm font-semibold text-gray-800">
                          Inventory Items ({filteredReceivedItems.length} of {receivedItems.length} items)
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleRefreshReceivedItems}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                          disabled={isLoadingReceivedItems}
                        >
                          <RotateCcw className={`w-3 h-3 ${isLoadingReceivedItems ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                    </div>
                    {filteredReceivedItems.length === 0 ? (
                      <div className="text-center py-8">
                        <PackageCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No items match your filters</p>
                        <button
                          onClick={() => setFilters({ search: '', status: '', location: '', dateFrom: '', dateTo: '' })}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Clear all filters
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="text-left p-3 font-medium text-gray-700">Product</th>
                              <th className="text-left p-3 font-medium text-gray-700 hidden sm:table-cell">Variant</th>
                              <th className="text-left p-3 font-medium text-gray-700">Serial Number / IMEI</th>
                              <th className="text-left p-3 font-medium text-gray-700">Status</th>
                              <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">Location</th>
                              <th className="text-left p-3 font-medium text-gray-700">Cost</th>
                              <th className="text-left p-3 font-medium text-gray-700">Selling Price</th>
                              <th className="text-left p-3 font-medium text-gray-700">Received Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredReceivedItems.map((item, index) => (
                              <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-3">
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">{item.product?.name || `Product ${item.product_id}`}</p>
                                    <p className="text-xs text-gray-500 sm:hidden">{item.variant?.name || `Variant ${item.variant_id}`}</p>
                                    <p className="text-xs text-gray-500">SKU: {item.product?.sku || item.product_id}</p>
                                  </div>
                                </td>
                                <td className="p-3 text-sm hidden sm:table-cell">{item.variant?.name || `Variant ${item.variant_id}`}</td>
                                <td className="p-3">
                                  <div>
                                    {item.serial_number && (
                                      <div className="font-mono text-sm text-gray-900">{item.serial_number}</div>
                                    )}
                                    {item.imei && (
                                      <div className="font-mono text-xs text-gray-600">IMEI: {item.imei}</div>
                                    )}
                                    {!item.serial_number && !item.imei && (
                                      <span className="text-gray-400">-</span>
                                    )}
                                    {item.barcode && (
                                      <div className="text-xs text-gray-500">Barcode: {item.barcode}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    item.status === 'available' ? 'bg-green-100 text-green-700' :
                                    item.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                                    item.status === 'damaged' ? 'bg-red-100 text-red-700' :
                                    item.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="p-3 text-sm hidden lg:table-cell">
                                  {item.location ? (
                                    <div>
                                      <div className="text-gray-900">{item.location}</div>
                                      {item.shelf && (
                                        <div className="text-xs text-gray-500">Shelf: {item.shelf}</div>
                                      )}
                                      {item.bin && (
                                        <div className="text-xs text-gray-500">Bin: {item.bin}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">Not assigned</span>
                                  )}
                                </td>
                                <td className="p-3 text-sm">
                                  <span className="font-medium text-gray-900">
                                    TZS {(item.cost_price || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="p-3 text-sm">
                                  <span className="font-medium text-gray-900">
                                    TZS {(item.selling_price || 0).toLocaleString()}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="text-sm text-gray-900">
                                    {new Date(item.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(item.created_at).toLocaleTimeString()}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {receivedItems.filter(item => item.status === 'available').length}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Available</div>
                        <div className="text-xs text-gray-400 mt-1">
                          TZS {receivedItems
                            .filter(item => item.status === 'available')
                            .reduce((sum, item) => sum + (Number(item.cost_price) || 0), 0)
                            .toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {receivedItems.filter(item => item.status === 'sold').length}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Sold</div>
                        <div className="text-xs text-gray-400 mt-1">
                          TZS {receivedItems
                            .filter(item => item.status === 'sold')
                            .reduce((sum, item) => sum + (Number(item.selling_price) || Number(item.cost_price) || 0), 0)
                            .toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">
                          {receivedItems.filter(item => item.status === 'reserved').length}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Reserved</div>
                        <div className="text-xs text-gray-400 mt-1">
                          TZS {receivedItems
                            .filter(item => item.status === 'reserved')
                            .reduce((sum, item) => sum + (Number(item.cost_price) || 0), 0)
                            .toLocaleString()}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {receivedItems.filter(item => item.status === 'damaged').length}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Damaged</div>
                        <div className="text-xs text-gray-400 mt-1">
                          TZS {receivedItems
                            .filter(item => item.status === 'damaged')
                            .reduce((sum, item) => sum + (Number(item.cost_price) || 0), 0)
                            .toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Received Items Tab - DEPRECATED: Now merged into Items tab above */}
          {false && activeTab === 'received' && (
            <div className="space-y-6">
              {/* Quality Check Summary */}
              {purchaseOrder && (
                <QualityCheckSummary 
                  purchaseOrderId={purchaseOrder.id}
                  onViewDetails={(qcId) => {
                    console.log('View quality check details:', qcId);
                    setSelectedQualityCheckId(qcId);
                    setShowQualityCheckDetailsModal(true);
                  }}
                  onItemsReceived={async () => {
                    // Refresh received items and purchase order
                    await loadPurchaseOrder();
                    await handleRefreshReceivedItems();
                  }}
                />
              )}

              {/* Quality Check Items - Show what's already checked */}
              {qualityCheckItems.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold">Quality Checked Items</h3>
                    <span className="text-sm text-gray-500">({qualityCheckItems.length} items checked)</span>
                  </div>
                  
                  <div className="space-y-3">
                    {qualityCheckItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.purchaseOrderItem?.product?.name || 'Unknown Product'}
                            {item.purchaseOrderItem?.variant?.name && (
                              <span className="text-gray-600"> - {item.purchaseOrderItem.variant.name}</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            Criteria: {item.criteriaName}
                          </p>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-1">Note: {item.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm">
                            <span className="text-gray-600">Checked: </span>
                            <span className="font-medium">{item.quantityChecked || 0}</span>
                          </div>
                          {item.result === 'pass' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Passed ({item.quantityPassed || 0})</span>
                            </div>
                          )}
                          {item.result === 'fail' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-full">
                              <XCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Failed ({item.quantityFailed || 0})</span>
                            </div>
                          )}
                          {item.result === 'na' && (
                            <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm font-medium">Pending</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search and Filters */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Eye className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Search & Filter</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                    <input
                      type="text"
                      placeholder="Search products, SKU, serial..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="available">Available</option>
                      <option value="sold">Sold</option>
                      <option value="reserved">Reserved</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="Filter by location..."
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => setFilters({ search: '', status: '', location: '', dateFrom: '', dateTo: '' })}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              {/* Bulk Actions - REMOVED: Component doesn't exist */}
              {/* <BulkActionsToolbar
                items={filteredReceivedItems}
                selectedItems={selectedItems}
                onSelectionChange={setSelectedItems}
                onItemsUpdate={handleRefreshReceivedItems}
                onExport={handleExport}
                purchaseOrderId={id || ''}
              /> */}

              {/* Inventory Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {receivedItems.filter(item => item.status === 'available').length}
                  </div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Available</div>
                  <div className="text-xs text-gray-400 mt-1">
                    TZS {receivedItems
                      .filter(item => item.status === 'available')
                      .reduce((sum, item) => sum + (Number(item.cost_price) || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {receivedItems.filter(item => item.status === 'sold').length}
                  </div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Sold</div>
                  <div className="text-xs text-gray-400 mt-1">
                    TZS {receivedItems
                      .filter(item => item.status === 'sold')
                      .reduce((sum, item) => sum + (Number(item.selling_price) || Number(item.cost_price) || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {receivedItems.filter(item => item.status === 'reserved').length}
                  </div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Reserved</div>
                  <div className="text-xs text-gray-400 mt-1">
                    TZS {receivedItems
                      .filter(item => item.status === 'reserved')
                      .reduce((sum, item) => sum + (Number(item.cost_price) || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {receivedItems.filter(item => item.status === 'damaged').length}
                  </div>
                  <div className="text-sm text-gray-500 uppercase tracking-wide">Damaged</div>
                  <div className="text-xs text-gray-400 mt-1">
                    TZS {receivedItems
                      .filter(item => item.status === 'damaged')
                      .reduce((sum, item) => sum + (Number(item.cost_price) || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Bulk Actions */}
              {filteredReceivedItems.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-green-600" />
                      <h3 className="text-sm font-semibold text-gray-800">Bulk Actions</h3>
                      {selectedItems.length > 0 && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                          {selectedItems.length} selected
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedItems(filteredReceivedItems.map(item => item.id))}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => setSelectedItems([])}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  {selectedItems.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => setShowStatusModal(true)}
                        className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      >
                        Update Status ({selectedItems.length})
                      </button>
                      <button
                        onClick={() => setShowLocationModal(true)}
                        className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                      >
                        Assign Location ({selectedItems.length})
                      </button>
                      <button
                        onClick={() => handleExport({ selectedItems })}
                        className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                      >
                        Export Selected ({selectedItems.length})
                      </button>
                      <button
                        onClick={() => showConfirmation(
                          'Delete Items',
                          `Are you sure you want to delete ${selectedItems.length} selected items? This action cannot be undone.`,
                          () => {
                            // Handle bulk delete
                            console.log('Bulk delete:', selectedItems);
                            toast.success(`Deleted ${selectedItems.length} items`);
                            setSelectedItems([]);
                          }
                        )}
                        className="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                      >
                        Delete ({selectedItems.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Received Items Table */}
              {isLoadingReceivedItems ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading received items...</p>
                  </div>
                </div>
              ) : filteredReceivedItems.length === 0 ? (
                <div className="text-center py-8">
                  <PackageCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No received items found</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {receivedItems.length === 0 
                      ? qualityCheckItems.length > 0
                        ? 'Quality check completed! Click "Receive to Inventory" button above to add these items to inventory'
                        : 'Items will appear here once they are received and added to inventory'
                      : 'No items match your current filters'
                    }
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-800">
                        Received Items ({filteredReceivedItems.length} items)
                      </h3>
                      <button
                        onClick={handleRefreshReceivedItems}
                        className="flex items-center gap-2 px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Refresh
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="text-left p-3 font-medium text-gray-700 w-8">
                            <input
                              type="checkbox"
                              checked={selectedItems.length === filteredReceivedItems.length && filteredReceivedItems.length > 0}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedItems(filteredReceivedItems.map(item => item.id));
                                } else {
                                  setSelectedItems([]);
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </th>
                          <th className="text-left p-3 font-medium text-gray-700">Product</th>
                          <th className="text-left p-3 font-medium text-gray-700 hidden sm:table-cell">Variant</th>
                          <th className="text-left p-3 font-medium text-gray-700">Serial Number</th>
                          <th className="text-left p-3 font-medium text-gray-700 hidden md:table-cell">IMEI</th>
                          <th className="text-left p-3 font-medium text-gray-700">Status</th>
                          <th className="text-left p-3 font-medium text-gray-700 hidden lg:table-cell">Location</th>
                          <th className="text-left p-3 font-medium text-gray-700">Cost Price</th>
                          <th className="text-left p-3 font-medium text-gray-700">Received Date</th>
                          <th className="text-left p-3 font-medium text-gray-700">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredReceivedItems.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3">
                              <input
                                type="checkbox"
                                checked={selectedItems.includes(item.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedItems(prev => [...prev, item.id]);
                                  } else {
                                    setSelectedItems(prev => prev.filter(id => id !== item.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-3">
                              <div>
                                <p className="font-medium text-sm text-gray-900">{item.product?.name || `Product ${item.product_id}`}</p>
                                <p className="text-xs text-gray-500 sm:hidden">{item.variant?.name || 'Default'}</p>
                                <p className="text-xs text-gray-500">SKU: {item.product?.sku || item.product_id}</p>
                              </div>
                            </td>
                            <td className="p-3 text-sm hidden sm:table-cell">{item.variant?.name || 'Default'}</td>
                            <td className="p-3">
                              <div className="font-mono text-sm text-gray-900">
                                {item.serial_number || item.serialNumber || (
                                  <div>
                                    <span className="text-gray-400">-</span>
                                    {item.item_number && (
                                      <div className="text-xs text-blue-600 mt-1">
                                        Item: {item.item_number}
                                      </div>
                                    )}
                                    {!item.item_number && item.metadata?.batch_number && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Batch #{item.metadata.batch_number}
                                        {item.metadata.total_in_batch && ` of ${item.metadata.total_in_batch}`}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {!item.serial_number && !item.serialNumber && (
                                  <button
                                    onClick={() => handleUpdateSerialNumber(item.id)}
                                    className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Add Serial
                                  </button>
                                )}
                              </div>
                              {item.barcode && (
                                <div className="text-xs text-gray-500">Barcode: {item.barcode}</div>
                              )}
                            </td>
                            <td className="p-3 text-sm hidden md:table-cell">
                              {item.imei ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-gray-600">{item.imei}</span>
                                  <button
                                    onClick={() => handleUpdateIMEI(item.id, item.imei)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                    title="Edit IMEI"
                                  >
                                    ✎
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-400">-</span>
                                  <button
                                    onClick={() => handleUpdateIMEI(item.id)}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    Add
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <select
                                value={item.status}
                                onChange={(e) => handleUpdateStatus(item.id, e.target.value, item.status)}
                                className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                                  item.status === 'available' ? 'bg-green-100 text-green-700' :
                                  item.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                                  item.status === 'damaged' ? 'bg-red-100 text-red-700' :
                                  item.status === 'reserved' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}
                              >
                                <option value="available">Available</option>
                                <option value="sold">Sold</option>
                                <option value="reserved">Reserved</option>
                                <option value="damaged">Damaged</option>
                              </select>
                            </td>
                            <td className="p-3 text-sm hidden lg:table-cell">
                              {item.location ? (
                                <div className="group relative">
                                  <div className="text-gray-900">{item.location}</div>
                                  {item.shelf && (
                                    <div className="text-xs text-gray-500">Shelf: {item.shelf}</div>
                                  )}
                                  {item.bin && (
                                    <div className="text-xs text-gray-500">Bin: {item.bin}</div>
                                  )}
                                  <button
                                    onClick={() => handleUpdateLocation(item.id, item.location, item.shelf, item.bin)}
                                    className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-800 transition-opacity"
                                    title="Edit location"
                                  >
                                    ✎
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUpdateLocation(item.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Assign
                                </button>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-900">
                                {item.cost_price ? `TZS ${item.cost_price.toLocaleString()}` : 'N/A'}
                              </div>
                              {item.selling_price ? (
                                <div className="group relative">
                                  <div className="text-xs text-gray-500">
                                    Sell: TZS {item.selling_price.toLocaleString()}
                                  </div>
                                  <button
                                    onClick={() => handleUpdateSellingPrice(item.id, item.selling_price)}
                                    className="absolute -right-6 top-0 opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-800 transition-opacity"
                                    title="Edit selling price"
                                  >
                                    ✎
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleUpdateSellingPrice(item.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                  Set Price
                                </button>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="text-sm text-gray-900">
                                {new Date(item.created_at).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleTimeString()}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex gap-1">
                                <button
                                  onClick={() => {
                                    // Handle view details
                                    console.log('View details:', item);
                                  }}
                                  className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    // Handle edit item
                                    console.log('Edit item:', item);
                                  }}
                                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                                  title="Edit Item"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => {
                                    // Generate QR code
                                    const qrData = {
                                      id: item.id,
                                      serialNumber: item.serial_number || item.serialNumber,
                                      productName: item.product?.name,
                                      sku: item.product?.sku
                                    };
                                    console.log('Generate QR code:', qrData);
                                    toast.success('QR code generated!');
                                  }}
                                  className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCode className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Shipping Tab - Completely Removed */}
          {false && false && (
            <div className="space-y-6">
              {purchaseOrder && (purchaseOrder.status === 'shipped' || purchaseOrder.status === 'received') && (purchaseOrder as any).shippingInfo ? (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Shipping Information</h3>
                  </div>
                  <ShippingTracker 
                    shippingInfo={(purchaseOrder as any).shippingInfo}
                    purchaseOrder={purchaseOrder}
                    compact={false}
                    debugMode={process.env.NODE_ENV === 'development'}
                    onRefresh={handleRefresh}
                  />
                  
                  <div className="flex gap-2 pt-2">
                    <GlassButton
                      onClick={() => navigate(`/lats/shipping/${(purchaseOrder as any).shippingInfo.id}`)}
                      variant="primary"
                      size="sm"
                      className="flex-1"
                    >
                      <Truck size={16} />
                      View Full Details
                    </GlassButton>
                    
                    <GlassButton
                      onClick={handleViewShipping}
                      variant="secondary"
                      size="sm"
                    >
                      <Eye size={16} />
                      Quick View
                    </GlassButton>
                    
                    <GlassButton
                      onClick={() => setShowShippingModal(true)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Edit size={16} />
                      Edit Shipping
                    </GlassButton>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Truck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No shipping information available</p>
                  {purchaseOrder && (purchaseOrder.status === 'draft' || purchaseOrder.status === 'sent' || purchaseOrder.status === 'confirmed') && (
                    <button
                      onClick={handleAssignShipping}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium mx-auto"
                    >
                      <Truck className="w-4 h-4" />
                      Assign Shipping
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && !loadedTabs.has('analytics') && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading analytics...</p>
              </div>
            </div>
          )}
          {activeTab === 'analytics' && loadedTabs.has('analytics') && (
            <div className="space-y-6">
              {/* Currency Validation Warnings */}
              {(() => {
                const currencyIssues = validateCurrencyConsistency(purchaseOrder);
                
                if (currencyIssues.length > 0) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        <h4 className="text-sm font-semibold text-yellow-800">Currency Issues Detected</h4>
                      </div>
                      <ul className="text-xs text-yellow-700 space-y-1">
                        {currencyIssues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Cost Analysis */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Calculator className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Cost Analysis</h3>
                  {/* Currency indicator */}
                  <div className="ml-auto flex items-center gap-2">
                    <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {purchaseOrder.currency || 'TZS'}
                    </div>
                    {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && (
                      <div className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                        1 {purchaseOrder.currency} = {formatExchangeRate(purchaseOrder.exchangeRate)} TZS
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Total Cost</div>
                    <div className="text-lg font-bold text-green-900">{formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</div>
                    {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ≈ TZS {purchaseOrder.totalAmountBaseCurrency ? 
                          purchaseOrder.totalAmountBaseCurrency.toLocaleString() : 
                          calculateTZSEquivalent(purchaseOrder.totalAmount, purchaseOrder.currency || 'USD', purchaseOrder.exchangeRate).toLocaleString()
                        }
                      </div>
                    )}
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Avg Cost/Item</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(
                        calculateAverageCostPerItem(purchaseOrder.totalAmount, purchaseOrder.items), 
                        purchaseOrder.currency
                      )}
                    </div>
                    {purchaseOrder.exchangeRate && purchaseOrder.exchangeRate !== 1.0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        ≈ TZS {calculateTZSEquivalent(
                          calculateAverageCostPerItem(purchaseOrder.totalAmount, purchaseOrder.items), 
                          purchaseOrder.currency || 'USD', 
                          purchaseOrder.exchangeRate
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-xs font-medium text-purple-700 uppercase tracking-wide mb-1">Total Quantity</div>
                    <div className="text-lg font-bold text-purple-900">
                      {purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">Items Count</div>
                    <div className="text-lg font-bold text-orange-900">{purchaseOrder.items?.length || 0}</div>
                  </div>
                </div>
              </div>

              {/* Inventory Impact */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Package className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Inventory Impact</h3>
                </div>
                <div className="space-y-3">
                  {purchaseOrder.items?.map((item, index) => {
                    const currentStock = item.product?.variants?.find(v => v.id === item.variantId)?.quantity || 0;
                    const newStock = currentStock + item.quantity;
                    const isLowStock = newStock <= (item.product?.variants?.find(v => v.id === item.variantId)?.minQuantity || 0);
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.product?.name || `Product ${item.productId}`}</p>
                          <p className="text-xs text-gray-500">{item.variant?.name || `Variant ${item.variantId}`}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Current: {currentStock}</p>
                          <p className="text-sm font-medium text-gray-900">+{item.quantity} → {newStock}</p>
                          {isLowStock && (
                            <p className="text-xs text-orange-600">Low Stock Warning</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && !loadedTabs.has('history') && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading history...</p>
              </div>
            </div>
          )}
          {activeTab === 'history' && loadedTabs.has('history') && (
            <div className="space-y-6">
              {/* Audit Trail */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <History className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-800">Audit Trail</h3>
                </div>
                <div className="space-y-2">
                  {auditHistory.length > 0 ? (
                    auditHistory.map((entry, index) => (
                      <div key={index} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{entry.action}</p>
                          <p className="text-xs text-gray-600">{entry.description}</p>
                          <p className="text-xs text-gray-500">By: {entry.user}</p>
                        </div>
                        <span className="text-xs text-gray-500">{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : 'N/A'}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No audit history available</p>
                  )}
                </div>
              </div>

              {/* Payment History */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Payment History</h3>
                  </div>
                  <button
                    onClick={handleViewPayments}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  {paymentHistory.length > 0 ? (
                    paymentHistory.slice(0, 3).map((payment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{payment.method || 'Payment'}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(payment.amount || 0)}
                            </p>
                            {payment.currency && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                {payment.currency}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {payment.timestamp ? new Date(payment.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                            payment.status === 'pending' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No payment history</p>
                  )}
                </div>
              </div>

              {/* Expense History */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-orange-600" />
                    <h3 className="text-sm font-semibold text-gray-800">Expense History</h3>
                  </div>
                  <button
                    onClick={handleViewExpenses}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-2">
                  {expenseHistory.length > 0 ? (
                    expenseHistory.slice(0, 3).map((expense, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{expense.category || 'Expense'}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {new Intl.NumberFormat('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              }).format(expense.amount || 0)}
                            </p>
                            {expense.currency && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                                {expense.currency}
                              </span>
                            )}
                          </div>
                          {expense.accountName && (
                            <p className="text-xs text-gray-600">Account: {expense.accountName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {expense.timestamp ? new Date(expense.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            }) : 'N/A'}
                          </p>
                          {expense.reference && (
                            <p className="text-xs text-gray-500">Ref: {expense.reference}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No expense history</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleViewCommunication}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <MessageSquare className="w-4 h-4" />
              Communication
            </button>
            
            <button
              onClick={handleSendWhatsApp}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium text-sm"
              title="Send WhatsApp message to supplier"
            >
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </button>
            
            <button
              onClick={handleSendSMS}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium text-sm"
              title="Send SMS to supplier"
            >
              <Send className="w-4 h-4" />
              SMS
            </button>
            
            <button
              onClick={handleViewPayments}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm"
            >
              <CreditCard className="w-4 h-4" />
              Payments
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/lats/purchase-orders')}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
            
            {purchaseOrder.status === 'draft' && (
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
              >
                <Edit className="w-4 h-4" />
                {isEditing ? 'Cancel Edit' : 'Edit'}
              </button>
            )}
          </div>
        </div>

        {/* Shipping Assignment Modal - Removed */}

        {/* Shipping Tracker Modal - Completely Removed */}
        {false && false && (purchaseOrder as any)?.shippingInfo && (
          <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm ${showShippingTracker ? 'block' : 'hidden'}`}>
            <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <ShippingTracker 
                shippingInfo={(purchaseOrder as any).shippingInfo}
                purchaseOrder={purchaseOrder}
                compact={false}
                debugMode={process.env.NODE_ENV === 'development'}
                onRefresh={handleRefresh}
              />
              <div className="mt-4 flex justify-end">
                <GlassButton
                  onClick={() => setShowShippingTracker(false)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Close
                </GlassButton>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Order Payment Modal */}
        {purchaseOrder && (
          <PaymentsPopupModal
            isOpen={showPurchaseOrderPaymentModal}
            onClose={() => setShowPurchaseOrderPaymentModal(false)}
            amount={(() => {
              // Calculate remaining amount in the purchase order's original currency
              const totalAmount = purchaseOrder.totalAmount || 0;
              const totalPaid = purchaseOrder.totalPaid || 0;
              const totalAmountBaseCurrency = purchaseOrder.totalAmountBaseCurrency || 0;
              const exchangeRate = purchaseOrder.exchangeRate || 1;
              
              // If the purchase order is in foreign currency and we have an exchange rate
              if (purchaseOrder.currency && purchaseOrder.currency !== 'TZS' && exchangeRate > 1) {
                // totalPaid is in TZS, convert it back to original currency for display
                const paidInOriginalCurrency = totalPaid / exchangeRate;
                const remainingInOriginalCurrency = totalAmount - paidInOriginalCurrency;
                // Return remaining in original currency (will be converted back to TZS by PaymentsPopupModal)
                return Math.max(0, remainingInOriginalCurrency);
              }
              
              // For TZS purchase orders, amounts are already in TZS
              return Math.max(0, totalAmount - totalPaid);
            })()}
            customerId={purchaseOrder.supplierId}
            customerName={purchaseOrder.supplier?.name}
            description={`Payment for Purchase Order ${purchaseOrder.orderNumber}`}
            onPaymentComplete={handlePurchaseOrderPaymentComplete}
            paymentType="cash_out"
            title="Purchase Order Payment"
            currency={purchaseOrder.currency}
            exchangeRate={purchaseOrder.exchangeRate}
          />
        )}


        {/* Partial Receive Modal */}
        {showPartialReceiveModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Partial Receive</h3>
              </div>
              
              <div className="p-6">
                <p className="text-gray-600 mb-4">
                  Select the items and quantities you have received:
                </p>
                
                <div className="space-y-3">
                  {purchaseOrder?.items.map((item, index) => (
                    <div key={item.id || index} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.product?.name || `Product ${item.productId}`}</h4>
                        <p className="text-sm text-gray-500">Ordered: {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Received:</label>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={item.receivedQuantity || 0}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            // Update the item's received quantity
                            const updatedItems = [...(purchaseOrder?.items || [])];
                            updatedItems[index] = { ...item, receivedQuantity: value };
                            setPurchaseOrder(prev => prev ? { ...prev, items: updatedItems } : null);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowPartialReceiveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const receivedItems = purchaseOrder?.items.filter(item => (item.receivedQuantity || 0) > 0) || [];
                      handlePartialReceive(receivedItems);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                  >
                    {isSaving ? 'Processing...' : 'Confirm Receive'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Communication Modal */}
        {showCommunicationModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Communication History</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  {communicationHistory.length > 0 ? (
                    communicationHistory.map((message, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{message.sender}</span>
                          <span className="text-sm text-gray-500">{new Date(message.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-700">{message.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No communication history available</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <textarea
                    id="messageInput"
                    placeholder="Add a new message..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                  />
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => setShowCommunicationModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      Close
                    </button>
                    <button 
                      onClick={() => {
                        const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
                        if (messageInput && messageInput.value.trim()) {
                          handleSendMessage(messageInput.value);
                          messageInput.value = '';
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quality Check Modal - New Enhanced System */}
        {purchaseOrder && (
          <QualityCheckModal
            purchaseOrderId={purchaseOrder.id}
            isOpen={showQualityCheckModal}
            onClose={() => setShowQualityCheckModal(false)}
            onComplete={async () => {
              setShowQualityCheckModal(false);
              await handleQualityCheckComplete();
            }}
          />
        )}

        {/* Quality Check Details Modal */}
        <QualityCheckDetailsModal
          qualityCheckId={selectedQualityCheckId}
          isOpen={showQualityCheckDetailsModal}
          onClose={() => {
            setShowQualityCheckDetailsModal(false);
            setSelectedQualityCheckId('');
          }}
        />

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-yellow-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Order Notes</h3>
              </div>
              
              <div className="p-6 space-y-4">
                {/* Add New Note */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-gray-700">Add New Note</label>
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Enter your note here..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    rows={3}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                  >
                    Add Note
                  </button>
                </div>
                
                {/* Notes List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Previous Notes</h4>
                  {orderNotes.length > 0 ? (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {orderNotes.map((note, index) => (
                        <div key={note.id || index} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">{note.author}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{note.content}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No notes available</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowNotesModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Actions Modal */}
        {showBulkActions && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <Layers className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Bulk Actions</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="text-sm text-gray-600">
                  Select items and choose an action to perform on multiple items at once.
                </div>
                
                {/* Item Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Select Items</h4>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                    {purchaseOrder.items?.map((item, index) => (
                      <div key={item.id || index} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={bulkSelectedItems.includes(item.id)}
                          onChange={() => handleBulkSelectItem(item.id)}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{item.product?.name || `Product ${item.productId}`}</p>
                          <p className="text-xs text-gray-500">SKU: {item.product?.sku || `SKU-${item.productId}`} | Qty: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Bulk Actions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Available Actions</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleBulkAction('update_status')}
                      disabled={bulkSelectedItems.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Update Status
                    </button>
                    
                    <button
                      onClick={() => handleBulkAction('assign_location')}
                      disabled={bulkSelectedItems.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <Store className="w-4 h-4" />
                      Assign Location
                    </button>
                    
                    <button
                      onClick={() => handleBulkAction('export_selected')}
                      disabled={bulkSelectedItems.length === 0}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium text-sm"
                    >
                      <Download className="w-4 h-4" />
                      Export Selected
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      setShowBulkActions(false);
                      setBulkSelectedItems([]);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBulkSelectedItems(purchaseOrder.items?.map(item => item.id) || [])}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Select All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Return Order Modal */}
        {showReturnOrderModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <RotateCcw className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Return Order</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="text-sm text-gray-600">
                  Create a return order for items that need to be returned to the supplier.
                </div>
                
                <div className="space-y-4">
                  {/* Return Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return Type</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500">
                      <option value="defective">Defective Items</option>
                      <option value="wrong_item">Wrong Items</option>
                      <option value="excess">Excess Quantity</option>
                      <option value="damaged">Damaged in Transit</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  {/* Items to Return */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Items to Return</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                      {purchaseOrder.items?.map((item, index) => (
                        <div key={item.id || index} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.product?.name || `Product ${item.productId}`}</p>
                            <p className="text-xs text-gray-500">SKU: {item.product?.sku || `SKU-${item.productId}`} | Received: {item.receivedQuantity || 0}</p>
                          </div>
                          <div className="w-20">
                            <input
                              type="number"
                              placeholder="Qty"
                              min="1"
                              max={item.receivedQuantity || item.quantity}
                              className="w-full p-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return Reason</label>
                    <textarea
                      placeholder="Describe the reason for return..."
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={3}
                    />
                  </div>
                  
                  {/* Additional Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                    <textarea
                      placeholder="Any additional information..."
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      rows={2}
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowReturnOrderModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleReturnOrder({})}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Create Return Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              </div>
              
              <div className="p-6">
                <div className="space-y-4 mb-6">
                  {paymentHistory.length > 0 ? (
                    paymentHistory.map((payment, index) => (
                      <div key={payment.id || index}>
                        {/* Check if this payment has multiple payment methods */}
                        {payment.metadata?.paymentMethod?.type === 'multiple' && payment.metadata.paymentMethod.details?.payments ? (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border border-blue-200 p-6">
                            <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                              <CreditCard className="w-5 h-5" />
                              Payment #{index + 1} - Multiple Methods
                            </h4>
                            <div className="space-y-4">
                              {payment.metadata.paymentMethod.details.payments.map((subPayment: any, subIndex: number) => (
                                <div key={subIndex} className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <CreditCard className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <p className="font-semibold text-gray-900 text-lg">
                                          {subPayment.method ? 
                                            subPayment.method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 
                                            'Unknown Method'
                                          }
                                        </p>
                                      </div>
                                      <div className="space-y-1">
                                        {subPayment.reference && (
                                          <p className="text-sm text-gray-600">
                                            <span className="font-medium">Reference:</span> {subPayment.reference}
                                          </p>
                                        )}
                                        {subPayment.transactionId && (
                                          <p className="text-sm text-gray-600">
                                            <span className="font-medium">Transaction ID:</span> {subPayment.transactionId}
                                          </p>
                                        )}
                                        {subPayment.timestamp && (
                                          <p className="text-sm text-gray-500">
                                            <span className="font-medium">Time:</span> {new Date(subPayment.timestamp).toLocaleString('en-TZ')}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xl font-bold text-green-600 mb-2">
                                        {formatCurrency(subPayment.amount, subPayment.currency || payment.currency)}
                                      </p>
                                      {subPayment.status && (
                                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                          subPayment.status === 'completed' || subPayment.status === 'success' ? 'bg-green-100 text-green-800' :
                                          subPayment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                          subPayment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                          'bg-gray-100 text-gray-800'
                                        }`}>
                                          {subPayment.status.toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {subPayment.notes && (
                                    <div className="mt-3 pt-3 border-t border-blue-200">
                                      <p className="text-sm text-gray-600 italic">
                                        <span className="font-medium">Note:</span> {subPayment.notes}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              {/* Payment Summary */}
                              <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-600" />
                                  Payment Summary
                                </h5>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="text-center">
                                    <div className="text-sm text-gray-600">Total Payments</div>
                                    <div className="text-lg font-semibold text-blue-900">
                                      {payment.metadata.paymentMethod.details.payments.length}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm text-gray-600">Payment Methods</div>
                                    <div className="text-lg font-semibold text-blue-900">
                                      {new Set(payment.metadata.paymentMethod.details.payments.map((p: any) => p.method)).size}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-sm text-gray-600">Total Amount</div>
                                    <div className="text-xl font-bold text-green-600">
                                      {formatCurrency(
                                        payment.metadata.paymentMethod.details.payments.reduce((sum: number, p: any) => sum + p.amount, 0),
                                        payment.currency
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Single Payment Display */
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <p className="font-semibold text-gray-900 text-lg">
                                    {payment.method ? 
                                      payment.method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 
                                      'Unknown Method'
                                    }
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  {payment.reference && (
                                    <p className="text-sm text-gray-600">
                                      <span className="font-medium">Reference:</span> {payment.reference}
                                    </p>
                                  )}
                                  {payment.timestamp && (
                                    <p className="text-sm text-gray-500">
                                      <span className="font-medium">Time:</span> {new Date(payment.timestamp).toLocaleString('en-TZ')}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-green-600 mb-2">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </p>
                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                                  payment.status === 'completed' || payment.status === 'success' ? 'bg-green-100 text-green-800' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  payment.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {payment.status.toUpperCase()}
                                </span>
                              </div>
                            </div>
                            {payment.notes && (
                              <div className="mt-3 pt-3 border-t border-blue-200">
                                <p className="text-sm text-gray-600 italic">
                                  <span className="font-medium">Note:</span> {payment.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Payment History</h3>
                      <p className="text-sm">No payments have been made for this purchase order yet.</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 mt-6 border-t border-gray-200 pt-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Serial Number Receive Modal */}
        {showSerialNumberReceiveModal && purchaseOrder && (
          <SerialNumberReceiveModal
            isOpen={showSerialNumberReceiveModal}
            onClose={() => setShowSerialNumberReceiveModal(false)}
            purchaseOrder={purchaseOrder as any}
            onConfirm={handleSerialNumberReceive}
            isLoading={isSaving}
            mode={receiveMode}
            initialReceivedItems={tempSerialNumberData.length > 0 ? tempSerialNumberData : undefined}
          />
        )}

        {/* Pricing Modal - Set prices before receiving */}
        {showPricingModal && purchaseOrder && (
          <SetPricingModal
            isOpen={showPricingModal}
            onClose={() => setShowPricingModal(false)}
            purchaseOrder={purchaseOrder as any}
            onConfirm={handleConfirmPricingAndReceive}
            isLoading={isReceiving}
            initialPricingData={tempPricingData.size > 0 ? tempPricingData : undefined}
          />
        )}



        {/* Status Update Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Update Status</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Status</label>
                  <select
                    value={currentItem?.status || ''}
                    onChange={(e) => setCurrentItem((prev: any) => prev ? { ...prev, status: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="available">Available</option>
                    <option value="sold">Sold</option>
                    <option value="reserved">Reserved</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (Optional)</label>
                  <textarea
                    placeholder="Enter reason for status change..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (currentItem && selectedItems.length > 0) {
                      // Handle bulk status update
                      console.log('Bulk status update:', selectedItems, currentItem.status);
                      toast.success(`Updated ${selectedItems.length} items to ${currentItem.status}`);
                      setSelectedItems([]);
                      setShowStatusModal(false);
                    } else if (currentItem) {
                      // Handle single item status update
                      console.log('Single status update:', currentItem);
                      toast.success(`Updated item status to ${currentItem.status}`);
                      setShowStatusModal(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location Assignment Modal */}
        {showLocationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Assign Location</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                  <input
                    type="text"
                    placeholder="e.g., Warehouse A, Store Front"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Shelf</label>
                    <input
                      type="text"
                      placeholder="e.g., A1, B2"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bin</label>
                    <input
                      type="text"
                      placeholder="e.g., 01, 15"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    placeholder="Additional location notes..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (selectedItems.length > 0) {
                      // Handle bulk location assignment
                      console.log('Bulk location assignment:', selectedItems);
                      toast.success(`Assigned location to ${selectedItems.length} items`);
                      setSelectedItems([]);
                      setShowLocationModal(false);
                    } else {
                      // Handle single item location assignment
                      console.log('Single location assignment');
                      toast.success('Location assigned successfully');
                      setShowLocationModal(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Assign Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirmation Dialog */}
        {showConfirmDialog && confirmAction && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative">
              {/* Close Button - Only show in confirming state */}
              {confirmDialogState === 'confirming' && (
                <button
                  onClick={() => {
                    setShowConfirmDialog(false);
                    setConfirmAction(null);
                    setConfirmDialogState('confirming');
                  }}
                  className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {/* Icon Header - Changes based on state */}
              <div className={`p-8 text-center transition-all duration-500 ${
                confirmDialogState === 'success' 
                  ? 'bg-gradient-to-br from-green-100 to-emerald-100' 
                  : 'bg-gradient-to-br from-green-50 to-emerald-50'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg transition-all duration-500 ${
                  confirmDialogState === 'success'
                    ? 'bg-green-500 scale-110'
                    : confirmDialogState === 'processing'
                    ? 'bg-blue-500'
                    : 'bg-green-600'
                }`}>
                  {confirmDialogState === 'success' ? (
                    <CheckCircle className="w-10 h-10 text-white" />
                  ) : confirmDialogState === 'processing' ? (
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Package className="w-8 h-8 text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {confirmDialogState === 'success' 
                    ? 'Successfully Added!' 
                    : confirmDialogState === 'processing'
                    ? 'Adding to Inventory...'
                    : 'Add to Inventory?'
                  }
                </h3>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-center text-gray-600 leading-relaxed">
                  {confirmDialogState === 'success'
                    ? 'Items have been successfully added to inventory.'
                    : confirmDialogState === 'processing'
                    ? 'Please wait while we add items to inventory...'
                    : confirmAction.message
                  }
                </p>
              </div>
              
              {/* Actions - Only show button in confirming state */}
              {confirmDialogState === 'confirming' && (
                <div className="p-6 pt-0">
                  <button
                    onClick={() => {
                      confirmAction.onConfirm();
                    }}
                    className="w-full px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl text-lg"
                  >
                    Confirm & Add
                  </button>
                </div>
              )}
              
              {/* Success state close button */}
              {confirmDialogState === 'success' && (
                <div className="p-6 pt-0">
                  <button
                    onClick={() => {
                      setShowConfirmDialog(false);
                      setConfirmAction(null);
                      setConfirmDialogState('confirming');
                    }}
                    className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Message Toast */}
        {errorMessage && (
          <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg z-50">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="ml-2 text-red-700 hover:text-red-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Completion Summary Modal */}
        {showCompletionSummaryModal && purchaseOrder && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-10 h-10 text-white" />
                  </div>
                  <button
                    onClick={() => setShowCompletionSummaryModal(false)}
                    className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Complete Purchase Order</h2>
                <p className="text-gray-700">Review the order summary before completing</p>
              </div>

              {/* Summary Content */}
              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="space-y-6">
                  {/* Order Information */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      Order Information
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Order Number</p>
                        <p className="font-semibold text-gray-900">{purchaseOrder.orderNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Supplier</p>
                        <p className="font-semibold text-gray-900">{purchaseOrder.supplier?.name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Order Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(purchaseOrder.orderDate || purchaseOrder.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {purchaseOrder.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items Summary */}
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-purple-600" />
                      Items Summary
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Items</p>
                        <p className="text-2xl font-bold text-gray-900">{purchaseOrder.items?.length || 0}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Ordered</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {purchaseOrder.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Total Received</p>
                        <p className="text-2xl font-bold text-green-600">
                          {purchaseOrder.items?.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Financial Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Total Amount</span>
                        <span className="text-xl font-bold text-gray-900">
                          {purchaseOrder.currency || 'TZS'} {Number(purchaseOrder.totalAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Payment Status</span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          purchaseOrder.paymentStatus === 'paid' 
                            ? 'bg-green-100 text-green-800' 
                            : purchaseOrder.paymentStatus === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {purchaseOrder.paymentStatus?.toUpperCase() || 'UNPAID'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Message */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-900 mb-1">Important</p>
                        <p className="text-sm text-yellow-800">
                          Completing this order will finalize all transactions and mark it as complete. 
                          This action cannot be undone.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-8 py-6">
                {/* Primary Actions */}
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => setShowCompletionSummaryModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePrintReceipt}
                    className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg"
                    title="Print Receipt"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors shadow-lg"
                    title="Share on WhatsApp"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={confirmCompleteOrder}
                    disabled={isCompleting}
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
                  >
                    {isCompleting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Confirm & Complete
                      </>
                    )}
                  </button>
                </div>
                
                {/* Secondary Info */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Info className="w-3 h-3" />
                  <span>Print receipt or share via WhatsApp before completing</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add to Inventory Modal */}
        {showAddToInventoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold">Add to Inventory</h2>
                </div>
                <button onClick={() => setShowAddToInventoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Quality Check Passed!</p>
                      <p className="text-sm text-blue-600">Set selling prices and add items to inventory</p>
                    </div>
                  </div>
                </div>

                {/* Profit Margin */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Profit Margin (%)
                  </label>
                  <input
                    type="number"
                    value={profitMargin}
                    onChange={(e) => setProfitMargin(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="30"
                    min="0"
                    max="100"
                    step="5"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Selling price will be calculated as: Cost Price × (1 + {profitMargin}%)
                  </p>
                </div>

                {/* Default Location */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Default Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={inventoryLocation}
                    onChange={(e) => setInventoryLocation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., Warehouse A, Shelf 3"
                  />
                </div>

                {/* Preview */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Preview</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Items to add:</span>
                      <span className="font-medium">{qualityCheckItems.filter(i => i.result === 'pass').length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Profit margin:</span>
                      <span className="font-medium">{profitMargin}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Location:</span>
                      <span className="font-medium">{inventoryLocation || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddToInventoryModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddToInventory}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  {isSaving ? 'Adding...' : 'Add to Inventory'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Consolidated Receive Modal */}
        {showConsolidatedReceiveModal && purchaseOrder && (
          <ConsolidatedReceiveModal
            isOpen={showConsolidatedReceiveModal}
            onClose={() => setShowConsolidatedReceiveModal(false)}
            purchaseOrder={purchaseOrder}
            onReceiveFull={async () => {
              setReceiveMode('full');
              // Save progress
              saveReceiveProgress({ receiveMode: 'full' });
              
              console.log('📦 Full receive selected - opening SerialNumberReceiveModal');
              setShowConsolidatedReceiveModal(false);
              
              // Always show the Serial Number Modal to allow users to enter IMEI/serial numbers
              // The modal will allow skipping for items that don't need tracking
              setTimeout(() => setShowSerialNumberReceiveModal(true), 150);
            }}
            onReceivePartial={async () => {
              setReceiveMode('partial');
              // Save progress
              saveReceiveProgress({ receiveMode: 'partial' });
              
              console.log('📦 Partial receive selected - opening SerialNumberReceiveModal');
              setShowConsolidatedReceiveModal(false);
              
              // Always show the Serial Number Modal to allow users to enter IMEI/serial numbers
              // and select quantities for partial receive
              toast('Select quantities to receive for each item', { icon: 'ℹ️' });
              setTimeout(() => setShowSerialNumberReceiveModal(true), 150);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PurchaseOrderDetailPage;
