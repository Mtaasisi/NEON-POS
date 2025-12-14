import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, X, User, ShoppingCart, CreditCard, CheckCircle, ArrowLeft, Package, Settings, Scan } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useInventoryStore } from '../../lats/stores/useInventoryStore';
import { saleProcessingService } from '../../../lib/saleProcessingService';
import { format } from '../../lats/lib/format';
import toast from 'react-hot-toast';
import { useMobileBranch } from '../../mobile/hooks/useMobileBranch';
import { supabase } from '../../../lib/supabaseClient';
import { useScreenInfo } from '../../../hooks/useResponsiveSize';
import { useTabletSizes } from '../../../hooks/useTabletSizes';
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

const TabletPOS: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useMobileBranch();
  const { customers, loading: customersLoading, refreshCustomers } = useCustomers();
  const { products: dbProducts, loadProducts } = useInventoryStore();
  const successModal = useSuccessModal();

  // Tablet-specific responsive sizing
  const sizes = useTabletSizes();
  const screenInfo = useScreenInfo();

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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');
  const [quickSku, setQuickSku] = useState('');
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [heldCarts, setHeldCarts] = useState<Array<any>>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortMode, setSortMode] = useState<'name' | 'stock' | 'price'>('name');

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);

  const TAX_RATE = 18;

  // Load products if not already loaded
  useEffect(() => {
    if (dbProducts.length === 0) {
      console.log('📦 [TabletPOS] No products in store, loading...');
      loadProducts({ page: 1, limit: 500 });
    } else {
      console.log(`✅ [TabletPOS] Using ${dbProducts.length} preloaded products`);
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
          console.log('✅ [TabletPOS] Loaded', images.length, 'product images');
        }
      } catch (error) {
        console.error('❌ [TabletPOS] Error loading product images:', error);
      }
    };

    if (dbProducts.length > 0) {
      fetchProductImages();
    }
  }, [dbProducts]);

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

  const addVariantToCart = (product: any, variant: any) => {
    if (!variant) {
      toast.error('Invalid variant');
      return;
    }

    const existingItem = cart.find(item => item.variantId === variant.id);

    if (existingItem) {
      if (existingItem.quantity >= variant.stock_quantity) {
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
      if ((variant.stock_quantity || variant.quantity || 0) <= 0) {
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
        unitPrice: variant.selling_price || variant.unit_price || 0,
        totalPrice: variant.selling_price || variant.unit_price || 0,
        availableQuantity: variant.stock_quantity || variant.quantity || 0,
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

  const handleQuickAdd = () => {
    const skuOrBarcode = quickSku.trim().toLowerCase();
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
      if (requireConfirm) {
        const ok = window.confirm('Confirm payment and complete sale?');
        if (!ok) return;
      }
      console.log('🔄 [TabletPOS] Processing sale...', {
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
              accountId: null,
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

      console.log('📤 [TabletPOS] Sending sale data:', saleData);

      const result = await saleProcessingService.processSale(saleData);

      if (!result.success) {
        throw new Error(result.error || 'Failed to process sale');
      }

      console.log('✅ [TabletPOS] Sale processed successfully:', result);

      setCurrentReceipt(result.sale);
      setShowPaymentModal(false);

      successModal.show({
        title: 'Sale Completed!',
        message: `Sale of ${format.currency(cartTotal)} completed successfully`,
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
              setCurrentStep('products');
            },
            variant: 'secondary'
          }
        ]
      });

      setCart([]);
      setSelectedCustomer(null);

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
    setShowPaymentModal(true);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
      {/* Tablet Header */}
      <div
        className="bg-white border-b border-gray-200 shadow-sm"
        style={{
          paddingLeft: `${sizes.spacing8}px`,
          paddingRight: `${sizes.spacing8}px`,
          paddingTop: `${sizes.spacing6}px`,
          paddingBottom: `${sizes.spacing6}px`
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
              <ArrowLeft size={sizes.iconSizeLg} className="text-gray-600" />
            </button>
            <div>
              <h1 style={{ fontSize: `${sizes.text2xl}px` }} className="font-bold text-gray-900">
                Tablet POS
              </h1>
              <p style={{ fontSize: `${sizes.textSm}px` }} className="text-gray-500">
                {currentBranch?.name || 'Branch'}
              </p>
            </div>
          </div>
          <button
            className="p-2 rounded-full hover:bg-gray-100 active:scale-95 transition-all"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <Settings size={sizes.iconSizeLg} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex flex-1 overflow-hidden min-h-0" style={{ overscrollBehavior: 'contain' }}>
        {/* Left Column - Products */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Search Bar + Quick Add */}
          <div
            className="border-b border-gray-200 bg-white"
            style={{ padding: `${sizes.spacing6}px ${sizes.spacing8}px` }}
          >
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={sizes.iconSize} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Scan className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={sizes.iconSize} />
                  <input
                    type="text"
                    placeholder="Scan or enter SKU"
                    value={quickSku}
                    onChange={(e) => setQuickSku(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); } }}
                    className="pl-10 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ fontSize: `${sizes.textBase}px`, width: '220px' }}
                  />
                </div>
                <button
                  onClick={handleQuickAdd}
                  className="px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold"
                  style={{ fontSize: `${sizes.textBase}px` }}
                >
                  Add
                </button>
              </div>
            </div>
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
            sizes={sizes}
          />
        </div>
      </div>

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
        />
      )}

      {showCustomerModal && (
        <TabletCustomerSelectionModal
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
        <TabletAddCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={(customer) => {
            setSelectedCustomer(customer);
            setShowAddCustomerModal(false);
            refreshCustomers();
          }}
        />
      )}

      {showPaymentModal && (
        <TabletPaymentModal
          amount={cartTotal}
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

      <SuccessModal {...successModal.props} />
    </div>
  );
};

export default TabletPOS;