import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Minus, X, User, Settings, ShoppingCart, Percent, Scan, Package } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useCustomers } from '../../../context/CustomersContext';
import { useInventoryStore } from '../../lats/stores/useInventoryStore';
import { saleProcessingService } from '../../../lib/saleProcessingService';
import { format } from '../../lats/lib/format';
import toast from 'react-hot-toast';
import MobileCustomerSelectionModal from '../components/MobileCustomerSelectionModal';
import MobileAddCustomerModal from '../components/MobileAddCustomerModal';
import MobilePaymentModal from '../components/MobilePaymentModal';
import ShareReceiptModal from '../../../components/ui/ShareReceiptModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import { SuccessIcons } from '../../../components/ui/SuccessModalIcons';
import { useMobileBranch } from '../hooks/useMobileBranch';

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
  const { currentBranch, loading: branchLoading } = useMobileBranch();
  const { customers, loading: customersLoading, error: customersError, refreshCustomers } = useCustomers();
  const { products: dbProducts, loadProducts, loadCategories } = useInventoryStore();
  const successModal = useSuccessModal();

  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState<any>(null);
  
  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Tax settings (default 18% VAT for Tanzania)
  const TAX_RATE = 18;
  const isTaxEnabled = true;

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Load products on mount and when branch changes
  useEffect(() => {
    const loadData = async () => {
      // Wait for branch to load
      if (branchLoading) return;

      try {
        console.log('🔍 [MobilePOS] Loading products for branch:', currentBranch?.name);
        await Promise.all([
          loadProducts({ page: 1, limit: 200 }),
          loadCategories()
        ]);
        console.log('✅ [MobilePOS] Products loaded successfully');
      } catch (error) {
        console.error('❌ Error loading data:', error);
        toast.error('Failed to load products');
      }
    };
    loadData();

    // Listen for branch changes
    const handleBranchChange = () => {
      console.log('🔄 [MobilePOS] Branch changed, reloading products...');
      loadData();
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => {
      window.removeEventListener('branchChanged', handleBranchChange);
    };
  }, [currentBranch, branchLoading, loadProducts, loadCategories]);

  // Check authentication status
  useEffect(() => {
    if (!currentUser) {
      console.warn('⚠️ No authenticated user - customers may not load');
    } else {
      console.log('✅ User authenticated:', currentUser.email || currentUser.id);
    }
  }, [currentUser]);

  // Monitor customer loading
  useEffect(() => {
    console.log('📊 Customer State:', {
      loading: customersLoading,
      error: customersError,
      count: customers.length,
      hasUser: !!currentUser
    });

    if (!customersLoading) {
      if (customersError) {
        console.error('❌ Customers error:', customersError);
        toast.error('Failed to load customers. Click to retry.', {
          duration: 5000,
          onClick: () => {
            refreshCustomers();
          }
        });
      } else {
        console.log(`✅ Customers loaded: ${customers.length} customers`);
        if (customers.length === 0) {
          console.warn('⚠️ No customers found in database');
          console.log('💡 Tip: You can add a customer using the "Add Customer" button');
        } else {
          console.log('📋 Customer list:', customers.map(c => ({ id: c.id, name: c.name })));
        }
      }
    } else {
      console.log('⏳ Loading customers...');
    }
  }, [customers, customersLoading, customersError, currentUser]);

  // Transform products for display
  const products = useMemo(() => {
    return dbProducts.map(product => {
      // Get the first variant's price or product price
      const variant = product.variants?.[0];
      const price = variant?.sellingPrice ?? variant?.price ?? product.price ?? 0;
      const stockQuantity = variant?.quantity ?? product.quantity ?? 0;
      
      return {
        id: product.id,
        name: product.name,
        price: typeof price === 'string' ? parseFloat(price) : Number(price),
        category: product.categoryName || 'Uncategorized',
        image: product.thumbnail_url || '',
        stockQuantity: stockQuantity,
        variants: product.variants || [],
        sku: product.sku || 'N/A'
      };
    });
  }, [dbProducts]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    return ['All', ...cats];
  }, [products]);

  // Filter products by search and category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           p.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Add to cart
  const addToCart = useCallback((product: any) => {
    const variant = product.variants[0];
    const price = variant?.sellingPrice ?? variant?.price ?? product.price;
    
    if (!price || price <= 0) {
      toast.error('Invalid product price');
      return;
    }

    if (product.stockQuantity <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity + 1 > product.stockQuantity) {
        toast.error(`Only ${product.stockQuantity} units available`);
        return;
      }
      
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { 
              ...item, 
              quantity: item.quantity + 1,
              totalPrice: (item.quantity + 1) * item.unitPrice 
            }
          : item
      ));
      toast.success(`${product.name} quantity updated`);
    } else {
      const newItem: CartItem = {
        id: `${product.id}-${variant?.id || 'default'}-${Date.now()}`,
        productId: product.id,
        variantId: variant?.id || 'default',
        productName: product.name,
        variantName: variant?.name || 'Default',
        sku: product.sku,
        quantity: 1,
        unitPrice: price,
        totalPrice: price,
        availableQuantity: product.stockQuantity,
        image: product.image
      };
      
      setCart([...cart, newItem]);
      toast.success(`${product.name} added to cart`);
    }
  }, [cart]);

  // Update quantity
  const updateQuantity = useCallback((itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        
        if (newQuantity <= 0) {
          return item; // Will be filtered out
        }
        
        if (newQuantity > item.availableQuantity) {
          toast.error(`Only ${item.availableQuantity} units available`);
          return item;
        }
        
        return {
          ...item,
          quantity: newQuantity,
          totalPrice: newQuantity * item.unitPrice
        };
      }
      return item;
    }).filter(item => item.quantity > 0));
  }, [cart]);

  // Remove from cart
  const removeFromCart = useCallback((itemId: string) => {
    const item = cart.find(i => i.id === itemId);
    setCart(cart.filter(i => i.id !== itemId));
    if (item) {
      toast.success(`${item.productName} removed from cart`);
    }
  }, [cart]);

  // Clear cart
  const clearCart = useCallback(() => {
    setCart([]);
    setManualDiscount(0);
    setDiscountValue('');
    setSelectedCustomer(null);
    toast.success('Cart cleared');
  }, []);

  // Calculate totals
  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const discountAmount = manualDiscount || 0;
  const subtotalAfterDiscount = totalAmount - discountAmount;
  const taxAmount = isTaxEnabled ? (subtotalAfterDiscount * TAX_RATE) / 100 : 0;
  const finalAmount = subtotalAfterDiscount + taxAmount;

  // Apply discount
  const applyDiscount = useCallback(() => {
    if (!discountValue) {
      toast.error('Enter discount amount');
      return;
    }

    const value = parseFloat(discountValue);
    if (isNaN(value) || value < 0) {
      toast.error('Invalid discount value');
      return;
    }

    const calculatedDiscount = discountType === 'percentage' 
      ? (totalAmount * value) / 100
      : value;

    if (calculatedDiscount >= totalAmount) {
      toast.error('Discount cannot exceed total amount');
      return;
    }

    setManualDiscount(calculatedDiscount);
    setShowDiscountInput(false);
    toast.success('Discount applied');
  }, [discountValue, discountType, totalAmount]);

  // Process payment
  const handleCheckout = useCallback(() => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (finalAmount <= 0) {
      toast.error('Invalid total amount');
      return;
    }

    setShowPaymentModal(true);
  }, [cart, finalAmount]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        {/* Customer Loading Banner */}
        {customersLoading && (
          <div className="mb-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-[14px] text-blue-800">Loading customers...</span>
          </div>
        )}
        {customersError && (
          <div className="mb-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[14px] text-red-800">Failed to load customers</span>
            <button
              onClick={() => refreshCustomers()}
              className="text-[12px] bg-red-600 text-white px-2 py-1 rounded-md hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[32px] font-bold text-black tracking-tight">POS</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings size={20} className="text-blue-500" />
            </button>
          </div>
        </div>
        
        {/* Search Bar with Barcode */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} strokeWidth={2} />
            <input
              type="text"
              placeholder="Search products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-[#f2f2f7] border-0 rounded-lg focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 text-[15px] font-light"
              style={{ WebkitAppearance: 'none' }}
            />
          </div>
          <button
            onClick={() => toast('Barcode scanner coming soon!', { icon: '📸' })}
            className="p-2 bg-[#f2f2f7] rounded-lg hover:bg-gray-300 active:bg-gray-400 transition-colors"
            aria-label="Scan barcode"
          >
            <Scan size={20} className="text-gray-600" strokeWidth={2} />
          </button>
        </div>

        {/* Category Filter */}
        <div className="mt-3">
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className="flex items-center gap-2 text-blue-500 text-[14px] font-medium"
          >
            <span>Categories</span>
            {selectedCategory !== 'All' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[12px] font-semibold">
                {selectedCategory}
              </span>
            )}
            <span className={`transition-transform ${showCategoryFilter ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showCategoryFilter && (
            <div className="flex gap-2 overflow-x-auto pb-2 pt-2 scrollbar-hide -mx-4 px-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    if (category !== 'All') {
                      setShowCategoryFilter(false);
                    }
                  }}
                  className={`px-4 py-2 rounded-full text-[14px] font-medium whitespace-nowrap transition-all ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - iOS 17 Style */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => {
              if (customersLoading) {
                toast('Loading customers, please wait...', { icon: '⏳' });
                return;
              }
              if (customers.length === 0) {
                toast('No customers found. Add a customer first.', { 
                  icon: '👥',
                  duration: 3000
                });
                setShowAddCustomerModal(true);
                return;
              }
              setShowCustomerModal(true);
            }}
            disabled={customersLoading}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl text-[15px] font-semibold hover:bg-blue-600 active:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <User size={18} strokeWidth={2.5} />
            {customersLoading ? (
              'Loading...'
            ) : selectedCustomer ? (
              'Change'
            ) : (
              'Customer'
            )}
          </button>
          <button
            onClick={() => setShowDiscountInput(!showDiscountInput)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[15px] font-semibold transition-all shadow-sm ${
              showDiscountInput || manualDiscount > 0
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Percent size={18} strokeWidth={2.5} />
            {manualDiscount > 0 ? `TSh ${manualDiscount.toLocaleString()}` : 'Discount'}
          </button>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center justify-center bg-red-500 text-white px-4 py-2.5 rounded-xl text-[15px] font-semibold hover:bg-red-600 active:bg-red-700 transition-all shadow-sm"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Cart Summary Badge */}
        {cart.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart size={18} className="text-blue-600" strokeWidth={2} />
                <span className="text-[15px] text-blue-900 font-medium">
                  {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
                </span>
              </div>
              <span className="text-[17px] text-blue-600 font-bold">
                TSh {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Discount Input - iOS Style */}
        {showDiscountInput && (
          <div className="mt-3 p-4 bg-white rounded-xl border border-gray-200">
            {/* Type Selector */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-[15px] font-medium transition-all ${
                  discountType === 'percentage' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Percentage %
              </button>
              <button
                onClick={() => setDiscountType('fixed')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-[15px] font-medium transition-all ${
                  discountType === 'fixed' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Fixed Amount
              </button>
            </div>
            
            {/* Amount Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                {discountType === 'fixed' && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-[16px]">
                    TSh
                  </div>
                )}
                <input
                  type="number"
                  placeholder={discountType === 'percentage' ? 'Enter %' : 'Amount'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className={`w-full ${discountType === 'fixed' ? 'pl-12' : 'pl-4'} pr-4 py-3 bg-gray-50 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-[16px] text-gray-900 placeholder-gray-400`}
                  style={{ WebkitAppearance: 'none' }}
                />
                {discountType === 'percentage' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-[16px]">
                    %
                  </div>
                )}
              </div>
              <button
                onClick={applyDiscount}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg text-[15px] font-semibold hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
              >
                Apply
              </button>
            </div>
            
            {/* Preview */}
            {discountValue && parseFloat(discountValue) > 0 && (
              <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                <div className="text-[13px] text-blue-600">
                  {discountType === 'percentage' 
                    ? `${discountValue}% discount = TSh ${((totalAmount * parseFloat(discountValue)) / 100).toLocaleString()}`
                    : `Discount = TSh ${parseFloat(discountValue).toLocaleString()}`
                  }
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4" style={{ 
        paddingBottom: cart.length > 0 ? '400px' : '16px' 
      }}>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Package size={40} className="text-gray-400" strokeWidth={1.5} />
            </div>
            <p className="text-gray-500 text-[15px]">No products found</p>
            <p className="text-[13px] text-gray-400 mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stockQuantity <= 0}
                className={`bg-white rounded-xl p-3 border text-left transition-all ${
                  product.stockQuantity <= 0
                    ? 'border-gray-200 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-blue-300 active:bg-gray-50'
                }`}
              >
                {/* Product Image */}
                {typeof product.image === 'string' && product.image.startsWith('http') ? (
                  <img src={product.image} alt={product.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                ) : (
                  <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center mb-2">
                    <Package size={32} className="text-gray-400" strokeWidth={1.5} />
                  </div>
                )}
                
                {/* Product Details */}
                <div className="font-medium text-gray-900 text-[14px] mb-1 line-clamp-2">
                  {product.name}
                </div>
                <div className="text-[12px] text-gray-500 mb-2">{product.category}</div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-blue-600 font-semibold text-[15px]">
                    TSh {product.price.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {product.stockQuantity} left
                  </div>
                </div>
                {product.stockQuantity <= 0 && (
                  <div className="mt-1 text-[11px] text-red-600 font-semibold">Out of Stock</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Customer Banner - Fixed Position */}
      {selectedCustomer && cart.length > 0 && (
        <div className="fixed bottom-[340px] left-0 right-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-t border-b border-blue-200 px-4 py-2.5 shadow-lg z-20">
          <div className="flex items-center gap-2">
            {/* Avatar with Initials */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-[14px] shadow-md flex-shrink-0">
              {getInitials(selectedCustomer.name)}
            </div>
            
            {/* Customer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">
                  Sale For
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 truncate">
                {selectedCustomer.name}
              </h3>
            </div>
            
            {/* Remove Button */}
            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-red-50 active:bg-red-100 transition-colors shadow-sm flex-shrink-0 border border-gray-200"
              aria-label="Remove customer"
            >
              <X size={14} className="text-red-500" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Cart Summary - Fixed Bottom */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-2xl z-20" style={{
          maxHeight: selectedCustomer ? 'calc(100vh - 400px)' : 'calc(100vh - 350px)'
        }}>
          {/* Cart Items */}
          <div className="max-h-32 overflow-y-auto px-4 pt-3 space-y-2 scrollbar-thin">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                <div className="w-10 h-10 flex-shrink-0">
                  {typeof item.image === 'string' && item.image.startsWith('http') ? (
                    <img src={item.image} alt={item.productName} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                      <Package size={20} className="text-gray-400" strokeWidth={1.5} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[13px] text-gray-900 truncate">{item.productName}</div>
                  <div className="text-[11px] text-gray-500">
                    TSh {item.unitPrice.toLocaleString()} × {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 active:bg-gray-400"
                  >
                    <Minus size={12} strokeWidth={3} />
                  </button>
                  <span className="font-semibold text-[13px] w-7 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 rounded-full bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700"
                  >
                    <Plus size={12} strokeWidth={3} />
                  </button>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="p-1 text-red-500 hover:bg-red-50 rounded-full active:bg-red-100"
                  >
                    <X size={14} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totals - iOS 17 Style */}
          <div className="px-4 py-3 space-y-1.5 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-[14px] text-gray-600">Subtotal</span>
              <span className="text-[15px] font-medium text-gray-900">TSh {totalAmount.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-green-600">Discount</span>
                <span className="text-[15px] font-medium text-green-600">-TSh {discountAmount.toLocaleString()}</span>
              </div>
            )}
            {isTaxEnabled && (
              <div className="flex justify-between items-center">
                <span className="text-[14px] text-gray-600">Tax ({TAX_RATE}%)</span>
                <span className="text-[15px] font-medium text-gray-900">TSh {taxAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-gray-300">
              <span className="text-[16px] font-semibold text-gray-900">Total</span>
              <span className="text-[22px] font-bold text-blue-600">
                TSh {finalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Checkout Button - iOS 17 Style */}
          <div className="px-4 py-3 bg-white border-t border-gray-100">
            <button 
              onClick={handleCheckout}
              className="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-6 py-3.5 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-2 shadow-lg transition-all active:scale-98"
            >
              <ShoppingCart size={20} strokeWidth={2.5} />
              Checkout • {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <MobileCustomerSelectionModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onCustomerSelect={(customer) => {
          setSelectedCustomer(customer);
          toast.success(`Customer "${customer.name}" selected`);
        }}
        onAddNew={() => setShowAddCustomerModal(true)}
        selectedCustomer={selectedCustomer}
      />

      <MobileAddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerCreated={(customer) => {
          setSelectedCustomer(customer);
          setShowAddCustomerModal(false);
          toast.success(`Customer "${customer.name}" created`);
        }}
        onAddAnother={() => setShowAddCustomerModal(true)}
      />

      <MobilePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        amount={finalAmount}
        customerId={selectedCustomer?.id}
        customerName={selectedCustomer?.name || 'Walk-in Customer'}
        description={`POS Sale - ${cart.length} items`}
        onPaymentComplete={async (payments, totalPaid) => {
          try {
            const saleData = {
              customerId: selectedCustomer?.id || null,
              customerName: selectedCustomer?.name || 'Walk-in Customer',
              customerPhone: selectedCustomer?.phone || null,
              customerEmail: selectedCustomer?.email || null,
              branchId: currentBranch?.id || null, // Include branch ID in sale
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
                profit: 0
              })),
              subtotal: totalAmount,
              tax: taxAmount,
              discount: discountAmount,
              discountType: discountType,
              discountValue: parseFloat(discountValue) || 0,
              total: finalAmount,
              paymentMethod: {
                type: payments.length === 1 ? payments[0].paymentMethod : 'multiple',
                details: {
                  payments: payments.map((p: any) => ({
                    method: p.paymentMethod,
                    amount: p.amount,
                    accountId: p.paymentAccountId,
                    reference: p.reference,
                    notes: p.notes,
                    timestamp: p.timestamp
                  })),
                  totalPaid: totalPaid || finalAmount
                },
                amount: totalPaid || finalAmount
              },
              paymentStatus: 'completed' as const,
              soldBy: currentUser?.name || currentUser?.email || 'POS User',
              soldAt: new Date().toISOString(),
              notes: payments.map((p: any) => p.notes).filter(Boolean).join('; ') || undefined
            };

            const result = await saleProcessingService.processSale(saleData);

            if (result.success) {
              const receiptData = {
                id: result.sale?.id || '',
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                items: cart.map(item => ({
                  productName: item.productName,
                  variantName: item.variantName,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.totalPrice
                })),
                customer: selectedCustomer ? {
                  name: selectedCustomer.name,
                  phone: selectedCustomer.phone,
                  email: selectedCustomer.email
                } : null,
                subtotal: totalAmount,
                tax: taxAmount,
                discount: discountAmount,
                total: finalAmount,
                paymentMethod: {
                  name: payments.length === 1 ? payments[0].paymentMethod : 'Multiple Payments',
                  description: `${payments.length} payment(s) - ${format.money(totalPaid || finalAmount)}`,
                  icon: 'CreditCard'
                },
                cashier: currentUser?.name || 'POS User',
                receiptNumber: result.sale?.saleNumber || 'N/A'
              };

              setCurrentReceipt(receiptData);
              setShowPaymentModal(false);

              setTimeout(() => {
                successModal.show(
                  `Payment of ${format.money(totalPaid || finalAmount)} processed successfully!${result.sale?.saleNumber ? ` Sale #${result.sale.saleNumber}` : ''}`,
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
                        label: 'New Sale',
                        onClick: () => {
                          successModal.hide();
                        },
                        variant: 'secondary',
                      }
                    ],
                  }
                );
              }, 100);

              setTimeout(() => {
                clearCart();
              }, 150);
            } else {
              toast.error(result.error || 'Failed to process sale');
              setShowPaymentModal(false);
            }
          } catch (error: any) {
            console.error('Payment error:', error);
            toast.error(`Payment failed: ${error.message}`);
          }
        }}
      />

      <ShareReceiptModal
        isOpen={showShareReceipt}
        onClose={() => setShowShareReceipt(false)}
        onPrintReceipt={() => {
          setShowShareReceipt(false);
          toast.success('Receipt printed');
        }}
        receiptData={{
          receiptNumber: currentReceipt?.receiptNumber || 'N/A',
          amount: currentReceipt?.total || 0,
          customerName: currentReceipt?.customer?.name || selectedCustomer?.name,
          customerPhone: currentReceipt?.customer?.phone || selectedCustomer?.phone,
          customerEmail: currentReceipt?.customer?.email || selectedCustomer?.email,
          items: currentReceipt?.items || [],
        }}
      />

      <SuccessModal {...successModal} />
    </div>
  );
};

export default MobilePOS;
