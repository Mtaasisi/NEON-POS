import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, X, User, ShoppingCart, CreditCard, CheckCircle, ArrowLeft, ArrowRight, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useInventoryStore } from '../../lats/stores/useInventoryStore';
import { saleProcessingService } from '../../../lib/saleProcessingService';
import { format } from '../../lats/lib/format';
import toast from 'react-hot-toast';
import MobileCustomerSelectionModal from '../components/MobileCustomerSelectionModal';
import MobileAddCustomerModal from '../components/MobileAddCustomerModal';
import MobilePaymentModal from '../components/MobilePaymentModal';
import MobileVariantSelectionModal from '../components/MobileVariantSelectionModal';
import ShareReceiptModal from '../../../components/ui/ShareReceiptModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';
import { useMobileBranch } from '../hooks/useMobileBranch';
import { supabase } from '../../../lib/supabaseClient';
import { useResponsiveSizes, useScreenInfo } from '../../../hooks/useResponsiveSize';
import { ResponsiveMobileWrapper } from '../components/ResponsiveMobileWrapper';
import { useLoadingJob } from '../../../hooks/useLoadingJob';

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

type Step = 'products' | 'cart' | 'payment';

const MobilePOS: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { currentBranch } = useMobileBranch();
  const { customers, loading: customersLoading, refreshCustomers } = useCustomers();
  const { products: dbProducts, loadProducts } = useInventoryStore();
  const successModal = useSuccessModal();
  
  // Responsive sizing
  const sizes = useResponsiveSizes();
  const screenInfo = useScreenInfo();
  
  // Debug: Log screen dimensions on mount
  useEffect(() => {
    console.log('🖥️ [MobilePOS] Screen Info:', {
      width: screenInfo.width,
      height: screenInfo.height,
      deviceCategory: screenInfo.deviceCategory,
      scale: sizes.scale,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio
    });
  }, [screenInfo.width, screenInfo.deviceCategory]);

  // Current step
  const [currentStep, setCurrentStep] = useState<Step>('products');

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [notes, setNotes] = useState('');
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);

  const TAX_RATE = 18;

  // Products are preloaded globally, no need to load here
  // Only load if products array is empty (fallback)
  useEffect(() => {
    if (dbProducts.length === 0) {
      console.log('📦 [MobilePOS] No products in store, loading...');
      loadProducts({ page: 1, limit: 500 });
    } else {
      console.log(`✅ [MobilePOS] Using ${dbProducts.length} preloaded products`);
    }
  }, []);

  // Load product images separately
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
          // Create a map of product_id -> image_url
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

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!dbProducts) return [];
    
    // Log product data for debugging
    if (dbProducts.length > 0 && dbProducts.length <= 10) {
      console.log('📊 [MobilePOS] Products loaded:', dbProducts.map(p => ({
        name: p.name,
        hasVariants: !!p.variants && p.variants.length > 0,
        variantCount: p.variants?.length || 0,
        price: p.price || p.selling_price,
        variantPrice: p.variants?.[0]?.selling_price,
        stock: p.variants?.[0]?.quantity || p.stockQuantity
      })));
    }
    
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
    // Check if product has no variants
    if (!product.variants || product.variants.length === 0) {
      toast.error('Product has no variants available');
      return;
    }

    // Check if product has multiple variants or parent variants with children
    const hasMultipleVariants = product.variants.length > 1;
    const hasParentVariant = product.variants.some((v: any) => 
      v.variant_type === 'parent' || v.is_parent === true
    );

    // If multiple variants or has parent variants, show selection modal
    if (hasMultipleVariants || hasParentVariant) {
      setSelectedProductForVariants(product);
      setShowVariantModal(true);
      return;
    }

    // Single variant - add directly
    const variant = product.variants[0];
    addVariantToCart(product, variant);
  };

  // Add specific variant to cart
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

  // Handle variant selection from modal
  const handleVariantSelected = (variant: any) => {
    if (selectedProductForVariants) {
      addVariantToCart(selectedProductForVariants, variant);
    }
  };

  // Update quantity
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

  // Remove from cart
  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  // Process payment
  const handlePaymentComplete = async (payments: any[], totalPaid: number) => {
    try {
      console.log('🔄 [MobilePOS] Processing sale...', { 
        items: cart.length, 
        total: cartTotal,
        payments: payments.length 
      });

      // Validate customer selected
      if (!selectedCustomer) {
        toast.error('Please select a customer');
        return;
      }

      // Prepare sale data matching desktop POS format
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
          costPrice: 0, // Will be fetched by service
          profit: 0, // Will be calculated by service
        })),
        subtotal: cartSubtotal,
        tax: cartTax,
        discount: discountAmount,
        discountType: discountType,
        discountValue: discount,
        total: cartTotal,
        // Payment method structure matching desktop POS
        paymentMethod: {
          type: payments.length === 1 ? payments[0].paymentMethod : 'multiple',
          details: {
            payments: payments.map((payment: any) => ({
              method: payment.paymentMethod,
              amount: payment.amount,
              accountId: null, // Will be fetched from payment method name
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

      // Process the sale using the same service as desktop
      const result = await saleProcessingService.processSale(saleData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to process sale');
      }

      console.log('✅ [MobilePOS] Sale processed successfully:', result);
      
      setCurrentReceipt(result.sale);
      setShowPaymentModal(false);
      
      // Show success modal
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

      // Clear cart after successful sale
      setCart([]);
      setSelectedCustomer(null);
      setCurrentStep('products');
      
    } catch (error: any) {
      console.error('❌ [MobilePOS] Sale processing error:', error);
      toast.error(error.message || 'Failed to process sale');
    }
  };

  // Step navigation
  const canProceedToCart = cart.length > 0;
  const canProceedToPayment = cart.length > 0;

  const nextStep = () => {
    if (currentStep === 'products' && canProceedToCart) {
      setCurrentStep('cart');
    } else if (currentStep === 'cart' && canProceedToPayment) {
      setCurrentStep('payment');
      setShowPaymentModal(true);
    }
  };

  const previousStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('cart');
    } else if (currentStep === 'cart') {
      setCurrentStep('products');
    }
  };

  // Step indicator
  const steps = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'payment', label: 'Payment', icon: CreditCard },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <ResponsiveMobileWrapper>
      <div className="flex flex-col h-full bg-white">
        {/* iOS 17 Header - Minimal (Optimized for 1080x2400) */}
        <div style={{ 
          paddingLeft: `${sizes.spacing8}px`, 
          paddingRight: `${sizes.spacing8}px`,
          paddingTop: `${sizes.spacing8}px`,
          paddingBottom: `${sizes.spacing5}px`
        }}>
        <div className="flex items-center justify-between" style={{ marginBottom: `${sizes.spacing6}px` }}>
          <button
            onClick={() => navigate('/mobile/dashboard')}
            className="active:bg-gray-100 rounded-full transition-all flex items-center justify-center"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              padding: `${sizes.spacing3}px`,
              width: `${sizes.buttonHeight}px`,
              height: `${sizes.buttonHeight}px`,
            }}
          >
            <ArrowLeft size={sizes.iconSizeLg} className="text-blue-500" strokeWidth={2.5} />
          </button>
          <div className="text-center flex-1">
            <p style={{ fontSize: `${sizes.textSm}px` }} className="text-gray-400 uppercase tracking-wider font-semibold">
              {currentStep === 'products' ? 'Step 1 of 3' : currentStep === 'cart' ? 'Step 2 of 3' : 'Step 3 of 3'}
            </p>
            <h1 style={{ fontSize: `${sizes.text3xl}px`, marginTop: `${sizes.spacing1}px` }} className="font-bold text-gray-900 tracking-tight">
              {currentStep === 'products' ? 'Select Items' : currentStep === 'cart' ? 'Review Order' : 'Payment'}
            </h1>
          </div>
          <div style={{ width: `${sizes.buttonHeight}px` }} />
        </div>
        
        {/* Simple Progress Dots */}
        <div className="flex items-center justify-center" style={{ gap: `${sizes.spacing2}px` }}>
          {steps.map((_, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            
            return (
              <div
                key={index}
                style={{
                  height: `${sizes.spacing1 + 2}px`,
                  width: isActive ? `${sizes.spacing8}px` : `${sizes.spacing1 + 2}px`,
                  borderRadius: `${sizes.radiusFull}px`
                }}
                className={`transition-all duration-300 ${
                  isActive ? 'bg-blue-500' :
                  isCompleted ? 'bg-blue-500' :
                  'bg-gray-300'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto" style={{ paddingBottom: `${sizes.spacing10 + sizes.buttonHeight}px` }}>
        {/* STEP 1: Products */}
        {currentStep === 'products' && (
          <div style={{ paddingLeft: `${sizes.spacing8}px`, paddingRight: `${sizes.spacing8}px` }}>
            {/* iOS Search Bar */}
            <div style={{ marginBottom: `${sizes.spacing6}px` }}>
              <div className="bg-gray-100/80 flex items-center" style={{
                borderRadius: `${sizes.radiusXl}px`,
                padding: `${sizes.spacing4}px ${sizes.spacing5}px`,
                gap: `${sizes.spacing3}px`
              }}>
                <Search className="text-gray-400" size={sizes.iconSize} strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none placeholder-gray-400"
                  style={{ fontSize: `${sizes.textLg}px` }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="active:scale-90 transition-transform"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    <X size={sizes.iconSize} className="text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Clean Product Grid - Responsive (Optimized for 1080x2400) */}
            <div 
              className="grid"
              style={{ 
                gap: `${sizes.gapLg}px`,
                gridTemplateColumns: screenInfo.width < 360 
                  ? '1fr' 
                  : screenInfo.width < 600 
                  ? 'repeat(2, 1fr)' 
                  : 'repeat(3, 1fr)',
                width: '100%'
              }}
            >
              {filteredProducts.map((product) => {
                const variant = product.variants?.[0];
                const inCart = cart.find(item => item.variantId === variant?.id);
                
                // Get price from variant or fallback to product
                const displayPrice = variant?.selling_price || variant?.price || product.price || product.selling_price || 0;
                const stockQty = variant?.quantity || variant?.stock_quantity || product.stockQuantity || 0;
                
                return (
                  <button
                    key={product.id}
                    onClick={() => handleAddToCart(product)}
                    className="bg-gray-50 active:scale-[0.97] transition-all duration-150"
                    style={{ 
                      WebkitTapHighlightColor: 'transparent',
                      borderRadius: `${sizes.radiusXl}px`,
                      padding: `${sizes.productCardPadding}px`,
                    }}
                  >
                    {/* Product Image */}
                    {(productImages[product.id] || product.image_url) ? (
                      <div 
                        className="w-full aspect-square bg-white mb-3 overflow-hidden shadow-sm"
                        style={{ borderRadius: `${sizes.productImageRadius}px` }}
                      >
                        <img
                          src={productImages[product.id] || product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to package icon if image fails
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center"><svg width="${sizes.iconSizeXl}" height="${sizes.iconSizeXl}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>`;
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-full aspect-square bg-white mb-3 flex items-center justify-center"
                        style={{ borderRadius: `${sizes.productImageRadius}px` }}
                      >
                        <Package size={sizes.iconSizeXl} className="text-gray-300" />
                      </div>
                    )}
                    
                    {/* Product Name */}
                    <h3 
                      style={{ fontSize: `${sizes.textBase}px` }} 
                      className="font-semibold text-gray-900 mb-2 line-clamp-2 text-left leading-tight"
                    >
                      {product.name}
                    </h3>
                    
                    {/* Price and Stock Info */}
                    <div className="flex items-end justify-between" style={{ marginTop: `${sizes.spacing2}px` }}>
                      <div className="flex flex-col items-start" style={{ gap: `${sizes.spacing1}px` }}>
                        <span style={{ fontSize: `${sizes.textXl}px` }} className="font-bold text-gray-900">
                          {format.currency(displayPrice)}
                        </span>
                        <span style={{ fontSize: `${sizes.textSm}px` }} className={`font-medium ${
                          stockQty === 0 
                            ? 'text-red-500' 
                            : stockQty <= 5 
                            ? 'text-orange-500' 
                            : 'text-green-600'
                        }`}>
                          {stockQty === 0 
                            ? 'Out of stock' 
                            : `${stockQty} in stock`
                          }
                        </span>
                      </div>
                      
                      {/* Add to Cart Button */}
                      {inCart ? (
                        <div 
                          className="bg-blue-500 text-white font-bold flex items-center justify-center" 
                          style={{
                            fontSize: `${sizes.textBase}px`,
                            padding: `${sizes.spacing2}px ${sizes.spacing3}px`,
                            borderRadius: `${sizes.radiusFull}px`,
                            minWidth: `${sizes.spacing8}px`,
                          }}
                        >
                          {inCart.quantity}
                        </div>
                      ) : (
                        <div 
                          className="rounded-full bg-blue-500 flex items-center justify-center shadow-md" 
                          style={{
                            width: `${sizes.spacing8}px`,
                            height: `${sizes.spacing8}px`,
                          }}
                        >
                          <Plus size={Math.round(sizes.iconSize)} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <div className="rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4" style={{
                  width: `${sizes.avatarSize * 1.5}px`,
                  height: `${sizes.avatarSize * 1.5}px`
                }}>
                  <Package size={Math.round(sizes.iconSizeLg * 2)} className="text-gray-300" />
                </div>
                <p style={{ fontSize: `${sizes.textLg}px` }} className="text-gray-400 font-medium">No products found</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Cart Review */}
        {currentStep === 'cart' && (
          <div style={{ 
            paddingLeft: `${sizes.spacing8}px`, 
            paddingRight: `${sizes.spacing8}px`,
            display: 'flex',
            flexDirection: 'column',
            gap: `${sizes.spacing6}px`
          }}>
            {/* Customer Section */}
            {selectedCustomer ? (
              <div 
                className="bg-gray-50 flex items-center justify-between" 
                style={{ 
                  borderRadius: `${sizes.radiusXl}px`,
                  padding: `${sizes.spacing5}px`
                }}
              >
                <div className="flex items-center" style={{ gap: `${sizes.spacing4}px` }}>
                  <div 
                    className="rounded-full bg-blue-500 text-white flex items-center justify-center font-bold"
                    style={{
                      width: `${sizes.avatarSize}px`,
                      height: `${sizes.avatarSize}px`,
                      fontSize: `${sizes.textXl}px`
                    }}
                  >
                    {selectedCustomer.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p style={{ fontSize: `${sizes.textLg}px` }} className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                    <p style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-500">{selectedCustomer.phone}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="rounded-full bg-gray-200 active:bg-gray-300 flex items-center justify-center"
                  style={{ 
                    WebkitTapHighlightColor: 'transparent',
                    width: `${sizes.spacing8}px`,
                    height: `${sizes.spacing8}px`
                  }}
                >
                  <X size={sizes.iconSize} className="text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerModal(true)}
                className="w-full bg-gray-50 flex items-center justify-between active:bg-gray-100 transition-colors"
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  borderRadius: `${sizes.radiusXl}px`,
                  padding: `${sizes.spacing5}px`
                }}
              >
                <div className="flex items-center" style={{ gap: `${sizes.spacing4}px` }}>
                  <div 
                    className="rounded-full bg-gray-200 flex items-center justify-center"
                    style={{
                      width: `${sizes.spacing10}px`,
                      height: `${sizes.spacing10}px`
                    }}
                  >
                    <User size={sizes.iconSize} className="text-gray-500" />
                  </div>
                  <span style={{ fontSize: `${sizes.textLg}px` }} className="text-gray-600 font-medium">Add Customer</span>
                </div>
                <Plus size={sizes.iconSize} className="text-gray-400" />
              </button>
            )}

            {/* Discount Section */}
            <div 
              className="bg-gray-50" 
              style={{ 
                borderRadius: `${sizes.radiusXl}px`,
                padding: `${sizes.spacing5}px`
              }}
            >
              <div 
                className="flex items-center justify-between" 
                style={{ marginBottom: `${sizes.spacing4}px` }}
              >
                <span style={{ fontSize: `${sizes.textLg}px` }} className="font-semibold text-gray-900">Discount</span>
                <div className="flex items-center" style={{ gap: `${sizes.spacing2}px` }}>
                  <button
                    onClick={() => setDiscountType('percentage')}
                    className={`font-semibold transition-colors ${
                      discountType === 'percentage'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                    style={{
                      padding: `${sizes.spacing2}px ${sizes.spacing4}px`,
                      borderRadius: `${sizes.radiusMd}px`,
                      fontSize: `${sizes.textBase}px`
                    }}
                  >
                    %
                  </button>
                  <button
                    onClick={() => setDiscountType('fixed')}
                    className={`font-semibold transition-colors ${
                      discountType === 'fixed'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                    style={{
                      padding: `${sizes.spacing2}px ${sizes.spacing4}px`,
                      borderRadius: `${sizes.radiusMd}px`,
                      fontSize: `${sizes.textBase}px`
                    }}
                  >
                    TSh
                  </button>
                </div>
              </div>
              <input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="Enter discount"
                className="w-full bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{
                  padding: `${sizes.spacing4}px ${sizes.spacing5}px`,
                  borderRadius: `${sizes.radiusLg}px`,
                  fontSize: `${sizes.textLg}px`
                }}
              />
              {discountAmount > 0 && (
                <p 
                  style={{ 
                    fontSize: `${sizes.textBase}px`,
                    marginTop: `${sizes.spacing3}px`
                  }} 
                  className="text-green-600 font-medium"
                >
                  Discount: -{format.currency(discountAmount)}
                </p>
              )}
            </div>

            {/* Notes Section */}
            <div 
              className="bg-gray-50" 
              style={{ 
                borderRadius: `${sizes.radiusXl}px`,
                padding: `${sizes.spacing5}px`
              }}
            >
              <label 
                style={{ 
                  fontSize: `${sizes.textLg}px`,
                  marginBottom: `${sizes.spacing4}px`
                }} 
                className="font-semibold text-gray-900 block"
              >
                Order Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special instructions or notes..."
                rows={3}
                className="w-full bg-white border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                style={{
                  padding: `${sizes.spacing4}px ${sizes.spacing5}px`,
                  borderRadius: `${sizes.radiusLg}px`,
                  fontSize: `${sizes.textLg}px`
                }}
              />
            </div>

            {/* Cart Items - iOS List Style (Optimized for 1080x2400) */}
            <div 
              className="bg-gray-50 overflow-hidden" 
              style={{ borderRadius: `${sizes.radiusXl}px` }}
            >
              {cart.map((item, index) => (
                <div 
                  key={item.id} 
                  className={index !== cart.length - 1 ? 'border-b border-gray-200/50' : ''}
                  style={{ padding: `${sizes.spacing5}px` }}
                >
                  <div className="flex" style={{ gap: `${sizes.spacing5}px` }}>
                    {item.image && (
                      <div 
                        className="bg-white overflow-hidden shadow-sm flex-shrink-0" 
                        style={{ 
                          width: `${sizes.avatarSize * 1.8}px`,
                          height: `${sizes.avatarSize * 1.8}px`,
                          borderRadius: `${sizes.radiusLg}px`
                        }}
                      >
                        <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 
                        style={{ 
                          fontSize: `${sizes.textLg}px`,
                          marginBottom: `${sizes.spacing1}px`
                        }} 
                        className="font-semibold text-gray-900"
                      >
                        {item.productName}
                      </h3>
                      <p 
                        style={{ 
                          fontSize: `${sizes.textBase}px`,
                          marginBottom: `${sizes.spacing4}px`
                        }} 
                        className="text-gray-500"
                      >
                        {format.currency(item.unitPrice)} × {item.quantity} = {format.currency(item.totalPrice)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center bg-white shadow-md" 
                          style={{ borderRadius: `${sizes.radiusLg}px` }}
                        >
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="flex items-center justify-center active:bg-gray-100"
                            style={{ 
                              WebkitTapHighlightColor: 'transparent',
                              width: `${sizes.buttonHeight}px`,
                              height: `${sizes.buttonHeight}px`,
                              borderTopLeftRadius: `${sizes.radiusLg}px`,
                              borderBottomLeftRadius: `${sizes.radiusLg}px`
                            }}
                          >
                            <Minus size={sizes.iconSize} className="text-gray-600" strokeWidth={2.5} />
                          </button>
                          <span 
                            className="text-center font-bold"
                            style={{ 
                              fontSize: `${sizes.textLg}px`,
                              minWidth: `${sizes.spacing10}px`
                            }}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="flex items-center justify-center active:bg-gray-100"
                            disabled={item.quantity >= item.availableQuantity}
                            style={{ 
                              WebkitTapHighlightColor: 'transparent',
                              width: `${sizes.buttonHeight}px`,
                              height: `${sizes.buttonHeight}px`,
                              borderTopRightRadius: `${sizes.radiusLg}px`,
                              borderBottomRightRadius: `${sizes.radiusLg}px`
                            }}
                          >
                            <Plus size={sizes.iconSize} className="text-gray-600" strokeWidth={2.5} />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="rounded-full bg-red-100 active:bg-red-200 flex items-center justify-center"
                          style={{ 
                            WebkitTapHighlightColor: 'transparent',
                            width: `${sizes.spacing10}px`,
                            height: `${sizes.spacing10}px`
                          }}
                        >
                          <X size={sizes.iconSize} className="text-red-600" strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Clean Summary (Optimized for 1080x2400) */}
            <div 
              className="bg-gray-50" 
              style={{ 
                borderRadius: `${sizes.radiusXl}px`,
                padding: `${sizes.spacing6}px`
              }}
            >
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: `${sizes.spacing5}px`
              }}>
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: `${sizes.textLg}px` }} className="text-gray-600">Subtotal</span>
                  <span style={{ fontSize: `${sizes.textLg}px` }} className="font-semibold text-gray-900">{format.currency(cartSubtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: `${sizes.textLg}px` }} className="text-green-600">Discount</span>
                    <span style={{ fontSize: `${sizes.textLg}px` }} className="font-semibold text-green-600">-{format.currency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: `${sizes.textLg}px` }} className="text-gray-600">Tax ({TAX_RATE}%)</span>
                  <span style={{ fontSize: `${sizes.textLg}px` }} className="font-semibold text-gray-900">{format.currency(cartTax)}</span>
                </div>
                <div style={{ height: '2px' }} className="bg-gray-300" />
                <div className="flex justify-between items-center">
                  <span style={{ fontSize: `${sizes.text2xl}px` }} className="font-bold text-gray-900">Total</span>
                  <span style={{ fontSize: `${sizes.text3xl}px` }} className="font-bold text-gray-900">{format.currency(cartTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* iOS 17 Bottom Bar - Responsive */}
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200/50 safe-area-inset-bottom" style={{
        padding: `${sizes.spacing4}px ${sizes.spacing6}px`,
        paddingBottom: `calc(${sizes.spacing4}px + var(--safe-area-inset-bottom, 0px))`
      }}>
        {currentStep === 'products' && (
          <button
            onClick={nextStep}
            disabled={!canProceedToCart}
            className={`w-full font-semibold transition-all ${
              canProceedToCart
                ? 'bg-blue-500 text-white active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400'
            }`}
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              padding: `${sizes.spacing4}px`,
              borderRadius: `${sizes.radiusLg}px`,
              fontSize: `${sizes.textLg}px`,
              minHeight: `${sizes.buttonHeight}px`
            }}
          >
            {canProceedToCart ? `Continue (${cartItemCount})` : 'Add Items to Continue'}
          </button>
        )}

        {currentStep === 'cart' && (
          <div className="flex" style={{ gap: `${sizes.spacing3}px` }}>
            <button
              onClick={previousStep}
              className="bg-gray-100 text-gray-900 active:scale-95 transition-all font-semibold"
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                padding: `${sizes.spacing4}px ${sizes.spacing8}px`,
                borderRadius: `${sizes.radiusLg}px`,
                fontSize: `${sizes.textLg}px`,
                minHeight: `${sizes.buttonHeight}px`
              }}
            >
              Back
            </button>
            <button
              onClick={nextStep}
              disabled={!canProceedToPayment}
              className={`flex-1 font-semibold transition-all ${
                canProceedToPayment
                  ? 'bg-blue-500 text-white active:scale-[0.98]'
                  : 'bg-gray-200 text-gray-400'
              }`}
              style={{ 
                WebkitTapHighlightColor: 'transparent',
                padding: `${sizes.spacing4}px`,
                borderRadius: `${sizes.radiusLg}px`,
                fontSize: `${sizes.textLg}px`,
                minHeight: `${sizes.buttonHeight}px`
              }}
            >
              Pay {format.currency(cartTotal)}
            </button>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Variant Selection Modal */}
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
          onClose={() => {
            setShowPaymentModal(false);
            setCurrentStep('cart');
          }}
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
    </ResponsiveMobileWrapper>
  );
};

export default MobilePOS;

