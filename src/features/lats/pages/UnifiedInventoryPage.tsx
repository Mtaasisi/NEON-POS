import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../../features/shared/components/ui/BackButton';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';
import { PageErrorBoundary } from '../../../features/shared/components/PageErrorBoundary';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
import ErrorState from '../components/ui/ErrorState';
import { 
  Package, Plus, Download, Upload,
  Trash2, Star, Settings, RefreshCw, AlertTriangle, ShoppingCart, Tag, Truck,
  FileText, ArrowUp, ArrowDown, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import forms and components
import EnhancedStockAdjustModal from '../components/inventory/EnhancedStockAdjustModal';
import CategoryFormModal from '../components/inventory/CategoryFormModal';
import ManageCategoriesModal from '../components/inventory/ManageCategoriesModal';
import ProductImportExportModal from '../components/inventory/ProductImportExportModal';

import SupplierForm from '../components/inventory/SupplierForm';
import { useProductModals } from '../hooks/useProductModals';
import AddProductModal from '../components/product/AddProductModal';
import EditProductModal from '../components/product/EditProductModal';

// Import tab components
import EnhancedInventoryTab from '../components/inventory/EnhancedInventoryTab';
import OrderManagementModal from '../components/purchase-order/OrderManagementModal';

// Import database functionality
import { useInventoryStore } from '../stores/useInventoryStore';
import { format } from '../lib/format';
import { latsEventBus } from '../lib/data/eventBus';
import { LiveInventoryService, LiveInventoryMetrics } from '../lib/liveInventoryService';
import { Category, Supplier, StockMovement, Product } from '../types/inventory';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { DashboardSkeleton } from '../../../components/ui/SkeletonLoaders';

// Tab types
type TabType = 'inventory';

const UnifiedInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Product modals
  const productModals = useProductModals();
  
  // Unified loading system
  const { startLoading, updateProgress, completeLoading, failLoading } = useLoadingJob();
  
  // Error handling
  const { errorState, clearError, withErrorHandling } = useErrorHandler({
    maxRetries: 3,
    showToast: true,
    logToConsole: true
  });
  
  // Database state management
  const { 
    products, 
    categories, 

    suppliers,
    stockMovements,
    sales,
    isLoading,
    loadProducts,
    loadCategories,

    loadSuppliers,
    loadStockMovements,
    loadSales,
    createCategory,

    createSupplier,
    updateProduct,
    deleteProduct,
    adjustStock,
    forceRefreshProducts
  } = useInventoryStore();

  // Database connection status
  const [dbStatus, setDbStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
  
  // Prevent multiple simultaneous data loads
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [lastDataLoadTime, setLastDataLoadTime] = useState(0);
  const DATA_LOAD_COOLDOWN = 3000;
  
  // Loading state for better UX
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(true);
  
  // Progressive loading states
  const [loadingProgress, setLoadingProgress] = useState({
    categories: false,
    suppliers: false,
    products: false,
    stockMovements: false,
    sales: false
  });
  
  // Cache management
  const [dataCache, setDataCache] = useState({
    categories: null as Category[] | null,

    suppliers: null as Supplier[] | null,
    products: null as Product[] | null,
    stockMovements: null as StockMovement[] | null,
    sales: null as any[] | null
  });

  // Live inventory metrics state
  const [liveMetrics, setLiveMetrics] = useState<LiveInventoryMetrics | null>(null);
  const [isLoadingLiveMetrics, setIsLoadingLiveMetrics] = useState(false);
  
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Search input ref for keyboard shortcut
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('all');
  
  // Excel import/export modal state
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('created');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Form state variables
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showOrderManagementModal, setShowOrderManagementModal] = useState(false);



  // Optimized data loading with parallel execution and caching
  useEffect(() => {
    const loadData = async () => {
      // Prevent multiple simultaneous loads
      if (isDataLoading) {
        return;
      }

      // Check cooldown period and use cache if available
      const timeSinceLastLoad = Date.now() - lastDataLoadTime;
      if (timeSinceLastLoad < DATA_LOAD_COOLDOWN && dataCache.products && dataCache.categories) {
        setShowLoadingSkeleton(false);
        return;
      }

      const jobId = startLoading('Loading inventory data...');
      
      await withErrorHandling(async () => {
        setIsDataLoading(true);
        setDbStatus('connecting');
        setShowLoadingSkeleton(true);
        updateProgress(jobId, 10);
        
        try {
          const loadingStartTime = Date.now();
          
          // Reset loading progress
          setLoadingProgress({
            categories: false,
            suppliers: false,
            products: false,
            stockMovements: false,
            sales: false
          });

          if (import.meta.env.MODE === 'development') {
            console.log('🔄 [UnifiedInventory] Starting optimized parallel data loading...');
          }

          // 🚀 OPTIMIZED: Load essential data in parallel with error isolation
          const essentialDataPromises = [
            loadCategories().then(() => {
              setLoadingProgress(prev => ({ ...prev, categories: true }));
              if (import.meta.env.MODE === 'development') {
                console.log('✅ [UnifiedInventory] Categories loaded');
              }
            }).catch(err => {
              console.error('❌ Failed to load categories:', err);
              setLoadingProgress(prev => ({ ...prev, categories: true })); // Mark as complete even on error
            }),
            loadSuppliers().then(() => {
              setLoadingProgress(prev => ({ ...prev, suppliers: true }));
              if (import.meta.env.MODE === 'development') {
                console.log('✅ [UnifiedInventory] Suppliers loaded');
              }
            }).catch(err => {
              console.error('❌ Failed to load suppliers:', err);
              setLoadingProgress(prev => ({ ...prev, suppliers: true })); // Mark as complete even on error
            })
          ];

          await Promise.allSettled(essentialDataPromises);
          updateProgress(jobId, 40);

          // Load products (most important for UI) - optimized
          await loadProducts({ page: 1, limit: 100 }).catch(err => {
            console.error('❌ Failed to load products:', err);
          });
          setLoadingProgress(prev => ({ ...prev, products: true }));
          updateProgress(jobId, 70);

          if (import.meta.env.MODE === 'development') {
            console.log('✅ [UnifiedInventory] Products loaded');
          }

          // 🚀 OPTIMIZED: Load secondary data in parallel with error isolation
          const secondaryDataPromises = [
            loadStockMovements().then(() => {
              setLoadingProgress(prev => ({ ...prev, stockMovements: true }));
              if (import.meta.env.MODE === 'development') {
                console.log('✅ [UnifiedInventory] Stock movements loaded');
              }
            }).catch(err => {
              console.error('❌ Failed to load stock movements:', err);
              setLoadingProgress(prev => ({ ...prev, stockMovements: true })); // Mark as complete even on error
            }),
            loadSales().then(() => {
              setLoadingProgress(prev => ({ ...prev, sales: true }));
              if (import.meta.env.MODE === 'development') {
                console.log('✅ [UnifiedInventory] Sales loaded');
              }
            }).catch(err => {
              console.error('❌ Failed to load sales:', err);
              setLoadingProgress(prev => ({ ...prev, sales: true })); // Mark as complete even on error
            })
          ];

          await Promise.allSettled(secondaryDataPromises);
          updateProgress(jobId, 100);

          // Cache the loaded data
          setDataCache({
            categories: categories,
      
            suppliers: suppliers,
            products: products,
            stockMovements: stockMovements,
            sales: sales
          });

          const loadingTime = Date.now() - loadingStartTime;
          
          setDbStatus('connected');
          setLastDataLoadTime(Date.now());
          setShowLoadingSkeleton(false);
          completeLoading(jobId);
          
        } catch (error) {
          toast.error('Failed to load data from database');
          setDbStatus('error');
          setShowLoadingSkeleton(false);
          failLoading(jobId, 'Failed to load inventory data');
        } finally {
          setIsDataLoading(false);
        }
      }, 'Loading unified inventory data');
    };
    
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load live inventory metrics
  const loadLiveMetrics = useCallback(async () => {
    if (isLoadingLiveMetrics) return;
    
    setIsLoadingLiveMetrics(true);
    try {
      const liveData = await LiveInventoryService.getLiveInventoryMetrics();
      setLiveMetrics(liveData);
    } catch (error) {
      // Don't show error toast for live metrics as it's not critical
    } finally {
      setIsLoadingLiveMetrics(false);
    }
  }, []);

  // Load live metrics when products change or on initial load with debouncing
  useEffect(() => {
    if (products.length > 0 && !isLoadingLiveMetrics) {
      // Add debouncing to prevent excessive API calls
      const timeoutId = setTimeout(() => {
        loadLiveMetrics();
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.length]);

  // Listen for stock updates and refresh live metrics
  useEffect(() => {
    const handleStockUpdate = (event: any) => {
      // Small delay to ensure database is updated
      setTimeout(() => {
        loadLiveMetrics();
      }, 500);
    };

    const handleProductUpdate = (event: any) => {
      // Small delay to ensure database is updated
      setTimeout(() => {
        loadLiveMetrics();
      }, 500);
    };

    const handleSaleCompleted = (event: any) => {
      // Small delay to ensure database is updated
      setTimeout(() => {
        loadLiveMetrics();
      }, 500);
    };

    // 🔥 NEW: Handle purchase order received event
    const handlePurchaseOrderReceived = (event: any) => {
      console.log('📦 [UnifiedInventoryPage] Purchase order received, refreshing inventory...', event);
      
      // Refresh both products and metrics with a delay to ensure database is updated
      setTimeout(async () => {
        await loadProducts({ page: 1, limit: 100 });
        loadLiveMetrics();
      }, 1000); // Longer delay to ensure all database operations complete
    };

    // Subscribe to relevant events
    const unsubscribeStock = latsEventBus.subscribe('lats:stock.updated', handleStockUpdate);
    const unsubscribeProduct = latsEventBus.subscribe('lats:product.updated', handleProductUpdate);
    const unsubscribeSale = latsEventBus.subscribe('lats:sale.completed', handleSaleCompleted);
    const unsubscribePO = latsEventBus.subscribe('lats:purchase-order.received', handlePurchaseOrderReceived);

    // Cleanup subscriptions
    return () => {
      unsubscribeStock();
      unsubscribeProduct();
      unsubscribeSale();
      unsubscribePO();
    };
  }, [loadLiveMetrics, loadProducts]);

  // Handle export functionality - defined early to avoid temporal dead zone
  const handleExport = useCallback(() => {
    try {
      const csvContent = "data:text/csv;charset=utf-8," + 
        "Name,SKU,Category,Price,Stock,Status,Description\n" +
        products.map(product => {
          const category = categories.find(c => c.id === product.categoryId);
          const mainVariant = product.variants?.[0];
          return `"${product.name}","${mainVariant?.sku || 'N/A'}","${category?.name || 'Uncategorized'}","${mainVariant?.sellingPrice || 0}","${product.totalQuantity || 0}","Active","${product.description || ''}"`;
        }).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `product-inventory-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Product inventory exported successfully!');
    } catch (error) {
      toast.error('Failed to export product inventory');
    }
  }, [products, categories]);

  // Keyboard shortcuts for better UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K: Focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      
      // Ctrl/Cmd + N: Add new product
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddProductModal(true);
      }
      
      // Ctrl/Cmd + I: Bulk import
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        navigate('/lats/bulk-import');
      }
      
      // Ctrl/Cmd + E: Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      
      // Escape: Clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
      
      // Number key 1: Switch to inventory tab (only tab now)
      if (e.key === '1' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Only trigger if not in an input field
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setActiveTab('inventory');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, searchQuery, handleExport]);

  // Calculate metrics (use live data when available, fallback to cached data)
  const metrics = useMemo(() => {
    // Use live metrics if available, otherwise calculate from cached products
    if (liveMetrics) {
      return {
        totalItems: liveMetrics.totalProducts,
        lowStockItems: liveMetrics.lowStockItems,
        outOfStockItems: liveMetrics.outOfStockItems,
        reorderAlerts: liveMetrics.reorderAlerts,
        totalValue: liveMetrics.totalValue,
        retailValue: liveMetrics.retailValue || 0, // Add retail value from live metrics
        activeProducts: liveMetrics.activeProducts,
        featuredProducts: products.filter(p => p.isFeatured).length, // Still use cached for featured
        lastUpdated: liveMetrics.lastUpdated
      };
    }

    // Fallback to cached data calculation
    const totalItems = products.length;
    const lowStockItems = products.filter(product => {
      const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
      return totalStock > 0 && totalStock <= 10;
    }).length;
    const outOfStockItems = products.filter(product => {
      const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
      return totalStock <= 0;
    }).length;
    const reorderAlerts = products.filter(product => {
      const mainVariant = product.variants?.[0];
      const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
      return mainVariant?.minQuantity && totalStock <= mainVariant.minQuantity;
    }).length;
    const totalValue = products.reduce((sum, product) => {
      // Calculate value using ALL variants (consistent with LiveInventoryService)
      const productValue = product.variants?.reduce((variantSum, variant) => {
        const costPrice = variant.costPrice || 0;
        const quantity = variant.quantity || 0;
        return variantSum + (costPrice * quantity);
      }, 0) || 0;
      return sum + productValue;
    }, 0);
    
    const retailValue = products.reduce((sum, product) => {
      // Calculate retail value using ALL variants
      const productRetailValue = product.variants?.reduce((variantSum, variant) => {
        const sellingPrice = variant.sellingPrice || variant.price || 0;
        const quantity = variant.quantity || 0;
        return variantSum + (sellingPrice * quantity);
      }, 0) || 0;
      return sum + productRetailValue;
    }, 0);
    const activeProducts = products.length; // All products are automatically active
    const featuredProducts = products.filter(p => p.isFeatured).length;


    return {
      totalItems,
      lowStockItems,
      outOfStockItems,
      reorderAlerts,
      totalValue,
      retailValue,
      activeProducts,
      featuredProducts,
      lastUpdated: new Date().toISOString()
    };
  }, [products, liveMetrics]);

  // Filter products based on active tab and filters
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Note: Showing ALL products including test/sample products as per user preference
    // Previously filtered out: products with 'sample', 'test', or 'dummy' in the name

    // 🔍 DEBUG: Log initial product count
    if (import.meta.env.MODE === 'development' && filtered.length > 0) {
      console.log(`🔍 [UnifiedInventoryPage] Starting with ${filtered.length} products`);
    }

    // Apply search filter with enhanced variant search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const beforeSearch = filtered.length;
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description?.toLowerCase().includes(query) ||
        product.category?.name.toLowerCase().includes(query) ||
        // Enhanced variant search - search through variant names, SKUs, and barcodes
        product.variants?.some(variant => 
          variant.name?.toLowerCase().includes(query) ||
          variant.sku?.toLowerCase().includes(query) ||
          variant.barcode?.toLowerCase().includes(query)
        )
      );
      if (import.meta.env.MODE === 'development') {
        console.log(`🔍 [UnifiedInventoryPage] Search filter "${searchQuery}": ${beforeSearch} → ${filtered.length} products`);
      }
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => 
        categories.find(c => c.id === product.categoryId)?.name === selectedCategory
      );
    }



    // Apply status filter based on active tab
    if (activeTab === 'inventory') {
      if (selectedStatus === 'in-stock') {
        filtered = filtered.filter(product => {
          const stock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
          return stock > 10;
        });
      } else if (selectedStatus === 'low-stock') {
        filtered = filtered.filter(product => {
          const stock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
          return stock > 0 && stock <= 10;
        });
      } else if (selectedStatus === 'out-of-stock') {
        filtered = filtered.filter(product => {
          const stock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
          return stock <= 0;
        });
      }
    } else {
      // Inventory tab status filter
      if (selectedStatus !== 'all') {
        // All products are automatically active - no status filtering needed
        // filtered = filtered.filter(product => product.isActive === (selectedStatus === 'active'));
      }
    }

    // Apply low stock only filter (inventory tab)
    if (activeTab === 'inventory' && showLowStockOnly) {
      filtered = filtered.filter(product => {
        const totalStock = product.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
        return totalStock > 0 && totalStock <= 10;
      });
    }

    // Apply featured filter (inventory tab)
    if (activeTab === 'inventory' && showFeaturedOnly) {
      filtered = filtered.filter(product => product.isFeatured);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return (a.variants?.[0]?.sellingPrice || 0) - (b.variants?.[0]?.sellingPrice || 0);
        case 'stock':
          const aStock = a.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
          const bStock = b.variants?.reduce((sum, variant) => sum + (variant.quantity || 0), 0) || 0;
          return bStock - aStock;
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    // 🔍 DEBUG: Log final filtered count
    if (import.meta.env.MODE === 'development' && filtered.length !== products.length) {
      console.log(`🔍 [UnifiedInventoryPage] After all filters: ${products.length} → ${filtered.length} products`);
      console.log(`🔍 [UnifiedInventoryPage] Active filters:`, {
        searchQuery,
        selectedCategory,
        selectedStatus,
        showLowStockOnly,
        showFeaturedOnly,
        activeTab
      });
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedStatus, showLowStockOnly, showFeaturedOnly, sortBy, activeTab, categories]);


  // Format money
  const formatMoney = (amount: number) => {
    return format.money(amount);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock':
        return 'bg-green-100 text-green-800';
      case 'low-stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out-of-stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle stock adjustment
  const handleStockAdjustment = async (productId: string, variantId: string, quantity: number, reason: string) => {
    try {
      await adjustStock(productId, variantId, quantity, reason);
      toast.success('Stock adjusted successfully');
      
      // Refresh live metrics after stock adjustment
      setTimeout(() => {
        loadLiveMetrics();
      }, 1000); // Small delay to ensure database is updated
    } catch (error) {
      toast.error('Failed to adjust stock');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string) => {
    if (selectedProducts.length === 0) {
      toast.error('Please select products first');
      return;
    }
    
    switch (action) {
      case 'export':
        try {
          const csvContent = "data:text/csv;charset=utf-8," + 
            "Name,SKU,Category,Price,Stock,Status\n" +
            selectedProducts.map(productId => {
              const product = products.find(p => p.id === productId);
              if (!product) return '';
              const category = categories.find(c => c.id === product.categoryId);
              const mainVariant = product.variants?.[0];
              return `${product.name},${mainVariant?.sku || 'N/A'},${category?.name || 'Uncategorized'},${mainVariant?.sellingPrice || 0},${product.totalQuantity || 0},Active`;
            }).filter(row => row !== '').join("\n");
          
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", `products-export-${new Date().toISOString().split('T')[0]}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(`Exported ${selectedProducts.length} products successfully!`);
        } catch (error) {
          toast.error('Failed to export products');
        }
        break;
        
      case 'delete':
        if (confirm(`Are you sure you want to delete ${selectedProducts.length} products? This action cannot be undone.`)) {
          try {
            const deletePromises = selectedProducts.map(productId => deleteProduct(productId));
            await Promise.all(deletePromises);
            toast.success(`Successfully deleted ${selectedProducts.length} products`);
            setSelectedProducts([]);
          } catch (error) {
            toast.error('Failed to delete some products');
          }
        }
        break;
        
      case 'feature':
        try {
          const updatePromises = selectedProducts.map(async (productId) => {
            const product = products.find(p => p.id === productId);
            if (product) {
              // Toggle featured status
              const newFeaturedStatus = !product.isFeatured;
              await updateProduct(productId, { 
                isFeatured: newFeaturedStatus,
                isActive: true // Also ensure product is active when featuring
              });
            }
          });
          
          await Promise.all(updatePromises);
          const firstProduct = products.find(p => p.id === selectedProducts[0]);
          const action = firstProduct?.isFeatured ? 'unfeatured' : 'featured';
          toast.success(`Successfully ${action} ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}`);
          setSelectedProducts([]);
        } catch (error) {
          console.error('Feature error:', error);
          toast.error('Failed to update product featured status');
        }
        break;
      
      case 'print-labels':
        try {
          // Print labels for all selected products
          toast.success(`Preparing labels for ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}...`);
          // Note: The actual print modal is triggered from EnhancedInventoryTab
          // This case is here for completeness and future bulk printing features
        } catch (error) {
          console.error('Print labels error:', error);
          toast.error('Failed to print labels');
        }
        break;
      
      
      case 'duplicate':
        try {
          // Copy product information to clipboard for manual duplication
          const selectedProductsData = selectedProducts.map(productId => {
            const product = products.find(p => p.id === productId);
            if (!product) return null;
            
            return {
              name: product.name,
              categoryId: product.categoryId,
              variants: product.variants?.map((v: any) => ({
                sku: v.sku,
                sellingPrice: v.sellingPrice,
                costPrice: v.costPrice,
                quantity: v.quantity,
                attributes: v.attributes
              }))
            };
          }).filter(Boolean);
          
          // Copy to clipboard
          const productInfo = JSON.stringify(selectedProductsData, null, 2);
          navigator.clipboard.writeText(productInfo);
          
          toast.success(
            `Copied ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''} data to clipboard!\n` +
            'You can use this to create new products.',
            { duration: 4000 }
          );
          
          // Note: In a future update, this could directly duplicate products
          // For now, users can manually create new products using the copied data
        } catch (error) {
          console.error('Duplicate error:', error);
          toast.error('Failed to copy product data to clipboard');
        }
        break;
        
      default:
        toast.error('Unknown action');
    }
  };

  // Handle import functionality - opens combined import/export modal
  const handleImport = () => {
    setShowImportExportModal(true);
  };

  // Handle Excel import completion
  const handleExcelImportComplete = async (importedProducts: Product[]) => {
    setShowImportExportModal(false);
    toast.success(`Successfully imported ${importedProducts.length} products!`);
    
    // Refresh the data
    await Promise.all([
      loadProducts({ page: 1, limit: 50 }),
      loadCategories(),
      loadSuppliers()
    ]);
  };

  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  // Show error state if there's an error
  if (errorState.hasError) {
    return (
      <ErrorState
        error={errorState.error || 'An unexpected error occurred'}
        action={{
          label: 'Retry',
          onClick: () => window.location.reload(),
          variant: 'primary'
        }}
        secondaryAction={{
          label: 'Clear Error',
          onClick: clearError,
          variant: 'secondary'
        }}
      />
    );
  }

  // Show skeleton while loading
  if (showLoadingSkeleton && products.length === 0) {
    return <DashboardSkeleton />;
  }

  return (
    <PageErrorBoundary pageName="Unified Inventory Management" showDetails={true}>
      {/* Keyboard Shortcuts Help */}
      <div className="fixed bottom-4 right-4 z-40 group">
        <button
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 text-sm font-medium"
        >
          <span>⌨️</span>
          <span className="hidden md:inline">Shortcuts</span>
        </button>
        
        {/* Shortcuts Tooltip */}
        <div className="absolute bottom-14 right-0 w-64 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-gray-200/50 p-4 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
          <h3 className="text-sm font-bold text-gray-800 mb-2">⌨️ Keyboard Shortcuts</h3>
          <div className="space-y-2 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Focus Search</span>
              <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">⌘K</kbd>
            </div>
            <div className="flex justify-between">
              <span>Add Product</span>
              <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">⌘N</kbd>
            </div>
            <div className="flex justify-between">
              <span>Bulk Import</span>
              <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">⌘I</kbd>
            </div>
            <div className="flex justify-between">
              <span>Export Data</span>
              <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">⌘E</kbd>
            </div>
            <div className="flex justify-between">
              <span>Clear Search</span>
              <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">ESC</kbd>
            </div>
            <div className="flex justify-between">
              <span>Manage Orders</span>
              <kbd className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">Click Button</kbd>
            </div>
          </div>
        </div>
      </div>

      {/* Combined Container - All sections in one page like PurchaseOrdersPage */}
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[95vh]">
          {/* Fixed Header Section - Matching PurchaseOrdersPage */}
          <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Left: Icon + Text */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Inventory Management</h1>
                  <p className="text-sm text-gray-600">Manage products and inventory in one place</p>
                </div>
              </div>

              {/* Right: Back Button */}
              <BackButton to="/dashboard" label="" className="!w-12 !h-12 !p-0 !rounded-full !bg-blue-600 hover:!bg-blue-700 !shadow-lg flex items-center justify-center" iconClassName="text-white" />
            </div>
          </div>

          {/* Action Bar - Enhanced Design */}
          <div className="px-8 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100/50 flex-shrink-0">
            <div className="flex gap-3 flex-wrap">
              {/* Manage Categories Button */}
              <button
                onClick={() => setShowManageCategoriesModal(true)}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:from-indigo-600 hover:to-purple-700"
              >
                <Tag size={18} />
                <span>Manage Categories</span>
              </button>
              
              {/* Add Product Button */}
              <button
                onClick={() => setShowAddProductModal(true)}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg hover:from-blue-600 hover:to-blue-700"
                title="Add a new product (⌘N)"
              >
                <Plus size={18} />
                <span>Add Product</span>
              </button>

              {/* Manage Orders Button */}
              <button
                onClick={() => setShowOrderManagementModal(true)}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg hover:from-purple-600 hover:to-purple-700"
              >
                <ShoppingCart size={18} />
                <span>Manage Orders</span>
              </button>

              {/* Import/Export Excel Button */}
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:from-green-600 hover:to-emerald-700"
              >
                <Upload size={18} />
                <span>Import / Export</span>
              </button>

              {/* Refresh Data Button */}
              <button
                onClick={async () => {
                  setIsDataLoading(true);
                  try {
                    // Clear all product-related caches before refresh
                    try {
                      const { getProducts } = await import('../../../lib/latsProductApi');
                      await getProducts({ forceRefresh: true });
                    } catch (e) {
                      console.warn('Cache clear warning:', e);
                    }
                    
                    await Promise.all([
                      loadLiveMetrics(),
                      forceRefreshProducts()
                    ]);
                    toast.success('Data refreshed successfully! All caches cleared.');
                  } catch (error) {
                    console.error('Refresh error:', error);
                    toast.error('Failed to refresh data');
                  } finally {
                    setIsDataLoading(false);
                  }
                }}
                disabled={isLoadingLiveMetrics || isDataLoading}
                className="flex items-center gap-2 px-6 py-3 font-semibold text-sm rounded-xl transition-all duration-200 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg hover:from-gray-600 hover:to-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={18} className={isLoadingLiveMetrics || isDataLoading ? 'animate-spin' : ''} />
                <span>{isLoadingLiveMetrics || isDataLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>

            </div>
          </div>

          {/* Main Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading Skeleton */}
            {showLoadingSkeleton && (
              <div className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-gray-200 rounded-xl p-5 h-24"></div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Content - Only inventory tab now */}
            {!showLoadingSkeleton && (
              <EnhancedInventoryTab 
          products={filteredProducts}
          metrics={metrics}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          selectedBrand={selectedBrand}
          setSelectedBrand={setSelectedBrand}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          showLowStockOnly={showLowStockOnly}
          setShowLowStockOnly={setShowLowStockOnly}
          showFeaturedOnly={showFeaturedOnly}
          setShowFeaturedOnly={setShowFeaturedOnly}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortBy={sortBy}
          setSortBy={setSortBy}
          selectedProducts={selectedProducts}
          setSelectedProducts={setSelectedProducts}
          categories={categories}
          suppliers={suppliers}
          brands={[]}
          formatMoney={formatMoney}
          getStatusColor={getStatusColor}
          handleStockAdjustment={handleStockAdjustment}
          handleBulkAction={handleBulkAction}
          setShowStockAdjustModal={setShowStockAdjustModal}
          setSelectedProductForHistory={setSelectedProductForHistory}
          setShowDeleteConfirmation={setShowDeleteConfirmation}
          toggleProductSelection={toggleProductSelection}
          toggleSelectAll={toggleSelectAll}
          navigate={navigate}
          productModals={productModals}
          deleteProduct={deleteProduct}
          onAddProduct={() => setShowAddProductModal(true)}
        />
            )}
          </div>
        </div>
      </div>

      {/* Product Modals */}

        {/* Enhanced Stock Adjustment Modal */}
        {showStockAdjustModal && selectedProductForHistory && (
          <EnhancedStockAdjustModal
            product={products.find(p => p.id === selectedProductForHistory) || undefined}
            isOpen={showStockAdjustModal}
            onClose={() => {
              setShowStockAdjustModal(false);
              setSelectedProductForHistory(null);
            }}
            onSubmit={async (data) => {
              const { variant, ...adjustmentData } = data;
              let quantity = adjustmentData.quantity;
              
              // Calculate the actual quantity change based on adjustment type
              if (adjustmentData.adjustmentType === 'out') {
                quantity = -quantity; // Negative for stock out
              } else if (adjustmentData.adjustmentType === 'set') {
                quantity = quantity - variant.quantity; // Difference for set
              }
              
              await handleStockAdjustment(selectedProductForHistory, variant.id, quantity, adjustmentData.reason);
            }}
            loading={isLoading}
          />
        )}

        {/* Form Modals */}
        <CategoryFormModal
          isOpen={showCategoryForm}
          onClose={() => setShowCategoryForm(false)}
          onSubmit={async (categoryData) => {
            try {
              await createCategory(categoryData);
              toast.success('Category created successfully');
              setShowCategoryForm(false);
            } catch (error) {
              toast.error('Failed to create category');
            }
          }}
          parentCategories={categories}
          loading={isLoading}
        />

        {/* Manage Categories Modal */}
        {showManageCategoriesModal && (
          <ManageCategoriesModal
            isOpen={showManageCategoriesModal}
            onClose={() => setShowManageCategoriesModal(false)}
            categories={categories || []}
            onCategoryUpdate={async () => {
              // Force refresh categories to clear cache and get all categories including children
              const { categoryService } = await import('../lib/categoryService');
              await categoryService.forceRefresh();
              await loadCategories();
            }}
          />
        )}



        {showSupplierForm && (
          <SupplierForm
            onSubmit={async (supplierData) => {
              try {
                // Map the form data to match the Supplier interface
                const mappedData = {
                  ...supplierData,
                  leadTimeDays: 7, // Default lead time
                  isActive: true, // Default to active
                  country: supplierData.country || 'TZ', // Default country
                  currency: supplierData.currency || 'TZS' // Default currency
                };
                await createSupplier(mappedData);
                toast.success('Supplier created successfully');
                setShowSupplierForm(false);
              } catch (error) {
                toast.error('Failed to create supplier');
              }
            }}
            onClose={() => setShowSupplierForm(false)}
          />
        )}


        {/* Delete Confirmation Modal */}
        {showDeleteConfirmation && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowDeleteConfirmation(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Products</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Are you sure you want to delete <span className="font-semibold">{selectedProducts.length}</span> product{selectedProducts.length !== 1 ? 's' : ''}? 
                This action will permanently remove them from your inventory.
              </p>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirmation(false)}
                  className="px-4 py-2.5 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleBulkAction('delete');
                    setShowDeleteConfirmation(false);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-sm"
                >
                  Delete {selectedProducts.length} Product{selectedProducts.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Combined Import/Export Modal */}
      <ProductImportExportModal
        isOpen={showImportExportModal}
        onClose={() => setShowImportExportModal(false)}
        onImportComplete={handleExcelImportComplete}
      />

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={showAddProductModal}
        onClose={() => setShowAddProductModal(false)}
        onProductCreated={async () => {
          setShowAddProductModal(false);
          await loadProducts();
          toast.success('Product created successfully!');
        }}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={productModals.showEditModal}
        onClose={productModals.closeEditModal}
        productId={productModals.editingProductId || ''}
        onProductUpdated={async () => {
          await loadProducts();
          toast.success('Product updated successfully!');
        }}
        onSuccess={() => {
          productModals.closeEditModal();
        }}
      />

      {/* Order Management Modal */}
      <OrderManagementModal
        isOpen={showOrderManagementModal}
        onClose={() => setShowOrderManagementModal(false)}
      />
    </PageErrorBoundary>
  );
};

export default UnifiedInventoryPage;
