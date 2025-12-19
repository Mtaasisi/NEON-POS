import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, X, ArrowLeft, Settings, Scan, RefreshCw, Filter, ChevronDown, ChevronUp, Check, Truck } from 'lucide-react';

// Safe imports with dynamic loading
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useInventoryStore } from '../../lats/stores/useInventoryStore';
import { saleProcessingService } from '../../../lib/saleProcessingService';
import { deliveryService } from '../../../services/deliveryService';
import { format } from '../../lats/lib/format';
import toast, { Toaster } from 'react-hot-toast';
import { useMobileBranch } from '../../mobile/hooks/useMobileBranch';
import { supabase } from '../../../lib/supabaseClient';
import { useScreenInfo } from '../../../hooks/useResponsiveSize';
import { useTabletSizes } from '../../../hooks/useTabletSizes';

// Component imports with error boundaries
import TabletProductGrid from '../components/TabletProductGrid';
import TabletCartSidebar from '../components/TabletCartSidebar';
import TabletCustomerSection from '../components/TabletCustomerSection';
import TabletPaymentModal from '../components/TabletPaymentModal';
import TabletVariantSelectionModal from '../components/TabletVariantSelectionModal';
import TabletAddCustomerModal from '../components/TabletAddCustomerModal';
import TabletCustomerSelectionModal from '../components/TabletCustomerSelectionModal';
import ShareReceiptModal from '../../../components/ui/ShareReceiptModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';
import BarcodeScanner from '../../devices/components/BarcodeScanner';
import TabletSettingsModal from '../components/TabletSettingsModal';
import ProgressIndicator from '../../../components/ui/ProgressIndicator';

import DeliveryManagementPage from '../../../features/admin/pages/DeliveryManagementPage';

// Advanced POS hooks and services (optional - will be null if not available)
let useLoadingJob, latsEventBus, useUnifiedSearch, useDraftManager, usePOSClickSounds;
let SalesAnalyticsModal, AddExternalProductModal, AddProductModal, InvoiceTemplate, DraftManagementModal;

useLoadingJob = null; // Temporarily disabled due to require() issues

latsEventBus = null; // Temporarily disabled due to require() issues
useUnifiedSearch = null; // Temporarily disabled due to require() issues
useDraftManager = null; // Temporarily disabled due to require() issues
usePOSClickSounds = null; // Temporarily disabled due to require() issues
SalesAnalyticsModal = null; // Temporarily disabled due to require() issues
AddExternalProductModal = null; // Temporarily disabled due to require() issues
AddProductModal = null; // Temporarily disabled due to require() issues
InvoiceTemplate = null; // Temporarily disabled due to require() issues
DraftManagementModal = null; // Temporarily disabled due to require() issues

interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  availableQuantity: number;
  image?: string;
}

interface SaleData {
  id: string;
  saleNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  items: Array<{
    id: string;
    productId: string;
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    costPrice: number;
    profit: number;
  }>;
  subtotal: number;
  tax: number;
  discount: number;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  total: number;
  paymentMethod: {
    type: string;
    details: any;
    amount: number;
  };
  paymentStatus: 'pending' | 'completed' | 'failed';
  soldBy: string;
  soldAt: string;
  notes?: string;
}

// Fallback component for when hooks fail
const TabletPOSFallback: React.FC = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-50 items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Tablet POS Unavailable</h2>
        <p className="text-gray-600 mb-4">
          Some required components could not be loaded. Please check the browser console for details and try refreshing the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
};

const TabletPOS: React.FC = () => {
  const navigate = useNavigate();

  let screenInfo = { width: 1024, height: 768, deviceCategory: 'tablet' };
  try {
    screenInfo = useScreenInfo();
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useScreenInfo failed:', error);
  }

  // Check if it's a production environment AND a tablet device
  const isProduction = process.env.NODE_ENV === 'production';
  const isTabletOrIpad = screenInfo.deviceCategory === 'tablet';


  // Safe hook calls with fallbacks
  let currentUser, currentBranch, availableBranches, switchBranch, customers, refreshCustomers, dbProducts, loadProducts;
  let successModal;

  try {
    ({ currentUser } = useAuth());
  } catch (error) {
    console.error('❌ [TabletPOS] useAuth failed:', error);
    return <TabletPOSFallback />;
  }

  try {
    ({ currentBranch, availableBranches, switchBranch } = useMobileBranch());
  } catch (error) {
    console.error('❌ [TabletPOS] useMobileBranch failed:', error);
    return <TabletPOSFallback />;
  }

  try {
    ({ customers, refreshCustomers } = useCustomers());
  } catch (error) {
    console.error('❌ [TabletPOS] useCustomers failed:', error);
    return <TabletPOSFallback />;
  }

  try {
    ({ products: dbProducts, loadProducts } = useInventoryStore());
  } catch (error) {
    console.error('❌ [TabletPOS] useInventoryStore failed:', error);
    return <TabletPOSFallback />;
  }

  try {
    successModal = useSuccessModal();
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useSuccessModal failed:', error);
  }

  // Advanced POS hooks and services with fallbacks
  try {
    if (useLoadingJob) useLoadingJob();
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useLoadingJob failed:', error);
  }

  try {
    if (useUnifiedSearch) useUnifiedSearch();
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useUnifiedSearch failed:', error);
  }

  let playSuccessSound;
  try {
    if (usePOSClickSounds) ({ playSuccessSound } = usePOSClickSounds());
  } catch (error) {
    console.warn('⚠️ [TabletPOS] usePOSClickSounds failed:', error);
  }

  // Tablet-specific responsive sizing with fallbacks
  let sizes = { scale: 1, spacing4: 16, spacing6: 24, iconSize: 20, textSm: 14, textLg: 16, textXl: 20 };

  try {
    sizes = useTabletSizes();
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useTabletSizes failed:', error);
  }

  try {
    screenInfo = useScreenInfo();
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useScreenInfo failed:', error);
  }

  // Debug: Log screen dimensions on mount
  useEffect(() => {
    console.log('📱 [TabletPOS] Screen Info:', {
      width: screenInfo.width,
      height: screenInfo.height,
      deviceCategory: screenInfo.deviceCategory,
      scale: sizes.scale,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    });
  }, [screenInfo.width, screenInfo.deviceCategory]);

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartItems] = useState<any[]>([]); // For draft manager compatibility
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [requireConfirm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBranchSelector, setShowBranchSelector] = useState(false);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [stockStatusFilter, setStockStatusFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(true);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);

  // Additional state for advanced features (matching main POS)
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<SaleData | null>(null);
  const [deliveryData, setDeliveryData] = useState<any>(null);

  // Modal states for advanced features (matching main POS)
  const [showSalesAnalyticsModal, setShowSalesAnalyticsModal] = useState(false);
  const [showAddExternalProductModal, setShowAddExternalProductModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showDraftManagementModal, setShowDraftManagementModal] = useState(false);
  const [showDeliveryManagement, setShowDeliveryManagement] = useState(false);
  const [showDeliveryChoiceModal, setShowDeliveryChoiceModal] = useState(false);
  const [completedSaleData, setCompletedSaleData] = useState<any>(null);

  // Draft manager hook (optional)
  let loadDraft;
  try {
    if (useDraftManager) {
      ({ loadDraft } = useDraftManager({
        cartItems,
        customer: selectedCustomer,
        notes
      }));
    }
  } catch (error) {
    console.warn('⚠️ [TabletPOS] useDraftManager failed:', error);
  }

  const TAX_RATE = 18;

  // Safe product loading with error handling
  useEffect(() => {
    const fetchInitialProducts = async () => {
      if (!dbProducts || dbProducts.length === 0) {
        console.log('📦 [TabletPOS] No products in store, loading...');
        try {
          if (loadProducts) {
            await loadProducts({ page: 1, limit: 500 });
            console.log('✅ [TabletPOS] Initial products loaded successfully.');
          }
        } catch (error) {
          console.error('❌ [TabletPOS] Error loading initial products:', error);
          toast.error('Failed to load products. Please refresh.');
        }
      } else {
        console.log(`✅ [TabletPOS] Using ${dbProducts.length} preloaded products`);
      }
    };

    if (dbProducts !== undefined) {
      fetchInitialProducts();
    }
  }, [dbProducts, loadProducts]);

  // Require customer selection on component mount
  useEffect(() => {
    if (!selectedCustomer) {
      setShowCustomerModal(true);
    }
  }, [selectedCustomer]);

  // Load product images
  useEffect(() => {
    const fetchProductImages = async () => {
      if (!dbProducts || dbProducts.length === 0) return;

      const productIds = dbProducts.map(p => p.id);

      try {
        if (supabase) {
          const { data: images, error } = await supabase
            .from('product_images')
            .select('product_id, image_url, is_primary')
            .in('product_id', productIds)
            .eq('is_primary', true);

          if (error) throw error;

          if (images && images.length > 0) {
            const imageMap = images.reduce((acc: Record<string, string>, img: { product_id: string; image_url: string; is_primary: boolean }) => {
              acc[img.product_id] = img.image_url;
              return acc;
            }, {} as Record<string, string>);

            setProductImages(imageMap);
            console.log('✅ [TabletPOS] Loaded', images.length, 'product images');
          }
        }
      } catch (error: any) {
        console.error('❌ [TabletPOS] Error loading product images:', error);
      }
    };

    if (dbProducts && dbProducts.length > 0) {
      fetchProductImages();
    }
  }, [dbProducts]);

  // Event bus subscriptions for real-time updates (optional)
  useEffect(() => {
    if (!latsEventBus) return;

    const handleStockUpdate = (data: any) => {
      console.log('📦 [TabletPOS] Stock updated:', data);
      // Refresh products if needed
      if (dbProducts && dbProducts.length === 0 && loadProducts) {
        loadProducts({ page: 1, limit: 500 });
      }
    };

    const handleSaleCompleted = (data: any) => {
      console.log('✅ [TabletPOS] Sale completed:', data);
      // Could show a notification or update local state
      if (playSuccessSound) playSuccessSound();
    };

    let unsubscribeStock, unsubscribeSale;
    try {
      unsubscribeStock = latsEventBus.subscribe('lats:stock.updated', handleStockUpdate);
      unsubscribeSale = latsEventBus.subscribe('lats:sale.completed', handleSaleCompleted);
    } catch (error) {
      console.warn('⚠️ [TabletPOS] Event bus subscription failed:', error);
    }

    return () => {
      if (unsubscribeStock) unsubscribeStock();
      if (unsubscribeSale) unsubscribeSale();
    };
  }, [dbProducts, loadProducts, playSuccessSound]);

  // Extract filter options from products
  const filterOptions = useMemo(() => {
    if (!dbProducts) return { categories: [], suppliers: [], statuses: [] };

    const categories = new Set<string>();
    const suppliers = new Set<string>();
    const statuses = new Set<string>();

    dbProducts.forEach(product => {
      if (product.category?.name) {
        categories.add(product.category.name);
      }
      if (product.supplier?.name) {
        suppliers.add(product.supplier.name);
      }
      if (product.status) {
        statuses.add(product.status);
      }
    });

    return {
      categories: Array.from(categories).sort(),
      suppliers: Array.from(suppliers).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [dbProducts]);

  // Clear all filters
  const clearAllFilters = () => {
    setCategoryFilter([]);
    setStockStatusFilter([]);
    setStatusFilter([]);
    setSupplierFilter([]);
    setMinPrice('');
    setMaxPrice('');
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!dbProducts) return [];

    return dbProducts.filter(product => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          product.barcode?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter.length > 0) {
        if (!product.category?.name || !categoryFilter.includes(product.category.name)) {
          return false;
        }
      }

      // Supplier filter
      if (supplierFilter.length > 0) {
        if (!product.supplier?.name || !supplierFilter.includes(product.supplier.name)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter.length > 0) {
        if (!product.status || !statusFilter.includes(product.status)) {
          return false;
        }
      }

      // Price range filter
      const minPriceNum = minPrice ? parseFloat(minPrice) : null;
      const maxPriceNum = maxPrice ? parseFloat(maxPrice) : null;

      if (minPriceNum !== null && product.price < minPriceNum) {
        return false;
      }
      if (maxPriceNum !== null && product.price > maxPriceNum) {
        return false;
      }

      // Stock status filter
      if (stockStatusFilter.length > 0) {
        const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.stockQuantity || 0), 0) || 0;
        const minStock = product.minStockLevel || 0;

        let stockStatus = 'in-stock';
        if (totalStock === 0) {
          stockStatus = 'out-of-stock';
        } else if (totalStock <= minStock) {
          stockStatus = 'low-stock';
        }

        if (!stockStatusFilter.includes(stockStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [dbProducts, searchQuery, categoryFilter, supplierFilter, statusFilter, minPrice, maxPrice, stockStatusFilter]);

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = discountType === 'percentage'
    ? (cartSubtotal * discount) / 100
    : Math.min(discount, cartSubtotal);
  const subtotalAfterDiscount = cartSubtotal - discountAmount;
  const cartTax = (subtotalAfterDiscount * TAX_RATE) / 100;
  const deliveryFee = deliveryData?.fee || 0;
  const cartTotal = subtotalAfterDiscount + cartTax + deliveryFee;

  // Add to cart
  const handleAddToCart = (product: any) => {
    if (!product.variants || product.variants.length === 0) {
      toast.error('Product has no variants available');
      return;
    }

    const hasMultipleVariants = product.variants.length > 1;
    const hasParentVariant = product.variants.some((v: any) =>
      v.variant_type === 'parent' || v.is_parent === true
    );

    if (hasMultipleVariants || hasParentVariant) {
      setSelectedProductForVariants(product);
      setShowVariantModal(true);
      return;
    }

    const variant = product.variants[0];
    addVariantToCart(product, variant);
  };

  const resolvePrice = (variant: any, product: any) => {
    const raw =
      variant?.selling_price ??
      variant?.sellingPrice ??
      variant?.price ??
      variant?.unit_price ??
      product?.price ??
      product?.selling_price ??
      0;
    return Number(raw) || 0;
  };

  const resolveAvailableQty = (variant: any) =>
    variant?.stock_quantity ?? variant?.quantity ?? 0;

  const addVariantToCart = (product: any, variant: any) => {
    if (!variant) {
      toast.error('Invalid variant');
      return;
    }

    const existingItem = cart.find(item => item.variantId === variant.id);
    const unitPrice = resolvePrice(variant, product);
    const availableQuantity = resolveAvailableQty(variant);

    if (existingItem) {
      if (existingItem.quantity >= availableQuantity) {
        toast.error('Not enough stock available');
        return;
      }
      setCart(cart.map(item =>
        item.variantId === variant.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
      toast.success('Quantity updated');
    } else {
      if (availableQuantity <= 0) {
        toast.error('Out of stock');
        return;
      }

      const newItem: CartItem = {
        id: `${product.id}-${variant.id}`,
        productId: product.id,
        variantId: variant.id,
        productName: product.name || 'Unknown Product',
        variantName: variant.variant_name || variant.name || 'Default',
        sku: variant.sku || product.sku || '',
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        availableQuantity,
        image: productImages[product.id] || product.image_url
      };

      console.log('🛒 [TabletPOS] Adding item to cart:', {
        productName: newItem.productName,
        variantName: newItem.variantName,
        unitPrice: newItem.unitPrice
      });
      setCart([...cart, newItem]);
      toast.success('Added to cart');
    }
  };

  const handleVariantSelected = (variant: any) => {
    if (selectedProductForVariants) {
      addVariantToCart(selectedProductForVariants, variant);
    }
  };

  const handleQuickAdd = (skuOrBarcodeRaw?: string) => {
    const skuOrBarcode = (skuOrBarcodeRaw ?? quickSku).trim().toLowerCase();
    if (!skuOrBarcode) {
      toast.error('Enter a SKU or barcode');
      return;
    }

    let matchedProduct: any | undefined;
    let matchedVariant: any | undefined;

    if (dbProducts) {
      for (const product of dbProducts) {
        const productMatches =
          product?.sku?.toLowerCase() === skuOrBarcode ||
          product?.barcode?.toLowerCase() === skuOrBarcode;

        const variantMatch = product?.variants?.find((variant: any) =>
          variant?.sku?.toLowerCase() === skuOrBarcode ||
          variant?.barcode?.toLowerCase() === skuOrBarcode
        );

        if (variantMatch) {
          matchedProduct = product;
          matchedVariant = variantMatch;
          break;
        }

        if (productMatches) {
          matchedProduct = product;
          if (product?.variants?.length === 1) {
            matchedVariant = product.variants[0];
          }
          break;
        }
      }
    }

    if (matchedProduct && matchedVariant) {
      addVariantToCart(matchedProduct, matchedVariant);
      setQuickSku('');
      return;
    }

    if (matchedProduct) {
      setSelectedProductForVariants(matchedProduct);
      setShowVariantModal(true);
      toast.success('Select a variant to add');
      return;
    }

    toast.error('No product found for that SKU/barcode');
  };

  // Simple scan button flow: request camera permission on user gesture, then open scanner
  const handleScanClick = async () => {
    const typed = searchQuery?.trim();
    if (!window.isSecureContext) {
      toast.error('Camera requires HTTPS or localhost');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error('Camera not supported in this browser');
      return;
    }
    try {
      // Ask for permission up front (must be user gesture)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
      if (typed) {
        setQuickSku(typed);
        handleQuickAdd(typed);
      }
      setShowScanner(true);
    } catch (err) {
      console.error('Camera permission denied or unavailable', err);
      toast.error('Please allow camera access to scan');
    }
  };

  const handleScanResult = (value: string) => {
    if (!value) return;
    setQuickSku(value);
    handleQuickAdd(value);
    setShowScanner(false);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = Math.max(0, Math.min(item.quantity + delta, item.availableQuantity));
        if (newQuantity === 0) return null;
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice
        };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType('percentage');
    setNotes('');
    setDeliveryData(null);
  };

  const handlePaymentComplete = async (payments: any[], totalPaid: number) => {
    try {
      if (requireConfirm) {
        const ok = window.confirm('Confirm payment and complete sale?');
        if (!ok) return;
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d8d2b7c-213f-4a7f-865b-550e576368e7', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          location: 'TabletPOS.tsx:747',
          message: 'Payment completion started',
          data: {
            items: cart.length,
            total: cartTotal,
            payments: payments.length,
            hasDelivery: !!deliveryData,
            deliveryValidated: deliveryData?.validated,
            deliveryData: deliveryData
          },
          sessionId: 'debug-session',
          hypothesisId: 'F,G,H'
        })
      }).catch(() => {});
      // #endregion

      if (!selectedCustomer) {
        toast.error('Please select a customer');
        return;
      }

      // Note: Deliveries are now created separately after sales are completed

      console.log('🔄 [TabletPOS] Processing sale (deliveries created separately):', {
        items: cart.length,
        total: cartTotal
      });

      const saleData = {
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone,
        items: cart.map(item => ({
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
        })),
        subtotal: cartSubtotal,
        tax: cartTax,
        discount: discountAmount,
        discountType: discountType,
        discountValue: discount,
        total: cartTotal,
        paymentMethod: {
          type: payments.length === 1 ? payments[0].paymentMethod : 'multiple',
          details: {
            payments: payments.map((payment: any) => ({
              method: payment.paymentMethod,
              amount: payment.amount,
              accountId: payment.paymentAccountId || null,
              reference: payment.reference || '',
              notes: '',
              timestamp: payment.timestamp || new Date().toISOString()
            })),
            totalPaid: totalPaid
          },
          amount: totalPaid
        },
        paymentStatus: 'completed' as const,
        soldBy: currentUser?.email || 'Tablet POS User',
        soldAt: new Date().toISOString(),
        notes: notes || `Tablet POS Sale - Branch: ${currentBranch?.name || 'Unknown'}`
      };

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/4d8d2b7c-213f-4a7f-865b-550e576368e7', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          location: 'TabletPOS.tsx:804',
          message: 'Sale data prepared',
          data: {
            hasItems: saleData.items.length > 0,
            hasDelivery: !!saleData.delivery,
            deliveryMethod: saleData.delivery?.deliveryMethod,
            totalAmount: saleData.total,
            saleDataDelivery: saleData.delivery
          },
          sessionId: 'debug-session',
          hypothesisId: 'F,G'
        })
      }).catch(() => {});
      // #endregion

      console.log('📤 [TabletPOS] Sending sale data:', saleData);

      if (saleProcessingService) {
        console.log('💰 [TabletPOS] Sending sale data to processing service:', {
          itemCount: saleData.items.length,
          totalAmount: saleData.total,
          hasDelivery: !!saleData.delivery,
          deliveryMethod: saleData.delivery?.deliveryMethod,
          customerId: saleData.customerId
        });

        const result = await saleProcessingService.processSale(saleData);

        if (!result.success) {
          console.error('❌ [TabletPOS] Sale processing failed:', result.error);
          throw new Error(result.error || 'Failed to process sale');
        }

        console.log('✅ [TabletPOS] Sale processed successfully:', {
          saleId: result.saleId,
          deliveryCreated: !!result.sale?.delivery?.deliveryId,
          trackingNumber: result.sale?.delivery?.trackingNumber
        });

        console.log('✅ [TabletPOS] Sale processed successfully:', result);

        if (result.sale) {
          setCreatedInvoice(result.sale);
          setCompletedSaleData(result.sale);
        }
        setShowPaymentModal(false);

        if (successModal) {
          successModal.show(`Sale of ${format ? format.currency(cartTotal) : cartTotal} completed successfully`, {
            title: 'Sale Completed!',
            icon: SuccessIcons ? SuccessIcons.saleCompleted : '✅',
            actionButtons: [
              {
                label: 'View Receipt',
                onClick: () => setShowShareReceipt(true),
                variant: 'primary'
              },
              {
                label: 'Share/Print',
                onClick: () => setShowShareReceipt(true),
                variant: 'secondary'
              },
              {
                label: 'New Sale',
                onClick: () => {
                  setCart([]);
                  setSelectedCustomer(null);
                },
                variant: 'secondary'
              }
            ]
          });
        }

        setCart([]);
        setSelectedCustomer(null);

        // Show delivery choice modal after sale completion
        setTimeout(() => {
          setShowDeliveryChoiceModal(true);
        }, 1000); // Small delay to let success modal appear first
      }

    } catch (error: any) {
      console.error('❌ [TabletPOS] Sale processing error:', error);
      toast.error(error.message || 'Failed to process sale');
    }
  };

  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      toast.error('Add items to cart first');
      return;
    }
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      setShowCustomerModal(true);
      return;
    }
    setShowPaymentModal(true);
  };

  const handleBranchSwitch = async (branchId: string) => {
    setShowBranchSelector(false);

    // Clear all product caches before switching branches
    console.log('🧹 [TabletPOS] Clearing product caches before branch switch...');
    try {
      // Clear localStorage product cache
      const { productCacheService } = await import('../../../lib/productCacheService');
      if (productCacheService) {
        productCacheService.clearProducts();
        console.log('✅ [TabletPOS] localStorage cache cleared');
      }

      // Clear query cache for products
      const { invalidateCachePattern } = await import('../../../lib/queryCache');
      if (invalidateCachePattern) {
        invalidateCachePattern('products:*');
        console.log('✅ [TabletPOS] Query cache cleared');
      }

      // Clear enhanced cache
      const { smartCache } = await import('../../../lib/enhancedCacheManager');
      if (smartCache) {
        await smartCache.invalidateCache('products');
        console.log('✅ [TabletPOS] Enhanced cache cleared');
      }
    } catch (error) {
      console.warn('⚠️ [TabletPOS] Failed to clear some caches:', error);
    }

    // Switch branch (this will reload the page)
    if (switchBranch) {
      await switchBranch(branchId);
    }
  };

  // Safe refresh function with error handling
  const handleRefreshProducts = async () => {
    if (isRefreshing || !loadProducts) return;

    setIsRefreshing(true);
    console.log('🔄 [TabletPOS] Clearing products cache and reloading from database...');

    try {
      // Clear all caches and force reload products from database
      try {
        await loadProducts({ page: 1, limit: 500 }, true);
        console.log('✅ [TabletPOS] Products reloaded successfully.');
      } catch (error) {
        console.error('❌ [TabletPOS] Error reloading products:', error);
        toast.error('Failed to reload products. Please refresh.');
      }

      // Re-fetch product images for the newly loaded products
      if (dbProducts && dbProducts.length > 0 && supabase) {
        const productIds = dbProducts.map(p => p.id);

        const { data: images, error } = await supabase
          .from('product_images')
          .select('product_id, image_url, is_primary')
          .in('product_id', productIds)
          .eq('is_primary', true);

        if (!error && images) {
          const imageMap = images.reduce((acc: Record<string, string>, img: { product_id: string; image_url: string; is_primary: boolean }) => {
            acc[img.product_id] = img.image_url;
            return acc;
          }, {} as Record<string, string>);

          setProductImages(imageMap);
          console.log('✅ [TabletPOS] Refreshed', images.length, 'product images');
        }
      }

      // Success toast
      toast.success('Products cache cleared and reloaded from database', {
        duration: 3000,
        style: {
          background: '#f0fdf4',
          color: '#166534',
          border: '1px solid #bbf7d0',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#166534',
          secondary: '#f0fdf4',
        },
      });
    } catch (error) {
      console.error('❌ [TabletPOS] Error clearing cache and reloading products:', error);

      // Error toast
      toast.error('Failed to clear cache and reload products', {
        duration: 4000,
        style: {
          background: '#fef2f2',
          color: '#dc2626',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
        },
        iconTheme: {
          primary: '#dc2626',
          secondary: '#fef2f2',
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Tablet Header */}
      <div
        className="bg-white border-b border-gray-200 shadow-sm"
        style={{
          paddingLeft: `${sizes.spacing6}px`,
          paddingRight: `${sizes.spacing6}px`,
          paddingTop: `${sizes.spacing4}px`,
          paddingBottom: `${sizes.spacing4}px`
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/mobile/dashboard')}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ArrowLeft size={sizes.iconSize} className="text-gray-600" />
            </button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 style={{ fontSize: `${sizes.textXl}px` }} className="font-bold text-gray-900">
                  Tablet POS
                </h1>
                {(() => {
                  const canSwitchBranches = currentUser?.role === 'admin' ||
                    currentUser?.permissions?.includes('all') ||
                    currentUser?.permissions?.includes('manage_branches') ||
                    currentUser?.permissions?.includes('switch_branches');

                  return canSwitchBranches ? (
                    <button
                      onClick={() => setShowBranchSelector(true)}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-semibold rounded-full transition-colors flex items-center gap-2"
                      title="Switch Branch"
                    >
                      <span>{currentBranch?.name || 'Branch'}</span>
                      <ChevronDown size={14} />
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                      {currentBranch?.name || 'Branch'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Analytics Button */}
            {SalesAnalyticsModal && (
              <button
                onClick={() => setShowSalesAnalyticsModal(true)}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Sales Analytics"
              >
                <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-600">📊</span>
                </div>
              </button>
            )}


            {/* Drafts Button */}
            {DraftManagementModal && (
              <button
                onClick={() => setShowDraftManagementModal(true)}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
                title="Drafts"
              >
                <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
                  <span className="text-xs">📝</span>
                </div>
              </button>
            )}

            {/* Delivery Management Button */}
            <button
              onClick={() => setShowDeliveryManagement(true)}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Delivery Management"
            >
              <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
                <span className="text-xs">🚚</span>
              </div>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefreshProducts}
              disabled={isRefreshing}
              className={`p-2 rounded-full transition-all ${
                isRefreshing
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-gray-100 active:scale-95'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
              title={isRefreshing ? 'Refreshing...' : 'Refresh Products'}
            >
              <div className="transition-all duration-200 ease-in-out">
                {isRefreshing ? (
                  ProgressIndicator ? <ProgressIndicator size="sm" color="#64748b" /> : <RefreshCw size={sizes.iconSize} className="text-gray-400 animate-spin" />
                ) : (
                  <RefreshCw size={sizes.iconSize} className="text-gray-600" />
                )}
              </div>
            </button>
            <button
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={() => setShowSettings(true)}
            >
              <Settings size={sizes.iconSize} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0" style={{ overscrollBehavior: 'contain' }}>
        {/* Left Column - Products */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Search Bar + Quick Add */}
          <div
            className="border-b border-gray-200 bg-white"
            style={{ padding: `${sizes.spacing4}px ${sizes.spacing6}px` }}
          >
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={sizes.iconSize} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const value = (e.currentTarget.value || '').trim();
                      if (value) {
                        setQuickSku(value);
                        handleQuickAdd(value);
                      }
                    }
                  }}
                  className="w-full pl-12 pr-32 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontSize: `${sizes.textLg}px` }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                  >
                    <X size={sizes.iconSize} className="text-gray-400" />
                  </button>
                )}
                {AddExternalProductModal && (
                  <button
                    onClick={() => setShowAddExternalProductModal(true)}
                    className="absolute right-20 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white rounded-full text-sm font-semibold shadow-sm transition-colors"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    + Add
                  </button>
                )}
                <button
                  onClick={handleScanClick}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-full text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Scan size={sizes.iconSize} className="text-white" />
                  <span>Scan barcode</span>
                </button>
              </div>

              {AddProductModal && (
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-sm font-semibold whitespace-nowrap"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <Plus size={sizes.iconSize} />
                  <span>New Product</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div
              className="flex items-center justify-between px-6 py-3 cursor-pointer"
              onClick={() => setShowFilters(!showFilters)}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <div className="flex items-center space-x-3">
                <Filter size={sizes.iconSize} className="text-gray-600" />
                <span style={{ fontSize: `${sizes.textSm}px` }} className="font-medium text-gray-700">
                  Filters
                  {(categoryFilter.length > 0 || stockStatusFilter.length > 0 || statusFilter.length > 0 || supplierFilter.length > 0 || minPrice || maxPrice) && (
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                      {[
                        categoryFilter.length,
                        stockStatusFilter.length,
                        statusFilter.length,
                        supplierFilter.length,
                        (minPrice || maxPrice) ? 1 : 0
                      ].reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {(categoryFilter.length > 0 || stockStatusFilter.length > 0 || statusFilter.length > 0 || supplierFilter.length > 0 || minPrice || maxPrice) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      clearAllFilters();
                    }}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    Clear all
                  </button>
                )}
                {showFilters ? <ChevronUp size={sizes.iconSize} className="text-gray-600" /> : <ChevronDown size={sizes.iconSize} className="text-gray-600" />}
              </div>
            </div>

            {showFilters && (
              <div className="px-6 pb-4 space-y-4">
                {/* Category Filter */}
                <div>
                  <label style={{ fontSize: `${sizes.textSm}px` }} className="block text-gray-700 font-medium mb-2">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.categories.map(category => (
                      <button
                        key={category}
                        onClick={() => {
                          setCategoryFilter(prev =>
                            prev.includes(category)
                              ? prev.filter(c => c !== category)
                              : [...prev, category]
                          );
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-medium transition-colors min-h-[44px] ${
                          categoryFilter.includes(category)
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stock Status Filter */}
                <div>
                  <label style={{ fontSize: `${sizes.textSm}px` }} className="block text-gray-700 font-medium mb-2">
                    Stock Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'in-stock', label: 'In Stock', color: 'bg-green-100 text-green-800 border border-green-200' },
                      { value: 'low-stock', label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800 border border-yellow-200' },
                      { value: 'out-of-stock', label: 'Out of Stock', color: 'bg-red-100 text-red-800 border border-red-200' }
                    ].map(status => (
                      <button
                        key={status.value}
                        onClick={() => {
                          setStockStatusFilter(prev =>
                            prev.includes(status.value)
                              ? prev.filter(s => s !== status.value)
                              : [...prev, status.value]
                          );
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border min-h-[44px] ${
                          stockStatusFilter.includes(status.value)
                            ? status.color
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status Filter */}
                <div>
                  <label style={{ fontSize: `${sizes.textSm}px` }} className="block text-gray-700 font-medium mb-2">
                    Product Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.statuses.map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(prev =>
                            prev.includes(status)
                              ? prev.filter(s => s !== status)
                              : [...prev, status]
                          );
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border min-h-[44px] ${
                          statusFilter.includes(status)
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Supplier Filter */}
                <div>
                  <label style={{ fontSize: `${sizes.textSm}px` }} className="block text-gray-700 font-medium mb-2">
                    Supplier
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.suppliers.map(supplier => (
                      <button
                        key={supplier}
                        onClick={() => {
                          setSupplierFilter(prev =>
                            prev.includes(supplier)
                              ? prev.filter(s => s !== supplier)
                              : [...prev, supplier]
                          );
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border min-h-[44px] ${
                          supplierFilter.includes(supplier)
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {supplier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range Filter */}
                <div>
                  <label style={{ fontSize: `${sizes.textSm}px` }} className="block text-gray-700 font-medium mb-2">
                    Price Range
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Under $50', min: '', max: '50' },
                      { label: '$50 - $100', min: '50', max: '100' },
                      { label: '$100 - $500', min: '100', max: '500' },
                      { label: 'Over $500', min: '500', max: '' }
                    ].map(range => (
                      <button
                        key={range.label}
                        onClick={() => {
                          if (minPrice === range.min && maxPrice === range.max) {
                            // If already selected, clear it
                            setMinPrice('');
                            setMaxPrice('');
                          } else {
                            setMinPrice(range.min);
                            setMaxPrice(range.max);
                          }
                        }}
                        className={`px-4 py-3 rounded-full text-sm font-medium transition-colors border min-h-[44px] ${
                          minPrice === range.min && maxPrice === range.max
                            ? 'bg-orange-100 text-orange-800 border border-orange-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-transparent'
                        }`}
                        style={{ WebkitTapHighlightColor: 'transparent' }}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Product Grid */}
          <div
            className="flex-1 overflow-y-auto min-h-0"
            style={{ overscrollBehavior: 'contain' }}
          >
            <TabletProductGrid
              products={filteredProducts}
              onAddToCart={handleAddToCart}
              productImages={productImages}
              cartItems={cart}
              sizes={sizes}
            />
          </div>
        </div>

        {/* Right Column - Cart & Customer */}
        <div
          className="w-96 bg-white border-l border-gray-200 flex flex-col"
          style={{ minWidth: '384px' }}
        >
          <TabletCustomerSection
            selectedCustomer={selectedCustomer}
            onSelectCustomer={() => setShowCustomerModal(true)}
            onClearCustomer={() => setSelectedCustomer(null)}
            sizes={sizes}
          />

          {/* Always show cart sidebar */}
          {true && (
            <TabletCartSidebar
            cart={cart}
            cartSubtotal={cartSubtotal}
            discountAmount={discountAmount}
            discount={discount}
            discountType={discountType}
            cartTax={cartTax}
            cartTotal={cartTotal}
            notes={notes}
            onUpdateQuantity={updateQuantity}
            onRemoveFromCart={removeFromCart}
            onUpdateDiscount={setDiscount}
            onUpdateDiscountType={setDiscountType}
            onUpdateNotes={setNotes}
            onProceedToPayment={handleProceedToPayment}
            onClearCart={clearCart}
            customerSelected={!!selectedCustomer}
            sizes={sizes}
            />
          )}
        </div>

    </div>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
        />
      )}

      {/* Tablet-focused POS settings */}
      {showSettings && (
        <TabletSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Advanced POS Modals (matching main POS) */}
      {showSalesAnalyticsModal && SalesAnalyticsModal && (
        <SalesAnalyticsModal
          isOpen={showSalesAnalyticsModal}
          onClose={() => setShowSalesAnalyticsModal(false)}
          branchId={currentBranch?.id}
        />
      )}


      {showAddExternalProductModal && AddExternalProductModal && (
        <AddExternalProductModal
          isOpen={showAddExternalProductModal}
          onClose={() => setShowAddExternalProductModal(false)}
          onProductAdded={(product) => {
            console.log('📦 [TabletPOS] External product added:', product);
            setShowAddExternalProductModal(false);
            // Refresh products to show the new external product
            if (loadProducts) loadProducts({ page: 1, limit: 500 });
            toast.success('External product added');
          }}
        />
      )}

      {showAddProductModal && AddProductModal && (
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onProductCreated={() => {
            setShowAddProductModal(false);
            if (loadProducts) loadProducts({ page: 1, limit: 500 });
            toast.success('Product created successfully');
          }}
        />
      )}

      {showDraftManagementModal && DraftManagementModal && (
        <DraftManagementModal
          isOpen={showDraftManagementModal}
          onClose={() => setShowDraftManagementModal(false)}
          onLoadDraft={(draft) => {
            if (loadDraft) loadDraft(draft);
            setShowDraftManagementModal(false);
            toast.success('Draft loaded');
          }}
        />
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && createdInvoice && InvoiceTemplate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Invoice Preview</h3>
              <button
                onClick={() => setShowInvoicePreview(false)}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <InvoiceTemplate
                invoiceNumber={createdInvoice.saleNumber || createdInvoice.id}
                invoiceDate={createdInvoice.soldAt}
                customer={{
                  name: createdInvoice.customerName || 'Guest',
                  phone: createdInvoice.customerPhone,
                  email: createdInvoice.customerEmail,
                }}
                items={createdInvoice.items.map(item => ({
                  description: item.productName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.totalPrice,
                }))}
                subtotal={createdInvoice.subtotal}
                tax={createdInvoice.tax}
                discount={createdInvoice.discount}
                total={createdInvoice.total}
                notes={createdInvoice.notes}
                paymentInfo={{
                  paymentMethod: createdInvoice.paymentMethod.type,
                  paidAmount: createdInvoice.paymentMethod.amount,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showVariantModal && selectedProductForVariants && (
        <TabletVariantSelectionModal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProductForVariants(null);
          }}
          product={selectedProductForVariants}
          onSelectVariant={handleVariantSelected}
          cartItems={cart}
        />
      )}

      {showCustomerModal && (
        <TabletCustomerSelectionModal
          customers={customers || []}
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          onClose={() => {
            // Don't allow closing without selecting a customer
            if (!selectedCustomer) {
              toast.error('Please select a customer to continue');
              return;
            }
            setShowCustomerModal(false);
          }}
          onAddNew={() => {
            setShowCustomerModal(false);
            setShowAddCustomerModal(true);
          }}
        />
      )}

      {showAddCustomerModal && (
        <TabletAddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={(customer) => {
            setSelectedCustomer(customer);
            setShowAddCustomerModal(false);
            if (refreshCustomers) refreshCustomers();
          }}
        />
      )}

      {showPaymentModal && (
        <TabletPaymentModal
          amount={cartTotal}
          discountValue={discount}
          discountType={discountType}
          onChangeDiscount={(value) => {
            console.log('onChangeDiscount called with:', value);
            setDiscount(value);
          }}
          onChangeDiscountType={(type) => {
            console.log('onChangeDiscountType called with:', type);
            setDiscountType(type);
          }}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {showShareReceipt && createdInvoice && (
        <ShareReceiptModal
          isOpen={showShareReceipt}
          receiptData={{
            id: createdInvoice.id,
            receiptNumber: createdInvoice.saleNumber || createdInvoice.id,
            amount: createdInvoice.total,
            subtotal: createdInvoice.subtotal,
            tax: createdInvoice.tax,
            discount: createdInvoice.discount,
            paymentMethod: createdInvoice.paymentMethod.type,
            customerName: createdInvoice.customerName,
            customerPhone: createdInvoice.customerPhone,
            customerEmail: createdInvoice.customerEmail,
            sellerName: createdInvoice.soldBy,
            items: createdInvoice.items.map(item => ({
              productName: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          }}
          onClose={() => setShowShareReceipt(false)}
        />
      )}

      {/* Branch Selector Modal */}
      {showBranchSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Switch Branch</h3>
                <button
                  onClick={() => setShowBranchSelector(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">Select a branch to switch to</p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {(availableBranches || []).map((branch: any) => (
                <button
                  key={branch.id}
                  onClick={() => handleBranchSwitch(branch.id)}
                  disabled={branch.id === currentBranch?.id}
                  className={`w-full p-4 text-left border-b border-gray-100 hover:bg-gray-50 disabled:bg-blue-50 disabled:opacity-60 transition-colors ${
                    branch.id === currentBranch?.id ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${
                          branch.id === currentBranch?.id ? 'text-blue-700' : 'text-gray-900'
                        }`}>
                          {branch.name}
                        </span>
                        {branch.is_main && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
                            MAIN
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {branch.city || 'Location not set'}
                      </p>
                    </div>
                    {branch.id === currentBranch?.id && (
                      <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Management Modal */}
      {showDeliveryManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Delivery Management</h2>
              <button
                onClick={() => setShowDeliveryManagement(false)}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <DeliveryManagementPage currentBranch={currentBranch} />
            </div>
          </div>
        </div>
      )}

      {/* Minimal UI Toaster */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
          },
        }}
      />

      {successModal && successModal.Component && <successModal.Component {...successModal.props} />}

      {/* Delivery Choice Modal */}
      {showDeliveryChoiceModal && completedSaleData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Delivery Options</h2>
                <p className="text-gray-600 text-sm">
                  Would you like to arrange delivery for this sale?
                </p>
                <div className="bg-gray-50 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-gray-900">
                    Sale: {completedSaleData.saleNumber || completedSaleData.id}
                  </p>
                  <p className="text-sm text-gray-600">
                    Customer: {completedSaleData.customerName || 'Walk-in Customer'}
                  </p>
                  <p className="text-sm font-semibold text-green-600">
                    Total: TZS {completedSaleData.total?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    // Navigate to delivery creation page with the sale data
                    const deliveryUrl = `/admin/deliveries?sale=${completedSaleData.id}`;
                    window.open(deliveryUrl, '_blank');
                    setShowDeliveryChoiceModal(false);
                    setCompletedSaleData(null);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  Yes, Create Delivery
                </button>

                <button
                  onClick={() => {
                    // Navigate to sales management to create delivery later
                    const salesUrl = `/admin/sales`;
                    window.open(salesUrl, '_blank');
                    setShowDeliveryChoiceModal(false);
                    setCompletedSaleData(null);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Create Later
                </button>

                <button
                  onClick={() => {
                    setShowDeliveryChoiceModal(false);
                    setCompletedSaleData(null);
                    // Show receipt modal if not already shown
                    setShowShareReceipt(true);
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  No Delivery Needed
                </button>
              </div>

              <div className="mt-4 text-center">
                <p className="text-xs text-gray-500">
                  You can always create deliveries later from Sales Management
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabletPOS;