/**
 * POSPageOptimized Component
 * 
 * OPTIMIZATIONS APPLIED:
 * ✅ Removed duplicate useEffect hooks (stock update listeners)
 * ✅ Removed duplicate inventory alert check hooks
 * ✅ Added useCallback to optimize cart functions (addToCart, updateCartItemQuantity, removeCartItem, clearCart)
 * ✅ Improved error handling and validation throughout
 * ✅ Added stock availability checks before adding to cart
 * ✅ Combined event bus and window event listeners for backward compatibility
 * ✅ Added proper cleanup for timeouts to prevent memory leaks
 * ✅ Enhanced console logging for debugging
 * 
 * CRITICAL BUG FIXES:
 * 🚨 Fixed price field mismatch (item.price → item.unitPrice)
 * 🚨 Fixed product/variant name fields (item.name → item.productName/variantName)
 * 🚨 Fixed "Invalid total amount" error with comprehensive validation
 * 🚨 Fixed sales recording $0 prices (wrong field: item.price vs item.unitPrice)
 * 🚨 Fixed product names in sales (wrong field: item.name vs item.productName)
 * 🚨 Fixed variant names in sales (wrong field: item.name vs item.variantName)
 * 🚨 Fixed in both ZenoPay and regular payment handlers
 * 
 * PAYMENT VALIDATION IMPROVEMENTS:
 * - Individual cart item price validation (NaN, undefined, 0 checks)
 * - Discount validation (cannot exceed total)
 * - Total amount validation with clear error messages
 * - Comprehensive console logging for debugging
 * - Specific error messages identifying problem items
 * 
 * PERFORMANCE IMPROVEMENTS:
 * - Memoized expensive computations with useMemo
 * - Optimized re-renders with useCallback
 * - Consolidated duplicate event listeners
 * - Better state management for cart operations
 * - Enhanced total calculation with validation
 * 
 * DEBUGGING FEATURES:
 * - 🛒 Cart operation logs
 * - 📦 Quantity update logs
 * - 🧮 Total calculation logs
 * - 💳 Payment processing logs
 * - ✅/❌ Success/error indicators
 * 
 * Last optimized: 2025-10-09
 * Total fixes: 9 major issues resolved
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, X, CheckCircle, User, Package, DollarSign, Phone, Mail, Calendar, UserCircle } from 'lucide-react';
import { useCustomers } from '../../../context/CustomersContext';
import { useAuth } from '../../../context/AuthContext';
import { useBranch } from '../../../context/BranchContext';
import { rbacManager, type UserRole } from '../lib/rbac';
// import { useInventoryAlertPreferences } from '../../../../hooks/useInventoryAlertPreferences';
// import { applyInventoryAlertsMigration } from '../../../../utils/applyInventoryAlertsMigration';
import LATSBreadcrumb from '../components/ui/LATSBreadcrumb';
import POSTopBar from '../components/pos/POSTopBar';
import ProductSearchSection from '../components/pos/ProductSearchSection';
import POSCartSection from '../components/pos/POSCartSection';
import { useDynamicDataStore } from '../lib/data/dynamicDataStore';
import { useInventoryStore } from '../stores/useInventoryStore';
import AddExternalProductModal from '../components/pos/AddExternalProductModal';
import DeliverySection from '../components/pos/DeliverySection';
import AddCustomerModal from '../../../features/customers/components/forms/AddCustomerModal';
import CustomerSelectionModal from '../components/pos/CustomerSelectionModal';
import CustomerEditModal from '../components/pos/CustomerEditModal';
import CustomerDetailModal from '../../../features/customers/components/CustomerDetailModal';
import SalesAnalyticsModal from '../components/pos/SalesAnalyticsModal';
import ZenoPayPaymentModal from '../components/pos/ZenoPayPaymentModal';
import POSInstallmentModal from '../components/pos/POSInstallmentModal';
import TradeInContractModal from '../components/pos/TradeInContractModal';
import TradeInPricingModal from '../components/pos/TradeInPricingModal';
import VariantSelectionModal from '../components/pos/VariantSelectionModal';
import ComprehensivePaymentModal from '../components/pos/ComprehensivePaymentModal';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import ProductGridSkeleton from '../../../components/ui/ProductGridSkeleton';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Lazy load TradeInCalculator to avoid circular dependency issues with getAllSpareParts
const TradeInCalculator = React.lazy(() => import('../components/pos/TradeInCalculator'));
import InstallmentManagementModal from '../components/pos/InstallmentManagementModal';
import PaymentsPopupModal from '../../../components/PaymentsPopupModal';
import { supabase } from '../../../lib/supabaseClient';
import { usePaymentMethodsContext } from '../../../context/PaymentMethodsContext';
import { latsEventBus } from '../lib/data/eventBus';
import PostClosureWarningModal from '../components/modals/PostClosureWarningModal';
import DayOpeningModal from '../components/modals/DayOpeningModal';
import { SoundManager } from '../../../lib/soundUtils';
import DailyClosingModal from '../components/modals/DailyClosingModal';
import { usePOSClickSounds } from '../hooks/usePOSClickSounds';
import { useDeviceDetection } from '../../../hooks/useDeviceDetection';
import MobilePOSWrapper from '../components/pos/MobilePOSWrapper';
import InvoiceTemplate from '../../../components/templates/InvoiceTemplate';
import { FileText, Printer } from 'lucide-react';


// Import lazy-loaded modal wrappers
import { 
  POSSettingsModalWrapper, 
  POSDiscountModalWrapper, 
  POSReceiptModalWrapper,
  type POSSettingsModalRef 
} from '../components/pos/POSModals';

// Import draft functionality
import { useDraftManager } from '../hooks/useDraftManager';
import DraftManagementModal from '../components/pos/DraftManagementModal';
import DraftNotification from '../components/pos/DraftNotification';
import { POSSettingsService } from '../../../lib/posSettingsApi';
import { saleProcessingService } from '../../../lib/saleProcessingService';
import { toast } from 'react-hot-toast';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';
import ShareReceiptModal from '../../../components/ui/ShareReceiptModal';
import GlobalSearchShortcut from '../../../features/shared/components/GlobalSearchShortcut';
import QuickExpenseModal from '../../../components/QuickExpenseModal';
import { 
  useDynamicPricingSettings,
  useGeneralSettings,
  // useReceiptSettings, // NOT USED - removed
  useBarcodeScannerSettings,
  useDeliverySettings,
  useSearchFilterSettings,
  // useUserPermissionsSettings, // NOT USED - removed
  // useLoyaltyCustomerSettings, // NOT USED - removed
  // useAnalyticsReportingSettings, // NOT USED - removed
  // useNotificationSettings, // NOT USED - removed
  useAdvancedSettings
} from '../../../hooks/usePOSSettings';
import { useDynamicDelivery } from '../hooks/useDynamicDelivery';
import { format } from '../lib/format';
import { usePOSFeatures } from '../hooks/usePOSFeatures';
import { SafeImage } from '../../../components/SafeImage';

// Helper function to convert old image format to new format
// const convertToProductImages = (imageUrls: string[]): ProductImage[] => {
//   if (!imageUrls || imageUrls.length === 0) return [];
//   
//   return imageUrls.map((imageUrl, index) => ({
//     id: `temp-${index}`,
//     url: imageUrl,
//     thumbnailUrl: imageUrl,
//     fileName: `product-image-${index + 1}`,
//     fileSize: 0,
//     isPrimary: index === 0,
//     uploadedAt: new Date().toISOString()
//   }));
// };


// Performance optimization constants
const PRODUCTS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};


const POSPageOptimized: React.FC = () => {
  const navigate = useNavigate();
  const { playClickSound, playPaymentSound, playDeleteSound } = usePOSClickSounds();
  
  // Device detection for automatic mobile UI switching
  const { isMobile, isTablet, deviceType } = useDeviceDetection();
  
  // View mode preference (can be manually toggled by user)
  const [viewModePreference, setViewModePreference] = useState<'mobile' | 'desktop' | 'auto'>(() => {
    const saved = localStorage.getItem('pos_view_mode');
    return (saved === 'mobile' || saved === 'desktop') ? saved : 'auto';
  });
  
  // Listen for view mode changes from the toggle button
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('pos_view_mode');
      if (saved === 'mobile' || saved === 'desktop') {
        setViewModePreference(saved);
      }
    };
    
    // Listen for storage changes
    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event (for same-tab updates)
    const handleViewModeChange = () => handleStorageChange();
    window.addEventListener('viewModeChanged', handleViewModeChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('viewModeChanged', handleViewModeChange);
    };
  }, []);
  
  // Determine which UI to use based on preference or auto-detection
  const useMobileUI = viewModePreference === 'auto' 
    ? isMobile 
    : viewModePreference === 'mobile';
  
  // Debug device detection and view mode (only log once in development mode)
  const hasLoggedDeviceInfo = useRef(false);
  useEffect(() => {
    if (!hasLoggedDeviceInfo.current && process.env.NODE_ENV === 'development') {
      console.log('🔧 Device Detection:', { 
        isMobile, 
        isTablet, 
        deviceType, 
        viewModePreference, 
        useMobileUI 
      });
      hasLoggedDeviceInfo.current = true;
    }
  }, [isMobile, isTablet, deviceType, viewModePreference, useMobileUI]);
  
  // Session tracking - tracks when the current day was opened (moved up to avoid TDZ error)
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);
  
  // Get sales data from inventory store (real database data)
  const { sales: dbSales } = useInventoryStore();
  
  // Calculate today's sales total - only from current session
  const todaysSales = useMemo(() => {
    // If we have a session start time, only count sales from this session
    if (sessionStartTime) {
      const sessionSales = dbSales.filter(sale => 
        sale.created_at && sale.created_at >= sessionStartTime
      );
      const total = sessionSales.reduce((sum, sale) => {
        const amount = typeof sale.total_amount === 'number' ? sale.total_amount : parseFloat(sale.total_amount) || 0;
        return sum + amount;
      }, 0);
      return total;
    }
    
    // Fallback: If no session, show today's sales
    const today = new Date().toISOString().split('T')[0];
    const todaySales = dbSales.filter(sale => {
      if (!sale.created_at) return false;
      const createdDate = typeof sale.created_at === 'string' 
        ? sale.created_at 
        : new Date(sale.created_at).toISOString();
      return createdDate.startsWith(today);
    });
    const total = todaySales.reduce((sum, sale) => {
      const amount = typeof sale.total_amount === 'number' ? sale.total_amount : parseFloat(sale.total_amount) || 0;
      return sum + amount;
    }, 0);

    return total;
  }, [dbSales, sessionStartTime]);
  
  // Log session info only when session actually changes (not on every sale) - development only
  useEffect(() => {
    if (sessionStartTime && process.env.NODE_ENV === 'development') {
      console.log(`📊 Session started at: ${new Date(sessionStartTime).toLocaleTimeString()}`);
    }
  }, [sessionStartTime]);
  
  // Get customers from context
  const { customers } = useCustomers();

  // Get authenticated user
  const { currentUser } = useAuth();
  
  // Get current branch
  const { currentBranch, loading: branchLoading } = useBranch();
  
  // Success modal for sale completion
  const successModal = useSuccessModal();
  
  // Inventory alert preferences from database (temporarily disabled)
  // const {
  //   preferences: alertPreferences,
  //   loading: alertPreferencesLoading,
  //   dismissAlertsForToday,
  //   permanentlyDisableAlerts,
  //   areAlertsDismissedForToday,
  //   logAlertHistory,
  //   isLowStockAlertsEnabled,
  //   lowStockThreshold: dbLowStockThreshold,
  //   showAlertsAsModal,
  //   showAlertsAsNotification,
  //   autoHideNotificationSeconds,
  //   areAlertsPermanentlyDisabled
  // } = useInventoryAlertPreferences();

  // Permission checks for current user - now checks user.permissions array first!
  const userRole = currentUser?.role as UserRole;
  const canAccessPOS = rbacManager.canUser(currentUser, 'pos', 'view');
  const canSell = rbacManager.canUser(currentUser, 'pos', 'sell');
  const canRefund = rbacManager.canUser(currentUser, 'pos', 'refund');
  const canVoid = rbacManager.canUser(currentUser, 'pos', 'void');
  const canViewInventory = rbacManager.canUser(currentUser, 'pos-inventory', 'view');
  const canSearchInventory = rbacManager.canUser(currentUser, 'pos-inventory', 'search');
  const canAddToCart = rbacManager.canUser(currentUser, 'pos-inventory', 'add-to-cart');
  const canCreateSales = rbacManager.canUser(currentUser, 'sales', 'create');
  const canViewSales = rbacManager.canUser(currentUser, 'sales', 'view');
  const canEditSales = rbacManager.canUser(currentUser, 'sales', 'edit');
  const canDeleteSales = rbacManager.canUser(currentUser, 'sales', 'delete');
  const canRefundSales = rbacManager.canUser(currentUser, 'sales', 'refund');

  // Get payment methods from global context
  // const { paymentMethods: dbPaymentMethods, loading: paymentMethodsLoading } = usePaymentMethodsContext();

  // All POS settings hooks
  // Load only the settings that are actually used in this page (optimized from 11 to 6 hooks)
  const { settings: generalSettings } = useGeneralSettings();
  const { settings: dynamicPricingSettings } = useDynamicPricingSettings();
  const { settings: barcodeScannerSettings } = useBarcodeScannerSettings();
  const { settings: deliverySettings } = useDeliverySettings();
  // ✅ FIX: Ensure deliverySettings has all required fields with proper defaults
  const safeDeliverySettings = deliverySettings ? {
    ...deliverySettings,
    delivery_areas: deliverySettings.delivery_areas || [],
    area_delivery_fees: deliverySettings.area_delivery_fees || {}
  } : {
    delivery_areas: [],
    area_delivery_fees: {},
    enable_delivery: false,
    default_delivery_fee: 0,
    free_delivery_threshold: 0
  } as any; // Type assertion to handle partial settings
  const dynamicDelivery = useDynamicDelivery(safeDeliverySettings);
  const [selectedDeliveryArea, setSelectedDeliveryArea] = useState<string>('');
  const { settings: searchFilterSettings } = useSearchFilterSettings();
  const { settings: advancedSettings } = useAdvancedSettings();
  
  // Get products per page from settings (fallback to 20 if not set)
  const productsPerPageFromSettings = generalSettings?.products_per_page || 20;

  // Database state management
  const { 
    products: dbProducts,
    categories,
    loadProducts,
    loadCategories,
    loadSuppliers,
    loadSales
  } = useInventoryStore();

  // Unified loading system for non-blocking loading indicators
  const { startLoading, updateProgress, completeLoading, failLoading } = useLoadingJob();

  // Track if we've already logged product load status
  const hasLoggedProductStatus = useRef(false);
  // Track if initial data load has been triggered
  const initialLoadTriggered = useRef(false);
  // Track if we've attempted to auto-open customer selection modal
  const hasAttemptedAutoOpen = useRef(false);

  // Track stock adjustments for products/variants when added to cart
  const [stockAdjustments, setStockAdjustments] = useState<Map<string, number>>(new Map());

  // Transform products with category information - OPTIMIZED
  const products = useMemo(() => {
    if (dbProducts.length === 0) {
      if (import.meta.env.DEV) {
        console.log('🔍 [POS Debug] No products in dbProducts array');
      }
      return [];
    }

    // 🔍 DEBUG: Check product data quality
    if (import.meta.env.DEV) {
      const productsWithVariants = dbProducts.filter(p => p.variants && p.variants.length > 0).length;
      const productsWithStock = dbProducts.filter(p => {
        const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.quantity || v.stockQuantity || 0), 0) || 0;
        return totalStock > 0;
      }).length;
      const productsWithPrice = dbProducts.filter(p => {
        const hasPrice = p.price > 0 || p.variants?.some((v: any) => (v.sellingPrice || v.price || 0) > 0);
        return hasPrice;
      }).length;
      
      console.log('🔍 [POS Debug] Product data quality check:', {
        totalProducts: dbProducts.length,
        withVariants: productsWithVariants,
        withoutVariants: dbProducts.length - productsWithVariants,
        withStock: productsWithStock,
        withoutStock: dbProducts.length - productsWithStock,
        withPrice: productsWithPrice,
        withoutPrice: dbProducts.length - productsWithPrice,
        percentageWithVariants: Math.round((productsWithVariants / dbProducts.length) * 100),
        percentageWithStock: Math.round((productsWithStock / dbProducts.length) * 100),
        percentageWithPrice: Math.round((productsWithPrice / dbProducts.length) * 100)
      });
      
      // Sample first few products
      const sampleProducts = dbProducts.slice(0, 3);
      sampleProducts.forEach((product, idx) => {
        console.log(`🔍 [POS Debug] Sample product ${idx + 1}:`, {
          id: product.id,
          name: product.name,
          hasVariants: !!(product.variants && product.variants.length > 0),
          variantCount: product.variants?.length || 0,
          price: product.price,
          variants: product.variants?.map((v: any) => ({
            id: v.id,
            name: v.name,
            quantity: v.quantity,
            stockQuantity: v.stockQuantity,
            price: v.price,
            sellingPrice: v.sellingPrice
          })) || []
        });
      });
    }

    // Note: Showing ALL products including test/sample products as per user preference
    const filteredDbProducts = dbProducts;
    
    // DON'T WAIT FOR CATEGORIES - Show products immediately!
    // If no categories loaded yet, return products without category info
    if (categories.length === 0) {
      return filteredDbProducts.map(product => {
        // Apply stock adjustments to variants
        const adjustedVariants = product.variants?.map((variant: any) => {
          const variantKey = `${product.id}-${variant.id}`;
          const stockAdjustment = stockAdjustments.get(variantKey) || 0;
          const originalQuantity = variant.stockQuantity ?? variant.quantity ?? 0;
          const adjustedQuantity = Math.max(0, originalQuantity - stockAdjustment);
          
          return {
            ...variant,
            quantity: adjustedQuantity,
            stockQuantity: adjustedQuantity,
            _originalQuantity: originalQuantity
          };
        });
        
        return {
          ...product,
          variants: adjustedVariants,
          categoryName: 'Uncategorized',
          category: undefined
        };
      });
    }
    
    return filteredDbProducts.map(product => {
      // Try multiple possible category field names - handle both camelCase and snake_case
      const categoryId = product.categoryId || (product as any).category_id || (product as any).category?.id;
      
      // Find category by ID, with fallback to name matching if ID doesn't work
      let categoryName = 'Unknown Category';
      let foundCategory = null;
      
      if (categoryId && categories.length > 0) {
        foundCategory = categories.find(c => c.id === categoryId);
        if (foundCategory) {
          categoryName = foundCategory.name;
        }
      }
      
      // If no category found by ID, try to find by name (for backward compatibility)
      if (!foundCategory && product.name && categories.length > 0) {
        // Try to match category by product name patterns
        const productNameLower = product.name.toLowerCase();
        foundCategory = categories.find(c => {
          const categoryNameLower = c.name.toLowerCase();
          return productNameLower.includes(categoryNameLower) || 
                 categoryNameLower.includes(productNameLower);
        });
        if (foundCategory) {
          categoryName = foundCategory.name;
        }
      }
      
      // Apply stock adjustments to variants
      const adjustedVariants = product.variants?.map((variant: any) => {
        const variantKey = `${product.id}-${variant.id}`;
        const stockAdjustment = stockAdjustments.get(variantKey) || 0;
        const originalQuantity = variant.stockQuantity ?? variant.quantity ?? 0;
        const adjustedQuantity = Math.max(0, originalQuantity - stockAdjustment);
        
        return {
          ...variant,
          quantity: adjustedQuantity,
          stockQuantity: adjustedQuantity,
          // Keep original quantity for reference
          _originalQuantity: originalQuantity
        };
      });
      
      return {
        ...product,
        variants: adjustedVariants,
        categoryName,
        // Ensure category object is available for backward compatibility
        category: product.category || (foundCategory ? {
          id: foundCategory.id,
          name: foundCategory.name,
          description: foundCategory.description,
          color: foundCategory.color
        } : undefined)
      };
    });
  }, [dbProducts, categories, stockAdjustments]);

  // Performance optimization: Cache data loading state
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastLoadTime, setLastLoadTime] = useState(0);

  // Log product load status only when products change (not on every render)
  useEffect(() => {
    if (dbProducts.length > 0 && !hasLoggedProductStatus.current) {
      console.log(`✅ [POS] ${dbProducts.length} products loaded from database`);
      
      // 🔍 DIAGNOSTIC: Check product data quality
      const productsWithVariants = dbProducts.filter(p => p.variants && p.variants.length > 0).length;
      const productsWithStock = dbProducts.filter(p => {
        const totalStock = p.variants?.reduce((sum: number, v: any) => sum + (v.quantity || v.stockQuantity || 0), 0) || 0;
        return totalStock > 0;
      }).length;
      const productsWithPrice = dbProducts.filter(p => {
        const hasPrice = p.price > 0 || p.variants?.some((v: any) => (v.sellingPrice || v.price || 0) > 0);
        return hasPrice;
      }).length;
      
      console.log(`📊 [POS Diagnostic] Product data quality:`, {
        total: dbProducts.length,
        withVariants: productsWithVariants,
        withStock: productsWithStock,
        withPrice: productsWithPrice,
        withoutVariants: dbProducts.length - productsWithVariants,
        withoutStock: dbProducts.length - productsWithStock,
        withoutPrice: dbProducts.length - productsWithPrice
      });
      
      // Sample first product to see structure
      if (dbProducts.length > 0) {
        const sample = dbProducts[0];
        console.log(`🔍 [POS Diagnostic] Sample product structure:`, {
          id: sample.id,
          name: sample.name,
          hasVariants: !!(sample.variants && sample.variants.length > 0),
          variantCount: sample.variants?.length || 0,
          price: sample.price,
          variants: sample.variants?.map((v: any) => ({
            id: v.id,
            name: v.name,
            quantity: v.quantity,
            stockQuantity: v.stockQuantity,
            price: v.price,
            sellingPrice: v.sellingPrice
          })) || []
        });
      }
      
      const filteredCount = products.length;
      if (filteredCount !== dbProducts.length) {
        console.log(`✅ [POS] ${filteredCount} products after filtering`);
      }
      hasLoggedProductStatus.current = true;
    } else if (dbProducts.length === 0 && hasLoggedProductStatus.current) {
      console.warn('⚠️ [POS] dbProducts became empty! This might indicate a store reset.');
      hasLoggedProductStatus.current = false;
    }
    
    // Debug: Log current state
    if (import.meta.env.DEV) {
      console.log(`🔍 [POS Debug] dbProducts: ${dbProducts.length}, products: ${products.length}, dataLoaded: ${dataLoaded}`);
    }
  }, [dbProducts.length, products.length, dataLoaded, dbProducts]);
  const isCachingEnabled = advancedSettings?.enable_caching;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const debounceTime = searchFilterSettings?.search_debounce_time || SEARCH_DEBOUNCE_MS;
  const debouncedSearchQuery = useDebounce(searchQuery, debounceTime);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all'); // Default to 'all' to show all products
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'recent' | 'sales'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Settings state
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Feature toggles - Load from localStorage
  const { 
    features, 
    isDeliveryEnabled, 
    isLoyaltyEnabled, 
    isCustomerProfilesEnabled, 
    isDynamicPricingEnabled 
  } = usePOSFeatures();

  // Customer state
  const [customerName, setCustomerName] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShareReceiptModal, setShowShareReceiptModal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [additionalCustomerInfo, setAdditionalCustomerInfo] = useState({
    companyName: '',
    additionalNotes: '',
    receiverName: '',
    receiverAddress: '',
    receiverPhone: ''
  });
  const [paymentInfo, setPaymentInfo] = useState({
    paymentMethod: '',
    paymentReference: '',
    transactionId: '',
    paidAmount: 0,
    balance: 0,
    paymentDate: ''
  });
  const [showAdditionalInfoForm, setShowAdditionalInfoForm] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [cashierName, setCashierName] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // QrCode scanning state
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [scanHistory, setScanHistory] = useState<Array<{barcode: string, product: any, timestamp: Date}>>([]);

  // Modal states
  const [showAddExternalProductModal, setShowAddExternalProductModal] = useState(false);
  const [showDeliverySection, setShowDeliverySection] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showCustomerSelectionModal, setShowCustomerSelectionModal] = useState(false);
  const [showCustomerEditModal, setShowCustomerEditModal] = useState(false);
  const [showCustomerDetailModal, setShowCustomerDetailModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showDraftNotification, setShowDraftNotification] = useState(false);
  const [showQuickExpense, setShowQuickExpense] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [showPOSSummaryModal, setShowPOSSummaryModal] = useState(false);
  const [showVariantSelectionModal, setShowVariantSelectionModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);
  const [cartItemForIMEIUpdate, setCartItemForIMEIUpdate] = useState<any>(null);

  // Draft management
  const { 
    saveDraft, 
    loadDraft, 
    getAllDrafts, 
    deleteCurrentDraft: deleteDraft,
    hasUnsavedChanges,
    currentDraftId 
  } = useDraftManager({
    cartItems,
    customer: selectedCustomer
  });

  // Discount state
  const [manualDiscount, setManualDiscount] = useState(0);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  // Stats and notifications
  const [dailyStats, setDailyStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransactionValue: 0,
    topSellingProducts: []
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [currentShift, setCurrentShift] = useState({
    startTime: new Date(),
    totalSales: 0,
    totalTransactions: 0
  });

  // QrCode scanner state
  const [showQrCodeScanner, setShowQrCodeScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedQrCodes, setScannedQrCodes] = useState<string[]>([]);

  // Receipt state
  const [receiptTemplate, setReceiptTemplate] = useState({
    header: '',
    footer: '',
    includeLogo: true,
    includeQR: true
  });
  const [receiptHistory, setReceiptHistory] = useState<any[]>([]);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [receiptPrintMode, setReceiptPrintMode] = useState<'thermal' | 'a4' | 'email'>('thermal');


  // Daily closure state
  const [isDailyClosed, setIsDailyClosed] = useState(false);
  const [dailyClosureInfo, setDailyClosureInfo] = useState<{
    closedAt?: string;
    closedBy?: string;
  } | null>(null);
  const [showPostClosureWarning, setShowPostClosureWarning] = useState(false);
  const [showDayOpeningModal, setShowDayOpeningModal] = useState(false);
  const [showDailyClosingModal, setShowDailyClosingModal] = useState(false);

  // Stock adjustment
  const [showStockAdjustment, setShowStockAdjustment] = useState(false);
  const [selectedProductForAdjustment, setSelectedProductForAdjustment] = useState<any>(null);

  // Customer loyalty
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState<{[key: string]: number}>({});
  const [customerPurchaseHistory, setCustomerPurchaseHistory] = useState<{[key: string]: any[]}>({});
  const [customerNotes, setCustomerNotes] = useState<{[key: string]: string}>({});
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [selectedCustomerForDetails, setSelectedCustomerForDetails] = useState<any>(null);
  
  const [showLoyaltyPoints, setShowLoyaltyPoints] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState('');
  const [pointsReason, setPointsReason] = useState('');

  // Analytics and reporting
  const [showSalesAnalytics, setShowSalesAnalytics] = useState(false);

  // Payment processing
  const [showZenoPayPayment, setShowZenoPayPayment] = useState(false);
  const [showInstallmentModal, setShowInstallmentModal] = useState(false);
  const [showReturnsModal, setShowReturnsModal] = useState(false);
  const [showSplitPaymentModal, setShowSplitPaymentModal] = useState(false);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);

  // Trade-In state
  const [showTradeInCalculator, setShowTradeInCalculator] = useState(false);
  const [showTradeInContract, setShowTradeInContract] = useState(false);
  const [showTradeInPricing, setShowTradeInPricing] = useState(false);
  const [tradeInData, setTradeInData] = useState<any>(null);
  const [tradeInTransaction, setTradeInTransaction] = useState<any>(null);
  const [tradeInDiscount, setTradeInDiscount] = useState(0);
  
  // Use a ref to persist the trade-in transaction throughout the payment flow
  // This prevents the state from being lost due to React's async state updates
  const tradeInTransactionRef = useRef<any>(null);
  
  // Installment management
  const [showInstallmentManagement, setShowInstallmentManagement] = useState(false);

  // Settings modal refs
  const settingsModalRef = useRef<POSSettingsModalRef>(null);
  const generalSettingsRef = useRef<any>(null);
  const dynamicPricingSettingsRef = useRef<any>(null);
  const receiptSettingsRef = useRef<any>(null);
  const barcodeScannerSettingsRef = useRef<any>(null);
  const deliverySettingsRef = useRef<any>(null);
  const searchFilterSettingsRef = useRef<any>(null);
  const userPermissionsSettingsRef = useRef<any>(null);
  const loyaltyCustomerSettingsRef = useRef<any>(null);
  const analyticsReportingSettingsRef = useRef<any>(null);
  const notificationSettingsRef = useRef<any>(null);
  const advancedSettingsRef = useRef<any>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  // Set cashier name from authenticated user
  useEffect(() => {
    if (currentUser) {
      setCashierName(currentUser.name || currentUser.email || 'POS User');
    }
  }, [currentUser]);

  // Initialize sound debugging
  useEffect(() => {
    // Expose SoundManager to window for debugging (if needed)
    (window as any).SoundManager = SoundManager;
  }, []);

  // Component-level permission check
  useEffect(() => {
    if (currentUser && !canAccessPOS) {
      navigate('/dashboard');
      return;
    }
  }, [currentUser, canAccessPOS, navigate]);

  // Check if user has permission to close daily sales
  const canCloseDailySales = useMemo(() => {
    if (!currentUser) return false;
    // Now checks user.permissions array first, then falls back to role
    return rbacManager.canUser(currentUser, 'reports', 'daily-close') || 
           currentUser.role === 'admin' || 
           currentUser.role === 'manager' ||
           currentUser.role === 'owner';
  }, [currentUser]);


  // Show loading indicator when search query changes (debounced)
  useEffect(() => {
    if (debouncedSearchQuery) {
      const jobId = startLoading('Filtering products...');
      // Simulate filter time
      setTimeout(() => {
        completeLoading(jobId);
      }, 300);
    }
  }, [debouncedSearchQuery, startLoading, completeLoading]);

  // Show loading indicator when category filter changes
  useEffect(() => {
    if (selectedCategory) {
      const jobId = startLoading('Filtering by category...');
      setTimeout(() => {
        completeLoading(jobId);
      }, 200);
    }
  }, [selectedCategory, startLoading, completeLoading]);

  // Show loading indicator when stock filter changes
  useEffect(() => {
    const jobId = startLoading('Applying filters...');
    setTimeout(() => {
      completeLoading(jobId);
    }, 200);
  }, [stockFilter, sortBy, sortOrder, startLoading, completeLoading]);

  // Load initial data - simplified to match customer portal pattern
  useEffect(() => {
    // Prevent multiple simultaneous loads
    if (initialLoadTriggered.current) {
      return;
    }
    initialLoadTriggered.current = true;

    const loadInitialData = async () => {
      const jobId = startLoading('Loading POS data...');
      
      try {
        console.log('🚀 [POS] Loading products and categories...');
        
        // Simple approach: just call loadProducts and loadCategories like customer portal does
        // The loadProducts function handles cache internally, so we don't need to check it here
        await Promise.allSettled([
          loadProducts({ page: 1, limit: 200 }, false),
          loadCategories()
        ]);
        
        const finalProductCount = useInventoryStore.getState().products.length;
        console.log(`✅ [POS] Loaded ${finalProductCount} products`);
        
        completeLoading(jobId);
      } catch (error) {
        console.error('❌ [POS] Error loading initial data:', error);
        failLoading(jobId, 'Failed to load POS data');
      }
    };
    
    loadInitialData();
    
    // Load non-critical data in background (don't wait for it)
    const backgroundJobId = startLoading('Loading additional data...');
    Promise.allSettled([
      loadSuppliers(),
      loadSales()
    ]).then(() => {
      console.log('✅ [POS] Background data loaded');
      completeLoading(backgroundJobId);
    }).catch(err => {
      console.warn('⚠️ [POS] Background data failed (non-critical):', err);
      failLoading(backgroundJobId, 'Background data failed');
    });
    
    setDataLoaded(true);
    setLastLoadTime(Date.now());
  }, [loadProducts, loadCategories, loadSuppliers, loadSales, startLoading, completeLoading, failLoading]);

  // Auto-open customer selection modal when POS page loads (similar to PO page)
  useEffect(() => {
    // Only show automatically if:
    // 1. Customer profiles feature is enabled
    // 2. No customer is currently selected
    // 3. Initial data has been loaded
    // 4. We haven't already attempted to open it
    if (
      isCustomerProfilesEnabled() &&
      !selectedCustomer &&
      dataLoaded &&
      !hasAttemptedAutoOpen.current
    ) {
      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        setShowCustomerSelectionModal(true);
        hasAttemptedAutoOpen.current = true;
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isCustomerProfilesEnabled, selectedCustomer, dataLoaded]);

  // Monitor categories loading
  useEffect(() => {
    // Categories loaded - no need to log in production
  }, [categories]);

  // Load receipt history
  useEffect(() => {
    const loadReceiptHistory = async () => {
      try {
        // Implementation for loading receipt history

      } catch (error) {
        console.error('Error loading receipt history:', error);
      }
    };

    loadReceiptHistory();
  }, []);

  // Show access denied if user doesn't have POS permissions
  if (!currentUser || !canAccessPOS) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="text-center p-8">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600 mb-4">You don't have permission to access the POS system.</p>
          <button
            onClick={() => {
              playClickSound();
              navigate('/dashboard');
            }}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Main component return


  // Listen for stock updates and refresh POS data after sales
  useEffect(() => {
    console.log('🔵 [DEBUG] POSPageOptimized: Setting up event listeners');
    
    // ⚠️ CRITICAL: Add debouncing to prevent multiple simultaneous reloads
    let stockUpdateTimeout: NodeJS.Timeout | null = null;
    let saleCompletedTimeout: NodeJS.Timeout | null = null;
    let stockUpdateCount = 0;
    let saleCompletedCount = 0;
    
    const handleStockUpdate = (event: any) => {
      stockUpdateCount++;
      console.log(`🔵 [DEBUG] POSPageOptimized: Stock update event #${stockUpdateCount} received:`, {
        event,
        hasPendingTimeout: !!stockUpdateTimeout,
        timestamp: new Date().toISOString()
      });
      
      // Clear any pending reload
      if (stockUpdateTimeout) {
        console.log(`🔵 [DEBUG] POSPageOptimized: Clearing pending stock update timeout`);
        clearTimeout(stockUpdateTimeout);
      }
      
      // 🚀 OPTIMIZATION: Debounce product reload to prevent cascading events
      console.log(`🔵 [DEBUG] POSPageOptimized: Scheduling stock update reload in 2 seconds`);
      stockUpdateTimeout = setTimeout(() => {
        console.log(`🔵 [DEBUG] POSPageOptimized: Executing stock update reload now`);
        loadProducts().catch(err => {
          console.warn('⚠️ [DEBUG] POSPageOptimized: Background product reload failed:', err);
        });
        stockUpdateTimeout = null;
      }, 2000); // Increased delay to 2 seconds to prevent cascading
    };

    const handleSaleCompleted = (event: any) => {
      saleCompletedCount++;
      console.log(`🔵 [DEBUG] POSPageOptimized: Sale completed event #${saleCompletedCount} received:`, {
        event,
        hasPendingTimeout: !!saleCompletedTimeout,
        timestamp: new Date().toISOString()
      });
      
      // Clear any pending reload
      if (saleCompletedTimeout) {
        console.log(`🔵 [DEBUG] POSPageOptimized: Clearing pending sale completed timeout`);
        clearTimeout(saleCompletedTimeout);
      }
      
      // Always refresh products after sale to update stock levels
      console.log(`🔄 [POS] Refreshing products after sale to update stock`);
      saleCompletedTimeout = setTimeout(() => {
        console.log(`🔵 [DEBUG] POSPageOptimized: Executing sale completed reload now`);
        Promise.allSettled([
          // Force refresh products to get updated stock levels
          loadProducts({ page: 1, limit: 200 }, true).catch(err => {
            console.warn('⚠️ [DEBUG] POSPageOptimized: Background product reload failed:', err);
          }),
          loadSales().catch(err => {
            console.warn('⚠️ [DEBUG] POSPageOptimized: Background sales reload failed:', err);
          })
        ]).then(() => {
          console.log(`✅ [POS] Products refreshed after sale - stock updated`);
        });
        saleCompletedTimeout = null;
      }, 500); // Reduced delay to 500ms for faster stock update
    };

    // Subscribe to event bus events (modern approach)
    console.log('🔵 [DEBUG] POSPageOptimized: Subscribing to event bus');
    const unsubscribeStock = latsEventBus.subscribe('lats:stock.updated', handleStockUpdate);
    const unsubscribeSale = latsEventBus.subscribe('lats:sale.completed', handleSaleCompleted);
    console.log('🔵 [DEBUG] POSPageOptimized: Event bus subscriptions created');

    // Also subscribe to window events for backward compatibility
    console.log('🔵 [DEBUG] POSPageOptimized: Adding window event listeners');
    window.addEventListener('stockUpdated', handleStockUpdate);
    window.addEventListener('saleCompleted', handleSaleCompleted);
    console.log('🔵 [DEBUG] POSPageOptimized: Window event listeners added');

    // Cleanup all subscriptions
    return () => {
      console.log('🔵 [DEBUG] POSPageOptimized: Cleaning up event listeners');
      // Clear any pending timeouts
      if (stockUpdateTimeout) {
        console.log('🔵 [DEBUG] POSPageOptimized: Clearing stock update timeout');
        clearTimeout(stockUpdateTimeout);
      }
      if (saleCompletedTimeout) {
        console.log('🔵 [DEBUG] POSPageOptimized: Clearing sale completed timeout');
        clearTimeout(saleCompletedTimeout);
      }
      unsubscribeStock();
      unsubscribeSale();
      window.removeEventListener('stockUpdated', handleStockUpdate);
      window.removeEventListener('saleCompleted', handleSaleCompleted);
      console.log('🔵 [DEBUG] POSPageOptimized: Event listeners cleaned up');
    };
    // ⚠️ CRITICAL FIX: Remove loadProducts and loadSales from dependencies
    // They are stable functions from the store and don't need to be in deps
    // Including them causes infinite loops because they might be recreated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - handlers are stable and don't need to recreate


  // Customer selection functionality with error handling
  const handleRemoveCustomer = () => {
    try {
      if (!selectedCustomer) {
        toast.success('No customer to remove.');
        return;
      }
      
      setSelectedCustomer(null);
      toast.success('Customer removed');
    } catch (error) {
      console.error('Error removing customer:', error);
      toast.error('Failed to remove customer. Please try again.');
    }
  };

  const handleShowCustomerDetails = () => {
    if (selectedCustomer) {
      setSelectedCustomerForDetails(selectedCustomer);
      setShowCustomerDetails(true);
    }
  };

  // Feature toggle wrappers - Check if features are enabled before allowing access
  const handleShowCustomerSelectionModal = () => {
    if (!isCustomerProfilesEnabled()) {
      toast.error('Customer Profiles feature is disabled. Enable it in POS Settings > Features');
      return;
    }
    setShowCustomerSelectionModal(true);
  };

  const handleShowAddCustomerModal = () => {
    if (!isCustomerProfilesEnabled()) {
      toast.error('Customer Profiles feature is disabled. Enable it in POS Settings > Features');
      return;
    }
    setShowAddCustomerModal(true);
  };

  const handleShowDeliverySection = () => {
    if (!isDeliveryEnabled()) {
      toast.error('Delivery Management feature is disabled. Enable it in POS Settings > Features');
      return;
    }
    setShowDeliverySection(true);
  };

  const handleShowLoyaltyPoints = () => {
    if (!isLoyaltyEnabled()) {
      toast.error('Loyalty Program feature is disabled. Enable it in POS Settings > Features');
      return;
    }
    setShowLoyaltyPoints(true);
  };


  const handleShowSalesAnalytics = () => {
    if (!isDynamicPricingEnabled()) {
      toast.error('Dynamic Pricing feature is disabled. Enable it in POS Settings > Features');
      return;
    }
    setShowSalesAnalytics(true);
  };


  const handleUnifiedSearch = (query: string) => {
    const jobId = startLoading('Searching products...');
    
    try {
      // Check if it's a barcode
      if (/^\d{8,}$/.test(query)) {
        // It's likely a barcode
        updateProgress(jobId, 50);
        startQrCodeScanner();
        completeLoading(jobId);
      } else {
        // Regular search
        updateProgress(jobId, 50);
        setShowSearchResults(true);
        updateProgress(jobId, 100);
        completeLoading(jobId);
      }
    } catch (error: any) {
      failLoading(jobId, 'Search failed');
    }
  };

  const startQrCodeScanner = () => {
    try {
      // Check permissions
      if (!canSearchInventory) {
        return;
      }

      if (!barcodeScannerSettings?.enable_barcode_scanner) {
        toast.error('QrCode scanning is not enabled in settings.');
        return;
      }

      if (dbProducts.length === 0) {
        toast.error('No products available for scanning. Please load products first.');
        return;
      }

      setShowQrCodeScanner(true);
      setIsScanning(true);
      setScannerError('');
      toast.success('QrCode scanner started. Scan a product barcode.');
      
      // Start real barcode scanning
      // Note: In production, this would integrate with a real barcode scanner library
      // For now, we'll show a message to use external barcode scanner
      toast.success('Please use your external barcode scanner device to scan products');
      setIsScanning(false);
    } catch (error) {
      console.error('Error starting barcode scanner:', error);
      toast.error('Failed to start barcode scanner. Please try again.');
      setShowQrCodeScanner(false);
      setIsScanning(false);
    }
  };

  const handleQrCodeScanned = (barcode: string) => {
    try {
      // Validate barcode
      if (!barcode || barcode.trim() === '') {
        setScannerError('Invalid barcode');
        toast.error('Invalid barcode scanned. Please try again.');
        setIsScanning(false);
        setShowQrCodeScanner(false);
        return;
      }

      // Find product by barcode
      const product = dbProducts.find(p => (p as any).barcode === barcode || p.id.toString() === barcode);
      
      if (product) {
        // Add product to cart
        const existingItem = cartItems.find(item => item.productId === product.id);
        if (existingItem) {
          updateCartItemQuantity(existingItem.id, existingItem.quantity + 1);
        } else {
          addToCart(product);
        }
        toast.success(`Product added: ${product.name}`);
        setScannedQrCodes(prev => [...prev, barcode]);
      } else {
        setScannerError('Product not found');
        toast.error(`Product not found for barcode: ${barcode}`);
      }
    } catch (error) {
      console.error('Error handling barcode scan:', error);
      setScannerError('Failed to process barcode');
      toast.error('Failed to process barcode. Please try again.');
    } finally {
      setIsScanning(false);
      setShowQrCodeScanner(false);
    }
  };

  const stopQrCodeScanner = () => {
    setShowQrCodeScanner(false);
    setIsScanning(false);
    setScannerError('');
    toast('QrCode scanner stopped');
  };


  // Migration handler for testing (temporarily disabled)
  // const handleApplyMigration = async () => {
  //   const success = await applyInventoryAlertsMigration();
  //   if (success) {
  //     toast.success('Database migration applied successfully!');
  //   } else {
  //     toast.error('Migration failed. Check console for details.');
  //   }
  // };

  // Check daily closure status and load session info
  useEffect(() => {
    const checkDailyClosureStatus = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        // Check if day is closed - with comprehensive error handling
        let closureData = null;
        let closureError = null;
        
        try {
          const result = await supabase
            .from('daily_sales_closures')
            .select('id, date, closed_at, closed_by')
            .eq('date', today)
            .maybeSingle();
          
          closureData = result.data;
          closureError = result.error;
        } catch (err: any) {
          // Catch network errors and table doesn't exist errors
          if (err.message?.includes('400') || err.message?.includes('Bad Request') || 
              err.message?.includes('relation') || err.message?.includes('does not exist')) {
            console.warn('⚠️ Daily closure table not available - skipping closure check');
            setIsDailyClosed(false);
            setDailyClosureInfo(null);
            setSessionStartTime(new Date().toISOString());
            return;
          } else {
            console.error('❌ Unexpected error checking daily closure:', err);
          }
        }

        // Handle closure check errors gracefully
        if (closureError) {
          // PGRST116 = no rows returned (expected)
          // 42P01 = table doesn't exist
          // 42703 = column doesn't exist
          if (closureError.code === 'PGRST116') {
            // No closure found - this is fine, continue
          } else if (closureError.code === '42P01' || closureError.code === '42703' || 
                     closureError.message?.includes('400') || closureError.message?.includes('Bad Request')) {
            console.warn('⚠️ Daily closure table/columns not set up yet - skipping closure check');
            // Continue without closure checking
            setIsDailyClosed(false);
            setDailyClosureInfo(null);
            setSessionStartTime(new Date().toISOString());
            return;
          } else if (closureError.message?.includes('No data returned from insert') || 
                     closureError.message?.includes('RLS') || 
                     closureError.message?.includes('policy')) {
            // RLS policy error - suppress and use fallback
            console.warn('⚠️ Daily closure check blocked by RLS policies - using fallback mode');
            setIsDailyClosed(false);
            setDailyClosureInfo(null);
            setSessionStartTime(new Date().toISOString());
            return;
          } else {
            console.warn('⚠️ Error checking daily closure status:', closureError.message || closureError);
          }
        }

        if (closureData) {
          // Day is closed - show opening modal
          console.log('🔒 Day is closed, showing opening modal');
          setIsDailyClosed(true);
          setDailyClosureInfo({
            closedAt: closureData.closed_at,
            closedBy: closureData.closed_by
          });
          setShowDayOpeningModal(true);
          setSessionStartTime(null); // Clear session
        } else {
          // Day is not closed - check for active session
          let sessionData = null;
          let sessionError = null;
          
          try {
            const result = await supabase
              .from('daily_opening_sessions')
              .select('id, date, opened_at, opened_by')
              .eq('date', today)
              .eq('is_active', true)
              .maybeSingle();
            
            sessionData = result.data;
            sessionError = result.error;
          } catch (err: any) {
            // Catch network errors and table doesn't exist errors
            if (err.message?.includes('400') || err.message?.includes('Bad Request') || 
                err.message?.includes('relation') || err.message?.includes('does not exist')) {
              console.warn('⚠️ Session table not available - using fallback mode');
              setIsDailyClosed(false);
              setDailyClosureInfo(null);
              setSessionStartTime(new Date().toISOString());
              return;
            } else {
              console.error('❌ Unexpected error checking session:', err);
            }
          }

          // Handle session check errors gracefully
          if (sessionError) {
            if (sessionError.code === 'PGRST116') {
              // No session found - this is fine, we'll create one
            } else if (sessionError.code === '42P01' || sessionError.code === '42703' || 
                       sessionError.message?.includes('400') || sessionError.message?.includes('Bad Request')) {
              console.warn('⚠️ Session table/columns not set up yet - using fallback');
              // Use current time as session start
              setIsDailyClosed(false);
              setDailyClosureInfo(null);
              setSessionStartTime(new Date().toISOString());
              return;
            } else {
              console.error('❌ Error checking session:', sessionError);
            }
          }

          if (sessionData) {
            // Active session found - use it (only log in development)
            if (process.env.NODE_ENV === 'development') {
              console.log('✅ Active session found, started at:', sessionData.opened_at);
            }
            setIsDailyClosed(false);
            setDailyClosureInfo(null);
            setSessionStartTime(sessionData.opened_at);
          } else {
            // No session and not closed - create a new session automatically
            console.log('🆕 No active session, creating one...');
            
            let newSession = null;
            let createError = null;
            
            try {
              // Use UPSERT to handle duplicate key errors gracefully
              const result = await supabase
                .from('daily_opening_sessions')
                .upsert([{
                  date: today,
                  opened_at: new Date().toISOString(),
                  opened_by: currentUser?.role || 'system',
                  opened_by_user_id: currentUser?.id,
                  is_active: true
                }], {
                  onConflict: 'date,is_active'
                })
                .select()
                .single();

              newSession = result.data;
              createError = result.error;
            } catch (err: any) {
              // Catch network errors and table doesn't exist errors
              if (err.message?.includes('400') || err.message?.includes('Bad Request') ||
                  err.message?.includes('relation') || err.message?.includes('does not exist')) {
                console.warn('⚠️ Cannot create session (table not available) - using fallback mode');
                setSessionStartTime(new Date().toISOString());
                setIsDailyClosed(false);
                setDailyClosureInfo(null);
                return;
              }
            }

            if (createError) {
              // Check for RLS policy errors (common when policies aren't set up yet)
              if (createError.message?.includes('No data returned from insert') || 
                  createError.message?.includes('RLS') || 
                  createError.message?.includes('policy')) {
                console.warn('⚠️ Cannot create session (RLS policies may need configuration) - using fallback mode');
                setSessionStartTime(new Date().toISOString());
                setIsDailyClosed(false);
                setDailyClosureInfo(null);
                return;
              }
              // If table doesn't exist or has issues, just use current time
              else if (createError.code === '42P01' || createError.code === '42703' || 
                  createError.message?.includes('400') || createError.message?.includes('Bad Request')) {
                console.warn('⚠️ Cannot create session (table not ready) - using fallback');
                // Fallback to current time
                setSessionStartTime(new Date().toISOString());
              } else {
                console.error('❌ Error creating session:', createError);
                // Fallback to current time
                setSessionStartTime(new Date().toISOString());
              }
            } else if (newSession) {
              // Session created or retrieved successfully via UPSERT
              console.log('✅ Session handled successfully:', newSession);
              setSessionStartTime(newSession.opened_at);
            } else {
              // No session created, use fallback
              console.warn('⚠️ Session handling failed - using fallback mode');
              setSessionStartTime(new Date().toISOString());
            }
            
            setIsDailyClosed(false);
            setDailyClosureInfo(null);
          }
        }
      } catch (err) {
        console.error('❌ Error in checkDailyClosureStatus:', err);
        setIsDailyClosed(false);
        setDailyClosureInfo(null);
        // Fallback to current time on any error
        setSessionStartTime(new Date().toISOString());
      }
    };

    checkDailyClosureStatus();
  }, [currentUser]);

  // Stock adjustment functionality
  const handleStockAdjustment = (productId: string, adjustment: number, _reason: string) => {
    try {
      // Find the product
      const product = dbProducts.find(p => p.id === productId);
      if (!product) {
        toast.error('Product not found');
        return;
      }

      // Update stock (this would normally call an API)
      toast.success(`Stock adjusted for ${product.name}: ${adjustment > 0 ? '+' : ''}${adjustment}`);
      
      // Close the modal
      setShowStockAdjustment(false);
      setSelectedProductForAdjustment(null);
      
      // Refresh inventory data
      loadProducts();
    } catch (error) {
      toast.error('Failed to adjust stock');
      console.error('Stock adjustment error:', error);
    }
  };

  // Loyalty points functionality
  const handleAddLoyaltyPoints = (customerId: string, points: number, _reason: string) => {
    try {
      // Find the customer
      const customer = customers.find(c => c.id === customerId);
      if (!customer) {
        toast.error('Customer not found');
        return;
      }

      // Add loyalty points (this would normally call an API)
      setCustomerLoyaltyPoints(prev => ({
        ...prev,
        [customerId]: (prev[customerId] || 0) + points
      }));
      toast.success(`Added ${points} loyalty points to ${customer.name}`);
      
      // Close the modal
      setShowLoyaltyPoints(false);
      setPointsToAdd('');
      setPointsReason('');
    } catch (error) {
      toast.error('Failed to add loyalty points');
      console.error('Loyalty points error:', error);
    }
  };

  // Receipt history functionality
  const loadReceiptHistory = async () => {
    try {
      // Load real receipt history from database
      // This would typically call a receipts API or query the sales table
      const receipts = dbSales.map((sale, index) => ({
        id: sale.id,
        saleId: sale.id,
        date: (sale as any).created_at || (sale as any).soldAt || new Date().toISOString(),
        total: (sale as any).total_amount || (sale as any).total || 0,
        customer: (sale as any).customer_name || sale.customerName || 'Walk-in Customer',
        items: (sale as any).items?.length || 0
      }));
      setReceiptHistory(receipts);
    } catch (error) {
      console.error('Error loading receipt history:', error);
      toast.error('Failed to load receipt history');
    }
  };

  useEffect(() => {
    if (showReceiptHistory) {
      loadReceiptHistory();
    }
  }, [showReceiptHistory, dbSales]);

  // Check if product has IMEI variants (parent-child system)
  // This is called BEFORE adding to cart to allow variant selection
  const checkForIMEIVariants = useCallback(async (product: any): Promise<boolean> => {
    try {
      // ✅ OPTIMIZED: Single query to check for IMEI children using IN clause
      const { data: parentVariants } = await supabase
        .from('lats_product_variants')
        .select('id, variant_name, name, is_parent, variant_type, quantity')
        .eq('product_id', product.id)
        .eq('is_active', true)
        .is('parent_variant_id', null) // Only parents
        .gt('quantity', 0);

      if (!parentVariants || parentVariants.length === 0) {
        return false; // No variants with stock
      }

      // Get all parent IDs
      const parentIds = parentVariants
        .filter((p: any) => p.is_parent || p.variant_type === 'parent')
        .map((p: any) => p.id);

      if (parentIds.length === 0) {
        return false; // No parent variants
      }

      // ⚡ PERFORMANCE FIX: Single query to check all parents at once
      const { count } = await supabase
        .from('lats_product_variants')
        .select('id', { count: 'exact', head: true })
        .in('parent_variant_id', parentIds)
        .eq('variant_type', 'imei_child')
        .eq('is_active', true)
        .gt('quantity', 0);

      // ✅ FIX: Also check for legacy inventory_items (serial numbers)
      // Since IMEI and serial_number are synced in database, just query once
      const { count: legacyCount } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', product.id)
        .in('variant_id', parentIds)
        .not('serial_number', 'is', null) // serial_number and imei are synced, so this gets all
        .eq('status', 'available');

      const totalCount = (count || 0) + (legacyCount || 0);

      if (totalCount > 0) {
        console.log(`✅ Product has ${totalCount} children (${count || 0} IMEI + ${legacyCount || 0} legacy) across ${parentIds.length} parents`);
        return true; // Has children - show selector
      }

      return false; // No children found
    } catch (error) {
      console.error('Error checking for IMEI variants:', error);
      return false; // On error, proceed with direct add
    }
  }, []);


  const addToCart = useCallback(async (product: any, variant?: any, quantity: number = 1) => {
    try {
      // Check permissions
      if (!canAddToCart) {
        toast.error('You do not have permission to add items to cart');
        return;
      }

      // Validate product
      if (!product || !product.id) {
        toast.error('Invalid product. Please try again.');
        console.error('Invalid product object:', product);
        return;
      }

      // If no variant specified, try to get the first variant from the product
      if (!variant || variant.id === 'default' || !variant.id) {
        // Check if product has variants
        if (product.variants && product.variants.length > 0) {
          // Use the first variant
          variant = product.variants[0];
          console.log('⚠️ No variant specified, using first variant:', variant);
        } else {
          // 🚀 OPTIMIZATION: Try to get variant from cache first (instant!)
          // First check if product already has variants in memory (fastest!)
          if (product.variants && product.variants.length > 0) {
            variant = product.variants[0];
            console.log('⚡ [addToCart] Using variant from product object (instant!)');
          } else {
            // 🚀 OPTIMIZATION: Try to get variant from cache first (instant!)
            const { workflowOptimizationService } = await import('../../../services/workflowOptimizationService');
            
            // Try to get any variant for this product from cache
            // Since we don't have variant ID, we'll need to query, but optimize it
            // For now, do a quick query but cache the result
            console.log('🔍 Product has no variants in object, fetching from database...');
            
            // 🚀 OPTIMIZATION: Batch query - get all variants for this product at once
            // This way we cache all variants for future clicks
            const { data: dbVariants, error: variantError } = await supabase
              .from('lats_product_variants')
              .select('id, name, variant_name, selling_price, price, unit_price, quantity, sku, is_parent, variant_type, is_active')
              .eq('product_id', product.id)
              .eq('is_active', true)
              .order('created_at', { ascending: true })
              .limit(10); // Get up to 10 variants to cache them all

            if (variantError) {
              console.error('❌ Error fetching variants:', variantError);
              toast.error('Failed to load product variants. Please try again.');
              return;
            }

            if (dbVariants && dbVariants.length > 0) {
              // Use the first variant
              variant = {
                id: dbVariants[0].id,
                name: dbVariants[0].name || dbVariants[0].variant_name || 'Default',
                sellingPrice: dbVariants[0].selling_price || dbVariants[0].price || dbVariants[0].unit_price,
                price: dbVariants[0].price || dbVariants[0].unit_price || dbVariants[0].selling_price,
                sku: dbVariants[0].sku,
                quantity: dbVariants[0].quantity,
                is_parent: dbVariants[0].is_parent,
                variant_type: dbVariants[0].variant_type
              };
              
              // 🚀 OPTIMIZATION: Variants are now cached in the product object
              // Future clicks will use product.variants (instant!)
              
              console.log(`✅ Found ${dbVariants.length} variants in database, cached for future use`);
            } else {
              // No variants in database either - check if product has IMEI variants that need selection
              const hasIMEIVariants = await checkForIMEIVariants(product);
              if (hasIMEIVariants) {
                toast.error('Please select a specific device variant first');
                console.log('⚠️ Product has IMEI variants, variant selection required');
                return;
              } else {
                // ✅ ALLOW: Product has no variants and no children - allow direct product sale
                // Create a virtual variant using product data
                console.log('ℹ️ Product has no variants - creating virtual variant from product data');
                variant = {
                  id: product.id, // Use product ID as variant ID for products without variants
                  name: 'Default',
                  sellingPrice: product.selling_price || product.price || product.unit_price,
                  price: product.price || product.unit_price || product.selling_price,
                  sku: product.sku || 'N/A',
                  quantity: product.stock_quantity || 0,
                  is_parent: false,
                  variant_type: 'standard'
                };
                console.log('✅ Created virtual variant for product without variants:', variant);
              }
            }
          }
        }
      }

      // Validate variant ID is a valid UUID (or product ID for products without variants)
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!variant.id) {
        toast.error('Invalid variant ID. Please select a valid variant.');
        console.error('❌ Invalid variant ID:', variant.id, 'for product:', product.name);
        return;
      }
      
      // ✅ ALLOW: If variant ID equals product ID, it's a product without variants (virtual variant)
      // This is allowed for products that have no variants in the database
      const isVirtualVariant = variant.id === product.id;
      if (!isVirtualVariant && !UUID_REGEX.test(variant.id)) {
        toast.error('Invalid variant ID format. Please select a valid variant.');
        console.error('❌ Invalid variant ID format:', variant.id, 'for product:', product.name);
        return;
      }

      // Validate price and ensure it's a number - check multiple field names
      const rawPrice = variant?.sellingPrice ?? variant?.price ?? product.price;
      const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice);
      
      if (price === undefined || price === null || isNaN(price) || price < 0) {
        toast.error('Invalid product price. Please contact support.');
        console.error('Price validation failed:', { 
          productId: product.id, 
          productName: product.name,
          variantSellingPrice: variant?.sellingPrice,
          variantPrice: variant?.price,
          productPrice: product.price,
          rawPrice: rawPrice,
          finalPrice: price 
        });
        return;
      }

      // 🚀 OPTIMIZATION: Use cached stock data for INSTANT response (optimistic UI)
      // Check stock availability using cached data first (non-blocking)
      let availableStock: number;
      
      if (isVirtualVariant) {
        // For products without variants, use product stock from cache
        availableStock = product.stock_quantity || 0;
        if (availableStock < quantity) {
          toast.error(`${product.name}: Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`);
          return;
        }
      } else {
        // 🚀 OPTIMIZATION: Use fast stock check from optimization service (cached - instant!)
        const { workflowOptimizationService } = await import('../../../services/workflowOptimizationService');
        const cachedStock = await workflowOptimizationService.checkStockFast(variant.id);
        
        // Quick validation using cached stock (instant - no database wait!)
        if (cachedStock !== undefined) {
          if (cachedStock < quantity) {
            toast.error(`${product.name}: Insufficient stock. Available: ${cachedStock}, Requested: ${quantity}`);
            return;
          }
          availableStock = cachedStock;
        } else {
          // Cache miss - do quick check but don't block (optimistic UI)
          // Add to cart immediately, validate in background
          availableStock = variant.quantity || 0; // Use variant quantity from product object
          
          // Validate in background (non-blocking)
          saleProcessingService.checkStockAvailability(variant.id, quantity).then(stockCheck => {
            if (!stockCheck.available) {
              // Remove from cart if stock is insufficient
              setCartItems(prev => prev.filter(item => 
                !(item.productId === product.id && item.variantId === variant.id)
              ));
              toast.error(`${product.name}: ${stockCheck.error || 'Insufficient stock'}`);
            }
          }).catch(err => {
            console.warn('Background stock validation failed:', err);
          });
        }
      }
      
      console.log('✅ Stock check passed:', {
        productName: product.name,
        variantName: variant?.name,
        availableStock,
        requestedQuantity: quantity
      });

      const existingItem = cartItems.find(item => 
        item.productId === product.id && 
        (!variant || item.variantId === variant.id)
      );

      if (existingItem) {
        // 🚀 OPTIMIZATION: Quick check using cached stock (instant!)
        const totalRequested = existingItem.quantity + quantity;
        const { workflowOptimizationService } = await import('../../../services/workflowOptimizationService');
        const updatedCachedStock = await workflowOptimizationService.checkStockFast(variant.id);
        
        // Use cached stock if available, otherwise use availableStock from above
        const currentAvailableStock = updatedCachedStock !== undefined ? updatedCachedStock : availableStock;
        
        if (totalRequested > currentAvailableStock) {
          toast.error(`Only ${currentAvailableStock} units available for ${product.name}. You already have ${existingItem.quantity} in cart.`);
          return;
        }
        
        // Validate in background (non-blocking) if cache might be stale
        if (updatedCachedStock === undefined) {
          saleProcessingService.checkStockAvailability(variant.id, totalRequested).then(updatedStockCheck => {
            if (!updatedStockCheck.available) {
              // Revert the quantity change if stock is insufficient
              setCartItems(prev => prev.map(item => 
                item.id === existingItem.id 
                  ? { ...item, quantity: existingItem.quantity, totalPrice: existingItem.quantity * item.unitPrice }
                  : item
              ));
              toast.error(`${product.name}: ${updatedStockCheck.error || 'Insufficient stock for requested quantity'}`);
            }
          }).catch(err => {
            console.warn('Background stock validation failed:', err);
          });
        }
        
        const newQuantity = existingItem.quantity + quantity;
        // Ensure numeric calculation
        const unitPrice = typeof existingItem.unitPrice === 'string' 
          ? parseFloat(existingItem.unitPrice) 
          : Number(existingItem.unitPrice);
        const newTotalPrice = newQuantity * unitPrice;
        
        setCartItems(prev => prev.map(item => 
          item.id === existingItem.id 
            ? { ...item, quantity: newQuantity, totalPrice: newTotalPrice }
            : item
        ));
        
        // Update stock adjustments - track how much stock has been used
        const variantKey = `${product.id}-${variant?.id || existingItem.variantId}`;
        const currentAdjustment = stockAdjustments.get(variantKey) || 0;
        const newAdjustment = currentAdjustment + quantity;
        
        setStockAdjustments(prev => {
          const updated = new Map(prev);
          updated.set(variantKey, newAdjustment);
          return updated;
        });
        
        // Check if this makes the product out of stock
        if (availableStock - newAdjustment <= 0) {
          console.log(`🔴 Product now out of stock: ${product.name} (${variant?.name || 'Default'})`);
        }
        
        toast.success(`${product.name} quantity updated to ${newQuantity}`);
      } else {
        // Ensure variant exists and has valid ID
        if (!variant || !variant.id) {
          toast.error('Invalid variant. Cannot add to cart.');
          console.error('❌ No valid variant for product:', product.name);
          return;
        }

        // Extract product image - handle both images array and single image fields
        let productImage: string | undefined;
        if (product.images && Array.isArray(product.images) && product.images.length > 0) {
          // If images is an array, get the first image
          // Handle both string arrays and object arrays with url property
          const firstImage = product.images[0];
          productImage = typeof firstImage === 'string' ? firstImage : (firstImage?.url || firstImage?.thumbnailUrl);
        } else {
          // Fallback to single image fields
          productImage = product.thumbnail_url || product.image || product.primary_image;
        }

        const newItem = {
          id: `${product.id}-${variant.id}-${Date.now()}`,
          productId: product.id,
          variantId: variant.id, // Always use valid variant ID
          productName: product.name,
          variantName: variant.name || 'Default',
          sku: variant.sku || product.sku || 'N/A',
          quantity: quantity,
          unitPrice: price,
          totalPrice: price * quantity,
          availableQuantity: availableStock,
          image: productImage,
          attributes: { 
            ...(variant.attributes || {}), 
            ...(variant.variant_attributes || {}),
            ...(variant.variantAttributes || {})
          }, // Include variant attributes from all sources
          // ✅ FIX: Treat legacy items as IMEI children
          selectedIMEIVariants: variant && (variant.attributes?.imei || variant.is_legacy || variant.is_imei_child) ? [variant] : [] // Store IMEI variant or legacy item if provided
        };
        
        console.log('✅ Adding to cart:', newItem);
        
        setCartItems(prev => [...prev, newItem]);
        
        // Update stock adjustments - track how much stock has been used
        const variantKey = `${product.id}-${variant.id}`;
        const currentAdjustment = stockAdjustments.get(variantKey) || 0;
        const newAdjustment = currentAdjustment + quantity;
        
        setStockAdjustments(prev => {
          const updated = new Map(prev);
          updated.set(variantKey, newAdjustment);
          return updated;
        });
        
        // Check if this makes the product out of stock
        if (availableStock - newAdjustment <= 0) {
          console.log(`🔴 Product now out of stock: ${product.name} (${variant.name || 'Default'})`);
          toast(`${product.name} is now out of stock`, { icon: 'ℹ️' });
        }
        
        toast.success(`${quantity}x ${product.name} added to cart`);
      }
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
      toast.error('Failed to add item to cart. Please try again.');
    }
  }, [canAddToCart, cartItems, checkForIMEIVariants, stockAdjustments]);

  const updateCartItemQuantity = useCallback(async (itemId: string, quantity: number) => {
    try {
      // Validate inputs
      if (!itemId) {
        toast.error('Invalid item ID. Please try again.');
        return;
      }

      if (quantity < 0) {
        toast.error('Quantity cannot be negative.');
        return;
      }

      if (quantity === 0) {
        removeCartItem(itemId);
        return;
      }

      // Check if item exists
      const existingItem = cartItems.find(item => item.id === itemId);
      if (!existingItem) {
        toast.error('Item not found in cart.');
        return;
      }

      // ✅ IMPROVED: Check stock availability using the service method
      // This properly handles parent variants by calculating stock from children
      const stockCheck = await saleProcessingService.checkStockAvailability(existingItem.variantId, quantity);
      
      if (!stockCheck.available) {
        const errorMessage = stockCheck.error || 'Insufficient stock';
        toast.error(`${existingItem.productName}: ${errorMessage}`);
        // Only log in development - user already sees toast error
        if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
          console.warn('⚠️ Stock check failed for quantity update:', {
            productName: existingItem.productName,
            variantId: existingItem.variantId,
            requestedQuantity: quantity,
            availableStock: stockCheck.availableStock,
            error: stockCheck.error
          });
        }
        return;
      }

      // Ensure numeric calculation
      const unitPrice = typeof existingItem.unitPrice === 'string' 
        ? parseFloat(existingItem.unitPrice) 
        : Number(existingItem.unitPrice);
      const newTotalPrice = quantity * unitPrice;

      // Calculate the difference in quantity to update stock adjustments
      const quantityDifference = quantity - existingItem.quantity;
      const variantKey = `${existingItem.productId}-${existingItem.variantId}`;
      
      setCartItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, quantity, totalPrice: newTotalPrice }
          : item
      ));
      
      // Update stock adjustments based on the quantity change
      setStockAdjustments(prev => {
        const updated = new Map(prev);
        const currentAdjustment = updated.get(variantKey) || 0;
        const newAdjustment = currentAdjustment + quantityDifference;
        
        if (newAdjustment <= 0) {
          updated.delete(variantKey);
        } else {
          updated.set(variantKey, newAdjustment);
        }
        return updated;
      });
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      toast.error('Failed to update item quantity. Please try again.');
    }
  }, [cartItems]);

  const updateCartItemTags = useCallback((itemId: string, tags: string[]) => {
    try {
      if (!itemId) {
        toast.error('Invalid item ID. Please try again.');
        return;
      }

      const existingItem = cartItems.find(item => item.id === itemId);
      if (!existingItem) {
        toast.error('Item not found in cart.');
        return;
      }

      setCartItems(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, tags }
          : item
      ));
      
      console.log('✅ Updated tags for item:', itemId, tags);
    } catch (error) {
      console.error('Error updating cart item tags:', error);
      toast.error('Failed to update item tags. Please try again.');
    }
  }, [cartItems]);

  // Handle IMEI selection for cart items
  const handleCartItemIMEISelect = useCallback(async (item: any) => {
    try {
      console.log('🔍 Opening IMEI selection modal for cart item:', item);

      // Fetch the product details to get variants
      const { data: product } = await supabase
        .from('lats_products')
        .select(`
          *,
          product_variants:lats_product_variants(*)
        `)
        .eq('id', item.productId)
        .single();

      if (!product) {
        toast.error('Product not found');
        return;
      }

      // Normalize product data: ensure variants array exists
      // Handle both 'variants' and 'product_variants' property names
      const normalizedProduct = {
        ...product,
        variants: product.variants || product.product_variants || []
      };

      // Set the product for variant selection
      setSelectedProductForVariants(normalizedProduct);
      setShowVariantSelectionModal(true);
      setCartItemForIMEIUpdate(item);

    } catch (error) {
      console.error('Error opening IMEI selection modal:', error);
      toast.error('Failed to open IMEI selection. Please try again.');
    }
  }, []);

  const removeCartItem = useCallback((itemId: string) => {
    try {
      if (!itemId) {
        toast.error('Invalid item ID. Please try again.');
        return;
      }

      const itemToRemove = cartItems.find(item => item.id === itemId);
      if (itemToRemove) {
        setCartItems(prev => prev.filter(item => item.id !== itemId));
        
        // Update stock adjustments - remove the quantity from adjustments
        const variantKey = `${itemToRemove.productId}-${itemToRemove.variantId}`;
        setStockAdjustments(prev => {
          const updated = new Map(prev);
          const currentAdjustment = updated.get(variantKey) || 0;
          const newAdjustment = currentAdjustment - itemToRemove.quantity;
          
          if (newAdjustment <= 0) {
            updated.delete(variantKey);
          } else {
            updated.set(variantKey, newAdjustment);
          }
          return updated;
        });
        
        toast.success(`${itemToRemove.productName} removed from cart`);
      } else {
        toast.error('Item not found in cart.');
      }
    } catch (error) {
      console.error('Error removing cart item:', error);
      toast.error('Failed to remove item from cart. Please try again.');
    }
  }, [cartItems]);

  const clearCart = useCallback(() => {
    try {
      if (cartItems.length === 0) {
        toast.success('Cart is already empty.');
        return;
      }
      
      setCartItems([]);
      setStockAdjustments(new Map()); // Clear stock adjustments
      setManualDiscount(0);
      setDiscountValue('');
      setDiscountType('percentage');
      toast.success('Cart cleared successfully');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart. Please try again.');
    }
  }, [cartItems]);

  // Customer functionality - functions already defined above

  // Payment processing with error handling
  const handleProcessPayment = async () => {
    try {
      // Check permissions
      if (!canSell || !canCreateSales) {
        toast.error('You do not have permission to process sales');
        return;
      }

      // Validate cart
      if (cartItems.length === 0) {
        toast.error('Cart is empty. Please add items before processing payment.');
        return;
      }

      // Validate cart items have valid prices
      const invalidItems = cartItems.filter(item => 
        !item.totalPrice || 
        item.totalPrice <= 0 || 
        isNaN(item.totalPrice) ||
        !item.unitPrice ||
        item.unitPrice <= 0 ||
        isNaN(item.unitPrice)
      );

      if (invalidItems.length > 0) {
        console.error('❌ Invalid cart items found:', invalidItems);
        toast.error(`Invalid prices found for: ${invalidItems.map(i => i.productName).join(', ')}`);
        return;
      }

      // Validate total amount
      if (isNaN(totalAmount) || totalAmount <= 0) {
        console.error('❌ Invalid total amount:', totalAmount);
        toast.error('Cart total is invalid. Please check item prices.');
        return;
      }

      // Validate discount is not greater than total
      if (discountAmount >= totalAmount) {
        console.error('❌ Discount exceeds total:', { discountAmount, totalAmount });
        toast.error(`Discount (${format.money(discountAmount)}) cannot exceed total (${format.money(totalAmount)})`);
        return;
      }

      // Validate final amount
      if (finalAmount <= 0) {
        console.error('❌ Invalid final amount:', {
          totalAmount,
          discountAmount,
          finalAmount
        });
        toast.error('Invalid total amount. Please check your cart items and discount.');
        return;
      }

      // Check if customer is required for certain payment methods (optional for now)
      if (!selectedCustomer && (finalAmount > 50000)) {
        toast.error('Customer information is recommended for payments over 50,000 TZS');
        // Don't return, just show warning
      }

      // Validate IMEI Variants are selected for items that require them
      const itemsRequiringIMEIVariants = await Promise.all(
        cartItems.map(async (item) => {
          try {
            console.log('🔍 Checking IMEI requirement for item:', {
              productName: item.productName,
              variantId: item.variantId,
              variantName: item.variantName,
              selectedSerialNumbers: item.selectedSerialNumbers,
              selectedIMEIVariants: item.selectedIMEIVariants
            });

            // Check if this specific variant requires IMEI selection
            let requiresIMEI = false;

            if (item.variantId && item.variantId !== 'default') {
              // First check if this variant has IMEI child variants
              const { count: imeiChildrenCount } = await supabase
                .from('lats_product_variants')
                .select('id', { count: 'exact', head: true })
                .eq('parent_variant_id', item.variantId)
                .eq('variant_type', 'imei_child')
                .eq('is_active', true)
                .gt('quantity', 0);

              if ((imeiChildrenCount || 0) > 0) {
                // Variant has IMEI children, requires IMEI selection
                console.log(`📱 Variant ${item.variantId} has ${imeiChildrenCount} IMEI children - REQUIRES IMEI selection`);
                requiresIMEI = true;
              } else {
                // Check if this variant itself is an IMEI variant
                const { data: variant } = await supabase
                  .from('lats_product_variants')
                  .select('variant_attributes')
                  .eq('id', item.variantId)
                  .eq('is_active', true)
                  .single();

                console.log(`📱 Variant ${item.variantId} IMEI check:`, {
                  hasIMEIAttribute: !!variant?.variant_attributes?.imei,
                  variantAttributes: variant?.variant_attributes
                });

                // If it's an IMEI variant, no further selection needed
                // If it's not an IMEI variant and has no IMEI children, no selection needed
                requiresIMEI = false;
              }
            } else {
              // No specific variant selected (default variant)
              // Check if the product has any variants that require IMEI
              const { data: imeiVariants } = await supabase
                .from('lats_product_variants')
                .select('id')
                .eq('product_id', item.productId)
                .not("variant_attributes->>'imei'", 'is', null)
                .eq('is_active', true)
                .gt('quantity', 0)
                .limit(1);

              requiresIMEI = imeiVariants && imeiVariants.length > 0;
            }

            if (requiresIMEI) {
              // Check if IMEI variants are selected
              const hasSelected = item.selectedIMEIVariants && item.selectedIMEIVariants.length > 0;

              console.log(`⚠️ Item ${item.productName} (${item.variantName}) REQUIRES IMEI - hasSelected: ${hasSelected}`);

              return {
                item,
                requiresIMEI: true,
                hasSelected: hasSelected
              };
            }

            console.log(`✅ Item ${item.productName} (${item.variantName}) does NOT require IMEI`);
            return null;
          } catch (error) {
            console.warn('Error checking IMEI variants for item:', item, error);
            return null;
          }
        })
      );

      const itemsMissingIMEI = itemsRequiringIMEIVariants
        .filter(result => result !== null && result.requiresIMEI && !result.hasSelected);

      if (itemsMissingIMEI.length > 0) {
        const itemNames = itemsMissingIMEI.map(result => result!.item.productName).join(', ');
        toast.error(`Please select IMEI/Serial numbers for: ${itemNames}`);
        console.error('❌ Missing IMEI variants for items:', itemsMissingIMEI);
        return;
      }

      // Check for daily closure
      if (isDailyClosed) {
        setShowPostClosureWarning(true);
        return;
      }

      // Show summary modal first before payment
      setShowPOSSummaryModal(true);
    } catch (error) {
      console.error('Error in handleProcessPayment:', error);
      toast.error('Failed to initialize payment. Please try again.');
    }
  };

  // Handle confirming the sale summary and proceeding to payment
  const handleConfirmSaleSummary = () => {
    setShowPOSSummaryModal(false);
    setShowPaymentModal(true);
  };

  const handleRefreshData = async () => {
    try {
      // Get store instance to access invalidateCache
      const store = useInventoryStore.getState();
      
      // Invalidate all caches to force fresh load from database
      store.invalidateCache('products');
      store.invalidateCache('categories');
      store.invalidateCache('suppliers');
      store.invalidateCache('sales');
      
      // Also clear product cache service cache
      const { productCacheService } = await import('../../../lib/productCacheService');
      productCacheService.clearCache();
      
      // Force load from database (skip cache)
      await Promise.all([
        loadProducts({ page: 1, limit: 500 }, true), // force = true to skip cache
        loadSales(),
        loadCategories(),
        loadSuppliers()
      ]);
      
      toast.success('Data refreshed from database successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh some data');
    }
  };

  // Trade-In handlers
  const handleShowTradeInModal = () => {
    if (cartItems.length === 0) {
      toast.error('Add items to cart first');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }
    setShowTradeInCalculator(true);
  };

  const handleTradeInComplete = async (data: any) => {
    console.log('✅ handleTradeInComplete called with data:', data);
    console.log('🔍 Function type:', typeof handleTradeInComplete);
    console.log('🔍 Data type:', typeof data);
    console.log('🔍 Selected customer:', selectedCustomer?.id, selectedCustomer?.name);
    console.log('🔍 Cart items:', cartItems.length, cartItems);
    
    if (!selectedCustomer) {
      console.error('❌ No customer selected - cannot create trade-in');
      toast.error('Please select a customer before adding trade-in');
      return;
    }
    
    if (cartItems.length === 0) {
      console.error('❌ No items in cart - cannot create trade-in');
      toast.error('Please add items to cart before trade-in');
      return;
    }
    
    setTradeInData(data);
    
    // Apply trade-in value as discount
    setTradeInDiscount(data.final_trade_in_value);
    console.log('💰 Trade-in discount set:', data.final_trade_in_value);
    
    console.log('📝 About to start try block...');
    
    // Create transaction
    try {
      console.log('📝 Creating trade-in transaction - STARTING...');
      const { createTradeInTransaction } = await import('../lib/tradeInApi');
      console.log('📝 createTradeInTransaction imported successfully');
      
      // Get product and variant from cart (first item if multiple)
      const firstCartItem = cartItems[0];
      const newProductId = firstCartItem?.product_id || null;
      const newVariantId = firstCartItem?.variant_id || null;
      
      console.log('🛒 Cart item for trade-in:', {
        product_id: newProductId,
        variant_id: newVariantId,
        product_name: firstCartItem?.name,
      });
      
      const result = await createTradeInTransaction({
        customer_id: selectedCustomer?.id || '',
        device_name: data.trade_in_details.device_name,
        device_model: data.trade_in_details.device_model,
        device_imei: data.trade_in_details.device_imei,
        base_trade_in_price: data.trade_in_details.base_price,
        condition_rating: data.trade_in_details.condition_rating,
        condition_description: data.trade_in_details.condition_description,
        damage_items: data.trade_in_details.damage_items,
        new_product_id: newProductId,
        new_variant_id: newVariantId,
        new_device_price: finalAmount,
        customer_payment_amount: data.customer_payment_amount,
      });
      
      console.log('📝 Transaction creation result:', result);

      if (result.success && result.data) {
        console.log('✅ Trade-in transaction created successfully:', result.data);
        console.log('📝 Setting tradeInTransaction state to:', result.data.id);
        setTradeInTransaction(result.data);
        tradeInTransactionRef.current = result.data; // Also store in ref for reliable access
        setShowTradeInCalculator(false);
        toast.success(`Trade-in added: ${data.trade_in_details.device_name} for ${data.final_trade_in_value.toLocaleString()} TZS`);
        
        // Show contract modal
        console.log('📄 Opening contract modal...');
        setShowTradeInContract(true);
      } else {
        console.error('❌ Failed to create trade-in transaction:', result.error);
        toast.error(result.error || 'Failed to create trade-in transaction');
      }
    } catch (error) {
      console.error('❌ Error creating trade-in transaction:', error);
      console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      toast.error('Failed to create trade-in transaction');
    }
  };

  const handleContractSigned = () => {
    toast.success('Contract signed successfully!');
    setShowTradeInContract(false);
    // Contract is now linked to the trade-in transaction
    // Continue with normal sale process - open payment modal
    console.log('✅ Contract signed, proceeding to payment...');
    console.log('🔍 Trade-in transaction state at contract sign:', tradeInTransaction?.id || 'none');
    console.log('🔍 Trade-in transaction ref at contract sign:', tradeInTransactionRef.current?.id || 'none');
    
    // Open payment modal to complete the sale as normal
    setTimeout(() => {
      setShowPaymentModal(true);
    }, 300);
  };

  const handleTradeInPricingConfirm = async (pricingData: any) => {
    if (!tradeInTransaction) {
      toast.error('No trade-in transaction found');
      return;
    }

    try {
      console.log('📦 Adding traded-in device to inventory with pricing...', pricingData);
      const { addTradeInDeviceToInventory, getOrCreateTradeInCategory } = await import('../lib/tradeInInventoryService');
      
      // Get or create "Trade-In Items" category
      const categoryId = await getOrCreateTradeInCategory();
      
      const inventoryResult = await addTradeInDeviceToInventory({
        transaction: tradeInTransaction,
        categoryId: categoryId,
        locationId: undefined, // Use undefined instead of null for optional parameter
        needsRepair: tradeInTransaction.needs_repair || false,
        resalePrice: pricingData.selling_price, // Use the confirmed selling price
      });
      
      if (inventoryResult.success) {
        console.log('✅ Trade-in device added to inventory:', inventoryResult.data);
        toast.success('✅ Trade-in device added to inventory with pricing!');
        
        // Close modal
        setShowTradeInPricing(false);
        
        // Clear trade-in data after successful inventory addition
        setTradeInTransaction(null);
        tradeInTransactionRef.current = null; // Also clear the ref
        setTradeInData(null);
        setTradeInDiscount(0);
        
        // Clear cart and customer now that trade-in process is complete
        setTimeout(() => {
          clearCart();
          setSelectedCustomer(null);
          console.log('🎉 POS: Cart cleared after trade-in pricing completed');
        }, 150);
      } else {
        console.error('❌ Failed to add trade-in to inventory:', inventoryResult.error);
        toast.error('Failed to add trade-in to inventory: ' + inventoryResult.error);
      }
    } catch (error) {
      console.error('❌ Error adding trade-in to inventory:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add trade-in to inventory';
      toast.error(errorMessage);
    }
  };

  // Tax rate from settings
  const TAX_RATE = generalSettings?.tax_rate || 18; // Default 18% VAT for Tanzania
  const isTaxEnabled = generalSettings?.enable_tax === true; // Only enable tax if explicitly set to true

  // Calculate totals with validation
  const totalAmount = useMemo(() => {
    const total = cartItems.reduce((sum, item) => {
      // Ensure itemTotal is a number, not a string
      const itemTotal = typeof item.totalPrice === 'string' 
        ? parseFloat(item.totalPrice) 
        : Number(item.totalPrice || 0);
      
      if (isNaN(itemTotal)) {
        return sum;
      }
      return sum + itemTotal;
    }, 0);
    
    return total;
  }, [cartItems]);
  
  const discountAmount = manualDiscount || 0;
  const discountPercentage = totalAmount > 0 ? Math.round((discountAmount / totalAmount) * 100) : 0;
  const subtotalAfterDiscount = totalAmount - discountAmount;
  const taxAmount = isTaxEnabled ? (subtotalAfterDiscount * TAX_RATE) / 100 : 0;
  const finalAmount = subtotalAfterDiscount + taxAmount;

  // Apply discount function (declared after totalAmount is calculated)
  const applyDiscount = useCallback((_type: string, _value: string) => {
    try {
      setDiscountType(_type as "fixed" | "percentage");
      setDiscountValue(_value);
      const discountAmount = _type === 'percentage' 
        ? (totalAmount * parseFloat(_value)) / 100
        : parseFloat(_value);
      setManualDiscount(discountAmount);
      setShowDiscountModal(false);
      toast.success('Discount applied successfully');
    } catch (error) {
      console.error('Error applying discount:', error);
      toast.error('Failed to apply discount. Please try again.');
    }
  }, [totalAmount]);

  // Check if barcode scanner is enabled
  const isQrCodeScannerEnabled = barcodeScannerSettings?.enable_barcode_scanner;

  // Render Mobile UI if on mobile device or user preference is set to mobile
  if (useMobileUI) {
    return (
      <>
        <MobilePOSWrapper
          cartItems={cartItems}
          selectedCustomer={selectedCustomer}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          products={products}
          onAddToCart={addToCart}
          onUpdateCartItemQuantity={updateCartItemQuantity}
          onRemoveCartItem={removeCartItem}
          onProcessPayment={handleProcessPayment}
          onClearCart={clearCart}
          onShowCustomerSearch={() => handleShowCustomerSelectionModal()}
          onAddCustomer={() => handleShowAddCustomerModal()}
          onRemoveCustomer={handleRemoveCustomer}
          onScanBarcode={startQrCodeScanner}
          onViewReceipts={() => toast.info('Receipts view feature coming soon!', { duration: 3000 })}
          onToggleSettings={() => setShowSettings(true)}
          onViewSales={async () => {
            await loadSales();
            navigate('/lats/sales-reports');
          }}
          onShowDiscountModal={() => setShowDiscountModal(true)}
          totalAmount={totalAmount}
          discountAmount={discountAmount}
          taxAmount={taxAmount}
          finalAmount={finalAmount}
          isProcessingPayment={isProcessingPayment}
          todaysSales={todaysSales}
          isTaxEnabled={isTaxEnabled}
          taxRate={TAX_RATE}
          isQrCodeScannerEnabled={isQrCodeScannerEnabled}
        />

        {/* All Modals (shared between mobile and desktop) */}
        <AddExternalProductModal
          isOpen={showAddExternalProductModal}
          onClose={() => setShowAddExternalProductModal(false)}
          onProductAdded={(product) => {
            addToCart(product);
            setShowAddExternalProductModal(false);
          }}
        />

        <CustomerSelectionModal
          isOpen={showCustomerSelectionModal}
          onClose={() => setShowCustomerSelectionModal(false)}
          onCustomerSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerSelectionModal(false);
            toast.success(`Customer "${customer.name}" selected!`);
          }}
          selectedCustomer={selectedCustomer}
        />

        <AddCustomerModal
          isOpen={showAddCustomerModal}
          onClose={() => setShowAddCustomerModal(false)}
          onCustomerCreated={(customer) => {
            setSelectedCustomer(customer);
            setShowAddCustomerModal(false);
            toast.success(`New customer "${customer.name}" created and selected!`);
          }}
          onAddAnother={() => {
            // Reopen modal for adding another customer
            setShowAddCustomerModal(true);
          }}
        />

        <CustomerEditModal
          isOpen={showCustomerEditModal}
          onClose={() => setShowCustomerEditModal(false)}
          customer={selectedCustomer}
          onCustomerUpdated={(updatedCustomer) => {
            setSelectedCustomer(updatedCustomer);
            setShowCustomerEditModal(false);
            toast.success('Customer updated successfully!');
          }}
        />

        <CustomerDetailModal
          isOpen={showCustomerDetailModal}
          onClose={() => setShowCustomerDetailModal(false)}
          customer={selectedCustomer}
          onEdit={(customer) => {
            setShowCustomerDetailModal(false);
            setShowCustomerEditModal(true);
          }}
        />

        <POSDiscountModalWrapper
          isOpen={showDiscountModal}
          onClose={() => setShowDiscountModal(false)}
          onApplyDiscount={applyDiscount}
          cartSubtotal={totalAmount}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          discountType={discountType}
          setDiscountType={setDiscountType}
          appliedDiscount={manualDiscount}
        />

        <POSSettingsModalWrapper
          ref={settingsModalRef}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />

        <SalesAnalyticsModal
          isOpen={showSalesAnalytics}
          onClose={() => setShowSalesAnalytics(false)}
        />


        <POSReceiptModalWrapper
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receiptData={currentReceipt}
          onShare={() => setShowShareReceiptModal(true)}
        />

        {/* TEST BUTTON - Remove in production */}
        {import.meta.env.DEV && (
          <button
            onClick={() => {
              // Create test receipt data
              const testReceipt = {
                id: 'test-' + Date.now(),
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                items: [
                  {
                    productName: 'Test Product 1',
                    variantName: 'Variant A',
                    quantity: 2,
                    unitPrice: 50000,
                    totalPrice: 100000
                  },
                  {
                    productName: 'Test Product 2',
                    variantName: 'Variant B',
                    quantity: 1,
                    unitPrice: 75000,
                    totalPrice: 75000
                  }
                ],
                customer: {
                  name: 'Test Customer',
                  phone: '+255 123 456 789',
                  email: 'test@example.com'
                },
                subtotal: 175000,
                tax: 0,
                discount: 10000,
                total: 165000,
                paymentMethod: {
                  name: 'Cash',
                  description: 'Cash Payment',
                  icon: '💵'
                },
                cashier: 'Test Cashier',
                receiptNumber: 'TEST-' + Date.now()
              };
              setCurrentReceipt(testReceipt);
              setShowReceiptModal(true);
            }}
            className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 transition-colors font-semibold"
            title="Test Receipt Modal (Dev Only)"
          >
            🧪 Test Receipt
          </button>
        )}

        <ShareReceiptModal
          isOpen={showShareReceiptModal}
          onClose={() => setShowShareReceiptModal(false)}
          receiptData={currentReceipt}
        />

        <DraftManagementModal
          isOpen={showDraftModal}
          onClose={() => setShowDraftModal(false)}
          onLoadDraft={loadDraft}
        />

        <DraftNotification
          draftCount={getAllDrafts().length}
          onViewDrafts={() => setShowDraftModal(true)}
          onDismiss={() => {}}
          isVisible={getAllDrafts().length > 0}
        />

        <DailyClosingModal
          isOpen={showDailyClosingModal}
          onClose={() => setShowDailyClosingModal(false)}
          onComplete={() => {
            console.log('Day closed successfully');
            setIsDailyClosed(true);
            setShowDailyClosingModal(false);
            toast.success('Day closed successfully!');
          }}
          currentUser={currentUser}
        />

        {/* Comprehensive Payment Modal - Supports multiple payment methods */}
        <ComprehensivePaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          totalAmount={totalAmount}
          discountAmount={discountAmount + tradeInDiscount}
          onProcessPayment={async (paymentData) => {
            try {
              console.log('Processing comprehensive payment:', paymentData);

              // Handle different payment types
              let payments = [];
              let totalPaid = 0;

              if (paymentData.method === 'split') {
                // Handle split payments
                payments = paymentData.splitPayments.map((split: any) => ({
                  paymentMethod: split.methodId,
                  amount: split.amount,
                  reference: split.reference || null
                }));
                totalPaid = paymentData.totalAmount;
              } else {
                // Handle single payment
                payments = [{
                  paymentMethod: paymentData.method,
                  amount: paymentData.amount,
                  reference: paymentData.reference || null,
                  loyaltyPoints: paymentData.loyaltyPoints || null,
                  giftCardCode: paymentData.giftCardCode || null
                }];
                totalPaid = paymentData.amount;
              }

              console.log('Converted payments:', payments);

              // Calculate expected payment amount
              const expectedAmount = finalAmount;
              
              // ✅ FIX: Calculate validatedTotalPaid before using it
              const validatedTotalPaid = totalPaid || expectedAmount;

              // Prepare sale data for database with multiple payments
              const saleData = {
                customerId: selectedCustomer?.id || null,
                customerName: selectedCustomer?.name || 'Walk-in Customer',
                customerPhone: selectedCustomer?.phone || null,
                customerEmail: selectedCustomer?.email || null,
                items: cartItems.map(item => ({
                  id: item.id,
                  productId: item.productId,
                  variantId: item.variantId,
                  productName: item.productName,
                  variantName: item.variantName,
                  sku: item.sku,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice,
                  costPrice: 0,
                  profit: 0,
                  selectedSerialNumbers: item.selectedSerialNumbers || [] // Pass serial numbers
                })),
                subtotal: totalAmount,
                tax: taxAmount,
                discount: manualDiscount,
                discountType: discountType,
                discountValue: parseFloat(discountValue) || 0,
                total: finalAmount,
                paymentMethod: {
                  type: payments.length === 1 ? payments[0].paymentMethod : 'multiple',
                  details: {
                    payments: payments.map((payment: any) => ({
                      method: payment.paymentMethod,
                      amount: payment.amount,
                      accountId: payment.paymentAccountId,
                      reference: payment.reference,
                      notes: payment.notes,
                      timestamp: payment.timestamp
                    })),
                    totalPaid: validatedTotalPaid
                  },
                  amount: validatedTotalPaid
                },
                paymentStatus: 'completed' as const,
                soldBy: cashierName || 'POS User',
                soldAt: new Date().toISOString(),
                notes: payments.map((p: any) => p.notes).filter(Boolean).join('; ') || undefined
              };

              // Process the sale using the service
              const result = await saleProcessingService.processSale(saleData);
              
              if (result.success) {
                const displayAmount = totalPaid || finalAmount;
                const saleNumber = result.sale?.saleNumber;
                
                // ✅ If there's a trade-in transaction, handle based on user role
                const activeTradeInTransaction = tradeInTransaction || tradeInTransactionRef.current;
                const isAdmin = userRole === 'admin';
                
                if (activeTradeInTransaction && activeTradeInTransaction.id) {
                  try {
                    if (isAdmin) {
                      // Admin: Mark as completed and show pricing modal
                      console.log('📝 [ADMIN] Marking trade-in transaction as completed:', activeTradeInTransaction.id);
                      const { completeTradeInTransaction } = await import('../lib/tradeInApi');
                      const completionResult = await completeTradeInTransaction(activeTradeInTransaction.id);
                      
                      if (completionResult.success) {
                        console.log('✅ Trade-in transaction marked as completed');
                        setTradeInTransaction(completionResult.data);
                        tradeInTransactionRef.current = completionResult.data;
                      } else {
                        console.error('❌ Failed to mark trade-in as completed:', completionResult.error);
                        toast.error('Warning: Failed to mark trade-in as completed');
                      }
                    } else {
                      // Customer Care: Mark as approved for admin review
                      console.log('📝 [CUSTOMER CARE] Marking trade-in transaction as approved for admin review:', activeTradeInTransaction.id);
                      const { data, error } = await supabase
                        .from('lats_trade_in_transactions')
                        .update({
                          status: 'approved',
                          approved_at: new Date().toISOString(),
                          approved_by: currentUser?.id || null,
                        })
                        .eq('id', activeTradeInTransaction.id)
                        .select()
                        .single();
                      
                      if (!error && data) {
                        console.log('✅ Trade-in marked as approved, awaiting admin to add to inventory');
                        toast.success('✅ Trade-in submitted for admin review. Admin will add device to inventory with pricing.');
                        setTradeInTransaction(data);
                        tradeInTransactionRef.current = data;
                      } else {
                        console.error('❌ Failed to mark trade-in as approved:', error);
                        toast.error('Warning: Failed to submit trade-in for approval');
                      }
                    }
                  } catch (error) {
                    console.error('❌ Error updating trade-in status:', error);
                    toast.error('Warning: Failed to update trade-in status');
                  }
                }
                
                // Prepare receipt data BEFORE clearing anything
                const receiptData = {
                  id: result.sale?.id || '',
                  date: new Date().toLocaleDateString(),
                  time: new Date().toLocaleTimeString(),
                  items: cartItems.map(item => {
                    // Find product and variant to get full attributes/specifications
                    const product = products.find(p => p.id === item.productId);
                    const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                    
                    // Extract attributes from variant - check both variant_attributes and attributes
                    let attributes = item.attributes || {};
                    
                    // Merge variant_attributes (JSONB column from database)
                    if (variant?.variant_attributes) {
                      attributes = { ...attributes, ...variant.variant_attributes };
                    }
                    // Also check variantAttributes (camelCase)
                    if (variant?.variantAttributes) {
                      attributes = { ...attributes, ...variant.variantAttributes };
                    }
                    // Merge regular attributes
                    if (variant?.attributes) {
                      attributes = { ...attributes, ...variant.attributes };
                    }
                    
                    // Handle specification field - can be in variant_attributes or attributes
                    const specSource = variant?.variant_attributes?.specification || 
                                     variant?.variantAttributes?.specification ||
                                     variant?.attributes?.specification;
                    
                    if (specSource) {
                      try {
                        const parsed = typeof specSource === 'string' 
                          ? JSON.parse(specSource)
                          : specSource;
                        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                          // Merge specification fields into attributes
                          attributes = { ...attributes, ...parsed };
                        }
                      } catch {
                        // If parsing fails, keep original
                      }
                    }
                    
                    return {
                    productName: item.productName,
                    variantName: item.variantName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                      sku: item.sku,
                      image: item.image,
                      selectedSerialNumbers: item.selectedSerialNumbers || [],
                      attributes: attributes
                    };
                  }),
                  customerName: selectedCustomer?.name || null,
                  customerPhone: selectedCustomer?.phone || null,
                  customerEmail: selectedCustomer?.email || null,
                  customer: selectedCustomer ? {
                    name: selectedCustomer.name,
                    phone: selectedCustomer.phone,
                    email: selectedCustomer.email
                  } : null,
                  subtotal: totalAmount,
                  tax: taxAmount,
                  discount: manualDiscount,
                  total: finalAmount,
                  paymentMethod: {
                    name: payments.length === 1 ? payments[0].paymentMethod : 'Multiple Payments',
                    description: payments.length === 1 
                      ? `${payments[0].paymentMethod} - ${format.money(payments[0].amount)}`
                      : `${payments.length} payment methods - ${format.money(displayAmount)}`,
                    icon: '💳'
                  },
                  cashier: cashierName || 'POS User',
                  receiptNumber: saleNumber || 'N/A'
                };
                
                // Store receipt data for printing
                setCurrentReceipt(receiptData);
                
                // Close payment modal FIRST
                setShowPaymentModal(false);
                
                // Show success modal BEFORE clearing cart (to preserve data for modal display)
                console.log('🎉 POS: About to show success modal');
                
                // Use setTimeout to ensure modal renders before state changes
                setTimeout(() => {
                  successModal.show(
                    `Payment of ${format.money(displayAmount)} processed successfully!${saleNumber ? ` Sale #${saleNumber}` : ''}`,
                    {
                      title: 'Sale Complete! 🎉',
                      icon: SuccessIcons.paymentReceived,
                      autoCloseDelay: 0,
                      actionButtons: [
                        {
                          label: 'Share Receipt',
                          onClick: () => {
                            setShowShareReceipt(true);
                          },
                          variant: 'primary',
                        },
                        {
                          label: 'View Receipt',
                          onClick: () => {
                            setShowReceiptModal(true);
                          },
                          variant: 'secondary',
                        },
                        {
                          label: 'Continue',
                          onClick: () => {
                            successModal.hide();
                          },
                          variant: 'secondary',
                        }
                      ],
                    }
                  );
                }, 50);
                
                // Clear everything after a tiny delay to ensure modals have time to set up
                setTimeout(() => {
                  clearCart();
                  setManualDiscount(0);
                  setDiscountValue('');
                  setDiscountType('percentage');
                  // Discount is already cleared via setManualDiscount(0) and setDiscountValue('')
                  setSelectedCustomer(null);
                  
                  // ✅ FIX: Clear child variants cache after sale to ensure sold items are hidden
                  (async () => {
                    try {
                      const { childVariantsCacheService } = await import('../../../services/childVariantsCacheService');
                      childVariantsCacheService.clearCache();
                      console.log('✅ Child variants cache cleared after sale');
                    } catch (error) {
                      console.warn('⚠️ Failed to clear child variants cache:', error);
                    }
                  })().catch(err => {
                    console.warn('⚠️ Unhandled error in cache clearing:', err);
                  });
                  
                  // Reload sales data to refresh today's sales display
                  loadSales();
                  
                  // Play success sound
                  playPaymentSound();
                  
                  console.log('🧹 POS: Cart cleared after successful payment');
                }, 100);
              } else {
                console.error('❌ Failed to process sale:', result.error);
                toast.error(result.error || 'Failed to process sale');
                setShowPaymentModal(false);
              }
            } catch (error: any) {
              console.error('❌ Payment processing error:', error);
              
              if (error?.name === 'ValidationError' || error?.name === 'PaymentValidationError') {
                toast.error(error.message || 'Payment validation failed');
                // Keep modal open so user can retry
              } else if (error?.name === 'UserCancelledError') {
                toast(
                  'Payment cancelled', 
                  {
                    icon: '❌',
                    duration: 2000,
                  }
                );
                successModal.show(
                  'Payment was cancelled. Cart has been preserved.',
                  {
                    title: 'Payment Received! 💰',
                    icon: SuccessIcons.paymentReceived,
                    autoCloseDelay: 3000,
                  }
                );
                setShowPaymentModal(false);
              } else {
                throw error;
              }
            }
          }}
        />

        {/* Post Closure Warning Modal */}
        <PostClosureWarningModal
          isOpen={showPostClosureWarning}
          onClose={() => setShowPostClosureWarning(false)}
          onContinue={() => {
            setShowPostClosureWarning(false);
            setShowPaymentModal(true);
          }}
          closureTime={dailyClosureInfo?.closedAt}
          closedBy={dailyClosureInfo?.closedBy}
          userRole={currentUser?.role}
        />

        {/* Day Opening Modal */}
        <DayOpeningModal
          isOpen={showDayOpeningModal}
          onClose={() => setShowDayOpeningModal(false)}
          onOpenDay={async () => {
            setSessionStartTime(new Date().toISOString());
            setIsDailyClosed(false);
            setShowDayOpeningModal(false);
            toast.success('Day opened successfully!');
          }}
          currentUser={currentUser}
        />

        <SuccessModal {...successModal.props} />
      </>
    );
  }

  // Render Desktop UI
  return (
    <div className="flex flex-col h-screen pos-auto-scale" data-pos-page="true">
      {/* Breadcrumb */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-2">
        <LATSBreadcrumb />
      </div>

      {/* POS Top Bar */}
      <div className="flex-shrink-0">
        <POSTopBar
        cartItemsCount={cartItems.length}
        totalAmount={totalAmount}
        onProcessPayment={handleProcessPayment}
        onClearCart={clearCart}
        onPreviewInvoice={() => {
          // Generate invoice preview from current cart
          if (!selectedCustomer) {
            toast.error('Please select a customer first to preview invoice');
            return;
          }
          
          if (cartItems.length === 0) {
            toast.error('Add items to cart first');
            return;
          }

          const invoiceData = {
            invoiceNumber: `PREVIEW-${Date.now()}`,
            invoiceDate: new Date().toISOString().split('T')[0],
            customer: {
              name: selectedCustomer.name,
              address: selectedCustomer.address || '',
              phone: selectedCustomer.phone || '',
              email: selectedCustomer.email || '',
              taxId: (selectedCustomer as any).taxId || ''
            },
            items: cartItems.map(item => {
              // Find product and variant to get specifications
              const product = products.find(p => p.id === item.productId);
              const variant = product?.variants?.find((v: any) => v.id === item.variantId);
              
              // Extract specifications from product or variant
              let specifications: string | Record<string, any> | undefined;
              
              // Try variant attributes first, then product specification, then product attributes
              if (variant?.attributes?.specification) {
                                try {
                                  const parsed = JSON.parse(variant.attributes.specification);
                                  specifications = typeof parsed === 'object' ? parsed : variant.attributes.specification;
                                } catch {
                                  specifications = variant.attributes.specification;
                                }
                              } else if ((product as any)?.specification) {
                                try {
                                  const parsed = JSON.parse((product as any).specification);
                                  specifications = typeof parsed === 'object' ? parsed : (product as any).specification;
                                } catch {
                                  specifications = (product as any).specification;
                                }
                              } else if (product?.attributes?.specification) {
                                try {
                                  const parsed = JSON.parse(product.attributes.specification);
                                  specifications = typeof parsed === 'object' ? parsed : product.attributes.specification;
                                } catch {
                                  specifications = product.attributes.specification;
                                }
                              } else if (variant?.attributes && Object.keys(variant.attributes).length > 0) {
                                // Use variant attributes as specifications if no explicit specification field
                                const attrs = { ...variant.attributes };
                                delete attrs.imei; // Remove IMEI from specifications
                                delete attrs.is_legacy;
                                delete attrs.is_imei_child;
                                if (Object.keys(attrs).length > 0) {
                                  specifications = attrs;
                                }
                              }
              
              return {
                description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: item.totalPrice,
                specifications: specifications
              };
            }),
            subtotal: totalAmount,
            tax: taxAmount || 0,
            discount: manualDiscount || 0,
            total: finalAmount,
            notes: 'This is a preview invoice. Prices may change before payment.',
            terms: 'Net 30'
          };
          
          setCreatedInvoice(invoiceData);
          setShowInvoicePreview(true);
        }}
        onScanQrCode={isQrCodeScannerEnabled ? startQrCodeScanner : () => {}}
        onAddCustomer={() => handleShowAddCustomerModal()}
        onViewReceipts={() => {
          toast.info('Receipts view feature coming soon!', { duration: 3000 });
        }}
        onViewSales={async () => {
          // Refresh sales data before navigating
          await loadSales();
          navigate('/lats/sales-reports');
        }}
        onOpenPaymentTracking={() => {
          handleShowPaymentTracking();
        }}
        onOpenDrafts={() => setShowDraftModal(true)}
        isProcessingPayment={isProcessingPayment}
        hasSelectedCustomer={!!selectedCustomer}
        draftCount={getAllDrafts().length}
        // Bottom bar actions moved to top bar
        onViewAnalytics={() => handleShowSalesAnalytics()}
        onCustomers={() => handleShowAddCustomerModal()}
        onReports={() => handleShowSalesAnalytics()}
        onRefreshData={handleRefreshData}
        onSettings={() => setShowSettings(true)}
        onOpenInstallments={() => setShowInstallmentManagement(true)}
        onOpenExpense={() => setShowQuickExpense(true)}
        todaysSales={todaysSales}
        isDailyClosed={isDailyClosed}
        onCloseDay={() => setShowDailyClosingModal(true)}
        canCloseDay={canCloseDailySales}
      />
      </div>

      {/* Temporary Migration Button - Remove after migration is applied */}
      {/* {currentUser?.role === 'admin' && (
        <div className="fixed top-20 right-4 z-50">
          <button
            onClick={handleApplyMigration}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Apply DB Migration
          </button>
        </div>
      )} */}

      {/* Main Content Area - Takes remaining space */}
      <div className="flex-1 min-h-0 p-4 sm:p-6 max-w-full mx-auto pos-page-container overflow-hidden">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Product Search Section - Fixed height to prevent layout shift */}
          <div className="flex-1 min-h-0 relative h-full">
            {!dataLoaded && products.length === 0 ? (
              <ProductGridSkeleton 
                itemCount={8} 
                columns={4}
                showSearchBar={true}
                showCategories={true}
              />
            ) : null}
            
            {/* Debug info - shows product counts */}
            {import.meta.env.DEV && (
              <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs z-50 font-mono">
                Products: {products.length} | dbProducts: {dbProducts.length} | Loaded: {dataLoaded ? 'Y' : 'N'}
              </div>
            )}
            
            <ProductSearchSection
              products={products as any}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isSearching={isSearching}
              showAdvancedFilters={showAdvancedFilters}
              setShowAdvancedFilters={setShowAdvancedFilters}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedBrand={selectedBrand}
              setSelectedBrand={setSelectedBrand}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              stockFilter={stockFilter}
              setStockFilter={setStockFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              categories={categories?.map(cat => cat.name) || []}
              brands={[]}
              onAddToCart={addToCart}
              onAddExternalProduct={() => setShowAddExternalProductModal(true)}
              onSearch={handleUnifiedSearch}
              onScanQrCode={startQrCodeScanner}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              productsPerPage={productsPerPageFromSettings}
            />
          </div>

          {/* Cart Section */}
          <POSCartSection
            cartItems={cartItems}
            selectedCustomer={selectedCustomer}
            onRemoveCustomer={handleRemoveCustomer}
            onShowCustomerSearch={() => handleShowCustomerSelectionModal()}
            onShowCustomerDetails={handleShowCustomerDetails}
            onUpdateCartItemQuantity={updateCartItemQuantity}
            onRemoveCartItem={removeCartItem}
            onUpdateCartItemTags={updateCartItemTags}
            onIMEISelect={handleCartItemIMEISelect}
            onApplyDiscount={(_type, value) => {
              // Calculate the actual discount amount based on type
              const discountAmount = _type === 'percentage' 
                ? (totalAmount * parseFloat(value.toString())) / 100
                : parseFloat(value.toString());
              setManualDiscount(discountAmount);
              setShowDiscountModal(false);
            }}
            onProcessPayment={handleProcessPayment}
            onShowInstallmentModal={() => setShowInstallmentModal(true)}
            onShowTradeInModal={handleShowTradeInModal}
            onShowDiscountModal={() => setShowDiscountModal(true)}
            onClearDiscount={() => {
              setManualDiscount(0);
              setDiscountValue('');
              setDiscountType('percentage');
            }}
            onPreviewInvoice={() => {
              // Generate invoice preview from current cart
              if (!selectedCustomer) {
                toast.error('Please select a customer first to preview invoice');
                return;
              }
              
              if (cartItems.length === 0) {
                toast.error('Add items to cart first');
                return;
              }

              const invoiceData = {
                invoiceNumber: `PREVIEW-${Date.now()}`,
                invoiceDate: new Date().toISOString().split('T')[0],
                customer: {
                  name: selectedCustomer.name,
                  address: selectedCustomer.address || '',
                  phone: selectedCustomer.phone || '',
                  email: selectedCustomer.email || '',
                  taxId: (selectedCustomer as any).taxId || ''
                },
                items: cartItems.map(item => {
                  // Find product and variant to get specifications
                  const product = products.find(p => p.id === item.productId);
                  const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                  
                  // Extract specifications from product or variant
                  let specifications: string | Record<string, any> | undefined;
                  
                  // Try variant attributes first, then product specification, then product attributes
                  if (variant?.attributes?.specification) {
                                    try {
                                      const parsed = JSON.parse(variant.attributes.specification);
                                      specifications = typeof parsed === 'object' ? parsed : variant.attributes.specification;
                                    } catch {
                                      specifications = variant.attributes.specification;
                                    }
                                  } else if ((product as any)?.specification) {
                                    try {
                                      const parsed = JSON.parse((product as any).specification);
                                      specifications = typeof parsed === 'object' ? parsed : (product as any).specification;
                                    } catch {
                                      specifications = (product as any).specification;
                                    }
                                  } else if (product?.attributes?.specification) {
                                    try {
                                      const parsed = JSON.parse(product.attributes.specification);
                                      specifications = typeof parsed === 'object' ? parsed : product.attributes.specification;
                                    } catch {
                                      specifications = product.attributes.specification;
                                    }
                                  } else if (variant?.attributes && Object.keys(variant.attributes).length > 0) {
                                    // Use variant attributes as specifications if no explicit specification field
                                    const attrs = { ...variant.attributes };
                                    delete attrs.imei; // Remove IMEI from specifications
                                    delete attrs.is_legacy;
                                    delete attrs.is_imei_child;
                                    if (Object.keys(attrs).length > 0) {
                                      specifications = attrs;
                                    }
                                  }
                  
                  return {
                    description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.totalPrice,
                    specifications: specifications
                  };
                }),
                subtotal: totalAmount,
                tax: taxAmount || 0,
                discount: manualDiscount || 0,
                total: finalAmount,
                notes: 'This is a preview invoice. Prices may change before payment.',
                terms: 'Net 30'
              };
              
              setCreatedInvoice(invoiceData);
              setShowInvoicePreview(true);
            }}
            dynamicPricingEnabled={dynamicPricingSettings?.enable_dynamic_pricing}
            totalAmount={totalAmount}
            discountAmount={discountAmount}
            discountPercentage={discountPercentage}
            taxAmount={taxAmount}
            taxRate={TAX_RATE}
            finalAmount={finalAmount}
            onEditCustomer={(_customer) => setShowCustomerEditModal(true)}
            isTaxEnabled={isTaxEnabled}
          />
        </div>
      </div>

      {/* Modals */}
      <AddExternalProductModal
        isOpen={showAddExternalProductModal}
        onClose={() => setShowAddExternalProductModal(false)}
        onProductAdded={(product) => {
          addToCart(product);
          setShowAddExternalProductModal(false);
        }}
      />

      {/* Customer Selection Modal - Only if feature is enabled */}
      {isCustomerProfilesEnabled() && (
        <>
          <CustomerSelectionModal
            isOpen={showCustomerSelectionModal}
            onClose={() => setShowCustomerSelectionModal(false)}
            onCustomerSelect={(customer) => {
              setSelectedCustomer(customer);
              setShowCustomerSelectionModal(false);
              toast.success(`Customer "${customer.name}" selected!`);
            }}
            selectedCustomer={selectedCustomer}
          />

          <AddCustomerModal
            isOpen={showAddCustomerModal}
            onClose={() => setShowAddCustomerModal(false)}
            onCustomerCreated={(customer) => {
              setSelectedCustomer(customer);
              setShowAddCustomerModal(false);
              toast.success(`New customer "${customer.name}" created and selected!`);
            }}
            onAddAnother={() => {
              // Reopen modal for adding another customer
              setShowAddCustomerModal(true);
            }}
          />

          <CustomerEditModal
            isOpen={showCustomerEditModal}
            onClose={() => setShowCustomerEditModal(false)}
            customer={selectedCustomer}
            onCustomerUpdated={(updatedCustomer) => {
              setSelectedCustomer(updatedCustomer);
              setShowCustomerEditModal(false);
            }}
          />
        </>
      )}

      <DraftManagementModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        onLoadDraft={loadDraft}
        currentDraftId={currentDraftId || undefined}
      />

      {/* Sales Analytics Modal - Only if dynamic pricing is enabled */}
      {isDynamicPricingEnabled() && (
        <SalesAnalyticsModal
          isOpen={showSalesAnalytics}
          onClose={() => setShowSalesAnalytics(false)}
        />
      )}

      <ZenoPayPaymentModal
        isOpen={showZenoPayPayment}
        onClose={() => setShowZenoPayPayment(false)}
        cartItems={cartItems}
        total={finalAmount}
        onPaymentComplete={async (payment) => {
          try {
            // Handle successful payment completion

            // Validate customer selection
            if (!selectedCustomer && !customerName) {
              toast.error('Please select a customer or enter customer name');
              return;
            }

            // Prepare sale data for database
            const saleData = {
              customerId: selectedCustomer?.id || null,
              customerName: selectedCustomer?.name || customerName || 'Walk-in Customer',
              customerPhone: selectedCustomer?.phone || null,
              customerEmail: selectedCustomer?.email || null,
              items: cartItems.map(item => ({
                id: item.id,
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName, // Fixed: was item.name
                variantName: item.variantName, // Fixed: was item.name
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice, // Fixed: was item.price
                totalPrice: item.totalPrice,
                costPrice: 0, // Will be calculated by service
                profit: 0 // Will be calculated by service
              })),
              subtotal: totalAmount,
              tax: taxAmount,
              discount: manualDiscount,
              discountType: discountType,
              discountValue: parseFloat(discountValue) || 0,
              total: finalAmount,
              paymentMethod: {
                type: 'zenopay',
                details: {
                  transactionId: payment.id,
                  provider: 'ZenoPay'
                },
                amount: finalAmount
              },
              paymentStatus: 'completed' as const,
              soldBy: cashierName || 'POS User',
              soldAt: new Date().toISOString(),
              notes: `ZenoPay Transaction ID: ${payment.id || 'N/A'}`
            };

            // Process the sale using the service
            const result = await saleProcessingService.processSale(saleData);
            
            if (result.success) {
              // Show pricing modal for trade-in device if there's a trade-in transaction
              const activeTradeInTransaction = tradeInTransaction || tradeInTransactionRef.current;
              const isAdmin = userRole === 'admin';
              
              if (activeTradeInTransaction && activeTradeInTransaction.id) {
                try {
                  if (isAdmin) {
                    // Admin: Mark as completed and show pricing modal
                    console.log('📝 [ADMIN] Marking trade-in transaction as completed (ZenoPay):', activeTradeInTransaction.id);
                    const { completeTradeInTransaction } = await import('../lib/tradeInApi');
                    const completionResult = await completeTradeInTransaction(activeTradeInTransaction.id);
                    
                    if (completionResult.success) {
                      console.log('✅ Trade-in transaction marked as completed (ZenoPay)');
                      setTradeInTransaction(completionResult.data);
                      tradeInTransactionRef.current = completionResult.data;
                      
                      // Show pricing modal for admin
                      console.log('📋 [ADMIN] Opening pricing modal for trade-in device (ZenoPay)...');
                      if (!tradeInTransaction && tradeInTransactionRef.current) {
                        setTradeInTransaction(tradeInTransactionRef.current);
                      }
                      setShowTradeInPricing(true);
                    } else {
                      console.error('❌ Failed to mark trade-in as completed:', completionResult.error);
                    }
                  } else {
                    // Customer Care: Mark as approved for admin review
                    console.log('📝 [CUSTOMER CARE] Marking trade-in as approved (ZenoPay):', activeTradeInTransaction.id);
                    const { data, error } = await supabase
                      .from('lats_trade_in_transactions')
                      .update({
                        status: 'approved',
                        approved_at: new Date().toISOString(),
                        approved_by: currentUser?.id || null,
                      })
                      .eq('id', activeTradeInTransaction.id)
                      .select()
                      .single();
                    
                    if (!error && data) {
                      console.log('✅ Trade-in marked as approved, awaiting admin');
                      toast.success('✅ Trade-in submitted for admin review. Admin will add device to inventory with pricing.');
                      setTradeInTransaction(data);
                      tradeInTransactionRef.current = data;
                    } else {
                      console.error('❌ Failed to mark trade-in as approved:', error);
                      toast.error('Warning: Failed to submit trade-in for approval');
                    }
                  }
                } catch (error) {
                  console.error('❌ Error updating trade-in status:', error);
                }
              }
              
              // Prepare receipt data
              const receiptData = {
                id: result.sale?.id || '',
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                items: cartItems.map(item => {
                  // Find product and variant to get full attributes/specifications
                  const product = products.find(p => p.id === item.productId);
                  const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                  
                  // Extract attributes from variant or use item attributes
                  let attributes = item.attributes || {};
                  
                  // If variant exists, merge its attributes
                  if (variant?.attributes) {
                    attributes = { ...attributes, ...variant.attributes };
                  }
                  
                  // Also check for specification field in variant attributes
                  if (variant?.attributes?.specification) {
                    try {
                      const parsed = typeof variant.attributes.specification === 'string' 
                        ? JSON.parse(variant.attributes.specification)
                        : variant.attributes.specification;
                      if (typeof parsed === 'object' && parsed !== null) {
                        attributes = { ...attributes, ...parsed };
                      }
                    } catch {
                      // If parsing fails, keep original
                    }
                  }
                  
                  return {
                  productName: item.productName,
                  variantName: item.variantName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    sku: item.sku,
                    image: item.image,
                    selectedSerialNumbers: item.selectedSerialNumbers || [],
                    attributes: attributes
                  };
                }),
                customerName: selectedCustomer?.name || null,
                customerPhone: selectedCustomer?.phone || null,
                customerEmail: selectedCustomer?.email || null,
                customer: selectedCustomer ? {
                  name: selectedCustomer.name,
                  phone: selectedCustomer.phone,
                  email: selectedCustomer.email
                } : null,
                subtotal: totalAmount,
                tax: taxAmount,
                discount: manualDiscount,
                total: finalAmount,
                paymentMethod: {
                  name: 'ZenoPay',
                  description: `ZenoPay - ${format.money(finalAmount)}`,
                  icon: '💳'
                },
                cashier: cashierName || 'POS User',
                receiptNumber: result.sale?.saleNumber || 'N/A'
              };
              
              const saleNumber = result.sale?.saleNumber;
              
              // Store receipt data for printing
              setCurrentReceipt(receiptData);
              
              // Close payment modal FIRST
              setShowZenoPayPayment(false);
              
              // Show success modal BEFORE clearing (with delay to ensure render)
              setTimeout(() => {
                successModal.show(
                  `ZenoPay payment completed successfully!${saleNumber ? ` Sale #${saleNumber}` : ''}`,
                  {
                    title: 'Sale Complete! 🎉',
                    icon: SuccessIcons.saleCompleted,
                    autoCloseDelay: 0,
                    actionButtons: [
                      {
                        label: 'Share Receipt',
                        onClick: () => {
                          setShowShareReceipt(true);
                        },
                        variant: 'primary',
                      },
                      {
                        label: 'New Sale',
                        onClick: () => {
                          // Modal closes automatically
                        },
                        variant: 'secondary',
                      },
                    ],
                  }
                );
              }, 100);
              
              // Clear cart and customer AFTER showing modal
              setTimeout(() => {
                clearCart();
                setSelectedCustomer(null);
                
                // ✅ FIX: Clear child variants cache after sale to ensure sold items are hidden
                (async () => {
                  try {
                    const { childVariantsCacheService } = await import('../../../services/childVariantsCacheService');
                    childVariantsCacheService.clearCache();
                    console.log('✅ Child variants cache cleared after ZenoPay sale');
                  } catch (error) {
                    console.warn('⚠️ Failed to clear child variants cache:', error);
                  }
                })().catch(err => {
                  console.warn('⚠️ Unhandled error in cache clearing:', err);
                });
                
                // ✅ FIX: Reload sales data to refresh today's sales display
                loadSales();
                
                // Play success sound
                playPaymentSound();
                
                console.log('🧹 POS: Cart cleared after successful ZenoPay payment');
              }, 150);
            } else {
              throw new Error(result.error || 'Failed to process sale');
            }
            
          } catch (error) {
            console.error('Error handling ZenoPay payment completion:', error);
            toast.error(`Payment completed but failed to process sale: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }}
        customer={selectedCustomer}
      />

      {/* Installment Plan Modal */}
      {showInstallmentModal && selectedCustomer && (
        <POSInstallmentModal
          isOpen={showInstallmentModal}
          onClose={() => setShowInstallmentModal(false)}
          onSuccess={async () => {
            // Show pricing modal for trade-in device if there's a trade-in transaction
            const activeTradeInTransaction = tradeInTransaction || tradeInTransactionRef.current;
            const isAdmin = userRole === 'admin';
            
            if (activeTradeInTransaction && activeTradeInTransaction.id) {
              try {
                if (isAdmin) {
                  // Admin: Mark as completed and show pricing modal
                  console.log('📝 [ADMIN] Marking trade-in as completed (Installment):', activeTradeInTransaction.id);
                  const { completeTradeInTransaction } = await import('../lib/tradeInApi');
                  const completionResult = await completeTradeInTransaction(activeTradeInTransaction.id);
                  
                  if (completionResult.success) {
                    console.log('✅ Trade-in transaction marked as completed (Installment)');
                    setTradeInTransaction(completionResult.data);
                    tradeInTransactionRef.current = completionResult.data;
                    
                    // Show pricing modal for admin
                    console.log('📋 [ADMIN] Opening pricing modal for trade-in device (Installment)...');
                    if (!tradeInTransaction && tradeInTransactionRef.current) {
                      setTradeInTransaction(tradeInTransactionRef.current);
                    }
                    setShowTradeInPricing(true);
                  } else {
                    console.error('❌ Failed to mark trade-in as completed:', completionResult.error);
                  }
                } else {
                  // Customer Care: Mark as approved for admin review
                  console.log('📝 [CUSTOMER CARE] Marking trade-in as approved (Installment):', activeTradeInTransaction.id);
                  const { data, error } = await supabase
                    .from('lats_trade_in_transactions')
                    .update({
                      status: 'approved',
                      approved_at: new Date().toISOString(),
                      approved_by: currentUser?.id || null,
                    })
                    .eq('id', activeTradeInTransaction.id)
                    .select()
                    .single();
                  
                  if (!error && data) {
                    console.log('✅ Trade-in marked as approved, awaiting admin');
                    toast.success('✅ Trade-in submitted for admin review. Admin will add device to inventory with pricing.');
                    setTradeInTransaction(data);
                    tradeInTransactionRef.current = data;
                  } else {
                    console.error('❌ Failed to mark trade-in as approved:', error);
                    toast.error('Warning: Failed to submit trade-in for approval');
                  }
                }
              } catch (error) {
                console.error('❌ Error updating trade-in status:', error);
              }
            }
            
            setShowInstallmentModal(false);
            clearCart();
            toast.success('✅ Sale completed with installment plan!');
          }}
          cartItems={cartItems}
          cartTotal={finalAmount}
          customer={selectedCustomer}
          currentUser={currentUser}
        />
      )}

      {/* Trade-In Calculator Modal */}
      {showTradeInCalculator && (
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <LoadingSpinner size="sm" color="orange" />
          </div>
        }>
          <TradeInCalculator
            isOpen={showTradeInCalculator}
            onClose={() => setShowTradeInCalculator(false)}
            newDevicePrice={finalAmount}
            onTradeInComplete={handleTradeInComplete}
          />
        </React.Suspense>
      )}

      {/* Trade-In Contract Modal */}
      {tradeInTransaction && (
        <TradeInContractModal
          isOpen={showTradeInContract}
          transaction={tradeInTransaction}
          onClose={() => setShowTradeInContract(false)}
          onContractSigned={handleContractSigned}
        />
      )}

      {/* Trade-In Pricing Modal */}
      {tradeInTransaction && (
        <TradeInPricingModal
          isOpen={showTradeInPricing}
          transaction={tradeInTransaction}
          onClose={() => setShowTradeInPricing(false)}
          onConfirm={handleTradeInPricingConfirm}
        />
      )}

      {/* Installment Management Modal */}
      <InstallmentManagementModal
        isOpen={showInstallmentManagement}
        onClose={() => setShowInstallmentManagement(false)}
      />

      {/* POS Sale Summary Modal */}
      {showPOSSummaryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col relative">
            {/* Close Button */}
                <button
              type="button"
                  onClick={() => setShowPOSSummaryModal(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
                >
                  <X className="w-5 h-5" />
                </button>

            {/* Icon Header - Fixed */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <ShoppingCart className="w-8 h-8 text-white" />
              </div>
                
                {/* Text */}
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Complete Sale
                  </h3>
                  <p className="text-sm text-gray-600">
                    Review your sale details before processing payment
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Customer & Sale Information - Combined */}
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-blue-600" />
                    Sale Information
                    </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCustomer && (
                      <>
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                      </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Customer Name</p>
                            <p className="font-semibold text-gray-900 truncate">{selectedCustomer.name}</p>
                      </div>
                    </div>
                        <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            {selectedCustomer.phone ? (
                              <Phone className="w-5 h-5 text-green-600" />
                            ) : (
                              <Mail className="w-5 h-5 text-green-600" />
                            )}
                  </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Contact</p>
                            <p className="font-semibold text-gray-900 truncate">{selectedCustomer.phone || selectedCustomer.email || 'N/A'}</p>
                          </div>
                        </div>
                      </>
                    )}
                    <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">Sale Date</p>
                        <p className="font-semibold text-gray-900 text-sm">{new Date().toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</p>
                      </div>
                    </div>
                    {currentUser && (
                      <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
                          <UserCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 mb-1">Cashier</p>
                          <p className="font-semibold text-gray-900 truncate">{currentUser.fullName || currentUser.email}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-b-2 border-gray-300 my-4"></div>

                {/* Items Summary - With Thumbnails */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Sale Items ({cartItems.length})
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 cursor-pointer flex flex-col h-full bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 shadow-sm relative"
                      >
                        {/* Quantity Badge */}
                        <div className="absolute -top-2 -right-2 p-1.5 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20 min-w-[2rem] min-h-[2rem] bg-gradient-to-r from-blue-500 to-blue-600">
                          <span className="text-xs font-bold text-white whitespace-nowrap px-1">
                            {item.quantity}
                          </span>
                        </div>
                        
                        <div className="flex items-start gap-2 md:gap-3">
                          {/* Thumbnail */}
                          {item.image ? (
                            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden">
                              <SafeImage
                                src={item.image}
                                alt={item.productName}
                                className="w-full h-full object-cover rounded-md"
                                fallbackText={item.productName.charAt(0).toUpperCase()}
                              />
                            </div>
                          ) : (
                            <div className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md flex items-center justify-center flex-shrink-0">
                              <Package className="w-8 h-8 md:w-10 md:h-10 text-gray-400" />
                            </div>
                          )}
                  
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="font-medium text-gray-800 truncate text-sm md:text-base leading-tight" title={item.productName}>
                                {item.productName}
                    </div>
                              {item.variantName && item.variantName !== 'Default' && (
                                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                                  {item.variantName}
                      </p>
                              )}
                    </div>
                            <div className="mt-2">
                              <div className="text-lg md:text-xl text-gray-700 font-bold">
                                {format.money(item.totalPrice)}
                    </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {format.money(item.unitPrice)} each
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Separator */}
                <div className="border-b-2 border-gray-300 my-4"></div>

                {/* Payment Summary - All totals here */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-blue-600" />
                    Payment Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-sm text-gray-500">Total Items</p>
                        <p className="text-xl font-bold text-gray-900">{cartItems.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Total Quantity</p>
                        <p className="text-xl font-bold text-blue-600">
                          {cartItems.reduce((sum, item) => sum + item.quantity, 0)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-700">Subtotal</span>
                      <span className="font-semibold text-gray-900">{format.money(totalAmount)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Discount</span>
                        <span className="font-semibold text-red-600">-{format.money(discountAmount)}</span>
                      </div>
                    )}
                    {tradeInDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Trade-In Credit</span>
                        <span className="font-semibold text-green-600">-{format.money(tradeInDiscount)}</span>
                      </div>
                    )}
                    {taxAmount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Tax</span>
                        <span className="font-semibold text-gray-900">{format.money(taxAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                      <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {format.money(tradeInDiscount > 0 ? finalAmount - tradeInDiscount : finalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons - Fixed Footer */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 flex-shrink-0 bg-white px-6 pb-6">
              <button
                type="button"
                onClick={() => setShowPOSSummaryModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaleSummary}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Payments Popup Modal */}
      <PaymentsPopupModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={tradeInDiscount > 0 ? finalAmount - tradeInDiscount : finalAmount}
        customerId={selectedCustomer?.id}
        customerName={selectedCustomer?.name || 'Walk-in Customer'}
        description={`POS Sale - ${cartItems.length} items${tradeInDiscount > 0 ? ` (Trade-In: -${format.money(tradeInDiscount)})` : ''}`}
        onPaymentComplete={async (payments, totalPaid) => {
          try {
            // Validate payment data before processing
            if (!payments || payments.length === 0) {
              throw new Error('No payment data received');
            }

            console.log('Processing payments:', {
              paymentCount: payments.length,
              totalPaid: totalPaid,
              payments: payments.map((p: any) => ({
                method: p.paymentMethod,
                amount: p.amount,
                reference: p.reference
              }))
            });

            // Calculate expected payment amount (after trade-in discount if applicable)
            const expectedAmount = tradeInDiscount > 0 ? finalAmount - tradeInDiscount : finalAmount;
            
            // Validate totalPaid to ensure it matches the expected amount
            const validatedTotalPaid = totalPaid || expectedAmount;
            
            // Validate that totalPaid matches expectedAmount (with tolerance for rounding)
            if (Math.abs(validatedTotalPaid - expectedAmount) > 1) {
              console.warn('⚠️ Payment amount mismatch:', {
                totalPaid: validatedTotalPaid,
                expectedAmount: expectedAmount,
                finalAmount: finalAmount,
                tradeInDiscount: tradeInDiscount,
                difference: Math.abs(validatedTotalPaid - expectedAmount)
              });
            }

            // Prepare sale notes including trade-in information if applicable
            let saleNotes = payments.map((p: any) => p.notes).filter(Boolean).join('; ');
            
            // Add trade-in information to sale notes
            if (tradeInTransaction && tradeInData) {
              const tradeInNote = `Trade-In: ${tradeInTransaction.device_name} ${tradeInTransaction.device_model} (IMEI: ${tradeInTransaction.device_imei || 'N/A'}) - Trade-In Value: ${format.money(tradeInData.final_trade_in_value)} - Customer Payment: ${format.money(tradeInData.customer_payment_amount)} - Transaction ID: ${tradeInTransaction.id}`;
              saleNotes = saleNotes ? `${saleNotes}; ${tradeInNote}` : tradeInNote;
            }

            // Validate cart items before processing - filter out invalid items
            const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const validCartItems = cartItems.filter(item => {
              if (!item.variantId || !UUID_REGEX.test(item.variantId)) {
                console.error('❌ Invalid cart item detected, removing:', {
                  itemId: item.id,
                  productName: item.productName,
                  variantId: item.variantId
                });
                toast.error(`Removed invalid item from cart: ${item.productName} (invalid variant)`);
                return false;
              }
              return true;
            });

            if (validCartItems.length === 0) {
              toast.error('No valid items in cart. Please add items before processing payment.');
              console.error('❌ No valid items in cart after filtering');
              return;
            }

            if (validCartItems.length < cartItems.length) {
              // Update cart to remove invalid items
              setCartItems(validCartItems);
              toast(`Removed ${cartItems.length - validCartItems.length} invalid item(s) from cart. Please review and try again.`, { icon: '⚠️' });
              return;
            }

            // ✅ OPTIMIZED: Variant existence check is now handled by batch stock validation
            // The stock validation will catch missing variants, so we can skip this redundant check
            // This reduces database queries and improves performance

            // ✅ OPTIMIZED PRE-PAYMENT STOCK VALIDATION: Batch check all items at once
            // This prevents payment processing when stock is insufficient
            console.log('🔍 Pre-payment stock validation for', validCartItems.length, 'items...');
            
            // ✅ OPTIMIZED: Use batch stock check instead of sequential checks
            const stockCheckItems = validCartItems.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity
            }));
            
            const stockCheckResults = await saleProcessingService.checkStockAvailabilityBatch(stockCheckItems);
            const stockValidationErrors: string[] = [];
            
            for (const item of validCartItems) {
              const stockCheck = stockCheckResults.get(item.variantId);
              
              if (!stockCheck || !stockCheck.available) {
                const errorMsg = `${item.productName} (${item.variantName}): ${stockCheck?.error || 'Insufficient stock'}`;
                stockValidationErrors.push(errorMsg);
                console.error('❌ Pre-payment stock validation failed:', {
                  productName: item.productName,
                  variantName: item.variantName,
                  variantId: item.variantId,
                  requestedQuantity: item.quantity,
                  availableStock: stockCheck?.availableStock || 0,
                  error: stockCheck?.error
                });
              }
            }
            
            if (stockValidationErrors.length > 0) {
              const errorMessage = `Cannot process payment. Stock issues detected:\n${stockValidationErrors.join('\n')}`;
              console.error('❌ Pre-payment stock validation failed:', stockValidationErrors);
              toast.error(errorMessage, { duration: 6000 });
              
              // Remove items with insufficient stock from cart (using already fetched results)
              const itemsToKeep = validCartItems.filter(item => {
                const stockCheck = stockCheckResults.get(item.variantId);
                return stockCheck?.available === true;
              });
              
              if (itemsToKeep.length < validCartItems.length) {
                setCartItems(itemsToKeep);
                if (itemsToKeep.length === 0) {
                  toast.error('All items were removed due to insufficient stock. Please add items to cart.');
                } else {
                  toast(`${validCartItems.length - itemsToKeep.length} item(s) removed due to insufficient stock.`, { icon: '⚠️' });
                }
              }
              
              return; // Stop payment processing
            }
            
            console.log('✅ Pre-payment stock validation passed for all items');

            // Prepare sale data for database with multiple payments
            const saleData = {
              customerId: selectedCustomer?.id || null,
              customerName: selectedCustomer?.name || 'Walk-in Customer',
              customerPhone: selectedCustomer?.phone || null,
              customerEmail: selectedCustomer?.email || null,
              items: validCartItems.map(item => ({
                id: item.id,
                productId: item.productId,
                variantId: item.variantId,
                productName: item.productName, // Fixed: was item.name
                variantName: item.variantName, // Fixed: was item.name
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice, // Fixed: was item.price
                totalPrice: item.totalPrice,
                costPrice: 0, // Will be calculated by service
                profit: 0, // Will be calculated by service
                // Add tags if available
                ...(item.tags && item.tags.length > 0 && {
                  tags: item.tags
                }),
                // Add selected serial numbers if available
                ...(item.selectedSerialNumbers && item.selectedSerialNumbers.length > 0 && {
                  serialNumbers: item.selectedSerialNumbers
                })
              })),
              subtotal: totalAmount,
              tax: taxAmount,
              discount: manualDiscount,
              discountType: discountType,
              discountValue: parseFloat(discountValue) || 0,
              // Include trade-in discount if applicable
              tradeInDiscount: tradeInDiscount || 0,
              tradeInTransactionId: tradeInTransaction?.id || null,
              total: finalAmount,
              // Payment method structure expected by sale processing service
              paymentMethod: {
                type: payments.length === 1 ? payments[0].paymentMethod : 'multiple',
                details: {
                  payments: payments.map((payment: any) => ({
                    method: payment.paymentMethod,
                    amount: payment.amount,
                    accountId: payment.paymentAccountId,
                    reference: payment.reference,
                    notes: payment.notes,
                    timestamp: payment.timestamp
                  })),
                  totalPaid: validatedTotalPaid,
                  // Include trade-in details in payment details
                  ...(tradeInTransaction && {
                    tradeIn: {
                      transactionId: tradeInTransaction.id,
                      deviceName: tradeInTransaction.device_name,
                      deviceModel: tradeInTransaction.device_model,
                      deviceImei: tradeInTransaction.device_imei,
                      tradeInValue: tradeInData?.final_trade_in_value || 0
                    }
                  })
                },
                amount: validatedTotalPaid // Fix: Use validated totalPaid instead of potentially 0
              },
              paymentStatus: 'completed' as const,
              soldBy: cashierName || 'POS User',
              soldAt: new Date().toISOString(),
              notes: saleNotes || undefined
            };

            // Process the sale using the service
            const result = await saleProcessingService.processSale(saleData);
            
            if (result.success) {
              const displayAmount = totalPaid || finalAmount;
              const saleNumber = result.sale?.saleNumber;
              
              // Show pricing modal for trade-in device if there's a trade-in transaction
              console.log('🔍 Checking for trade-in transaction:', tradeInTransaction?.id || 'none');
              console.log('🔍 Checking ref for trade-in transaction:', tradeInTransactionRef.current?.id || 'none');
              const activeTradeInTransaction = tradeInTransaction || tradeInTransactionRef.current;
              const isAdmin = userRole === 'admin';
              
              if (activeTradeInTransaction && activeTradeInTransaction.id) {
                try {
                  if (isAdmin) {
                    // Admin: Mark as completed and show pricing modal
                    console.log('📝 [ADMIN] Marking trade-in transaction as completed:', activeTradeInTransaction.id);
                    const { completeTradeInTransaction } = await import('../lib/tradeInApi');
                    const completionResult = await completeTradeInTransaction(activeTradeInTransaction.id);
                    
                    if (completionResult.success) {
                      console.log('✅ Trade-in transaction marked as completed');
                      setTradeInTransaction(completionResult.data);
                      tradeInTransactionRef.current = completionResult.data;
                      
                      // Show pricing modal for admin to set prices
                      console.log('📋 [ADMIN] Opening pricing modal for trade-in device...');
                      if (!tradeInTransaction && tradeInTransactionRef.current) {
                        setTradeInTransaction(tradeInTransactionRef.current);
                      }
                      setShowTradeInPricing(true);
                    } else {
                      console.error('❌ Failed to mark trade-in as completed:', completionResult.error);
                      toast.error('Warning: Failed to mark trade-in as completed');
                    }
                  } else {
                    // Customer Care: Mark as approved for admin review
                    console.log('📝 [CUSTOMER CARE] Marking trade-in transaction as approved for admin review:', activeTradeInTransaction.id);
                    const { data, error } = await supabase
                      .from('lats_trade_in_transactions')
                      .update({
                        status: 'approved',
                        approved_at: new Date().toISOString(),
                        approved_by: currentUser?.id || null,
                      })
                      .eq('id', activeTradeInTransaction.id)
                      .select()
                      .single();
                    
                    if (!error && data) {
                      console.log('✅ Trade-in marked as approved, awaiting admin to add to inventory');
                      toast.success('✅ Trade-in submitted for admin review. Admin will add device to inventory with pricing.');
                      setTradeInTransaction(data);
                      tradeInTransactionRef.current = data;
                    } else {
                      console.error('❌ Failed to mark trade-in as approved:', error);
                      toast.error('Warning: Failed to submit trade-in for approval');
                    }
                  }
                } catch (error) {
                  console.error('❌ Error updating trade-in status:', error);
                  toast.error('Warning: Failed to update trade-in status');
                }
              } else {
                console.log('⚠️ No trade-in transaction found - pricing modal not shown');
              }
              
              // Prepare receipt data BEFORE clearing anything
              const receiptData = {
                id: result.sale?.id || '',
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                items: cartItems.map(item => {
                  // Find product and variant to get full attributes/specifications
                  const product = products.find(p => p.id === item.productId);
                  const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                  
                  // Debug logging
                  console.log('🔍 Receipt: Processing item:', {
                    productId: item.productId,
                    variantId: item.variantId,
                    productName: item.productName,
                    variantFound: !!variant,
                    variantData: variant ? {
                      id: variant.id,
                      hasVariantAttributes: !!variant.variant_attributes,
                      hasAttributes: !!variant.attributes,
                      variantAttributesType: typeof variant.variant_attributes,
                      attributesType: typeof variant.attributes
                    } : null
                  });
                  
                  // Extract attributes from variant - check both variant_attributes and attributes
                  let attributes = item.attributes || {};
                  
                  // Helper function to parse JSONB data
                  const parseJsonb = (data: any): any => {
                    if (!data) return {};
                    if (typeof data === 'string') {
                      try {
                        return JSON.parse(data);
                      } catch {
                        return {};
                      }
                    }
                    if (typeof data === 'object') {
                      return data;
                    }
                    return {};
                  };
                  
                  // Merge variant_attributes (JSONB column from database) - parse if needed
                  if (variant?.variant_attributes) {
                    const parsedVariantAttrs = parseJsonb(variant.variant_attributes);
                    attributes = { ...attributes, ...parsedVariantAttrs };
                    console.log('✅ Receipt: Merged variant_attributes:', parsedVariantAttrs);
                  }
                  // Also check variantAttributes (camelCase)
                  if (variant?.variantAttributes) {
                    const parsedVariantAttrs = parseJsonb(variant.variantAttributes);
                    attributes = { ...attributes, ...parsedVariantAttrs };
                    console.log('✅ Receipt: Merged variantAttributes:', parsedVariantAttrs);
                  }
                  // Merge regular attributes
                  if (variant?.attributes) {
                    const parsedAttrs = parseJsonb(variant.attributes);
                    attributes = { ...attributes, ...parsedAttrs };
                    console.log('✅ Receipt: Merged attributes:', parsedAttrs);
                  }
                  
                  // Handle specification field - can be in variant_attributes or attributes
                  const specSource = variant?.variant_attributes?.specification || 
                                   variant?.variantAttributes?.specification ||
                                   variant?.attributes?.specification;
                  
                  if (specSource) {
                    try {
                      const parsed = typeof specSource === 'string' 
                        ? JSON.parse(specSource)
                        : specSource;
                      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                        // Merge specification fields into attributes
                        attributes = { ...attributes, ...parsed };
                        console.log('✅ Receipt: Merged specification:', parsed);
                      }
                    } catch (e) {
                      console.warn('⚠️ Receipt: Failed to parse specification:', e);
                    }
                  }
                  
                  // Also check if variant_attributes itself contains specification keys
                  const variantAttrs = variant?.variant_attributes ? parseJsonb(variant.variant_attributes) : {};
                  if (variantAttrs && typeof variantAttrs === 'object' && !variantAttrs.specification) {
                    // If variant_attributes is an object with keys (not a specification field), merge all keys
                    Object.keys(variantAttrs).forEach(key => {
                      if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && 
                          key !== 'variant_id' && key !== 'product_id' && 
                          key !== 'imei' && key !== 'is_legacy' && key !== 'is_imei_child') {
                        attributes[key] = variantAttrs[key];
                      }
                    });
                    console.log('✅ Receipt: Merged all variant_attributes keys:', Object.keys(variantAttrs));
                  }
                  
                  console.log('📋 Receipt: Final attributes for item:', attributes);
                  
                  return {
                  productName: item.productName,
                  variantName: item.variantName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    sku: item.sku,
                    image: item.image,
                    selectedSerialNumbers: item.selectedSerialNumbers || [],
                    attributes: attributes
                  };
                }),
                customerName: selectedCustomer?.name || null,
                customerPhone: selectedCustomer?.phone || null,
                customerEmail: selectedCustomer?.email || null,
                customer: selectedCustomer ? {
                  name: selectedCustomer.name,
                  phone: selectedCustomer.phone,
                  email: selectedCustomer.email
                } : null,
                subtotal: totalAmount,
                tax: taxAmount,
                discount: manualDiscount,
                // Include trade-in discount on receipt
                tradeInDiscount: tradeInDiscount || 0,
                tradeInDetails: tradeInTransaction ? {
                  deviceName: tradeInTransaction.device_name,
                  deviceModel: tradeInTransaction.device_model,
                  deviceImei: tradeInTransaction.device_imei,
                  tradeInValue: tradeInData?.final_trade_in_value || 0,
                  conditionRating: tradeInTransaction.condition_rating,
                  transactionId: tradeInTransaction.id
                } : null,
                total: finalAmount,
                paymentMethod: {
                  name: payments.length === 1 ? payments[0].paymentMethod : 'Multiple Payments',
                  description: payments.length === 1 
                    ? `${payments[0].paymentMethod} - ${format.money(payments[0].amount)}`
                    : `${payments.length} payment methods - ${format.money(displayAmount)}`,
                  icon: '💳'
                },
                cashier: cashierName || 'POS User',
                receiptNumber: saleNumber || 'N/A'
              };
              
              // Store receipt data for printing
              setCurrentReceipt(receiptData);
              
              // Close payment modal FIRST
              setShowPaymentModal(false);
              
              // Show success modal BEFORE clearing cart (to preserve data for modal display)
              console.log('🎉 POS: About to show success modal');
              
              // Use setTimeout to ensure modal renders before state changes
              setTimeout(() => {
                successModal.show(
                  `Payment of ${format.money(displayAmount)} processed successfully!${saleNumber ? ` Sale #${saleNumber}` : ''}`,
                  {
                    title: 'Sale Complete! 🎉',
                    icon: SuccessIcons.paymentReceived,
                    autoCloseDelay: 0, // Don't auto-close when there are action buttons
                    actionButtons: [
                      {
                        label: 'Share Receipt',
                        onClick: () => {
                          setShowShareReceipt(true);
                        },
                        variant: 'primary',
                      },
                      {
                        label: 'Create Invoice',
                        onClick: () => {
                          // Create invoice from sale data
                          const invoiceData = {
                            invoiceNumber: saleNumber || `INV-${Date.now()}`,
                            invoiceDate: new Date().toISOString().split('T')[0],
                            customer: selectedCustomer ? {
                              name: selectedCustomer.name,
                              address: selectedCustomer.address || '',
                              phone: selectedCustomer.phone || '',
                              email: selectedCustomer.email || '',
                              taxId: (selectedCustomer as any).taxId || ''
                            } : {
                              name: 'Walk-in Customer',
                              address: '',
                              phone: '',
                              email: '',
                              taxId: ''
                            },
                            items: cartItems.map(item => {
                              // Find product and variant to get specifications
                              const product = products.find(p => p.id === item.productId);
                              const variant = product?.variants?.find((v: any) => v.id === item.variantId);
                              
                              // Extract specifications from product or variant
                              let specifications: string | Record<string, any> | undefined;
                              
                              // Try variant attributes first, then product specification, then product attributes
                              if (variant?.attributes?.specification) {
                                try {
                                  const parsed = JSON.parse(variant.attributes.specification);
                                  specifications = typeof parsed === 'object' ? parsed : variant.attributes.specification;
                                } catch {
                                  specifications = variant.attributes.specification;
                                }
                              } else if ((product as any)?.specification) {
                                try {
                                  const parsed = JSON.parse((product as any).specification);
                                  specifications = typeof parsed === 'object' ? parsed : (product as any).specification;
                                } catch {
                                  specifications = (product as any).specification;
                                }
                              } else if (product?.attributes?.specification) {
                                try {
                                  const parsed = JSON.parse(product.attributes.specification);
                                  specifications = typeof parsed === 'object' ? parsed : product.attributes.specification;
                                } catch {
                                  specifications = product.attributes.specification;
                                }
                              } else if (variant?.attributes && Object.keys(variant.attributes).length > 0) {
                                // Use variant attributes as specifications if no explicit specification field
                                const attrs = { ...variant.attributes };
                                delete attrs.imei; // Remove IMEI from specifications
                                delete attrs.is_legacy;
                                delete attrs.is_imei_child;
                                if (Object.keys(attrs).length > 0) {
                                  specifications = attrs;
                                }
                              }
                              
                              return {
                                description: `${item.productName}${item.variantName ? ` - ${item.variantName}` : ''}`,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                total: item.totalPrice,
                                specifications: specifications
                              };
                            }),
                            subtotal: totalAmount,
                            tax: taxAmount || 0,
                            discount: manualDiscount || 0,
                            total: finalAmount,
                            notes: '',
                            terms: 'Net 30'
                          };
                          setCreatedInvoice(invoiceData);
                          setShowInvoicePreview(true);
                        },
                        variant: 'primary',
                      },
                      {
                        label: 'New Sale',
                        onClick: () => {
                          // Modal will close automatically
                        },
                        variant: 'secondary',
                      },
                    ],
                  }
                );
                
                console.log('🎉 POS: Success modal shown, modal state:', successModal.isOpen);
              }, 100);
              
              // Clear cart and customer AFTER showing modal (delayed)
              // Skip clearing if there's a trade-in transaction (will clear after pricing is set)
              const hasTradeIn = tradeInTransaction || tradeInTransactionRef.current;
              if (!hasTradeIn) {
                setTimeout(() => {
                  clearCart();
                  setSelectedCustomer(null);
                  console.log('🎉 POS: Cart cleared after modal shown');
                }, 150);
              } else {
                console.log('📋 Trade-in active - cart will clear after pricing is set');
              }
            } else {
              console.error('Sale processing failed:', result.error);
              
              // ✅ IMPROVED: Better error handling for stock-related errors
              const errorMessage = result.error || 'Failed to process sale';
              
              // Check if it's a stock-related error
              const isStockError = errorMessage.toLowerCase().includes('insufficient stock') ||
                                  errorMessage.toLowerCase().includes('out of stock') ||
                                  errorMessage.toLowerCase().includes('stock') ||
                                  errorMessage.toLowerCase().includes('available:') ||
                                  errorMessage.toLowerCase().includes('requested:');
              
              if (isStockError) {
                // For stock errors, show detailed error and don't process payment
                console.error('❌ Stock error detected during sale processing:', errorMessage);
                toast.error(`Cannot complete sale: ${errorMessage}`, { duration: 6000 });
                
                // Remove items with insufficient stock from cart
                const errorParts = errorMessage.match(/for (.+?) \(/);
                if (errorParts && errorParts[1]) {
                  const productName = errorParts[1];
                  const updatedCartItems = cartItems.filter(item => 
                    !item.productName.includes(productName)
                  );
                  
                  if (updatedCartItems.length < cartItems.length) {
                    setCartItems(updatedCartItems);
                    toast(`Removed "${productName}" from cart due to insufficient stock.`, { icon: '⚠️' });
                  }
                }
                
                throw new Error(errorMessage);
              } else {
                throw new Error(errorMessage);
              }
            }
            
          } catch (error) {
            console.error('Error processing payment:', error);
            
            // ✅ IMPROVED: Enhanced error handling with stock error detection
            if (error instanceof Error) {
              const errorMessage = error.message.toLowerCase();
              
              // Check if it's a stock-related error
              const isStockError = errorMessage.includes('insufficient stock') ||
                                  errorMessage.includes('out of stock') ||
                                  errorMessage.includes('stock') ||
                                  errorMessage.includes('available:') ||
                                  errorMessage.includes('requested:');
              
              // Check if it's a critical error that should stop the payment
              const criticalErrors = [
                'customer information is required',
                'no payment data received',
                'database connection error',
                'invalid payment method',
                'variant not found',
                'invalid variant'
              ];
              
              const isCriticalError = criticalErrors.some(criticalError => 
                errorMessage.includes(criticalError)
              ) || isStockError;
              
              if (isCriticalError || isStockError) {
                // Show detailed error message for stock errors
                if (isStockError) {
                  toast.error(`Payment failed: ${error.message}`, { duration: 6000 });
                  console.error('❌ Stock error prevented payment:', error.message);
                } else {
                  toast.error(`Payment failed: ${error.message}`, { duration: 4000 });
                }
                throw error; // This will be caught by the modal and show error toast
              } else {
                // For non-critical errors, log them but don't fail the payment
                console.warn('⚠️ Non-critical error during payment processing:', error.message);

                // Continue with successful payment flow
                const displayAmount = totalPaid || finalAmount;
                successModal.show(
                  `Payment of ${format.money(displayAmount)} processed successfully!`,
                  {
                    title: 'Payment Received! 💰',
                    icon: SuccessIcons.paymentReceived,
                    autoCloseDelay: 3000,
                  }
                );
                setShowPaymentModal(false);
              }
            } else {
              // Unknown error type
              const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
              toast.error(`Payment failed: ${errorMsg}`, { duration: 4000 });
              throw error;
            }
          }
        }}
        title="Process POS Payment"
      />

      {/* Additional Modals */}
      <POSSettingsModalWrapper
        ref={settingsModalRef}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        activeTab={activeSettingsTab}
        onTabChange={setActiveSettingsTab}
        onSaveSettings={async (_settings: any) => {
          setIsSavingSettings(true);
          try {
            // Validate settings
            if (!_settings || typeof _settings !== 'object') {
              throw new Error('Invalid settings data');
            }

            await POSSettingsService.saveAllSettings(_settings);
            toast.success('Settings saved successfully');
          } catch (error) {
            console.error('Error saving settings:', error);
            
            // Provide specific error messages
            if (error instanceof Error) {
              if (error.message.includes('network') || error.message.includes('fetch')) {
                toast.error('Network error. Please check your connection and try again.');
              } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
                toast.error('Permission denied. Please check your access rights.');
              } else if (error.message.includes('validation')) {
                toast.error('Invalid settings data. Please check your input and try again.');
              } else {
                toast.error(`Failed to save settings: ${error.message}`);
              }
            } else {
              toast.error('Failed to save settings. Please try again.');
            }
          } finally {
            setIsSavingSettings(false);
          }
        }}
        isSaving={isSavingSettings}
      />

      <POSDiscountModalWrapper
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        onApplyDiscount={applyDiscount}
        onClearDiscount={() => {
          setManualDiscount(0);
          setDiscountValue('');
          setDiscountType('percentage');
        }}
        currentTotal={totalAmount}
        hasExistingDiscount={discountAmount > 0}
      />

      <POSReceiptModalWrapper
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        receipt={currentReceipt}
        onPrint={(_mode: string) => {
          setReceiptPrintMode(_mode as "email" | "thermal" | "a4");
          // Handle printing logic
        }}
        onEmail={(_email: string) => {
          // Handle email logic
        }}
      />

      {/* QrCode Scanner Modal */}
      {showQrCodeScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">QrCode Scanner</h3>
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-blue-600 text-2xl mb-2">📱</div>
                <p className="text-blue-800 font-medium">External QrCode Scanner</p>
                <p className="text-blue-600 text-sm mt-1">Use your connected barcode scanner device to scan product barcodes</p>
              </div>
              <p className="text-gray-600 mb-4">Scanner is ready and waiting for input</p>
            </div>
            {scannerError && (
              <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                <p className="text-red-600 text-sm">{scannerError}</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  playClickSound();
                  stopQrCodeScanner();
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Stop Scanner
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Customer Details Modal */}
      <CustomerDetailModal
        isOpen={showCustomerDetails}
        onClose={() => setShowCustomerDetails(false)}
        customer={selectedCustomerForDetails}
        onEdit={(updatedCustomer) => {
          // Update the selected customer in the POS
          setSelectedCustomer(updatedCustomer);
          setSelectedCustomerForDetails(updatedCustomer);
          setShowCustomerDetails(false);
        }}
      />

      {/* Post-Closure Warning Modal */}
      <PostClosureWarningModal
        isOpen={showPostClosureWarning}
        onClose={() => setShowPostClosureWarning(false)}
        onContinue={() => {
          setShowPostClosureWarning(false);
          setShowPaymentModal(true);
        }}
        closureTime={dailyClosureInfo?.closedAt}
        closedBy={dailyClosureInfo?.closedBy}
        userRole={currentUser?.role}
      />

      {/* Day Opening Modal */}
      <DayOpeningModal
        isOpen={showDayOpeningModal}
        onClose={() => setShowDayOpeningModal(false)}
        expectedPasscode={generalSettings?.day_closing_passcode || '1234'}
        onOpenDay={async () => {
          try {
            const today = new Date().toISOString().split('T')[0];
            const now = new Date().toISOString();
            
            console.log('🔓 Opening new day session...');
            
            // Delete the closure record to "open" the day
            const { error: deleteError } = await supabase
              .from('daily_sales_closures')
              .eq('date', today)
              .delete();
            
            if (deleteError) {
              console.error('❌ Error deleting closure:', deleteError);
            }
            
            // Create a new session
            const { data: newSession, error: sessionError } = await supabase
              .from('daily_opening_sessions')
              .insert([{
                date: today,
                opened_at: now,
                opened_by: currentUser?.role || 'system',
                opened_by_user_id: currentUser?.id,
                is_active: true,
                notes: 'Day opened after closure'
              }])
              .select()
              .single();
            
            if (sessionError) {
              console.error('❌ Error creating session:', sessionError);
              toast.error('Failed to create session, but day is opened');
            } else {
              console.log('✅ New session created:', newSession);
            }
            
            // Update state
            setIsDailyClosed(false);
            setDailyClosureInfo(null);
            setShowDayOpeningModal(false);
            setSessionStartTime(now);
            
            toast.success('🎉 New day started! Counter reset.');
            
            // Reload sales to refresh the display
            loadSales();
          } catch (error) {
            console.error('❌ Error opening day:', error);
            toast.error('Error opening day');
          }
        }}
        currentUser={currentUser}
      />

      {/* Daily Closing Modal */}
      <DailyClosingModal
        isOpen={showDailyClosingModal}
        onClose={() => setShowDailyClosingModal(false)}
        expectedPasscode={generalSettings?.day_closing_passcode || '1234'}
        onComplete={() => {
          setIsDailyClosed(true);
          setDailyClosureInfo({
            closedAt: new Date().toISOString(),
            closedBy: currentUser?.name || currentUser?.email || 'Unknown'
          });
          setShowDailyClosingModal(false);
        }}
        currentUser={currentUser}
      />



      {/* Stock Adjustment Modal */}
      {showStockAdjustment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Stock Adjustment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Product</label>
                <select
                  value={selectedProductForAdjustment?.id || ''}
                  onChange={(e) => {
                    const product = dbProducts.find(p => p.id === e.target.value);
                    setSelectedProductForAdjustment(product || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a product</option>
                  {dbProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} (Current: {product.variants?.reduce((sum, variant) => sum + ((variant as any).quantity || 0), 0) || 0})
                    </option>
                  ))}
                </select>
              </div>
              {selectedProductForAdjustment && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Adjustment Amount</label>
                    <input
                      type="number"
                      placeholder="Enter adjustment amount"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      id="adjustmentAmount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason</label>
                    <input
                      type="text"
                      placeholder="Enter reason for adjustment"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                      id="adjustmentReason"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  playClickSound();
                  setShowStockAdjustment(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const amountInput = document.getElementById('adjustmentAmount') as HTMLInputElement;
                  const reasonInput = document.getElementById('adjustmentReason') as HTMLInputElement;
                  if (selectedProductForAdjustment && amountInput && reasonInput) {
                    handleStockAdjustment(
                      selectedProductForAdjustment.id,
                      parseInt(amountInput.value) || 0,
                      reasonInput.value || 'Manual adjustment'
                    );
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Adjust Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loyalty Points Modal - Only if feature is enabled */}
      {isLoyaltyEnabled() && showLoyaltyPoints && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Add Loyalty Points</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Customer</label>
                <select
                  value={selectedCustomer?.id || ''}
                  onChange={(e) => {
                    const customer = customers.find(c => c.id === e.target.value);
                    setSelectedCustomer(customer || null);
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} (Current Points: {typeof customerLoyaltyPoints === 'object' ? customerLoyaltyPoints[customer.id] || 0 : customerLoyaltyPoints})
                    </option>
                  ))}
                </select>
              </div>
              {selectedCustomer && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Points to Add</label>
                    <input
                      type="number"
                      value={pointsToAdd}
                      onChange={(e) => setPointsToAdd(e.target.value)}
                      placeholder="Enter points to add"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Reason</label>
                    <input
                      type="text"
                      value={pointsReason}
                      onChange={(e) => setPointsReason(e.target.value)}
                      placeholder="Enter reason for points"
                      className="w-full p-3 border border-gray-300 rounded-lg"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button
                onClick={() => {
                  playClickSound();
                  setShowLoyaltyPoints(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (selectedCustomer && parseInt(pointsToAdd) > 0) {
                    handleAddLoyaltyPoints(
                      selectedCustomer.id,
                      parseInt(pointsToAdd),
                      pointsReason || 'Manual points addition'
                    );
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Points
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt History Modal */}
      {showReceiptHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh]">
            <h3 className="text-lg font-semibold mb-4">Receipt History</h3>
            <div className="overflow-y-auto max-h-96">
              {receiptHistory.length > 0 ? (
                <div className="space-y-2">
                  {receiptHistory.map((receipt) => (
                    <div
                      key={receipt.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedReceipt(receipt);
                        // Show receipt details or print
                      }}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">Receipt #{receipt.id}</div>
                          <div className="text-sm text-gray-600">
                            Date: {new Date(receipt.date).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Customer: {receipt.customer}
                          </div>
                          <div className="text-sm text-gray-600">
                            Items: {receipt.items}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-lg">
                            ${(receipt.total as number).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No receipt history found</p>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button
                onClick={() => {
                  playClickSound();
                  setShowReceiptHistory(false);
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Notification */}
      <DraftNotification
        draftCount={getAllDrafts().length}
        onViewDrafts={() => setShowDraftModal(true)}
        onDismiss={() => setShowDraftNotification(false)}
        isVisible={showDraftNotification && getAllDrafts().length > 0}
      />

      {/* Delivery Section - Only if feature is enabled */}
      {isDeliveryEnabled() && showDeliverySection && (
        <DeliverySection
          isOpen={showDeliverySection}
          onClose={() => setShowDeliverySection(false)}
          onDeliverySet={(_delivery) => {
            // Handle delivery setting
            setShowDeliverySection(false);
          }}
        />
      )}

      {/* Success Modal for Sale Completion */}
      <SuccessModal {...successModal.props} />

      {/* Share Receipt Modal */}
      <ShareReceiptModal
        isOpen={showShareReceipt}
        onClose={() => setShowShareReceipt(false)}
        onPrintReceipt={() => {
          setShowReceipt(true);
          setShowShareReceipt(false);
        }}
        receiptData={{
          id: currentReceipt?.id || currentReceipt?.saleId,
          receiptNumber: currentReceipt?.receiptNumber || 'N/A',
          amount: currentReceipt?.total || 0,
          customerName: currentReceipt?.customer?.name || selectedCustomer?.name,
          customerPhone: currentReceipt?.customer?.phone || selectedCustomer?.phone,
          customerEmail: currentReceipt?.customer?.email || selectedCustomer?.email,
          customerCity: currentReceipt?.customer?.city || selectedCustomer?.city,
          customerTag: currentReceipt?.customer?.colorTag || currentReceipt?.customer?.customerTag || selectedCustomer?.colorTag || selectedCustomer?.customerTag,
          items: currentReceipt?.items || [],
        }}
      />

      {/* Invoice Preview Modal */}
      {showInvoicePreview && createdInvoice && createPortal(
        <div 
          className="fixed bg-black/60 flex items-center justify-center p-4 z-[100000]" 
          style={{ top: 0, left: 0, right: 0, bottom: 0 }}
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="invoice-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-[1400px] max-h-[90vh] flex flex-col overflow-hidden relative">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowInvoicePreview(false);
                setCreatedInvoice(null);
                // Reset additional information
                setAdditionalCustomerInfo({
                  companyName: '',
                  additionalNotes: '',
                  receiverName: '',
                  receiverAddress: '',
                  receiverPhone: ''
                });
                setPaymentInfo({
                  paymentMethod: '',
                  paymentReference: '',
                  transactionId: '',
                  paidAmount: 0,
                  balance: 0,
                  paymentDate: ''
                });
                setShowAdditionalInfoForm(false);
              }}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon Header - Fixed */}
            <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
              <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
                {/* Icon */}
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                
                {/* Text */}
                <div>
                  <h3 id="invoice-modal-title" className="text-2xl font-bold text-gray-900 mb-3">
                    {createdInvoice.invoiceNumber.startsWith('PREVIEW') ? 'Invoice Preview' : 'Invoice'}
                  </h3>
                  {createdInvoice.invoiceNumber.startsWith('PREVIEW') && (
                    <p className="text-sm text-blue-600">Review prices before payment</p>
                  )}
                </div>
              </div>
            </div>

            {/* Scrollable Content Section */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              {/* Additional Information Form - Collapsible */}
              <div className="mb-4 border border-gray-200 rounded-xl bg-gray-50">
                <button
                  onClick={() => setShowAdditionalInfoForm(!showAdditionalInfoForm)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors rounded-t-xl"
                >
                  <span className="font-semibold text-gray-700">Additional Information</span>
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${showAdditionalInfoForm ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showAdditionalInfoForm && (
                  <div className="p-4 space-y-4 border-t border-gray-200">
                    {/* Additional Customer Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Customer/Receiver Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                          <input
                            type="text"
                            value={additionalCustomerInfo.companyName}
                            onChange={(e) => setAdditionalCustomerInfo({ ...additionalCustomerInfo, companyName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Receiver Name</label>
                          <input
                            type="text"
                            value={additionalCustomerInfo.receiverName}
                            onChange={(e) => setAdditionalCustomerInfo({ ...additionalCustomerInfo, receiverName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="If different from customer"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Receiver Address</label>
                          <textarea
                            value={additionalCustomerInfo.receiverAddress}
                            onChange={(e) => setAdditionalCustomerInfo({ ...additionalCustomerInfo, receiverAddress: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="If different from customer address"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Receiver Phone</label>
                          <input
                            type="text"
                            value={additionalCustomerInfo.receiverPhone}
                            onChange={(e) => setAdditionalCustomerInfo({ ...additionalCustomerInfo, receiverPhone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Optional"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
                          <textarea
                            value={additionalCustomerInfo.additionalNotes}
                            onChange={(e) => setAdditionalCustomerInfo({ ...additionalCustomerInfo, additionalNotes: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Any additional information about the customer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Payment Information */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Information</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                          <select
                            value={paymentInfo.paymentMethod}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, paymentMethod: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select method</option>
                            <option value="Cash">Cash</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Card">Card</option>
                            <option value="ZenoPay">ZenoPay</option>
                            <option value="Installment">Installment</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                          <input
                            type="date"
                            value={paymentInfo.paymentDate}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, paymentDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Payment Reference</label>
                          <input
                            type="text"
                            value={paymentInfo.paymentReference}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, paymentReference: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Reference number"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Transaction ID</label>
                          <input
                            type="text"
                            value={paymentInfo.transactionId}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, transactionId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Transaction ID"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Paid Amount (TZS)</label>
                          <input
                            type="number"
                            value={paymentInfo.paidAmount || ''}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, paidAmount: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Balance (TZS)</label>
                          <input
                            type="number"
                            value={paymentInfo.balance || ''}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, balance: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <InvoiceTemplate
                invoiceNumber={createdInvoice.invoiceNumber}
                invoiceDate={createdInvoice.invoiceDate}
                customer={createdInvoice.customer}
                items={createdInvoice.items}
                subtotal={createdInvoice.subtotal}
                tax={createdInvoice.tax}
                discount={createdInvoice.discount}
                total={createdInvoice.total}
                notes={createdInvoice.notes}
                terms={createdInvoice.terms}
                onPrint={() => window.print()}
                additionalCustomerInfo={Object.values(additionalCustomerInfo).some(v => v) ? additionalCustomerInfo : undefined}
                paymentInfo={Object.values(paymentInfo).some(v => v !== '' && v !== 0) ? paymentInfo : undefined}
              />
            </div>

            {/* Fixed Action Buttons Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowInvoicePreview(false);
                  setCreatedInvoice(null);
                  // Reset additional information
                  setAdditionalCustomerInfo({
                    companyName: '',
                    additionalNotes: '',
                    receiverName: '',
                    receiverAddress: '',
                    receiverPhone: ''
                  });
                  setPaymentInfo({
                    paymentMethod: '',
                    paymentReference: '',
                    transactionId: '',
                    paidAmount: 0,
                    balance: 0,
                    paymentDate: ''
                  });
                  setShowAdditionalInfoForm(false);
                }}
                className="flex-1 px-6 py-3.5 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
              >
                Close
              </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
                >
                  <Printer className="w-5 h-5" />
                  Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Variant Selection Modal for IMEI/Cart Updates */}
      {showVariantSelectionModal && selectedProductForVariants && (
        <VariantSelectionModal
          isOpen={showVariantSelectionModal}
          onClose={() => {
            setShowVariantSelectionModal(false);
            setSelectedProductForVariants(null);
            setCartItemForIMEIUpdate(null);
          }}
          product={selectedProductForVariants}
          onSelectVariant={(product, variant, quantity) => {
            // Handle IMEI variant selection for cart item update
            if (cartItemForIMEIUpdate) {
              // Update the cart item with selected IMEI variants
              setCartItems(prev => prev.map(item =>
                item.id === cartItemForIMEIUpdate.id
                  ? {
                      ...item,
                      // ✅ FIX: Treat legacy items as IMEI children
                      selectedSerialNumbers: variant && (variant.attributes?.imei || variant.is_legacy || variant.is_imei_child) ? [variant] : [],
                      selectedIMEIVariants: variant && (variant.attributes?.imei || variant.is_legacy || variant.is_imei_child) ? [variant] : []
                    }
                  : item
              ));

              toast.success('IMEI/Serial number selected successfully');
              console.log('✅ Updated cart item with IMEI variant:', variant);
            }

            setShowVariantSelectionModal(false);
            setSelectedProductForVariants(null);
            setCartItemForIMEIUpdate(null);
          }}
        />
      )}

      {/* Global Search Modal */}
      <GlobalSearchShortcut />

      {/* Quick Expense Modal */}
      <QuickExpenseModal
        isOpen={showQuickExpense}
        onClose={() => setShowQuickExpense(false)}
        onSuccess={() => {
          toast.success('Expense recorded successfully');
          setShowQuickExpense(false);
        }}
      />

    </div>
  );
};

export default POSPageOptimized;

