import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, X, User, ShoppingCart, CreditCard, CheckCircle, Scan, RefreshCw } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useBranch } from '../../../context/BranchContext';
import { useInventoryStore } from '../../lats/stores/useInventoryStore';
import { saleProcessingService } from '../../../lib/saleProcessingService';
import { format } from '../../lats/lib/format';
import toast, { Toaster } from 'react-hot-toast';
import { useMobileBranch } from '../hooks/useMobileBranch';
import { supabase } from '../../../lib/supabaseClient';
import { usePaymentMethodsContext } from '../../../context/PaymentMethodsContext';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { latsEventBus } from '../../lats/lib/data/eventBus';
import { useUnifiedSearch } from '../../lats/hooks/useUnifiedSearch';
import { useDraftManager } from '../../lats/hooks/useDraftManager';
import { useDynamicDataStore } from '../../lats/lib/data/dynamicDataStore';
import { SoundManager } from '../../../lib/soundUtils';
import { usePOSClickSounds } from '../../lats/hooks/usePOSClickSounds';
import { MobileCard, MobileCardBody } from '../components/MobileCard';
import MobileButton from '../components/MobileButton';
import MobileHeader from '../components/MobileHeader';
import MobilePaymentModal from '../components/MobilePaymentModal';
import MobileVariantSelectionModal from '../components/MobileVariantSelectionModal';
import MobileCustomerSelectionModal from '../components/MobileCustomerSelectionModal';
import MobileAddCustomerModal from '../components/MobileAddCustomerModal';
import ShareReceiptModal from '../../../components/ui/ShareReceiptModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';
import BarcodeScanner from '../../devices/components/BarcodeScanner';

// Advanced POS modals and components (matching main POS)
import SalesAnalyticsModal from '../../lats/components/pos/SalesAnalyticsModal';
import ComprehensivePaymentModal from '../../lats/components/pos/ComprehensivePaymentModal';
import POSInstallmentModal from '../../lats/components/pos/POSInstallmentModal';
import TradeInContractModal from '../../lats/components/pos/TradeInContractModal';
import TradeInPricingModal from '../../lats/components/pos/TradeInPricingModal';
import InstallmentManagementModal from '../../lats/components/pos/InstallmentManagementModal';
import PaymentsPopupModal from '../../../components/PaymentsPopupModal';
import DeliverySection from '../../lats/components/pos/DeliverySection';
import AddExternalProductModal from '../../lats/components/pos/AddExternalProductModal';
import InvoiceTemplate from '../../../components/templates/InvoiceTemplate';
import DraftManagementModal from '../../lats/components/pos/DraftManagementModal';
import DraftNotification from '../../lats/components/pos/DraftNotification';

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

const MobilePOS: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch, loading: branchLoading } = useBranch();
  const { customers, loading: customersLoading, refreshCustomers } = useCustomers();
  const { products: dbProducts, loadProducts } = useInventoryStore();
  const successModal = useSuccessModal();

  // POS features and settings
  // Advanced POS hooks and services (matching main POS)
  const { paymentMethods } = usePaymentMethodsContext();
  const { startLoading, updateProgress, completeLoading, failLoading } = useLoadingJob();
  const { search: unifiedSearch, results: unifiedSearchResults, isSearching: isUnifiedSearching } = useUnifiedSearch();
  const { playClickSound, playSuccessSound, playErrorSound } = usePOSClickSounds();

  // State (matching main POS structure)
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartItems, setCartItems] = useState<any[]>([]); // For draft manager compatibility
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Additional state for advanced features (matching main POS)
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showShareReceiptModal, setShowShareReceiptModal] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [additionalCustomerInfo, setAdditionalCustomerInfo] = useState({
    phone: '',
    email: '',
    address: '',
    notes: ''
  });
  const [paymentInfo, setPaymentInfo] = useState({
    method: 'cash',
    amount: 0,
    reference: '',
    accountId: null
  });
  const [showAdditionalInfoForm, setShowAdditionalInfoForm] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<any>(null);

  // Modal states for advanced features (matching main POS)
  const [showSalesAnalyticsModal, setShowSalesAnalyticsModal] = useState(false);
  const [showDeliverySection, setShowDeliverySection] = useState(false);
  const [showAddExternalProductModal, setShowAddExternalProductModal] = useState(false);
  const [showDraftManagementModal, setShowDraftManagementModal] = useState(false);

  // Draft manager hook (needs to be after state declarations)
  const {
    drafts,
    saveDraft,
    loadDraft,
    deleteDraft,
    hasUnsavedChanges
  } = useDraftManager({
    cartItems,
    selectedCustomer,
    discount,
    discountType,
    notes
  });

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);

  const TAX_RATE = 18;

  // Load products if not already loaded
  useEffect(() => {
    if (dbProducts.length === 0) {
      console.log('📦 [MobilePOS] No products in store, loading...');
      loadProducts({ page: 1, limit: 500 });
    } else {
      console.log(`✅ [MobilePOS] Using ${dbProducts.length} preloaded products`);
    }
  }, []);

  // Load product images
  useEffect(() => {
    const fetchProductImages = async () => {
      if (!dbProducts || dbProducts.length === 0) return;

      const productIds = dbProducts.map(p => p.id);

      try {
        const { data: images, error } = await supabase
          .from('product_images')
          .select('product_id, image_url, is_primary')
          .in('product_id', productIds)
          .eq('is_primary', true);

        if (error) throw error;

        if (images && images.length > 0) {
          const imageMap = images.reduce((acc, img) => {
            acc[img.product_id] = img.image_url;
            return acc;
          }, {} as Record<string, string>);

          setProductImages(imageMap);
          console.log('✅ [MobilePOS] Loaded', images.length, 'product images');
        }
      } catch (error) {
        console.error('❌ [MobilePOS] Error loading product images:', error);
      }
    };

    if (dbProducts.length > 0) {
      fetchProductImages();
    }
  }, [dbProducts]);

  // Event bus subscriptions for real-time updates (matching main POS)
  useEffect(() => {
    const handleStockUpdate = (data: any) => {
      console.log('📦 [MobilePOS] Stock updated:', data);
      // Refresh products if needed
      if (dbProducts.length === 0) {
        loadProducts({ page: 1, limit: 500 });
      }
    };

    const handleSaleCompleted = (data: any) => {
      console.log('✅ [MobilePOS] Sale completed:', data);
      // Could show a notification or update local state
      playSuccessSound?.();
    };

    // Subscribe to real-time events
    const unsubscribeStock = latsEventBus.subscribe('lats:stock.updated', handleStockUpdate);
    const unsubscribeSale = latsEventBus.subscribe('lats:sale.completed', handleSaleCompleted);

    return () => {
      unsubscribeStock();
      unsubscribeSale();
    };
  }, [dbProducts.length, loadProducts, playSuccessSound]);

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!dbProducts) return [];

    return dbProducts.filter(product => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        product.name?.toLowerCase().includes(query) ||
        product.sku?.toLowerCase().includes(query) ||
        product.barcode?.toLowerCase().includes(query)
      );
    });
  }, [dbProducts, searchQuery]);

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = discountType === 'percentage'
    ? (cartSubtotal * discount) / 100
    : Math.min(discount, cartSubtotal);
  const subtotalAfterDiscount = cartSubtotal - discountAmount;
  const cartTax = (subtotalAfterDiscount * TAX_RATE) / 100;
  const cartTotal = subtotalAfterDiscount + cartTax;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
        productName: product.name,
        variantName: variant.variant_name || variant.name || 'Default',
        sku: variant.sku || product.sku || '',
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice,
        availableQuantity,
        image: productImages[product.id] || product.image_url
      };
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

    for (const product of dbProducts || []) {
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

  const handlePaymentComplete = async (payments: any[], totalPaid: number) => {
    try {
      console.log('🔄 [MobilePOS] Processing sale...', {
        items: cart.length,
        total: cartTotal,
        payments: payments.length
      });

      if (!selectedCustomer) {
        toast.error('Please select a customer');
        return;
      }

      const saleData = {
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerEmail: selectedCustomer?.email,
        customerPhone: selectedCustomer?.phone,
        items: cart.map(item => ({
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
        soldBy: currentUser?.email || 'Mobile POS User',
        soldAt: new Date().toISOString(),
        notes: notes || `Mobile POS Sale - Branch: ${currentBranch?.name || 'Unknown'}`
      };

      console.log('📤 [MobilePOS] Sending sale data:', saleData);

      const result = await saleProcessingService.processSale(saleData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to process sale');
      }

      console.log('✅ [MobilePOS] Sale processed successfully:', result);

      setCurrentReceipt(result.sale);
      setShowPaymentModal(false);

      successModal.show({
        title: 'Sale Completed!',
        message: String(`Sale of ${format.currency(cartTotal)} completed successfully`),
        icon: SuccessIcons.CheckCircle,
        color: 'green',
        actions: [
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

      setCart([]);
      setSelectedCustomer(null);
      setShowShareReceipt(true);

    } catch (error: any) {
      console.error('❌ [MobilePOS] Sale processing error:', error);
      toast.error(error.message || 'Failed to process sale');
    }
  };

  const handleProceedToPayment = () => {
    if (cart.length === 0) {
      toast.error('Add items to cart first');
      return;
    }
    setShowPaymentModal(true);
  };

	return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader
        title="Mobile POS"
        subtitle={currentBranch?.name || 'Branch'}
        rightActions={
          <div className="flex items-center gap-2">
            {/* Analytics Button */}
            <button
              onClick={() => setShowSalesAnalyticsModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Sales Analytics"
            >
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">📊</span>
              </div>
            </button>

            {/* Delivery Button */}
            <button
              onClick={() => setShowDeliverySection(true)}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Delivery"
            >
              <div className="w-5 h-5 rounded bg-green-100 flex items-center justify-center">
                <span className="text-xs">🚚</span>
              </div>
            </button>

            {/* Drafts Button */}
            <button
              onClick={() => setShowDraftManagementModal(true)}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
              title="Drafts"
            >
              <div className="w-5 h-5 rounded bg-orange-100 flex items-center justify-center">
                <span className="text-xs">📝</span>
              </div>
            </button>

            {/* Refresh Button */}
            <button
              onClick={async () => {
                if (isRefreshing) return;
                setIsRefreshing(true);
                console.log('🔄 [MobilePOS] Refreshing products...');

                try {
                  loadProducts({ page: 1, limit: 500 });
                  toast.success('Products refreshed', { duration: 3000 });
                } catch (error) {
                  console.error('❌ [MobilePOS] Error refreshing products:', error);
                  toast.error('Refresh failed');
                } finally {
                  setIsRefreshing(false);
                }
              }}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
            >
              <RefreshCw size={20} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        {/* Customer Selection */}
        <MobileCard variant="elevated">
          <MobileCardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <User size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {selectedCustomer ? selectedCustomer.name : 'Select Customer'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedCustomer ? selectedCustomer.phone : 'Required for sale'}
                  </p>
                </div>
              </div>
              <MobileButton
                variant="outline"
                size="sm"
                onClick={() => setShowCustomerModal(true)}
              >
                {selectedCustomer ? 'Change' : 'Select'}
              </MobileButton>
            </div>
          </MobileCardBody>
        </MobileCard>

        {/* Search Bar */}
        <MobileCard>
          <MobileCardBody>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
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
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                />
              </div>
              <MobileButton
                variant="secondary"
                size="sm"
                onClick={() => setShowAddExternalProductModal(true)}
                className="px-3"
              >
                + Add
              </MobileButton>
              <MobileButton
                variant="secondary"
                size="sm"
                onClick={handleScanClick}
                icon={<Scan size={18} />}
              >
                Scan
              </MobileButton>
            </div>
          </MobileCardBody>
        </MobileCard>

        {/* Products Grid */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 px-1">Products</h3>
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.slice(0, 20).map((product) => (
              <MobileCard
                key={product.id}
                variant="elevated"
                onClick={() => handleAddToCart(product)}
                className="cursor-pointer"
              >
                <MobileCardBody className="p-3">
                  <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center">
                    {productImages[product.id] ? (
                      <img
                        src={productImages[product.id]}
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package size={24} className="text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h4>
                  <p className="text-blue-600 font-semibold text-sm">
                    {format.currency(product.price || 0)}
                  </p>
                </MobileCardBody>
              </MobileCard>
            ))}
          </div>
        </div>

        {/* Cart Summary */}
        {cart.length > 0 && (
          <MobileCard variant="elevated">
            <MobileCardBody>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Cart ({cartItemCount} items)</h3>
                <ShoppingCart size={20} className="text-gray-600" />
              </div>

              <div className="space-y-2 mb-4">
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                      <p className="text-gray-500 text-xs">{format.currency(item.unitPrice)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center active:bg-red-200 ml-2"
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{format.currency(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-{format.currency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (18%):</span>
                  <span>{format.currency(cartTax)}</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t border-gray-200">
                  <span>Total:</span>
                  <span className="text-blue-600">{format.currency(cartTotal)}</span>
                </div>
              </div>

              <div className="mt-4">
                <MobileButton
                  variant="primary"
                  fullWidth
                  size="lg"
                  onClick={handleProceedToPayment}
                  icon={<CreditCard size={20} />}
                >
                  Proceed to Payment
                </MobileButton>
              </div>
            </MobileCardBody>
          </MobileCard>
        )}

        {/* Empty Cart State */}
        {cart.length === 0 && (
          <MobileCard variant="elevated">
            <MobileCardBody className="text-center py-8">
              <ShoppingCart size={48} className="text-gray-300 mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">Cart is empty</h3>
              <p className="text-gray-500 text-sm">Add products to get started</p>
            </MobileCardBody>
          </MobileCard>
        )}
      </div>

      {/* Camera Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onScan={handleScanResult}
        />
      )}

      {/* Modals */}
      {showVariantModal && selectedProductForVariants && (
        <MobileVariantSelectionModal
          isOpen={showVariantModal}
          onClose={() => {
            setShowVariantModal(false);
            setSelectedProductForVariants(null);
          }}
          product={selectedProductForVariants}
          onSelectVariant={handleVariantSelected}
        />
      )}

      {showCustomerModal && (
        <MobileCustomerSelectionModal
          customers={customers}
          onSelect={(customer) => {
            setSelectedCustomer(customer);
            setShowCustomerModal(false);
          }}
          onClose={() => setShowCustomerModal(false)}
          onAddNew={() => {
            setShowCustomerModal(false);
            setShowAddCustomerModal(true);
          }}
        />
      )}

      {showAddCustomerModal && (
        <MobileAddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={(customer) => {
            setSelectedCustomer(customer);
            setShowAddCustomerModal(false);
            refreshCustomers();
          }}
        />
      )}

      {showPaymentModal && (
        <MobilePaymentModal
          amount={cartTotal}
          discountValue={discount}
          discountType={discountType}
          onChangeDiscount={setDiscount}
          onChangeDiscountType={setDiscountType}
          onClose={() => setShowPaymentModal(false)}
          onComplete={handlePaymentComplete}
        />
      )}

      {showShareReceipt && currentReceipt && (
        <ShareReceiptModal
          receipt={currentReceipt}
          onClose={() => setShowShareReceipt(false)}
        />
      )}

      {/* Advanced POS Modals (matching main POS) */}
      {showSalesAnalyticsModal && (
        <SalesAnalyticsModal
          isOpen={showSalesAnalyticsModal}
          onClose={() => setShowSalesAnalyticsModal(false)}
          branchId={currentBranch?.id}
        />
      )}

      {showDeliverySection && (
        <DeliverySection
          isOpen={showDeliverySection}
          onClose={() => setShowDeliverySection(false)}
          deliverySettings={deliverySettings}
          onDeliveryComplete={(delivery) => {
            console.log('🚚 [MobilePOS] Delivery completed:', delivery);
            setShowDeliverySection(false);
            toast.success('Delivery arranged successfully');
          }}
        />
      )}

      {showAddExternalProductModal && (
        <AddExternalProductModal
          isOpen={showAddExternalProductModal}
          onClose={() => setShowAddExternalProductModal(false)}
          onProductAdded={(product) => {
            console.log('📦 [MobilePOS] External product added:', product);
            setShowAddExternalProductModal(false);
            // Refresh products to show the new external product
            loadProducts({ page: 1, limit: 500 });
            toast.success('External product added');
          }}
        />
      )}

      {showDraftManagementModal && (
        <DraftManagementModal
          isOpen={showDraftManagementModal}
          onClose={() => setShowDraftManagementModal(false)}
          drafts={drafts}
          onLoadDraft={(draft) => {
            loadDraft(draft);
            setShowDraftManagementModal(false);
            toast.success('Draft loaded');
          }}
          onDeleteDraft={(draftId) => {
            deleteDraft(draftId);
            toast.success('Draft deleted');
          }}
        />
      )}

      {/* Invoice Preview Modal */}
      {showInvoicePreview && createdInvoice && (
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
              <InvoiceTemplate invoice={createdInvoice} />
            </div>
          </div>
        </div>
      )}

      {/* Draft notification */}
      {hasUnsavedChanges && (
        <DraftNotification
          onSave={() => {
            const draftName = prompt('Enter draft name:');
            if (draftName) {
              saveDraft(draftName);
              toast.success('Draft saved');
            }
          }}
          onDiscard={() => {
            // Clear unsaved changes
            setCart([]);
            setSelectedCustomer(null);
            setDiscount(0);
            setNotes('');
          }}
        />
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

      <SuccessModal {...successModal.props} />
		</div>
	);
};

export default MobilePOS;


