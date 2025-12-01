// POcreate component for LATS module - Interactive Purchase Order Creation
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';

import POTopBar from '../components/purchase-order/POTopBar';
import {
  Search, QrCode, Plus, CheckCircle, XCircle, RefreshCw,
  User, Phone, Mail, Command, Truck, Coins, DollarSign, ShoppingBag, AlertTriangle, X, Building, ShoppingCart, Package,
  Keyboard, Upload, Bookmark, FileSpreadsheet, FileText, History, ChevronDown, ChevronUp, Loader2,
  Eye, Edit, Printer
} from 'lucide-react';

import { useInventoryStore } from '../stores/useInventoryStore';
import { getLatsProvider } from '../lib/data/provider';
import { getExchangeRateInfo } from '../lib/exchangeRateUtils';
import { useDialog } from '../../shared/hooks/useDialog';
import { usePOSClickSounds } from '../hooks/usePOSClickSounds';

// Import purchase order specific components
import VariantProductCard from '../components/pos/VariantProductCard';
import SupplierSelectionModal from '../components/purchase-order/SupplierSelectionModal';
import PurchaseOrderDraftModal from '../components/purchase-order/PurchaseOrderDraftModal';
import ShippingConfigurationModal from '../components/purchase-order/ShippingConfigurationModal';
import CurrencySelector from '../components/purchase-order/CurrencySelector';
import EnhancedAddSupplierModal from '../../settings/components/EnhancedAddSupplierModal';
import AddProductModal from '../components/product/AddProductModal';
import PurchaseCartItem from '../components/purchase-order/PurchaseCartItem';
import ProductDetailModal from '../components/purchase-order/ProductDetailModal';
import OrderManagementModal from '../components/purchase-order/OrderManagementModal';
import InstallmentManagementModal from '../components/pos/InstallmentManagementModal';
import { useSuccessModal } from '../../../hooks/useSuccessModal';
import SuccessModal from '../../../components/ui/SuccessModal';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Import new enhancement components
import KeyboardShortcutsModal from '../components/purchase-order/KeyboardShortcutsModal';
import LowStockSuggestionsWidget from '../components/purchase-order/LowStockSuggestionsWidget';
import RecentlyOrderedWidget from '../components/purchase-order/RecentlyOrderedWidget';
import POBarcodeScanner from '../components/purchase-order/POBarcodeScanner';
import BulkImportModal from '../components/purchase-order/BulkImportModal';
import SupplierQuickInfoCard from '../components/purchase-order/SupplierQuickInfoCard';
import OrderTemplatesModal, { POTemplate } from '../components/purchase-order/OrderTemplatesModal';
import EmailPOModal, { EmailData } from '../components/purchase-order/EmailPOModal';

import { toast } from 'react-hot-toast';
import PaymentsPopupModal from '../../../components/PaymentsPopupModal';
import ComprehensivePaymentModal from '../components/pos/ComprehensivePaymentModal';

// Shipping defaults function
const getShippingDefaults = () => ({
  defaultAddress: 'Dar es Salaam, Tanzania',
  defaultCity: 'Dar es Salaam',
  defaultCountry: 'Tanzania'
});

// Print content generator
const generatePrintContent = async (order: any) => {
  // Get business info from settings
  const { businessInfoService } = await import('../../../lib/businessInfoService');
  const businessInfo = await businessInfoService.getBusinessInfo();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Purchase Order ${order.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .company-logo { height: 60px; width: auto; margin: 0 auto 10px; display: block; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
        .order-details { margin-bottom: 30px; }
        .supplier-info { margin-bottom: 30px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .items-table th { background-color: #f2f2f2; }
        .total-section { text-align: right; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        ${businessInfo.logo ? `<img src="${businessInfo.logo}" alt="${businessInfo.name} Logo" class="company-logo" />` : ''}
        <div class="company-name">${businessInfo.name}</div>
        <div>Purchase Order</div>
      </div>
      
      <div class="order-details">
        <h3>Order Details</h3>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Currency:</strong> ${order.currency}</p>
      </div>
      
      <div class="supplier-info">
        <h3>Supplier Information</h3>
        <p><strong>Name:</strong> ${order.supplier?.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${order.supplier?.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${order.supplier?.phone || 'N/A'}</p>
      </div>
      
      <table class="items-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Variant</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${order.items?.map((item: any) => `
            <tr>
              <td>${item.product?.name || 'N/A'}</td>
              <td>${item.variant?.name || 'N/A'}</td>
              <td>${item.quantity}</td>
              <td>${formatMoney(item.costPrice, order.currency)}</td>
              <td>${formatMoney(item.totalPrice, order.currency)}</td>
            </tr>
          `).join('') || '<tr><td colspan="5">No items</td></tr>'}
        </tbody>
      </table>
      
      <div class="total-section">
        <p><strong>Total Amount: ${formatMoney(order.totalAmount, order.currency)}</strong></p>
      </div>
      
      <div class="footer">
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
};

// PDF content generator
const generatePDFContent = async (order: any) => {
  // This is a simplified PDF generation - in production, use a proper PDF library
  const htmlContent = await generatePrintContent(order);
  return htmlContent;
};
import { 
  SUPPORTED_CURRENCIES, 
  PurchaseOrderStatus,
  formatMoney,
  generatePONumber,
  validatePurchaseOrder,
  Currency
} from '../lib/purchaseOrderUtils';
import { purchaseOrderDraftService, PurchaseOrderDraft } from '../lib/draftService';

// Performance optimization constants
const SEARCH_DEBOUNCE_MS = 300;

// LocalStorage key for session persistence
const PO_SESSION_KEY = 'po_create_session';
const PO_SESSION_TIMESTAMP_KEY = 'po_create_session_timestamp';

interface PurchaseCartItemType {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantName?: string;
  sku: string;
  costPrice: number;
  sellingPrice?: number; // Store selling price for PO tracking
  quantity: number;
  totalPrice: number;
  currentStock?: number;
  category?: string;
  images?: string[];
}

interface Supplier {
  id: string;
  name: string;
  company_name?: string;
  contactPerson?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  wechat?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: string;
  exchangeRates?: string;
  exchange_rate?: number;
  leadTimeDays?: number;
  preferred_currency?: string;
  currency?: string; // Legacy field
  isActive: boolean;
  is_active?: boolean;
  rating?: number;
  description?: string;
  notes?: string;
}

// Performance optimization hook
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

const POcreate: React.FC = () => {
  console.log('🔧 POcreate component initializing...');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { confirm, alert, confirmationDialog, alertDialog, hideConfirmation, hideAlert } = useDialog();
  const { playClickSound } = usePOSClickSounds();
  const successModal = useSuccessModal();
  
  // Get edit and duplicate parameters from URL (now reactive to URL changes)
  const editOrderId = searchParams.get('edit');
  const duplicateOrderId = searchParams.get('duplicate');
  
  const isEditMode = useMemo(() => !!editOrderId, [editOrderId]);
  const isDuplicateMode = useMemo(() => !!duplicateOrderId, [duplicateOrderId]);
  
  // Database state management
  const {
    products: dbProducts,
    categories,
    suppliers,
    loadProducts,
    loadCategories,
    loadSuppliers,
    createPurchaseOrder,
    updatePurchaseOrder,
    getPurchaseOrder
  } = useInventoryStore();

  // Debounced search for better performance
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, SEARCH_DEBOUNCE_MS);
  
  // Ref for search input to enable keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Enhanced search and filtering state
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [stockFilter, setStockFilter] = useState<'all' | 'in-stock' | 'low-stock' | 'out-of-stock'>('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'recent' | 'supplier'>('recent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Use database products and transform them
  const products = useMemo(() => {
    // Return empty array if no products or categories are loaded yet
    if (dbProducts.length === 0 || categories.length === 0) {
      return [];
    }

    // Note: Showing ALL products including test/sample products as per user preference
    const filteredDbProducts = dbProducts;
    
    
    const transformedProducts = filteredDbProducts.map(product => {
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
      
      
              // Convert ProductImage[] to string[] for ProductSearchResult compatibility
        const imageUrls = Array.isArray(product.images) 
          ? product.images.map(img => typeof img === 'string' ? img : (img as any).url || (img as any).image_url || '')
          : [];
        
        return {
          ...product,
          categoryName,
          categoryId: foundCategory?.id || categoryId, // Ensure consistent categoryId
          images: imageUrls.filter(Boolean), // Convert to string[] and filter out empty strings
          tags: [],
          variants: product.variants?.map(variant => ({
            ...variant,
            id: variant.id || `variant-${Date.now()}`,
            sellingPrice: variant.price || product.price || 0,
            quantity: variant.stockQuantity || 0
          })) || []
        };
    });
    
    return transformedProducts;
  }, [dbProducts, categories]);

  // Add loading and error state display
  const { isLoading, error } = useInventoryStore();

  // Optimized filtered products
  const filteredProducts = useMemo(() => {
    if (showSearchResults && searchResults.length > 0) {
      return searchResults;
    }
    
    let filtered = products;
    
    // Basic search filter with enhanced variant search
    if (debouncedSearchQuery.trim() && !showSearchResults) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(product => {
        const mainVariant = product.variants?.[0];
        const category = categories?.find(c => c.id === product.categoryId)?.name || '';
        
        return (product.name?.toLowerCase() || '').includes(query) ||
               (mainVariant?.sku?.toLowerCase() || '').includes(query) ||
               (category.toLowerCase() || '').includes(query) ||
               // Enhanced variant search - search through all variant names and SKUs
               (product.variants && product.variants.some(variant => 
                 variant.name?.toLowerCase().includes(query) ||
                 variant.sku?.toLowerCase().includes(query) ||
                 variant.barcode?.toLowerCase().includes(query)
               ));
      });
    }
    
    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoryId === selectedCategory);
    }
    
    // Price range filter
    if (priceRange.min || priceRange.max) {
      filtered = filtered.filter(product => {
        const mainVariant = product.variants?.[0];
        const price = mainVariant?.costPrice || 0;
        const min = priceRange.min ? parseFloat(priceRange.min) : 0;
        const max = priceRange.max ? parseFloat(priceRange.max) : Infinity;
        return price >= min && price <= max;
      });
    }
    
    // Stock filter
    if (stockFilter !== 'all') {
      filtered = filtered.filter(product => {
        const mainVariant = product.variants?.[0];
        const stock = mainVariant?.stockQuantity || 0;
        
        switch (stockFilter) {
          case 'in-stock':
            return stock > 10;
          case 'low-stock':
            return stock > 0 && stock <= 10;
          case 'out-of-stock':
            return stock === 0;
          default:
            return true;
        }
      });
    }
    
    // Sorting
    filtered.sort((a, b) => {
      // Calculate total stock across all variants for each product
      const aTotalStock = a.variants?.reduce((sum, variant) => {
        return sum + (variant?.stockQuantity || variant?.quantity || 0);
      }, 0) || 0;
      const bTotalStock = b.variants?.reduce((sum, variant) => {
        return sum + (variant?.stockQuantity || variant?.quantity || 0);
      }, 0) || 0;
      
      // ✅ PRIORITY: Products with stock always appear above products without stock
      const aHasStock = aTotalStock > 0;
      const bHasStock = bTotalStock > 0;
      
      // If one has stock and the other doesn't, prioritize the one with stock
      if (aHasStock && !bHasStock) return -1;
      if (!aHasStock && bHasStock) return 1;
      
      // If both have stock or both don't have stock, apply normal sorting
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'price':
          aValue = a.variants?.[0]?.costPrice || a.price || 0;
          bValue = b.variants?.[0]?.costPrice || b.price || 0;
          break;
        case 'stock':
          aValue = aTotalStock;
          bValue = bTotalStock;
          break;
        case 'recent':
          aValue = new Date(a.createdAt || '').getTime();
          bValue = new Date(b.createdAt || '').getTime();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [products, categories, debouncedSearchQuery, selectedCategory, priceRange, stockFilter, sortBy, sortOrder, showSearchResults, searchResults]);

  // Load existing purchase order data for editing
  const loadPurchaseOrderForEdit = useCallback(async (orderId: string) => {
    if (!orderId) {
      return;
    }
    
    setIsLoadingEditData(true);
    setEditError(null);
    
    try {
      const response = await getPurchaseOrder(orderId);

      if (response.ok && response.data) {
        const order = response.data;

        // Store the existing purchase order data
        setExistingPurchaseOrder(order);

        // Load supplier data
        if (order.supplierId) {
          const supplier = suppliers.find(s => s.id === order.supplierId);
          if (supplier) {
            setSelectedSupplier(supplier);
          }
        }
        
        // Load cart items from order
        if (order.items && order.items.length > 0) {
          const cartItems: PurchaseCartItem[] = order.items.map((item: any) => {
            // Ensure valid values for validation (costPrice and quantity must be > 0)
            const costPrice = item.costPrice && item.costPrice > 0 ? item.costPrice : 1;
            const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
            
            return {
            id: `${item.productId}-${item.variantId}-${Date.now()}`,
            productId: item.productId,
            variantId: item.variantId,
            name: item.product?.name || 'Unknown Product',
            variantName: item.variant?.name || 'Default Variant',
            sku: item.variant?.sku || 'N/A',
              costPrice,
              quantity,
              totalPrice: costPrice * quantity,
            currentStock: item.variant?.stockQuantity || 0,
            category: item.product?.categoryName || 'Unknown Category',
            images: item.product?.images || []
            };
          });
          
          setPurchaseCartItems(cartItems);
        }
        
        // Set other order details
        if (order.expectedDelivery) {
          setExpectedDelivery(order.expectedDelivery);
          setShippingInfo(prev => ({
            ...prev,
            expectedDelivery: order.expectedDelivery
          }));
        }
        
        if (order.notes) {
          setPurchaseOrderNotes(order.notes);
        }
        
        if (order.paymentTerms) {
          setPaymentTerms(order.paymentTerms);
        }
        
        if (order.currency) {
          const currency = SUPPORTED_CURRENCIES.find(c => c.code === order.currency);
          if (currency) {
            setSelectedCurrency(currency);
          }
        }
        
        // Load exchange rate if available
        if (order.exchangeRate && order.exchangeRate !== 1.0) {
          // Format exchange rate string to match expected format
          const rateString = `1 ${order.currency} = ${Math.round(order.exchangeRate)} TZS`;
          setExchangeRates(rateString);
        }
        
        if (order.status) {
          setPurchaseOrderStatus(order.status);
        }
        
        toast.success(`Purchase order loaded for editing`);
      } else {
        const errorMsg = response.message || 'Failed to load purchase order for editing';
        setEditError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Error loading purchase order for editing';
      console.error('Error loading purchase order:', error);
      setEditError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingEditData(false);
    }
  }, [getPurchaseOrder, suppliers]);

  // Load data from database on component mount
  useEffect(() => {
    // 🚀 OPTIMIZED: Batch load all initial data in parallel with progress tracking
    const loadData = async () => {
      try {
        if (import.meta.env.MODE === 'development') {
          console.log('🔄 [POcreate] Starting optimized parallel data loading...');
        }

        // Batch load all initial data (3 concurrent requests)
        const [productsResult, categoriesResult, suppliersResult] = await Promise.allSettled([
          loadProducts({ page: 1, limit: 100 }).catch(err => {
            console.error('❌ Failed to load products:', err);
            return [];
          }),
          loadCategories().catch(err => {
            console.error('❌ Failed to load categories:', err);
            return [];
          }),
          loadSuppliers().catch(err => {
            console.error('❌ Failed to load suppliers:', err);
            return [];
          })
        ]);

        // Update state in batch to prevent multiple re-renders
        if (productsResult.status === 'fulfilled') {
          // Products are set in loadProducts function
        }
        if (categoriesResult.status === 'fulfilled') {
          // Categories are set in loadCategories function
        }
        if (suppliersResult.status === 'fulfilled') {
          // Suppliers are set in loadSuppliers function
        }

        if (import.meta.env.MODE === 'development') {
          console.log('✅ [POcreate] Optimized batch loading completed');
        }
      } catch (error) {
        console.error('❌ Error in optimized batch loading:', error);
        // Individual load functions handle their own errors
      }
    };
    
    loadData();
  }, [loadProducts, loadCategories, loadSuppliers]);

  // Load latest used exchange rate on component mount
  useEffect(() => {
    const latestExchangeRate = localStorage.getItem('po_latest_exchange_rate');
    if (latestExchangeRate && !isEditMode && !isDuplicateMode) {
      setLastUsedExchangeRate(latestExchangeRate);
      console.log('ℹ️ Suggested last exchange rate:', latestExchangeRate);
    }
  }, [isEditMode, isDuplicateMode]);

  // Load purchase order for editing when editOrderId is available
  useEffect(() => {
    if (editOrderId && suppliers.length > 0) {
      loadPurchaseOrderForEdit(editOrderId);
    } else if (!editOrderId) {
      // Reset existing purchase order when not in edit mode
      setExistingPurchaseOrder(null);
    }
  }, [editOrderId, suppliers.length, loadPurchaseOrderForEdit]);

  // Load purchase order for duplication - similar to edit but generates new order
  const loadPurchaseOrderForDuplication = useCallback(async (orderId: string) => {
    setIsLoadingEditData(true);
    setEditError('');
    
    try {
      console.log('📋 Loading purchase order for duplication:', orderId);
      const response = await getPurchaseOrder(orderId);
      
      if (response.ok && response.data) {
        const order = response.data;
        console.log('✅ Purchase order loaded for duplication:', order);
        
        // Set supplier
        if (order.supplierId) {
          const supplier = suppliers.find((s: Supplier) => s.id === order.supplierId);
          if (supplier) {
            setSelectedSupplier(supplier);
          }
        }
        
        // Set cart items from order items
        if (order.items && order.items.length > 0) {
          const cartItems = order.items.map((item: any) => {
            // Ensure valid values for validation (costPrice and quantity must be > 0)
            const costPrice = item.costPrice && item.costPrice > 0 ? item.costPrice : 1;
            const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
            
            return {
            id: `${item.productId}-${item.variantId}`,
            productId: item.productId,
            variantId: item.variantId,
            name: item.product?.name || 'Unknown Product',
            variantName: item.variant?.name || 'Default Variant',
            sku: item.variant?.sku || 'N/A',
              costPrice,
              quantity,
              totalPrice: costPrice * quantity,
            currentStock: item.variant?.stockQuantity || 0,
            category: item.product?.categoryName || 'Unknown Category',
            images: item.product?.images || []
            };
          });
          
          setPurchaseCartItems(cartItems);
        }
        
        // Set other order details (but don't copy order number or status)
        if (order.expectedDelivery) {
          setExpectedDelivery(order.expectedDelivery);
          setShippingInfo(prev => ({
            ...prev,
            expectedDelivery: order.expectedDelivery
          }));
        }
        
        if (order.notes) {
          setPurchaseOrderNotes(order.notes + ' (Duplicated)');
        }
        
        if (order.paymentTerms) {
          setPaymentTerms(order.paymentTerms);
        }
        
        if (order.currency) {
          const currency = SUPPORTED_CURRENCIES.find(c => c.code === order.currency);
          if (currency) {
            setSelectedCurrency(currency);
          }
        }
        
        // Load exchange rate if available
        if (order.exchangeRate && order.exchangeRate !== 1.0) {
          // Format exchange rate string to match expected format
          const rateString = `1 ${order.currency} = ${Math.round(order.exchangeRate)} TZS`;
          setExchangeRates(rateString);
        }
        
        // Always set status to draft for duplicated orders
        setPurchaseOrderStatus('draft');
        
        toast.success(`Purchase order duplicated successfully - Review and save`);
      } else {
        const errorMsg = response.message || 'Failed to load purchase order for duplication';
        setEditError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = 'Error loading purchase order for duplication';
      console.error('Error loading purchase order:', error);
      setEditError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoadingEditData(false);
    }
  }, [getPurchaseOrder, suppliers]);

  // Load purchase order for duplication when duplicateOrderId is available
  useEffect(() => {
    if (duplicateOrderId && suppliers.length > 0) {
      loadPurchaseOrderForDuplication(duplicateOrderId);
    }
  }, [duplicateOrderId, suppliers.length, loadPurchaseOrderForDuplication]);

  // Local state for purchase order
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null); // Fixed temporal dead zone issue
  const [hasRestoredSession, setHasRestoredSession] = useState(false);

  // Re-match supplier from session once suppliers are loaded
  useEffect(() => {
    if (hasRestoredSession && selectedSupplier && suppliers.length > 0) {
      // If we have a supplier from session, try to match it with the loaded suppliers
      // This ensures we have the latest supplier data
      const matchedSupplier = suppliers.find(s => s.id === selectedSupplier.id);
      if (matchedSupplier) {
        // Update to use the latest supplier data from the store
        setSelectedSupplier(matchedSupplier);
        console.log('🔄 [POcreate] Re-matched supplier from session with loaded suppliers');
      }
    }
  }, [hasRestoredSession, selectedSupplier, suppliers]);

  // Auto-open supplier selection modal for new purchase orders
  useEffect(() => {
    // Only show automatically for new purchase orders (not edit or duplicate mode)
    if (!isEditMode && !isDuplicateMode && !selectedSupplier && suppliers.length > 0 && !hasRestoredSession) {
      setShowSupplierSearch(true);
    }
  }, [isEditMode, isDuplicateMode, selectedSupplier, suppliers.length, hasRestoredSession]);
  const [purchaseCartItems, setPurchaseCartItems] = useState<PurchaseCartItem[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState(() => {
    // Default to TZS (Tanzanian Shilling) as the base currency
    return SUPPORTED_CURRENCIES.find(c => c.code === 'TZS') || SUPPORTED_CURRENCIES[0];
  });

  // Update currency when supplier is selected
  useEffect(() => {
    if (selectedSupplier?.currency) {
      const supplierCurrency = SUPPORTED_CURRENCIES.find(c => c.code === selectedSupplier.currency);
      if (supplierCurrency) {
        setSelectedCurrency(supplierCurrency);
      }
    }
  }, [selectedSupplier]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [exchangeRates, setExchangeRates] = useState('');
  const [lastUsedExchangeRate, setLastUsedExchangeRate] = useState('');
  const [purchaseOrderNotes, setPurchaseOrderNotes] = useState('');
  const [purchaseOrderStatus, setPurchaseOrderStatus] = useState<PurchaseOrderStatus>('sent');
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Calculate exchange rate info for use in components
  const exchangeRateInfo = getExchangeRateInfo(exchangeRates, selectedCurrency.code, 'TZS');
  const [paymentTerms, setPaymentTerms] = useState('Net 30'); // Default payment terms

  // Shipping info state
  const [shippingInfo, setShippingInfo] = useState({
    shippingMethod: 'standard' as 'air' | 'sea' | 'standard',
    expectedDelivery: '',
    shippingAddress: getShippingDefaults().defaultAddress,
    shippingCity: getShippingDefaults().defaultCity,
    shippingCountry: getShippingDefaults().defaultCountry,
    shippingPhone: '',
    shippingContact: '',
    shippingNotes: '',
    trackingNumber: '',
    estimatedCost: 0,
    carrier: 'DHL',
    requireSignature: false,
    enableInsurance: false,
    insuranceValue: 0
  });

  // Modal states
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showSupplierDetailsModal, setShowSupplierDetailsModal] = useState(false);
  const [expandedWidget, setExpandedWidget] = useState<'supplier' | 'lowStock' | 'recentOrders' | null>(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [showShippingConfigModal, setShowShippingConfigModal] = useState(false);
  const [createdPurchaseOrder, setCreatedPurchaseOrder] = useState<any>(null);
  const [showOrderManagementModal, setShowOrderManagementModal] = useState(false);
  const [showInstallmentManagementModal, setShowInstallmentManagementModal] = useState(false);
  const [showComprehensivePaymentModal, setShowComprehensivePaymentModal] = useState(false);
  const [showPOAnalyticsModal, setShowPOAnalyticsModal] = useState(false);
  const [showPOCollaborationModal, setShowPOCollaborationModal] = useState(false);
  const [showPOApprovalWorkflow, setShowPOApprovalWorkflow] = useState(false);
  const [showPOSummaryModal, setShowPOSummaryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // New enhancement modals
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  
  // Ref for click outside detection
  const widgetsContainerRef = useRef<HTMLDivElement>(null);
  
  // Edit mode state
  const [isLoadingEditData, setIsLoadingEditData] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [existingPurchaseOrder, setExistingPurchaseOrder] = useState<any>(null);
  
  // Cart item expansion state (similar to POS page)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Exchange rate calculation functions
  const parseExchangeRate = (exchangeRateText: string): number | null => {
    if (!exchangeRateText.trim()) return null;
    
    // Try to parse common exchange rate formats
    const patterns = [
      /1\s*([A-Z]{3})\s*=\s*([\d,]+\.?\d*)\s*([A-Z]{3})/i,  // "1 USD = 150 TZS"
      /([\d,]+\.?\d*)\s*([A-Z]{3})\s*=\s*1\s*([A-Z]{3})/i,  // "150 TZS = 1 USD"
      /([\d,]+\.?\d*)/i  // Just the number
    ];
    
    for (const pattern of patterns) {
      const match = exchangeRateText.match(pattern);
      if (match) {
        if (match.length === 4) {
          // Format: "1 USD = 150 TZS" or "150 TZS = 1 USD"
          const fromCurrency = match[1] || match[3];
          const toCurrency = match[3] || match[1];
          const rate = parseFloat(match[2].replace(/,/g, ''));
          
          if (fromCurrency === selectedCurrency.code && toCurrency === 'TZS') {
            return rate; // Direct rate to TZS
          } else if (fromCurrency === 'TZS' && toCurrency === selectedCurrency.code) {
            return 1 / rate; // Inverse rate from TZS
          }
        } else if (match.length === 2) {
          // Just the number - assume it's the rate to TZS
          return parseFloat(match[1].replace(/,/g, ''));
        }
      }
    }
    
    return null;
  };

  const convertToTZS = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === 'TZS') return amount;
    
    const exchangeRate = parseExchangeRate(exchangeRates);
    if (exchangeRate) {
      return amount * exchangeRate;
    }
    
    return amount; // Return original amount if no exchange rate
  };

  // Computed values for purchase order
  const subtotal = purchaseCartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const subtotalTZS = convertToTZS(subtotal, selectedCurrency.code);
  const discount = 0;
  const totalAmount = subtotal - discount;
  const totalAmountTZS = convertToTZS(totalAmount, selectedCurrency.code);

  // Handle adding product to purchase cart
  const handleAddToPurchaseCart = useCallback((product: any, variant?: any, quantity: number = 1) => {
    const selectedVariant = variant || product.variants?.[0];
    if (!selectedVariant) {
      alert('Product has no variants available', 'No Variants');
      return;
    }

    // Ensure costPrice is always > 0 to pass validation
    // Use nullish coalescing to properly handle 0 values
    const rawCostPrice = selectedVariant.costPrice ?? (product.price ? product.price * 0.7 : 0);
    const costPrice = rawCostPrice > 0 ? rawCostPrice : 1; // Minimum 1 for validation
    const sku = selectedVariant.sku || 'N/A';
    const currentStock = selectedVariant.stockQuantity || 0;
    
    setPurchaseCartItems(prevItems => {
      const existingItem = prevItems.find(item => 
        item.productId === product.id && item.variantId === selectedVariant.id
      );
      
      if (existingItem) {
        return prevItems.map(item =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + quantity,
                totalPrice: (item.quantity + quantity) * costPrice
              }
            : item
        );
      } else {
        const newItem: PurchaseCartItem = {
          id: `${product.id}-${selectedVariant.id}-${Date.now()}`,
          productId: product.id,
          variantId: selectedVariant.id,
          name: product.name,
          variantName: selectedVariant.name,
          sku: sku,
          costPrice: costPrice,
          sellingPrice: selectedVariant.sellingPrice || selectedVariant.price || 0, // Store selling price
          quantity: quantity,
          totalPrice: costPrice * quantity,
          currentStock: currentStock,
          category: product.categoryName,
  
          images: product.images || []
        };
        
        return [...prevItems, newItem];
      }
    });
    
    // Don't clear search - let user continue adding products from same search
  }, []);

  // Handle updating cart item quantity
  const handleUpdateQuantity = useCallback((itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setPurchaseCartItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }
    
    setPurchaseCartItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * item.costPrice
          };
        }
        return item;
      })
    );
  }, []);

  // Handle removing item from cart
  const handleRemoveFromCart = useCallback((itemId: string) => {
    setPurchaseCartItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Shipping info handler
  const handleSaveShippingInfo = useCallback((newShippingInfo: any) => {
    setShippingInfo(newShippingInfo);
    setExpectedDelivery(newShippingInfo.expectedDelivery);
    
    // Update shipping method display
    if (newShippingInfo.shippingMethod) {
      const methodDisplay: Record<string, string> = {
        'air': 'By Air',
        'sea': 'By Sea',
        'standard': 'Standard'
      };
      
      // Update the shipping method in the display
      setShippingInfo(prev => ({
        ...prev,
        shippingMethod: newShippingInfo.shippingMethod
      }));
    }
  }, []);

  // Handle updating item cost price
  const handleUpdateCostPrice = useCallback((itemId: string, newCostPrice: number) => {
    setPurchaseCartItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            costPrice: newCostPrice,
            totalPrice: item.quantity * newCostPrice
          };
        }
        return item;
      })
    );
  }, []);

  // Session persistence functions
  const saveSession = useCallback(() => {
    if (purchaseCartItems.length === 0 && !selectedSupplier) {
      // Don't save empty sessions
      console.log('ℹ️ [POcreate] Skipping save - empty session');
      return;
    }

    try {
      const sessionData = {
        purchaseCartItems,
        selectedSupplier,
        selectedCurrency,
        expectedDelivery,
        paymentTerms,
        purchaseOrderNotes,
        exchangeRates,
        shippingInfo
      };
      
      localStorage.setItem(PO_SESSION_KEY, JSON.stringify(sessionData));
      localStorage.setItem(PO_SESSION_TIMESTAMP_KEY, new Date().toISOString());
      console.log('💾 [POcreate] Session saved to localStorage', {
        cartItems: purchaseCartItems.length,
        supplier: selectedSupplier?.name,
        currency: selectedCurrency?.code
      });
    } catch (error) {
      console.error('❌ [POcreate] Failed to save session:', error);
      toast.error('Failed to save session to browser storage');
    }
  }, [purchaseCartItems, selectedSupplier, selectedCurrency, expectedDelivery, paymentTerms, purchaseOrderNotes, exchangeRates, shippingInfo]);

  const loadSession = useCallback(() => {
    try {
      const savedSession = localStorage.getItem(PO_SESSION_KEY);
      const savedTimestamp = localStorage.getItem(PO_SESSION_TIMESTAMP_KEY);
      
      if (!savedSession) {
        console.log('ℹ️ [POcreate] No saved session found');
        return false;
      }

      const sessionData = JSON.parse(savedSession);
      
      // Only restore if there's meaningful data
      if (!sessionData.purchaseCartItems || sessionData.purchaseCartItems.length === 0) {
        console.log('ℹ️ [POcreate] Session has no cart items, skipping restore');
        return false;
      }

      console.log('🔄 [POcreate] Restoring session...', {
        cartItems: sessionData.purchaseCartItems.length,
        supplier: sessionData.selectedSupplier?.name,
        currency: sessionData.selectedCurrency?.code
      });

      // Restore the session state
      setPurchaseCartItems(sessionData.purchaseCartItems || []);
      setSelectedSupplier(sessionData.selectedSupplier || null);
      setSelectedCurrency(sessionData.selectedCurrency || SUPPORTED_CURRENCIES[0]);
      setExpectedDelivery(sessionData.expectedDelivery || '');
      setPaymentTerms(sessionData.paymentTerms || 'Net 30');
      setPurchaseOrderNotes(sessionData.purchaseOrderNotes || '');
      setExchangeRates(sessionData.exchangeRates || '');
      if (sessionData.shippingInfo) {
        setShippingInfo(sessionData.shippingInfo);
      }

      // Mark session as restored
      setHasRestoredSession(true);

      // Auto-restore session silently - no notification needed
      console.log('✅ [POcreate] Session restored automatically from localStorage', {
        cartItems: sessionData.purchaseCartItems.length,
        supplier: sessionData.selectedSupplier?.name
      });
      return true;
    } catch (error) {
      console.error('❌ [POcreate] Failed to load session:', error);
      toast.error('Failed to restore previous session');
      return false;
    }
  }, []);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(PO_SESSION_KEY);
      localStorage.removeItem(PO_SESSION_TIMESTAMP_KEY);
      setHasRestoredSession(false);
      console.log('🗑️ [POcreate] Session cleared from localStorage');
    } catch (error) {
      console.error('❌ [POcreate] Failed to clear session:', error);
    }
  }, []);

  const discardSession = useCallback(() => {
    clearSession();
    setPurchaseCartItems([]);
    setSelectedSupplier(null);
    setExpectedDelivery('');
    setPaymentTerms('Net 30');
    setPurchaseOrderNotes('');
    setExchangeRates('');
    setShippingInfo({
      shippingMethod: 'standard' as 'air' | 'sea' | 'standard',
      expectedDelivery: '',
      shippingAddress: getShippingDefaults().defaultAddress,
      shippingCity: getShippingDefaults().defaultCity,
      shippingCountry: getShippingDefaults().defaultCountry,
      shippingPhone: '',
      shippingContact: '',
      shippingNotes: '',
      trackingNumber: '',
      estimatedCost: 0,
      carrier: 'DHL',
      requireSignature: false,
      enableInsurance: false,
      insuranceValue: 0
    });
    toast.success('Session discarded');
  }, [clearSession]);

  // Handle clear cart - Clear everything with custom UI dialog
  const handleClearCart = useCallback(async () => {
    console.log('🗑️ [CLEAR BUTTON] Clear cart clicked, items:', purchaseCartItems.length);
    
    if (purchaseCartItems.length > 0) {
      // Use custom UI confirm dialog
      const confirmed = await confirm(
        'Are you sure you want to clear everything?\n\n' +
        'This will remove:\n' +
        '• All cart items\n' +
        '• Selected supplier\n' +
        '• Order notes\n' +
        '• Shipping details'
      );
      
      console.log('✅ Confirmation result:', confirmed);
      
      if (confirmed) {
        console.log('🧹 Clearing all data...');
        
        try {
          // Clear cart items
          setPurchaseCartItems([]);
          // Clear supplier
          setSelectedSupplier(null);
          // Clear order details
          setExpectedDelivery('');
          setExchangeRates('');
          setPurchaseOrderNotes('');
          setPaymentTerms('Net 30'); // Reset to default
          // Clear shipping info
          setShippingInfo({
            address: '',
            city: '',
            country: '',
            zipCode: '',
            phoneNumber: '',
            expectedDelivery: '',
            shippingMethod: 'standard',
            trackingNumber: '',
            shippingCost: 0,
            notes: ''
          });
          
          // Clear localStorage session so it doesn't restore on refresh
          clearSession();
          
          console.log('✅ All data cleared successfully');
          toast.success('🗑️ Cart cleared! Everything has been removed.', {
            duration: 3000,
            style: {
              background: '#10b981',
              color: '#fff',
            },
          });
        } catch (error) {
          console.error('❌ Error in clear cart:', error);
          toast.error('Failed to clear cart');
        }
      } else {
        console.log('❌ User cancelled clear operation');
      }
    } else {
      console.log('ℹ️ No items to clear');
      toast.info('Cart is already empty');
    }
  }, [purchaseCartItems.length, confirm, clearSession]);

  // Auto-save functionality (for backward compatibility with draft service)
  const autoSaveDraft = useCallback(() => {
    if (purchaseCartItems.length > 0) {
      try {
        purchaseOrderDraftService.autoSave(
          purchaseCartItems,
          selectedSupplier,
          selectedCurrency,
          expectedDelivery,
          paymentTerms,
          purchaseOrderNotes,
          exchangeRates
        );
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }
  }, [purchaseCartItems, selectedSupplier, selectedCurrency, expectedDelivery, paymentTerms, purchaseOrderNotes, exchangeRates]);

  // Restore session on component mount (only if not in edit/duplicate mode)
  // Restore immediately on mount, don't wait for suppliers to load
  useEffect(() => {
    if (!isEditMode && !isDuplicateMode && !hasRestoredSession) {
      console.log('🔍 [POcreate] Checking for saved session to restore...');
      const restored = loadSession();
      if (!restored) {
        console.log('ℹ️ [POcreate] No session to restore, starting fresh');
      }
    }
  }, [isEditMode, isDuplicateMode, hasRestoredSession, loadSession]);

  // Auto-save session when cart or supplier changes (with shorter debounce for better persistence)
  useEffect(() => {
    // Don't save if we're still restoring session or in edit/duplicate mode
    if (hasRestoredSession && !isEditMode && !isDuplicateMode) {
      const timeoutId = setTimeout(() => {
        saveSession();
        autoSaveDraft();
      }, 500); // Reduced to 500ms for faster persistence

      return () => clearTimeout(timeoutId);
    }
  }, [purchaseCartItems, selectedSupplier, selectedCurrency, expectedDelivery, paymentTerms, purchaseOrderNotes, exchangeRates, shippingInfo, saveSession, autoSaveDraft, hasRestoredSession, isEditMode, isDuplicateMode]);

  // Save session immediately before page unload (refresh, close tab, etc.)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only save if we have data and not in edit/duplicate mode
      if (!isEditMode && !isDuplicateMode && (purchaseCartItems.length > 0 || selectedSupplier)) {
        // Save session synchronously before page unloads
        try {
          const sessionData = {
            purchaseCartItems,
            selectedSupplier,
            selectedCurrency,
            expectedDelivery,
            paymentTerms,
            purchaseOrderNotes,
            exchangeRates,
            shippingInfo
          };
          localStorage.setItem(PO_SESSION_KEY, JSON.stringify(sessionData));
          localStorage.setItem(PO_SESSION_TIMESTAMP_KEY, new Date().toISOString());
          console.log('💾 [POcreate] Session saved on page unload');
        } catch (error) {
          console.error('❌ [POcreate] Failed to save session on unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [purchaseCartItems, selectedSupplier, selectedCurrency, expectedDelivery, paymentTerms, purchaseOrderNotes, exchangeRates, shippingInfo, isEditMode, isDuplicateMode]);

  // Draft loading functionality
  const handleLoadDraft = useCallback((draft: PurchaseOrderDraft) => {
    try {
      setPurchaseCartItems(draft.cartItems || []);
      setSelectedSupplier(draft.supplier);
      setSelectedCurrency(draft.currency || SUPPORTED_CURRENCIES[0]);
      setExpectedDelivery(draft.expectedDelivery || '');
      setPaymentTerms(draft.paymentTerms || 'net_30');
      setPurchaseOrderNotes(draft.notes || '');
      setExchangeRates(draft.exchangeRates || '');
      
      toast.success(`Loaded draft: ${draft.name}`);
    } catch (error) {
      console.error('Failed to load draft:', error);
      toast.error('Failed to load draft. Please try again.');
    }
  }, []);

  // Handle supplier selection
  const handleSupplierSelect = useCallback((supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setExpandedWidget(null); // Collapse all widgets when selecting a new supplier
    
    // Auto-select currency from supplier
    const currencyCode = supplier.preferred_currency || supplier.currency;
    if (currencyCode) {
      const supplierCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
      if (supplierCurrency) {
        setSelectedCurrency(supplierCurrency);
        toast.success(`Currency automatically set to ${currencyCode} (${supplierCurrency.name})`);
      }
    } else {
      // Fallback to default currency if supplier doesn't specify one
      const defaultCurrency = SUPPORTED_CURRENCIES.find(c => c.code === 'TZS') || SUPPORTED_CURRENCIES[0];
      setSelectedCurrency(defaultCurrency);
      toast(`No supplier currency specified, using default: ${defaultCurrency.code}`);
    }
    
    // Set exchange rates if available
    if (supplier.exchangeRates) {
      setExchangeRates(supplier.exchangeRates);
      toast.success('Exchange rates loaded from supplier');
    }
    
    setShowSupplierSearch(false);
  }, []);

  // Handle supplier creation
  const handleSupplierCreated = useCallback((newSupplier: any) => {
    // Auto-select the newly created supplier
    setSelectedSupplier(newSupplier);
    
    // Auto-select currency from supplier
    if (newSupplier.currency) {
      const supplierCurrency = SUPPORTED_CURRENCIES.find(c => c.code === newSupplier.currency);
      if (supplierCurrency) {
        setSelectedCurrency(supplierCurrency);
        toast.success(`Currency automatically set to ${newSupplier.currency} (${supplierCurrency.name})`);
      }
    } else {
      // Fallback to default currency if supplier doesn't specify one
      const defaultCurrency = SUPPORTED_CURRENCIES.find(c => c.code === 'TZS') || SUPPORTED_CURRENCIES[0];
      setSelectedCurrency(defaultCurrency);
      toast(`No supplier currency specified, using default: ${defaultCurrency.code}`);
    }
    
    // Set exchange rates if available
    if (newSupplier.exchangeRates) {
      setExchangeRates(newSupplier.exchangeRates);
      toast.success('Exchange rates loaded from supplier');
    }
    
    // Reload suppliers list to include the new one
    loadSuppliers();
  }, [loadSuppliers]);

  // Handle product creation
  const handleProductCreated = useCallback((newProduct: any) => {
    // Refresh products list
    loadProducts();
    setShowAddProductModal(false);
    toast.success('Product added successfully!');
  }, [loadProducts]);

  // Handle product detail view
  const handleViewProductDetails = useCallback((product: any, preSelectedVariant?: any) => {
    // If a variant was pre-selected (from variant selection modal), attach it to the product
    if (preSelectedVariant) {
      const productWithSelectedVariant = {
        ...product,
        preSelectedVariant: preSelectedVariant
      };
      setSelectedProductForModal(productWithSelectedVariant);
    } else {
      setSelectedProductForModal(product);
    }
    setShowProductDetailModal(true);
  }, []);

  // Handle barcode scan
  const handleBarcodeScan = useCallback((barcode: string) => {
    // Find product by SKU
    const foundProduct = products.find(p => {
      if (p.variants && p.variants.length > 0) {
        return p.variants.some((v: any) => v.sku === barcode || v.barcode === barcode);
      }
      return false;
    });

    if (foundProduct) {
      const variant = foundProduct.variants.find((v: any) => v.sku === barcode || v.barcode === barcode);
      if (variant) {
        handleAddToPurchaseCart(foundProduct, variant, 1);
        toast.success(`Added: ${foundProduct.name}`);
      }
    } else {
      toast.error(`Product not found for: ${barcode}`);
    }
  }, [products, handleAddToPurchaseCart]);

  // Handle bulk import
  const handleBulkImport = useCallback((items: Array<{ sku: string; quantity: number; costPrice?: number; notes?: string; variantName?: string }>) => {
    let addedCount = 0;
    let notFoundCount = 0;
    let totalQuantity = 0;

    items.forEach(item => {
      const foundProduct = products.find(p => {
        if (p.variants && p.variants.length > 0) {
          return p.variants.some((v: any) => v.sku === item.sku);
        }
        return false;
      });

      if (foundProduct) {
        const variant = foundProduct.variants.find((v: any) => v.sku === item.sku);
        if (variant) {
          // Create a modified variant with custom cost price if provided
          const variantWithPrice = item.costPrice ? {
            ...variant,
            costPrice: item.costPrice
          } : variant;
          
          handleAddToPurchaseCart(foundProduct, variantWithPrice, item.quantity);
          addedCount++;
          totalQuantity += item.quantity;
        }
      } else {
        notFoundCount++;
      }
    });

    if (addedCount > 0) {
      toast.success(`✅ Added ${addedCount} item${addedCount > 1 ? 's' : ''} (${totalQuantity} total units) to purchase order`);
    }
    if (notFoundCount > 0) {
      toast.error(`❌ ${notFoundCount} item${notFoundCount > 1 ? 's' : ''} not found`);
    }
  }, [products, handleAddToPurchaseCart]);

  // Handle template load
  const handleLoadTemplate = useCallback((template: POTemplate) => {
    // Load supplier
    const templateSupplier = suppliers.find(s => s.id === template.supplierId);
    if (templateSupplier) {
      setSelectedSupplier(templateSupplier);
    }

    // Load currency
    const templateCurrency = SUPPORTED_CURRENCIES.find(c => c.code === template.currency);
    if (templateCurrency) {
      setSelectedCurrency(templateCurrency);
    }

    // Load payment terms and notes
    if (template.paymentTerms) setPaymentTerms(template.paymentTerms);
    if (template.notes) setPurchaseOrderNotes(template.notes);

    // Clear current cart and load template items
    setPurchaseCartItems([]);
    
    // Add each item from template
    setTimeout(() => {
      template.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const variant = product.variants?.find((v: any) => v.id === item.variantId);
          if (variant) {
            handleAddToPurchaseCart(product, variant, item.quantity);
          }
        }
      });
    }, 100);

    toast.success(`Loaded template: ${template.name}`);
  }, [suppliers, products, handleAddToPurchaseCart]);

  // Handle email send
  const handleSendEmail = useCallback(async (emailData: EmailData): Promise<boolean> => {
    try {
      // Prepare email data
      const emailPayload = {
        to: emailData.to,
        cc: emailData.cc || undefined,
        bcc: emailData.bcc || undefined,
        subject: emailData.subject,
        message: emailData.message,
        attachPDF: emailData.attachPDF,
        purchaseOrderId: createdPurchaseOrder?.id,
        orderNumber: createdPurchaseOrder?.orderNumber
      };

      console.log('Sending email:', emailPayload);
      
      // Simulate email sending (2 second delay)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, you would call your email API here:
      // const response = await fetch('/api/purchase-orders/send-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(emailPayload)
      // });
      // if (!response.ok) throw new Error('Email send failed');
      
      toast.success('Email sent successfully!');
      
      // Log email sent in PO history (optional)
      try {
        await supabase
          .from('lats_purchase_order_audit')
          .insert({
            purchase_order_id: createdPurchaseOrder?.id,
            action: 'Email Sent',
            user_id: currentUser?.id,
            details: `Email sent to ${emailData.to}`
          });
      } catch (auditError) {
        console.warn('Failed to log email audit:', auditError);
      }
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again or contact support.');
      return false;
    }
  }, [createdPurchaseOrder, currentUser]);

  // Handle saving as draft
  const handleSaveAsDraft = useCallback(async () => {
    const validation = validatePurchaseOrder(
      selectedSupplier, 
      purchaseCartItems, 
      '', 
      paymentTerms,
      selectedCurrency.code,
      exchangeRateInfo?.rate
    );
  
    if (!validation.isValid) {
      toast.error(validation.errors.join('\n'));
      return;
    }

    setIsSavingDraft(true);
    
    try {
      const orderNumber = generatePONumber();
      
      const draftData = {
        ...(isEditMode && editOrderId && { id: editOrderId }), // Include ID for updates
        supplierId: selectedSupplier!.id,
        expectedDelivery: shippingInfo.expectedDelivery || '',
        notes: purchaseOrderNotes,
        status: 'draft' as PurchaseOrderStatus, // Explicitly set as draft
        currency: selectedCurrency.code,
        paymentTerms: paymentTerms,
        createdBy: currentUser?.id || currentUser?.uid || null,
        exchangeRate: exchangeRateInfo?.rate || 1.0,
        baseCurrency: 'TZS',
        exchangeRateSource: exchangeRateInfo?.source || 'manual',
        exchangeRateDate: exchangeRateInfo?.date || new Date().toISOString(),
        items: purchaseCartItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice || 0,
          minimumOrderQty: item.minimumOrderQty,
          notes: item.notes || ''
        }))
      };
      
      const result = await createPurchaseOrder(draftData);
      
      if (result.ok) {
        // Clear session after saving as draft
        clearSession();
        
        toast.success(`Purchase Order saved as draft! You can edit it later.`);
        
        // Navigate to the PO list or detail page
        navigate(`/lats/purchase-orders/${result.data.id}`);
      } else {
        console.error('Failed to save draft:', result.message);
        toast.error(result.message || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Error saving draft. Please try again.');
    } finally {
      setIsSavingDraft(false);
    }
  }, [selectedSupplier, purchaseCartItems, shippingInfo.expectedDelivery, exchangeRates, purchaseOrderNotes, selectedCurrency, paymentTerms, exchangeRateInfo, createPurchaseOrder, navigate, currentUser, isEditMode, editOrderId, clearSession]);

  // Handle creating/updating purchase order
  const handleCreatePurchaseOrder = useCallback(async () => {
      const validation = validatePurchaseOrder(
        selectedSupplier, 
        purchaseCartItems, 
        '', 
        paymentTerms,
        selectedCurrency.code,
        exchangeRateInfo?.rate
      );
    
    if (!validation.isValid) {
      toast.error(validation.errors.join('\n'));
      return;
    }

    // Show summary modal before creating
    setShowPOSummaryModal(true);
  }, [selectedSupplier, purchaseCartItems, paymentTerms, selectedCurrency, exchangeRateInfo]);

  // Confirm and create/update purchase order after summary review
  const confirmCreatePurchaseOrder = useCallback(async () => {
    setShowPOSummaryModal(false);
    setIsCreatingPO(true);

    try {
      // Only generate order number for new orders, not updates
      const orderNumber = isEditMode ? existingPurchaseOrder?.orderNumber || '' : generatePONumber();

      const purchaseOrderData = {
        supplierId: selectedSupplier!.id,
        expectedDelivery: shippingInfo.expectedDelivery || '', // Use shipping info or empty string
        notes: purchaseOrderNotes,
        status: purchaseOrderStatus,
        currency: selectedCurrency.code, // Add currency
        paymentTerms: paymentTerms, // Add payment terms
        createdBy: currentUser?.id || currentUser?.uid || null, // Add created by user ID
        // Exchange rate tracking
        exchangeRate: exchangeRateInfo?.rate || 1.0,
        baseCurrency: 'TZS',
        exchangeRateSource: exchangeRateInfo?.source || 'manual',
        exchangeRateDate: exchangeRateInfo?.date || new Date().toISOString(),
        items: purchaseCartItems.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice || 0, // Include selling price for PO tracking
          minimumOrderQty: item.minimumOrderQty, // Add minimum order quantity
          notes: item.notes || '' // Add notes
        }))
      };

      // Call appropriate function based on mode
      const result = isEditMode && editOrderId
        ? await updatePurchaseOrder(editOrderId, purchaseOrderData)
        : await createPurchaseOrder(purchaseOrderData);
      
      if (result.ok) {
        // Store the created purchase order with all necessary data
        const createdPO = {
          ...result.data,
          supplier: selectedSupplier,
          orderNumber: orderNumber,
          currency: selectedCurrency.code,
          items: purchaseCartItems
        };
        setCreatedPurchaseOrder(createdPO);
        
        // Clear session after successful creation
        clearSession();
        
        // Save exchange rate to localStorage for future use
        if (exchangeRates && exchangeRates.trim()) {
          localStorage.setItem('po_latest_exchange_rate', exchangeRates);
          console.log('💾 Saved latest exchange rate:', exchangeRates);
        }
        
        // Show success modal with action buttons - capture purchase order data in closures
        successModal.show(
          `Purchase Order ${orderNumber} has been ${isEditMode && !isDuplicateMode ? 'updated' : 'created'} successfully!`,
          {
            title: `PO ${isEditMode && !isDuplicateMode ? 'Updated' : 'Created'}`,
            actionButtons: [
              {
                label: (
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="w-5 h-5" />
                    <span>View Order</span>
                  </div>
                ),
                onClick: () => navigate(`/lats/purchase-orders/${result.data.id}`),
                variant: 'primary'
              },
              {
                label: (
                  <div className="flex items-center justify-center gap-2">
                    <Edit className="w-5 h-5" />
                    <span>Edit Order</span>
                  </div>
                ),
                onClick: () => navigate(`/lats/purchase-orders/${result.data.id}/edit`),
                variant: 'secondary'
              },
              {
                label: (
                  <div className="flex items-center justify-center gap-2">
                    <Printer className="w-5 h-5" />
                    <span>Print PO</span>
                  </div>
                ),
                onClick: async () => {
                  try {
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const printContent = await generatePrintContent(createdPO);
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
                  }
                },
                variant: 'secondary'
              },
              {
                label: (
                  <div className="flex items-center justify-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    <span>Add Payment</span>
                  </div>
                ),
                onClick: () => {
                  // Store the purchase order data and open payment modal
                  setCreatedPurchaseOrder(createdPO);
                  setShowPaymentModal(true);
                },
                variant: 'success'
              }
            ]
          }
        );
        
        // Clear form data
        setPurchaseCartItems([]);
        setSelectedSupplier(null);
        setShippingInfo(prev => ({ ...prev, expectedDelivery: '' }));
        setPurchaseOrderNotes('');
        setPurchaseOrderStatus('sent');
      } else {
        console.error('Failed to create purchase order:', result.message);
        toast.error(result.message || 'Failed to create purchase order');
      }
    } catch (error) {
      console.error('Error creating purchase order:', error);
      toast.error('Error creating purchase order. Please try again.');
    } finally {
      setIsCreatingPO(false);
    }
  }, [selectedSupplier, purchaseCartItems, shippingInfo.expectedDelivery, exchangeRates, purchaseOrderNotes, purchaseOrderStatus, selectedCurrency, createPurchaseOrder, updatePurchaseOrder, navigate, clearSession, successModal, isEditMode, isDuplicateMode, editOrderId, existingPurchaseOrder, currentUser, paymentTerms, exchangeRateInfo]);

  // Handle Print Purchase Order
  const handlePrintPurchaseOrder = useCallback(async () => {
    if (!createdPurchaseOrder) {
      toast.error('No purchase order to print');
      return;
    }
    
    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printContent = await generatePrintContent(createdPurchaseOrder);
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
    }
  }, [createdPurchaseOrder]);

  // Handle Add Payment
  const handleAddPayment = useCallback(() => {
    if (!createdPurchaseOrder) {
      toast.error('No purchase order selected');
      return;
    }
    
    setShowPaymentModal(true);
  }, [createdPurchaseOrder]);

  // Handle payment completion
  const handlePaymentComplete = useCallback(async (paymentData: any[], totalPaid?: number) => {
    if (!createdPurchaseOrder) {
      console.error('❌ No purchase order available for payment');
      toast.error('No purchase order selected');
      return;
    }

    console.log('💰 Processing payment for PO:', {
      id: createdPurchaseOrder.id,
      orderNumber: createdPurchaseOrder.orderNumber || createdPurchaseOrder.po_number,
      supplier: createdPurchaseOrder.supplier?.name,
      totalAmount: createdPurchaseOrder.totalAmount || createdPurchaseOrder.total_amount,
      paymentCount: paymentData.length
    });

    try {
      // Import the payment service
      const { purchaseOrderPaymentService } = await import('../lib/purchaseOrderPaymentService');
      
      // Get current user
      const { data: { user } } = await (await import('../../../lib/supabaseClient')).supabase.auth.getUser();
      
      console.log('👤 Current user:', user?.id);
      
      // Process each payment entry using the service
      const results = await Promise.all(
        paymentData.map(async (payment) => {
          console.log('💳 Processing payment:', {
            purchaseOrderId: createdPurchaseOrder.id,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.paymentMethod
          });
          
          const result = await purchaseOrderPaymentService.processPayment({
            purchaseOrderId: createdPurchaseOrder.id,
            paymentAccountId: payment.paymentAccountId,
            amount: payment.amount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentMethodId: payment.paymentMethodId,
            reference: payment.reference || `${createdPurchaseOrder.orderNumber || createdPurchaseOrder.po_number}`,
            notes: payment.notes || `Payment via ${payment.paymentMethod}`,
            createdBy: user?.id || ''
          });
          
          console.log('✅ Payment result:', result);
          return result;
        })
      );

      // Check if all payments were successful
      const failedPayments = results.filter(result => !result.success);
      
      if (failedPayments.length > 0) {
        const errorMessages = failedPayments.map(result => result.message).join('; ');
        console.error('❌ Payment failures:', errorMessages);
        toast.error(`Some payments failed: ${errorMessages}`);
      } else {
        console.log('✅ All payments processed successfully');
        toast.success(`Payment of ${formatMoney(totalPaid || paymentData.reduce((sum, p) => sum + p.amount, 0), createdPurchaseOrder.currency || 'TZS')} recorded successfully!`);
      }
      
      // Close modal
      setShowPaymentModal(false);
    } catch (error: any) {
      console.error('❌ Error processing payment:', error);
      toast.error(error.message || 'Failed to process payment');
    }
  }, [createdPurchaseOrder]);

  // Handle search input changes
  const handleSearchInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim()) {
      setShowSearchResults(true);
      const filtered = products.filter(product => {
        const mainVariant = product.variants?.[0];
        const category = categories?.find(c => c.id === product.categoryId)?.name || '';
        
        return (product.name?.toLowerCase() || '').includes(value.toLowerCase()) ||
               (mainVariant?.sku?.toLowerCase() || '').includes(value.toLowerCase()) ||
               (category.toLowerCase() || '').includes(value.toLowerCase());
      });
      setSearchResults(filtered);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }
  }, [products, categories]);

  // Handle search input key press
  const handleSearchInputKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
    }
  }, [searchQuery]);

  // Handle global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

    // ? - Show keyboard shortcuts help
    if (e.key === '?' && !isTyping) {
      e.preventDefault();
      setShowKeyboardShortcuts(true);
      return;
    }

    // Ctrl+F or Ctrl+K - Focus search
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'k')) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    // Ctrl+S - Save as draft
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (selectedSupplier && purchaseCartItems.length > 0) {
        handleSaveAsDraft();
      } else {
        toast.error('Select supplier and add items first');
      }
      return;
    }

    // Ctrl+Enter - Create purchase order
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (selectedSupplier && purchaseCartItems.length > 0) {
        handleCreatePurchaseOrder();
      } else {
        toast.error('Select supplier and add items first');
      }
      return;
    }

    // Ctrl+B - Toggle barcode scanner
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      setShowBarcodeScanner(prev => !prev);
      return;
    }

    // Ctrl+I - Bulk import
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      setShowBulkImport(true);
      return;
    }

    // Ctrl+T - Templates
    if ((e.ctrlKey || e.metaKey) && e.key === 't') {
      e.preventDefault();
      setShowTemplates(true);
      return;
    }

    // Ctrl+Shift+S - Supplier selector
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
      e.preventDefault();
      setShowSupplierSearch(true);
      return;
    }

    // Ctrl+Shift+P - Add product
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
      e.preventDefault();
      setShowAddProductModal(true);
      return;
    }

    // Ctrl+Shift+C - Clear cart
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
      e.preventDefault();
      handleClearCart();
      return;
    }

    // Escape - Close modals or clear search
    if (e.key === 'Escape') {
      if (showKeyboardShortcuts) setShowKeyboardShortcuts(false);
      else if (showBarcodeScanner) setShowBarcodeScanner(false);
      else if (showBulkImport) setShowBulkImport(false);
      else if (showTemplates) setShowTemplates(false);
      else if (showPOSummaryModal) setShowPOSummaryModal(false);
      else if (searchQuery) setSearchQuery('');
      return;
    }
  }, [handleClearCart, selectedSupplier, purchaseCartItems, searchQuery, showKeyboardShortcuts, showBarcodeScanner, showBulkImport, showTemplates, showPOSummaryModal, handleSaveAsDraft, handleCreatePurchaseOrder]);

  // Add global keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [handleGlobalKeyDown]);

  // Handle click outside to close expanded widgets
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (widgetsContainerRef.current && !widgetsContainerRef.current.contains(event.target as Node)) {
        setExpandedWidget(null);
      }
    };

    if (expandedWidget) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [expandedWidget]);

  // Format money helper
  const formatMoneyDisplay = (amount: number, currency?: Currency) => formatMoney(amount, currency || selectedCurrency);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen">
      {/* Purchase Order Top Bar */}
      <POTopBar
        cartItemsCount={purchaseCartItems.length}
        totalAmount={totalAmount}
        currency={selectedCurrency}
        productsCount={products.length}
        suppliersCount={suppliers.length}
        onCreatePurchaseOrder={handleCreatePurchaseOrder}
        onSaveAsDraft={handleSaveAsDraft}
        onClearCart={handleClearCart}
        onAddSupplier={() => setShowAddSupplierModal(true)}
        onAddProduct={() => setShowAddProductModal(true)}
        onViewPurchaseOrders={() => setShowOrderManagementModal(true)}
        onOpenInstallmentManagement={() => setShowInstallmentManagementModal(true)}
        isCreatingPO={isCreatingPO}
        isSavingDraft={isSavingDraft}
        hasSelectedSupplier={!!selectedSupplier}
      />

      {/* Session Restored Banner - Removed: Now automatic with toast notification */}

      <div className="p-4 sm:p-6 pb-20 max-w-full mx-auto space-y-6">
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Product Search Section */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <GlassCard className="p-6 h-full flex flex-col">
              {/* Fixed Search Section */}
              <div className="flex-shrink-0 mb-6 space-y-4">
                {/* Product Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-orange-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={isEditMode ? "Search products to add to this order... (Ctrl+F focus)" : "Search products to add to purchase order... (Ctrl+F focus)"}
                    value={searchQuery}
                    onChange={handleSearchInputChange}
                    onKeyPress={handleSearchInputKeyPress}
                    className="w-full pl-14 pr-24 py-5 text-lg border-2 border-orange-200 rounded-xl bg-white text-gray-900 placeholder-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-500/30 focus:border-orange-500 shadow-lg hover:shadow-xl transition-all duration-200"
                    style={{ minHeight: '60px' }}
                  />
                  

                  
                  {/* QrCode indicator */}
                  {searchQuery.trim() && searchQuery.length >= 8 && /^[A-Za-z0-9]+$/.test(searchQuery) && (
                    <div className="absolute left-14 top-1/2 transform -translate-y-1/2">
                      <QrCode className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                  
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors duration-200"
                      title="Advanced filters (Ctrl+F)"
                    >
                      <Command className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Quick Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowBarcodeScanner(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm shadow-md"
                    title="Barcode Scanner (Ctrl+B)"
                  >
                    <QrCode className="w-4 h-4" />
                    <span className="hidden sm:inline">Scanner</span>
                  </button>

                  <button
                    onClick={() => setShowBulkImport(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm shadow-md"
                    title="Bulk Import from CSV (Ctrl+I)"
                  >
                    <Upload className="w-4 h-4" />
                    <span className="hidden sm:inline">Bulk Import</span>
                  </button>

                  <button
                    onClick={() => setShowTemplates(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors text-sm shadow-md"
                    title="Order Templates (Ctrl+T)"
                  >
                    <Bookmark className="w-4 h-4" />
                    <span className="hidden sm:inline">Templates</span>
                  </button>

                  <button
                    onClick={() => setShowKeyboardShortcuts(true)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm shadow-md"
                    title="Keyboard Shortcuts (?)"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>

                {/* Loading and Error States */}
                {isLoading && (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="sm" color="blue" />
                  </div>
                )}
                
                {/* Edit Mode Loading State */}
                {isEditMode && isLoadingEditData && (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner size="sm" color="purple" />
                  </div>
                )}
                
                {/* Edit Mode Error State */}
                {isEditMode && editError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-red-800 font-medium">Edit Error: {editError}</span>
                    </div>
                  </div>
                )}
                
                {isDuplicateMode && !isLoadingEditData && !editError && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                      <div>
                        <span className="text-purple-800 font-medium">Purchase order duplicated successfully</span>
                        <p className="text-sm text-purple-700 mt-1">Review the order details and click "Create PO" to save as a new purchase order</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <span className="text-red-800 font-medium">Error: {error}</span>
                    </div>
                  </div>
                )}

                {/* Advanced Filters */}
                {showAdvancedFilters && (
                  <div className="p-4 bg-gradient-to-br from-gray-50 to-orange-50 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Category Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="">All Categories</option>
                          {categories.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>



                      {/* Stock Filter */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stock Status</label>
                        <select
                          value={stockFilter}
                          onChange={(e) => setStockFilter(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="all">All Items</option>
                          <option value="in-stock">In Stock</option>
                          <option value="low-stock">Low Stock</option>
                          <option value="out-of-stock">Out of Stock</option>
                        </select>
                      </div>

                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                          <option value="name">Name</option>
                          <option value="price">Price</option>
                          <option value="stock">Stock</option>
                          <option value="recent">Recent</option>
                        </select>
                      </div>
                    </div>

                    {/* Clear Filters Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedCategory('');
                          setPriceRange({ min: '', max: '' });
                          setStockFilter('all');
                          setSortBy('name');
                          setSortOrder('asc');
                        }}
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                      >
                        Clear All Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Products Section */}
              <div className="flex-1 overflow-y-auto">
                {/* Search Results */}
                {showSearchResults && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-700">
                        Search Results ({filteredProducts.length})
                      </h3>
                      <button
                        onClick={() => setShowSearchResults(false)}
                        className="text-sm text-orange-600 hover:text-orange-800"
                      >
                        Show All Products
                      </button>
                    </div>
                    
                    {filteredProducts.length > 0 ? (
                      <div className="w-full max-w-full mx-auto px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                        <div 
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                            gap: 'clamp(1rem, 2vw, 1.5rem)',
                            gridAutoRows: '1fr'
                          }}
                        >
                        {filteredProducts.map((product) => (
                          <VariantProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={handleAddToPurchaseCart}
                            onViewDetails={handleViewProductDetails}
                            primaryColor="orange"
                            actionText="View Details"
                            allowOutOfStockSelection={true}
                            showCategory={true}
                            currencyCode={selectedCurrency.code}
                            currencySymbol={selectedCurrency.symbol}
                            className="w-full h-full"
                            disableVariantModal={true}
                          />
                        ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
                        <p className="text-gray-600 mb-4">No products found for "{searchQuery}"</p>
                      </div>
                    )}
                  </div>
                )}

                {/* All Products Grid */}
                {!showSearchResults && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-700">
                        {isEditMode ? "Add More Products to Order" : "Available Products"}
                      </h3>
                      <span className="text-sm text-gray-500">{products.length} products</span>
                    </div>
                    {products.length > 0 ? (
                      <div className="w-full max-w-full mx-auto px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-6">
                        <div 
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                            gap: 'clamp(1rem, 2vw, 1.5rem)',
                            gridAutoRows: '1fr'
                          }}
                        >
                        {products.map((product) => (
                          <VariantProductCard
                            key={product.id}
                            product={product}
                            onAddToCart={handleAddToPurchaseCart}
                            onViewDetails={handleViewProductDetails}
                            primaryColor="orange"
                            actionText="View Details"
                            allowOutOfStockSelection={true}
                            showCategory={true}
                            currencyCode={selectedCurrency.code}
                            currencySymbol={selectedCurrency.symbol}
                            className="w-full h-full"
                            disableVariantModal={true}
                          />
                        ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-4xl mb-2">📦</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No products available</h3>
                        <p className="text-gray-600 mb-4">No products found in the database</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>

          {/* Purchase Cart Section */}
          <div className="lg:w-[450px] flex-shrink-0">
            <GlassCard className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <ShoppingBag className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                      {isEditMode ? 'Edit Purchase Order' : isDuplicateMode ? 'Duplicate Purchase Order' : 'Purchase Cart'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {purchaseCartItems.length} items {isEditMode || isDuplicateMode ? 'in order' : 'to purchase'}
                    </p>
                  </div>
                </div>
                {purchaseCartItems.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearCart();
                    }}
                    className="p-3 text-red-500 hover:text-white hover:bg-red-600 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105"
                    title="Clear everything - Remove all items, supplier, and order details"
                  >
                    <XCircle className="w-8 h-8" />
                  </button>
                )}
              </div>

               {/* Widgets Container - for click outside detection */}
               <div ref={widgetsContainerRef}>
                 {/* Supplier Cards Section */}
                 <div className="mb-4">
                   {selectedSupplier ? (
                   <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 rounded-xl border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                     {/* Orange Supplier Card - Quick Info (Always Visible) */}
                     <div 
                       className="p-4 cursor-pointer hover:bg-orange-50/50 transition-colors"
                       onClick={() => setExpandedWidget(expandedWidget === 'supplier' ? null : 'supplier')}
                     >
                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <div className="relative">
                             <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                               {selectedSupplier.name.charAt(0)}
                             </div>
                             <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-gradient-to-r from-green-400 to-emerald-500">
                               <Truck className="w-3 h-3 text-white" />
                             </div>
                           </div>
                           <div>
                             <div className="font-bold text-gray-900 text-lg">{selectedSupplier.name}</div>
                             <div className="text-sm text-gray-600 flex items-center gap-2">
                               <Phone className="w-3 h-3" />
                               {selectedSupplier.phone || 'No phone'}
                             </div>
                             <div className="flex items-center gap-3 mt-2">
                               <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 border border-orange-200">
                                 {selectedSupplier.country || 'Unknown Location'}
                               </span>
                               <span 
                                 className="flex items-center gap-1 text-xs text-gray-600 bg-white px-2 py-1 rounded-full border border-gray-200"
                                 title={`Currency set by supplier: ${selectedSupplier.currency || selectedCurrency.code}`}
                               >
                                 <DollarSign className="w-3 h-3" />
                                 {selectedSupplier.currency || selectedCurrency.code}
                               </span>
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="p-2 text-orange-500">
                             {expandedWidget === 'supplier' ? (
                               <ChevronUp className="w-5 h-5" />
                             ) : (
                               <ChevronDown className="w-5 h-5" />
                             )}
                           </div>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedSupplier(null);
                             }}
                             className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200"
                           >
                             <XCircle className="w-5 h-5" />
                           </button>
                         </div>
                       </div>
                     </div>

                     {/* Supplier Stats - Expandable Section */}
                     {expandedWidget === 'supplier' && (
                       <div className="animate-in slide-in-from-top-2 duration-300">
                         <SupplierQuickInfoCard
                           supplier={selectedSupplier}
                           currency={selectedCurrency}
                           onContactClick={(method) => {
                             toast(`Contact via ${method}: Feature ready`, { icon: '📞' });
                           }}
                           className="rounded-none border-0 shadow-none"
                         />
                       </div>
                     )}
                   </div>
                   ) : (
                     <div 
                       className="bg-gradient-to-br from-orange-50 via-amber-50 to-orange-50 rounded-xl border-2 border-dashed border-orange-300 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
                       onClick={() => {
                         playClickSound();
                         setShowSupplierSearch(true);
                       }}
                     >
                       <div className="p-6 text-center">
                         <div className="flex flex-col items-center gap-4">
                           <div className="w-16 h-16 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white shadow-lg">
                             <Building className="w-8 h-8" />
                           </div>
                           <div>
                             <h3 className="text-lg font-semibold text-gray-900 mb-1">Select Supplier</h3>
                             <p className="text-sm text-gray-600">Choose a supplier to create purchase order</p>
                             <p className="text-xs text-gray-500 mt-2">Click here or press Ctrl+Shift+S</p>
                           </div>
                           <button
                             onClick={(e) => {
                               e.stopPropagation();
                               playClickSound();
                               setShowSupplierSearch(true);
                             }}
                             className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all duration-200 shadow-md hover:shadow-lg"
                           >
                             <Plus className="w-5 h-5" />
                             <span>Select Supplier</span>
                           </button>
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               </div>

              {/* Low Stock Suggestions Widget */}
              <div className="mb-4">
                <LowStockSuggestionsWidget
                  selectedSupplierId={selectedSupplier?.id}
                  selectedSupplierName={selectedSupplier?.name}
                  onAddToCart={handleAddToPurchaseCart}
                  isExpanded={expandedWidget === 'lowStock'}
                  onToggle={() => setExpandedWidget(expandedWidget === 'lowStock' ? null : 'lowStock')}
                />
              </div>

              {/* Recently Ordered Widget */}
              {selectedSupplier && (
                <div className="mb-4">
                  <RecentlyOrderedWidget
                    selectedSupplierId={selectedSupplier.id}
                    currency={selectedCurrency}
                    onAddToCart={handleAddToPurchaseCart}
                    isExpanded={expandedWidget === 'recentOrders'}
                    onToggle={() => setExpandedWidget(expandedWidget === 'recentOrders' ? null : 'recentOrders')}
                  />
                </div>
              )}

              {/* Cart Items */}
              <div className="flex-1 overflow-y-auto">
                {purchaseCartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Cart is empty</h3>
                    <p className="text-gray-600 mb-4">Add products to create a purchase order</p>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    {[...purchaseCartItems].reverse().map((item, index) => (
                      <PurchaseCartItem
                        key={item.id}
                        item={item}
                        index={index}
                        currency={selectedCurrency}
                        exchangeRates={exchangeRates}
                        isLatest={index === 0}
                        onUpdateQuantity={handleUpdateQuantity}
                        onUpdateCostPrice={handleUpdateCostPrice}
                        onRemove={handleRemoveFromCart}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Purchase Order Summary */}
              {purchaseCartItems.length > 0 && (
                <>
                  {/* Currency & Exchange Rate */}
                  {selectedSupplier && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency & Exchange Rate</label>
                      
                      {/* Inline Design */}
                      <div className="flex items-center gap-2 p-2 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-300 focus-within:border-orange-500 transition-all duration-200">
                        {/* Currency Icon & Code - Display Only */}
                        <div className="flex-shrink-0 flex items-center gap-2 p-2 bg-gray-100 rounded-md">
                          <span className="text-lg">{selectedCurrency.flag}</span>
                          <span className="text-sm font-semibold text-gray-800">{selectedCurrency.code}</span>
                        </div>
                        
                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-300"></div>
                        
                        {/* Exchange Rate Input */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={exchangeRates}
                            onChange={(e) => setExchangeRates(e.target.value)}
                            placeholder="Rate (e.g., 1 USD = 150 TZS)"
                            className="w-full border-0 focus:outline-none focus:ring-0 text-base font-bold text-gray-800 placeholder-gray-400 bg-transparent"
                          />
                        </div>
                        
                        {/* TZS Badge */}
                        {exchangeRates && selectedCurrency.code !== 'TZS' && (
                          <div className="flex-shrink-0">
                            <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-md font-medium">
                              ≈ {Math.round(parseExchangeRate(exchangeRates) || 0)} TZS
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!exchangeRates && lastUsedExchangeRate && (
                        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 bg-white/60 border border-dashed border-gray-300 rounded-lg px-3 py-2">
                          <span>Last used: <span className="font-semibold text-gray-700">{lastUsedExchangeRate}</span></span>
                          <button
                            type="button"
                            onClick={() => setExchangeRates(lastUsedExchangeRate)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            Use rate
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Purchase Order Summary */}
                  <div className="bg-gradient-to-br from-gray-50 to-orange-50 rounded-xl p-4 border border-gray-200 shadow-sm flex-shrink-0">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Items</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {purchaseCartItems.length} {purchaseCartItems.length === 1 ? 'item' : 'items'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Quantity</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">
                            {purchaseCartItems.reduce((sum, item) => sum + item.quantity, 0)} units
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 font-medium">Subtotal</span>
                        <div className="text-right">
                          <div className="font-semibold text-gray-900">{formatMoneyDisplay(subtotal)}</div>
                        </div>
                      </div>
                      
                      {selectedCurrency.code !== 'TZS' && exchangeRates && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-medium">Total in TZS</span>
                          <div className="text-right">
                            <div className="font-semibold text-green-600">{formatMoneyDisplay(subtotalTZS, { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TZS', flag: '🇹🇿' })}</div>
                          </div>
                        </div>
                      )}
                      
                      <div className="border-t-2 border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-gray-900">Total Amount</span>
                          <div className="text-right">
                            <div className="text-xl font-bold text-orange-600">
                              {formatMoneyDisplay(totalAmount)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-3 flex-shrink-0">
                    {/* Create PO Button */}
                    <GlassButton
                      onClick={handleCreatePurchaseOrder}
                      icon={isCreatingPO ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                      className="w-full h-16 bg-gradient-to-r from-purple-600 to-purple-700 text-white text-lg font-bold hover:from-purple-700 hover:to-purple-800 transition-all"
                      disabled={!selectedSupplier || purchaseCartItems.length === 0 || isCreatingPO}
                    >
                      {isCreatingPO ? (isEditMode && !isDuplicateMode ? 'Updating...' : 'Creating...') : (isEditMode && !isDuplicateMode ? 'Update PO' : 'Create PO')}
                    </GlassButton>
                  </div>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Supplier Search Modal */}
      {showSupplierSearch && (
        <SupplierSelectionModal
          isOpen={showSupplierSearch}
          onClose={() => setShowSupplierSearch(false)}
          onSupplierSelect={handleSupplierSelect}
          suppliers={suppliers}
        />
      )}

      {/* Shipping Configuration Modal */}
      {showShippingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Shipping Configuration</h3>
            <p className="text-gray-600 mb-4">Shipping configuration will be implemented soon.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  playClickSound();
                  setShowShippingModal(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draft Management Modal */}
      {showDraftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Draft Management</h3>
            <p className="text-gray-600 mb-4">Draft management functionality will be implemented soon.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  playClickSound();
                  setShowDraftModal(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Details Modal */}
      {showSupplierDetailsModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Supplier Details</h3>
              <button
                onClick={() => setShowSupplierDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Building className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{selectedSupplier.name}</h4>
                  <p className="text-sm text-gray-600">{selectedSupplier.category}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Email</label>
                  <p className="text-gray-900">{selectedSupplier.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-gray-900">{selectedSupplier.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <p className="text-gray-900">{selectedSupplier.address || 'Not provided'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">City</label>
                  <p className="text-gray-900">{selectedSupplier.city || 'Not provided'}</p>
                </div>
              </div>
              
              {selectedSupplier.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-gray-900">{selectedSupplier.notes}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowSupplierDetailsModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowSupplierDetailsModal(false);
                    setShowAddSupplierModal(true);
                  }}
                  className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Edit Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <EnhancedAddSupplierModal
          isOpen={showAddSupplierModal}
          onClose={() => setShowAddSupplierModal(false)}
          onSupplierCreated={() => {
            // Reload suppliers after creation
            setShowAddSupplierModal(false);
          }}
        />
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <AddProductModal
          isOpen={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onProductAdded={handleProductCreated}
          currency={selectedCurrency}
        />
      )}

      {/* Product Detail Modal */}
      {showProductDetailModal && selectedProductForModal && (
        <ProductDetailModal
          isOpen={showProductDetailModal}
          onClose={() => {
            setShowProductDetailModal(false);
            setSelectedProductForModal(null);
          }}
          product={selectedProductForModal}
          currency={selectedCurrency}
          onAddToCart={handleAddToPurchaseCart}
        />
      )}

      {/* Success Modal */}
      <SuccessModal {...successModal.props} />

      {/* Order Management Modal */}
      <OrderManagementModal
        isOpen={showOrderManagementModal}
        onClose={() => setShowOrderManagementModal(false)}
      />

      {/* Installment Management Modal */}
      <InstallmentManagementModal
        isOpen={showInstallmentManagementModal}
        onClose={() => setShowInstallmentManagementModal(false)}
      />

      {/* Draft Modal */}
      <PurchaseOrderDraftModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        onLoadDraft={(draft) => {
          setSelectedSupplier(draft.supplier);
          setPurchaseCartItems(draft.cartItems);
          setSelectedCurrency(draft.currency);
          setPaymentTerms(draft.paymentTerms);
          setPurchaseOrderNotes(draft.notes);
        }}
        onSaveDraft={(draft) => {
          // Draft saved - no action needed
        }}
        currentDraft={{
          supplier: selectedSupplier,
          cartItems: purchaseCartItems,
          currency: selectedCurrency,
          paymentTerms,
          notes: purchaseOrderNotes
        }}
      />

      {/* Shipping Configuration Modal */}
      <ShippingConfigurationModal
        isOpen={showShippingConfigModal}
        onClose={() => setShowShippingConfigModal(false)}
        onSave={(shippingInfo) => {
          setShippingInfo(shippingInfo);
        }}
        initialData={shippingInfo}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Barcode Scanner Modal */}
      <POBarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScanSuccess={handleBarcodeScan}
        products={products}
      />

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkImport}
        onClose={() => setShowBulkImport(false)}
        onImport={handleBulkImport}
        products={products}
      />

      {/* Order Templates Modal */}
      <OrderTemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onLoadTemplate={handleLoadTemplate}
        currentData={selectedSupplier && purchaseCartItems.length > 0 ? {
          supplierId: selectedSupplier.id,
          supplierName: selectedSupplier.name,
          items: purchaseCartItems,
          currency: selectedCurrency.code,
          paymentTerms,
          notes: purchaseOrderNotes
        } : undefined}
      />

      {/* Email PO Modal */}
      {createdPurchaseOrder && (
        <EmailPOModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          purchaseOrder={createdPurchaseOrder}
          supplier={selectedSupplier}
          onSend={handleSendEmail}
        />
      )}

      {/* Payment Modal */}
      {createdPurchaseOrder && (
        <PaymentsPopupModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={createdPurchaseOrder.totalAmount || createdPurchaseOrder.total_amount || 0}
          customerId={createdPurchaseOrder.supplierId || createdPurchaseOrder.supplier_id || createdPurchaseOrder.supplier?.id}
          customerName={createdPurchaseOrder.supplier?.name || 'Supplier'}
          description={`Payment for Purchase Order ${createdPurchaseOrder.orderNumber || createdPurchaseOrder.po_number || 'N/A'}`}
          onPaymentComplete={handlePaymentComplete}
          title="Purchase Order Payment"
          paymentType="cash_out"
        />
      )}

      {/* Purchase Order Summary Modal */}
      {showPOSummaryModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center shadow-lg">
                  <ShoppingBag className="w-10 h-10 text-white" />
                </div>
                <button
                  onClick={() => setShowPOSummaryModal(false)}
                  className="w-9 h-9 flex items-center justify-center bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                {isEditMode ? 'Update Purchase Order' : 'Create Purchase Order'}
              </h2>
              <p className="text-gray-700">Review your order details before {isEditMode ? 'updating' : 'creating'}</p>
            </div>

            {/* Summary Content - Scrollable */}
            <div className="p-8 overflow-y-auto flex-1">
              <div className="space-y-6">
                {/* Supplier Information */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-orange-600" />
                    Supplier Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Supplier Name</p>
                      <p className="font-semibold text-gray-900">{selectedSupplier.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Contact</p>
                      <p className="font-semibold text-gray-900">{selectedSupplier.phone || selectedSupplier.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Items Summary */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Order Items
                  </h3>
                  
                  <div className="space-y-3 mb-4">
                    {purchaseCartItems.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.variantName} • SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">Qty: {item.quantity}</p>
                          <p className="text-sm text-gray-600">{formatMoneyDisplay(item.costPrice, selectedCurrency)} each</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-1">Total Items</p>
                      <p className="text-2xl font-bold text-gray-900">{purchaseCartItems.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-1">Total Quantity</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {purchaseCartItems.reduce((sum, item) => sum + item.quantity, 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-1">Subtotal</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatMoneyDisplay(subtotal, selectedCurrency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 border-2 border-orange-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Coins className="w-5 h-5 text-orange-600" />
                    Financial Summary
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Currency</span>
                      <span className="font-semibold text-gray-900">{selectedCurrency.code} - {selectedCurrency.name}</span>
                    </div>
                    {exchangeRateInfo && exchangeRateInfo.rate !== 1.0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">Exchange Rate</span>
                        <span className="font-semibold text-gray-900">
                          1 {selectedCurrency.code} = {exchangeRateInfo.rate} TZS
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Payment Terms</span>
                      <span className="font-semibold text-gray-900">
                        {paymentTerms === 'net_30' ? 'Net 30' : 
                         paymentTerms === 'net_60' ? 'Net 60' : 
                         paymentTerms === 'cod' ? 'Cash on Delivery' : 
                         paymentTerms === 'advance' ? 'Advance Payment' : 'Net 30'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-orange-200">
                      <span className="text-lg font-semibold text-gray-900">Total Amount</span>
                      <span className="text-2xl font-bold text-orange-600">
                        {formatMoneyDisplay(totalAmount, selectedCurrency)}
                      </span>
                    </div>
                    {exchangeRateInfo && exchangeRateInfo.rate !== 1.0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600">Equivalent in TZS</span>
                        <span className="font-semibold text-gray-700">
                          TZS {(totalAmount * exchangeRateInfo.rate).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                {(shippingInfo.expectedDelivery || purchaseOrderNotes) && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
                    <div className="space-y-3">
                      {shippingInfo.expectedDelivery && (
                        <div>
                          <p className="text-sm text-gray-500">Expected Delivery</p>
                          <p className="font-semibold text-gray-900">{new Date(shippingInfo.expectedDelivery).toLocaleDateString()}</p>
                        </div>
                      )}
                      {purchaseOrderNotes && (
                        <div>
                          <p className="text-sm text-gray-500">Notes</p>
                          <p className="text-gray-900">{purchaseOrderNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-8 py-6 flex gap-4 border-t border-gray-200">
              <button
                onClick={() => setShowPOSummaryModal(false)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmCreatePurchaseOrder}
                disabled={isCreatingPO}
                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white rounded-xl transition-colors font-semibold shadow-lg flex items-center justify-center gap-2"
              >
                {isCreatingPO ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    {isEditMode ? 'Confirm & Update' : 'Confirm & Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Help Button */}
      <button
        onClick={() => setShowKeyboardShortcuts(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:shadow-xl transition-all duration-200 flex items-center justify-center group"
        title="Keyboard Shortcuts (?)"
      >
        <Keyboard className="w-6 h-6 group-hover:scale-110 transition-transform" />
        <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Press ? for shortcuts
        </span>
      </button>

      {/* Custom UI Confirmation Dialog */}
      {confirmationDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {confirmationDialog.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {confirmationDialog.message}
                </p>
              </div>
              <button
                onClick={hideConfirmation}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => {
                  if (confirmationDialog.onCancel) {
                    confirmationDialog.onCancel();
                  }
                  hideConfirmation();
                }}
                disabled={confirmationDialog.loading}
                className="flex-1 px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmationDialog.cancelText || 'Cancel'}
              </button>
              <button
                onClick={() => {
                  if (confirmationDialog.onConfirm) {
                    confirmationDialog.onConfirm();
                  }
                  hideConfirmation();
                }}
                disabled={confirmationDialog.loading}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {confirmationDialog.loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </span>
                ) : (
                  confirmationDialog.confirmText || 'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom UI Alert Dialog */}
      {alertDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in">
            {/* Header */}
            <div className="flex items-start gap-4 p-6 pb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {alertDialog.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {alertDialog.message}
                </p>
              </div>
              <button
                onClick={hideAlert}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={hideAlert}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors shadow-lg"
              >
                {alertDialog.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};



export default POcreate;
