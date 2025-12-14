import React, { useState, useEffect } from 'react';
import { Search, Package, QrCode, X, MoreHorizontal, Grid, List, DollarSign, Wrench } from 'lucide-react';
import GlassCard from '../../../../features/shared/components/ui/GlassCard';
import VariantProductCard from './VariantProductCard';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../../../context/AuthContext';
import { rbacManager, type UserRole } from '../../lib/rbac';
import { usePOSClickSounds } from '../../hooks/usePOSClickSounds';
import { RealTimeStockService } from '../../lib/realTimeStock';
import { useGeneralSettingsContext } from '../../../../context/GeneralSettingsContext';
import { useTranslation } from '../../lib/i18n/useTranslation';
import { getProductTotalStock } from '../../lib/productUtils';
import { searchIMEIVariants } from '../../lib/imeiVariantService';
import { useBranch } from '../../../../context/BranchContext';
import { SparePart } from '../../types/spareParts';
import { StockLevelIndicator } from '../shared/StockLevelIndicator';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  totalQuantity?: number;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    parent_id?: string;
    isActive: boolean;
    sortOrder: number;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
    children?: any[];
  };
  image?: string;
  barcode?: string;
  variants?: any[];
}

interface ProductSearchSectionProps {
  products: Product[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching: boolean;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: (show: boolean) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  selectedBrand: string;
  setSelectedBrand: (brand: string) => void;
  priceRange: { min: string; max: string };
  setPriceRange: (range: { min: string; max: string }) => void;
  stockFilter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
  setStockFilter: (filter: 'all' | 'in-stock' | 'low-stock' | 'out-of-stock') => void;
  sortBy: 'name' | 'price' | 'stock' | 'recent' | 'sales';
  setSortBy: (sort: 'name' | 'price' | 'stock' | 'recent' | 'sales') => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (order: 'asc' | 'desc') => void;
  categories: string[];
  brands: string[];
  onAddToCart: (product: Product, variant?: any) => void;
  onAddSparePartToCart?: (sparePart: SparePart) => void;
  onAddExternalProduct: () => void;
  onSearch: (query: string) => void;
  onScanQrCode?: () => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  productsPerPage: number;
  spareParts?: SparePart[]; // Spare parts from unified search
}

const ProductSearchSection: React.FC<ProductSearchSectionProps> = ({
  products,
  searchQuery,
  setSearchQuery,
  isSearching,
  showAdvancedFilters,
  setShowAdvancedFilters,
  selectedCategory,
  setSelectedCategory,
  selectedBrand,
  setSelectedBrand,
  priceRange,
  setPriceRange,
  stockFilter,
  setStockFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  categories,
  brands,
  onAddToCart,
  onAddSparePartToCart,
  onAddExternalProduct,
  onSearch,
  onScanQrCode,
  currentPage,
  setCurrentPage,
  totalPages,
  productsPerPage,
  spareParts = []
}) => {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role as UserRole;
  const canAddProducts = rbacManager.can(userRole, 'products', 'create');
  const { playClickSound } = usePOSClickSounds();
  const { t } = useTranslation(); // Add translation hook
  
  // Reset to page 1 when productsPerPage changes
  useEffect(() => {
    setCurrentPage(1);
  }, [productsPerPage, setCurrentPage]);
  
  // Session-based debug logging to prevent excessive console output
  const [hasLoggedDebug, setHasLoggedDebug] = useState(false);
  
  // Search suggestions disabled - keeping state for potential future use
  const [searchSuggestions, setSearchSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Categories expanded state
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  
  // View mode state (grid or list)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // State to track product IDs that match via children variants (IMEI/serial numbers)
  const [productsWithMatchingChildrenVariants, setProductsWithMatchingChildrenVariants] = useState<Set<string>>(new Set());
  const { currentBranch } = useBranch();

  // Category colors mapping - Comprehensive color scheme for all categories
  const getCategoryColor = (category: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; text: string; border: string; selected: string }> = {
      // Mobile Devices
      'Android Phones': { 
        bg: 'bg-green-50', 
        text: 'text-green-700', 
        border: 'border-green-200',
        selected: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-green-700'
      },
      'Android Tablets': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        selected: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700'
      },
      'iPhones': { 
        bg: 'bg-slate-50', 
        text: 'text-slate-700', 
        border: 'border-slate-200',
        selected: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-slate-700'
      },
      'iPhone': { 
        bg: 'bg-slate-50', 
        text: 'text-slate-700', 
        border: 'border-slate-200',
        selected: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-slate-700'
      },
      'iPad': { 
        bg: 'bg-sky-50', 
        text: 'text-sky-700', 
        border: 'border-sky-200',
        selected: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white border-sky-700'
      },
      'iPads': { 
        bg: 'bg-sky-50', 
        text: 'text-sky-700', 
        border: 'border-sky-200',
        selected: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white border-sky-700'
      },
      'iOS Devices': { 
        bg: 'bg-slate-50', 
        text: 'text-slate-700', 
        border: 'border-slate-200',
        selected: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white border-slate-700'
      },
      'Smart Watches': { 
        bg: 'bg-pink-50', 
        text: 'text-pink-700', 
        border: 'border-pink-200',
        selected: 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-pink-700'
      },
      'Smartwatches': { 
        bg: 'bg-pink-50', 
        text: 'text-pink-700', 
        border: 'border-pink-200',
        selected: 'bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white border-pink-700'
      },
      
      // Computers & Laptops
      'Laptops': { 
        bg: 'bg-indigo-50', 
        text: 'text-indigo-700', 
        border: 'border-indigo-200',
        selected: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-indigo-700'
      },
      'Laptop': { 
        bg: 'bg-indigo-50', 
        text: 'text-indigo-700', 
        border: 'border-indigo-200',
        selected: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-indigo-700'
      },
      'Computers': { 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-200',
        selected: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-emerald-700'
      },
      'Computer': { 
        bg: 'bg-emerald-50', 
        text: 'text-emerald-700', 
        border: 'border-emerald-200',
        selected: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-emerald-700'
      },
      'Computer Parts': { 
        bg: 'bg-teal-50', 
        text: 'text-teal-700', 
        border: 'border-teal-200',
        selected: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white border-teal-700'
      },
      'Monitors': { 
        bg: 'bg-lime-50', 
        text: 'text-lime-700', 
        border: 'border-lime-200',
        selected: 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white border-lime-700'
      },
      'Monitor': { 
        bg: 'bg-lime-50', 
        text: 'text-lime-700', 
        border: 'border-lime-200',
        selected: 'bg-gradient-to-r from-lime-500 to-lime-600 hover:from-lime-600 hover:to-lime-700 text-white border-lime-700'
      },
      
      // Audio
      'Soundbars': { 
        bg: 'bg-rose-50', 
        text: 'text-rose-700', 
        border: 'border-rose-200',
        selected: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white border-rose-700'
      },
      'Soundbar': { 
        bg: 'bg-rose-50', 
        text: 'text-rose-700', 
        border: 'border-rose-200',
        selected: 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white border-rose-700'
      },
      'Bluetooth Speakers': { 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        selected: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-amber-700'
      },
      'Bluetooth Speaker': { 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        selected: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-amber-700'
      },
      'Audio & Sound': { 
        bg: 'bg-fuchsia-50', 
        text: 'text-fuchsia-700', 
        border: 'border-fuchsia-200',
        selected: 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 text-white border-fuchsia-700'
      },
      'Audio Accessories': { 
        bg: 'bg-violet-50', 
        text: 'text-violet-700', 
        border: 'border-violet-200',
        selected: 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white border-violet-700'
      },
      'Headphones': { 
        bg: 'bg-orange-50', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        selected: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-orange-700'
      },
      'Headphone': { 
        bg: 'bg-orange-50', 
        text: 'text-orange-700', 
        border: 'border-orange-200',
        selected: 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-orange-700'
      },
      'Speakers': { 
        bg: 'bg-amber-50', 
        text: 'text-amber-700', 
        border: 'border-amber-200',
        selected: 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white border-amber-700'
      },
      
      // Accessories
      'Accessories': { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        selected: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-purple-700'
      },
      'Accessory': { 
        bg: 'bg-purple-50', 
        text: 'text-purple-700', 
        border: 'border-purple-200',
        selected: 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-purple-700'
      },
      'Chargers': { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        selected: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-700'
      },
      'Charger': { 
        bg: 'bg-yellow-50', 
        text: 'text-yellow-700', 
        border: 'border-yellow-200',
        selected: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-yellow-700'
      },
      'Cases & Covers': { 
        bg: 'bg-teal-50', 
        text: 'text-teal-700', 
        border: 'border-teal-200',
        selected: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white border-teal-700'
      },
      'Cases': { 
        bg: 'bg-teal-50', 
        text: 'text-teal-700', 
        border: 'border-teal-200',
        selected: 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white border-teal-700'
      },
      'Screen Protectors': { 
        bg: 'bg-cyan-50', 
        text: 'text-cyan-700', 
        border: 'border-cyan-200',
        selected: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-cyan-700'
      },
      'Screen Protector': { 
        bg: 'bg-cyan-50', 
        text: 'text-cyan-700', 
        border: 'border-cyan-200',
        selected: 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white border-cyan-700'
      },
      'Cables': { 
        bg: 'bg-zinc-50', 
        text: 'text-zinc-700', 
        border: 'border-zinc-200',
        selected: 'bg-gradient-to-r from-zinc-500 to-zinc-600 hover:from-zinc-600 hover:to-zinc-700 text-white border-zinc-700'
      },
      'Cable': { 
        bg: 'bg-zinc-50', 
        text: 'text-zinc-700', 
        border: 'border-zinc-200',
        selected: 'bg-gradient-to-r from-zinc-500 to-zinc-600 hover:from-zinc-600 hover:to-zinc-700 text-white border-zinc-700'
      },
      
      // Repair & Parts
      'Spare Parts': { 
        bg: 'bg-stone-50', 
        text: 'text-stone-700', 
        border: 'border-stone-200',
        selected: 'bg-gradient-to-r from-stone-500 to-stone-600 hover:from-stone-600 hover:to-stone-700 text-white border-stone-700'
      },
      'Repair Parts': { 
        bg: 'bg-red-50', 
        text: 'text-red-700', 
        border: 'border-red-200',
        selected: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-red-700'
      },
      'LCD Screens': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        selected: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700'
      },
      'LCD Screen': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        selected: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700'
      },
      'MacBook LCD Screens': { 
        bg: 'bg-indigo-50', 
        text: 'text-indigo-700', 
        border: 'border-indigo-200',
        selected: 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white border-indigo-700'
      },
      
      // General
      'Electronics': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        selected: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700'
      },
      'Electronic': { 
        bg: 'bg-blue-50', 
        text: 'text-blue-700', 
        border: 'border-blue-200',
        selected: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700'
      },
      'Uncategorized': { 
        bg: 'bg-gray-50', 
        text: 'text-gray-700', 
        border: 'border-gray-200',
        selected: 'bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white border-gray-700'
      },
    };

    // Default color for any category not in the mapping
    const defaultColor = {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      selected: 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700'
    };

    return colors[category] || defaultColor;
  };

  // Real-time stock data for all products (BATCH FETCH to avoid N+1 queries)
  const [realTimeStockData, setRealTimeStockData] = useState<Map<string, number>>(new Map());
  const [isLoadingStock, setIsLoadingStock] = useState(false);

  // Batch fetch stock data for all products when products change
  useEffect(() => {
    const fetchAllStockData = async () => {
      if (!products || products.length === 0) return;
      
      try {
        setIsLoadingStock(true);
        const productIds = products.map(p => p.id);
        
        // Batch fetch stock for ALL products at once
        const stockService = RealTimeStockService.getInstance();
        const stockLevels = await stockService.getStockLevels(productIds);
        
        // Convert to Map for easy lookup
        const stockMap = new Map<string, number>();
        Object.entries(stockLevels).forEach(([productId, levels]) => {
          const totalStock = levels.reduce((sum, level) => sum + level.quantity, 0);
          stockMap.set(productId, totalStock);
        });
        
        setRealTimeStockData(stockMap);
        
        if (import.meta.env.MODE === 'development') {
          console.log(`✅ [ProductSearchSection] Batch fetched stock for ${productIds.length} products in ONE query`);
        }
      } catch (error) {
        console.error('❌ [ProductSearchSection] Error fetching batch stock:', error);
      } finally {
        setIsLoadingStock(false);
      }
    };

    fetchAllStockData();
  }, [products]);

  // Search for children variants (IMEI/serial numbers) when search query changes
  useEffect(() => {
    const searchChildrenVariants = async () => {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setProductsWithMatchingChildrenVariants(new Set());
        if (import.meta.env.DEV && searchQuery.trim().length > 0) {
          console.log(`ℹ️ [ProductSearchSection] Search query too short (${searchQuery.trim().length} chars), minimum 2 required`);
        }
        return;
      }

      if (import.meta.env.DEV) {
        console.log(`🔍 [ProductSearchSection] Searching for children variants: "${searchQuery}"`);
      }

      try {
        const matchingVariants = await searchIMEIVariants(
          searchQuery.trim(),
          currentBranch?.id
        );

        // Extract unique product IDs from matching variants
        const productIds = new Set<string>();
        matchingVariants.forEach((variant: any) => {
          // The variant should have product_id directly, or via the product relation
          const productId = variant.product_id || variant.product?.id;
          if (productId) {
            productIds.add(productId);
          } else if (import.meta.env.DEV) {
            console.warn('⚠️ [ProductSearchSection] Variant missing product_id:', {
              variantId: variant.id,
              variantType: variant.variant_type,
              hasProductRelation: !!variant.product,
              variantAttributes: variant.variant_attributes
            });
          }
        });

        if (import.meta.env.DEV) {
          if (productIds.size > 0) {
            console.log(`✅ [ProductSearchSection] Found ${productIds.size} products with matching children variants for "${searchQuery}"`);
            console.log('📋 Product IDs:', Array.from(productIds));
            
            // Check if these products are in the products array
            const productIdsArray = Array.from(productIds);
            const productsInList = productIdsArray.filter(id => products.some(p => p.id === id));
            const productsNotInList = productIdsArray.filter(id => !products.some(p => p.id === id));
            
            if (productsNotInList.length > 0) {
              console.warn(`⚠️ [ProductSearchSection] ${productsNotInList.length} products with matching variants are NOT in the products list:`, productsNotInList);
              console.warn('💡 This might be because:');
              console.warn('   - Products are not loaded yet');
              console.warn('   - Products are filtered by branch settings');
              console.warn('   - Products are paginated and not in current page');
            }
            if (productsInList.length > 0) {
              console.log(`✅ [ProductSearchSection] ${productsInList.length} products with matching variants ARE in the products list and should appear in search results`);
            }
          } else {
            console.log(`⚠️ [ProductSearchSection] No products found for "${searchQuery}" - found ${matchingVariants.length} matching variants`);
            if (matchingVariants.length > 0) {
              console.log('🔍 Matching variants (but missing product_id):', matchingVariants.map((v: any) => ({
                id: v.id,
                product_id: v.product_id,
                product: v.product?.id,
                variant_attributes: v.variant_attributes
              })));
            } else {
              console.log(`ℹ️ [ProductSearchSection] No variants found matching "${searchQuery}" in database`);
            }
          }
        }

        setProductsWithMatchingChildrenVariants(productIds);
      } catch (error) {
        console.error('❌ [ProductSearchSection] Error searching children variants:', error);
        setProductsWithMatchingChildrenVariants(new Set());
      }
    };

    // Debounce the search
    const timeoutId = setTimeout(() => {
      searchChildrenVariants();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, currentBranch?.id, products]);

  // Handle search input change
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Disable search suggestions - just update the search query
    setShowSuggestions(false);
  };

  // Handle search input key press
  const handleSearchInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchQuery.trim()) {
        onSearch(searchQuery.trim());
      }
    }
  };

  // Handle unified search
  const handleUnifiedSearch = (query: string) => {
    // Check if it's a barcode
    if (/^\d{8,}$/.test(query)) {
      // It's likely a barcode
      if (onScanQrCode) {
        onScanQrCode();
      } else {
        toast('QrCode scanning not available');
      }
    } else {
      // Regular search
      onSearch(query);
    }
  };

  // Filter products based on current filters
  const filteredProducts = products.filter(product => {
    // Search query filter - check children variants FIRST before other filters
    if (searchQuery.trim()) {
      // First check if this product has matching children variants (IMEI/serial numbers)
      // This takes priority over other search criteria
      const matchesViaChildrenVariants = productsWithMatchingChildrenVariants.has(product.id);
      
      if (matchesViaChildrenVariants) {
        // Product matches via children variant - continue to other filters (category, stock, etc.)
        // Don't return false here, let it pass through to other filters
        if (import.meta.env.DEV) {
          console.log(`✅ [ProductSearchSection] Product "${product.name}" (${product.id}) matches via children variant`);
        }
      } else {
        // Check other search criteria
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          product.name?.toLowerCase().includes(query) ||
          product.sku?.toLowerCase().includes(query) ||
          (product.category?.name && product.category.name.toLowerCase().includes(query)) ||
          // Enhanced variant search - search through variant names and SKUs
          (product.variants && product.variants.some(variant => 
            variant.name?.toLowerCase().includes(query) ||
            variant.sku?.toLowerCase().includes(query) ||
            variant.barcode?.toLowerCase().includes(query)
          ));
        
        if (!matchesSearch) return false;
      }
    }
    
    // Category filter - only filter if a specific category is selected (not "All Product" or empty)
    // Handle both category.name and categoryName fields for backward compatibility
    if (selectedCategory && selectedCategory !== 'All Product' && selectedCategory !== 'all' && selectedCategory !== '') {
      const productCategoryName = product.category?.name || (product as any).categoryName || '';
      if (productCategoryName !== selectedCategory) return false;
    }
    
    // Get product price from variants or fallback to product level
    const primaryVariant = product.variants?.[0];
    const productPrice = primaryVariant?.sellingPrice || product.price || 0;
    
    // ✅ FIX: Use getProductTotalStock to calculate total stock across ALL variants
    // This ensures products with multiple variants are correctly filtered
    const productStock = getProductTotalStock(product as any);
    
    // Price range filter
    if (priceRange.min && productPrice < parseFloat(priceRange.min)) return false;
    if (priceRange.max && productPrice > parseFloat(priceRange.max)) return false;
    
    // Stock filter
    switch (stockFilter) {
      case 'in-stock':
        if (productStock <= 0) return false;
        break;
      case 'low-stock':
        if (productStock > 10 || productStock <= 0) return false;
        break;
      case 'out-of-stock':
        if (productStock > 0) return false;
        break;
    }
    
    return true;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // Get product price from variants or fallback to product level
    const aPrimaryVariant = a.variants?.[0];
    const bPrimaryVariant = b.variants?.[0];
    const aPrice = aPrimaryVariant?.sellingPrice || a.price || 0;
    const bPrice = bPrimaryVariant?.sellingPrice || b.price || 0;
    
    // ✅ FIX: Use getProductTotalStock to calculate total stock across ALL variants
    // This ensures products with multiple variants are correctly sorted
    const aStock = getProductTotalStock(a as any);
    const bStock = getProductTotalStock(b as any);
    
    // ✅ PRIORITY: Products with stock always appear above products without stock
    const aHasStock = aStock > 0;
    const bHasStock = bStock > 0;
    
    // If one has stock and the other doesn't, prioritize the one with stock
    if (aHasStock && !bHasStock) return -1;
    if (!aHasStock && bHasStock) return 1;
    
    // If both have stock or both don't have stock, apply normal sorting
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = aPrice - bPrice;
        break;
      case 'stock':
        comparison = aStock - bStock;
        break;
      case 'recent':
        // Assuming products have a createdAt field, using id as fallback
        comparison = a.id.localeCompare(b.id);
        break;
      case 'sales':
        // Using stock as fallback for sales sorting
        comparison = bStock - aStock;
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Display all products (scrolling instead of pagination)
  const displayProducts = sortedProducts;
  
  // No pagination - all products displayed with scrolling
  const calculatedTotalPages = 1;

  // Debug logging to help diagnose product display issues
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔍 [ProductSearchSection] Debug Info:', {
        productsCount: products.length,
        filteredCount: filteredProducts.length,
        sortedCount: sortedProducts.length,
        displayCount: displayProducts.length,
        searchQuery,
        selectedCategory,
        stockFilter,
        priceRange,
        sortBy,
        sortOrder,
        hasSearchQuery: !!searchQuery.trim(),
        hasCategoryFilter: !!selectedCategory && selectedCategory !== 'All Product' && selectedCategory !== 'all'
      });
    }
  }, [products.length, filteredProducts.length, sortedProducts.length, displayProducts.length, searchQuery, selectedCategory, stockFilter]);


  return (
    <div className="h-full flex flex-col">
      <GlassCard className="p-6 h-full flex flex-col overflow-hidden">
        {/* Fixed Search Section */}
        <div className="flex-shrink-0 mb-4">
          {/* Main Search and Quick Filters */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-md p-4 mb-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder={`${t('common.search')} ${t('common.products').toLowerCase()}...`}
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchInputKeyPress}
                  className="w-full min-h-[52px] pl-12 pr-24 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all text-sm font-medium placeholder:text-gray-400 shadow-sm hover:shadow-md"
                />
                
                {/* Action buttons inside search bar */}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                  {canAddProducts && (
                    <button
                      onClick={() => {
                        playClickSound();
                        onAddExternalProduct();
                      }}
                      className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Add Product"
                    >
                      <Package className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      playClickSound();
                      if (searchQuery.trim()) {
                        handleUnifiedSearch(searchQuery.trim());
                      }
                    }}
                    className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
                    title="Scan Barcode"
                  >
                    <QrCode className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Filters Row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Sort with integrated order */}
              <div className="flex rounded-lg overflow-hidden shadow-sm border border-gray-300">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="min-h-[44px] px-4 py-2.5 focus:outline-none focus:ring-0 bg-gradient-to-br from-gray-50 to-gray-100 text-sm font-medium border-none hover:from-gray-100 hover:to-gray-200 transition-all cursor-pointer"
                >
                  <option value="sales">🔥 Best Selling</option>
                  <option value="name">🔤 Name</option>
                  <option value="price">💰 Price</option>
                  <option value="stock">📦 Stock</option>
                </select>
                <button
                  onClick={() => {
                    playClickSound();
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 text-lg font-bold bg-gradient-to-br from-gray-50 to-gray-100 border-l border-gray-300 text-gray-700 hover:from-gray-100 hover:to-gray-200 transition-all"
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Price Range - Only show if being used */}
              {(priceRange.min || priceRange.max) && (
                <div className="flex rounded-lg overflow-hidden shadow-sm border border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100">
                  <div className="flex items-center px-2 text-blue-700">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                    className="min-h-[44px] px-3 py-2.5 focus:outline-none focus:ring-0 bg-transparent text-sm font-medium text-blue-900 w-20 border-none placeholder:text-blue-400"
                  />
                  <div className="flex items-center px-1 text-blue-700 font-bold">—</div>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                    className="min-h-[44px] px-3 py-2.5 focus:outline-none focus:ring-0 bg-transparent text-sm font-medium text-blue-900 w-20 border-none placeholder:text-blue-400"
                  />
                  <button
                    onClick={() => {
                      playClickSound();
                      setPriceRange({ min: '', max: '' });
                    }}
                    className="min-h-[44px] px-3 py-2 text-blue-600 hover:text-red-600 hover:bg-red-50 transition-all border-l border-blue-300"
                    title="Clear price filter"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    setSelectedCategory('');
                  }}
                  className={`min-h-[44px] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 border shadow-sm ${
                    selectedCategory === '' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700 shadow-md' 
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-gray-300 hover:shadow-md hover:scale-105'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {selectedCategory === '' && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                    All Products
                  </span>
                </button>
                {(categoriesExpanded ? categories : categories.slice(0, 3)).map((category) => {
                  const colorScheme = getCategoryColor(category, selectedCategory === category);
                  const isSelected = selectedCategory === category;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => {
                        playClickSound();
                        setSelectedCategory(category);
                      }}
                      className={`min-h-[44px] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 border shadow-sm hover:scale-105 ${
                        isSelected 
                          ? colorScheme.selected + ' shadow-md' 
                          : `${colorScheme.bg} ${colorScheme.text} ${colorScheme.border} hover:shadow-md`
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isSelected && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                        {category}
                      </span>
                    </button>
                  );
                })}
                {categories.length > 3 && (
                  <button
                    onClick={() => {
                      playClickSound();
                      setCategoriesExpanded(!categoriesExpanded);
                    }}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 text-sm bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border border-gray-300 hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 hover:shadow-md hover:scale-105 transition-all duration-300 rounded-lg shadow-sm"
                    title={categoriesExpanded ? "Show less" : "Show all categories"}
                  >
                    {categoriesExpanded ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
                  </button>
                )}
              </div>

              {/* Stock Filter Buttons */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    setStockFilter('all');
                  }}
                  className={`min-h-[44px] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 border shadow-sm hover:scale-105 ${
                    stockFilter === 'all' 
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-blue-700 shadow-md' 
                      : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 border-blue-200 hover:shadow-md'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {stockFilter === 'all' && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                    All Stock
                  </span>
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setStockFilter('in-stock');
                  }}
                  className={`min-h-[44px] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 border shadow-sm hover:scale-105 ${
                    stockFilter === 'in-stock' 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-green-700 shadow-md' 
                      : 'bg-gradient-to-br from-green-50 to-green-100 text-green-700 border-green-200 hover:shadow-md'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {stockFilter === 'in-stock' && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                    In Stock
                  </span>
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setStockFilter('low-stock');
                  }}
                  className={`min-h-[44px] px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-medium rounded-lg transition-all duration-300 border shadow-sm hover:scale-105 ${
                    stockFilter === 'low-stock' 
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-orange-700 shadow-md' 
                      : 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 border-orange-200 hover:shadow-md'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {stockFilter === 'low-stock' && <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>}
                    Low Stock
                  </span>
                </button>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    playClickSound();
                    setViewMode('grid');
                  }}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 text-sm transition-all duration-300 rounded-lg border shadow-sm hover:scale-105 ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white border-gray-900 shadow-md'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-gray-300 hover:shadow-md'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    playClickSound();
                    setViewMode('list');
                  }}
                  className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 sm:px-4 py-2 sm:py-3 text-sm transition-all duration-300 rounded-lg border shadow-sm hover:scale-105 ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white border-gray-900 shadow-md'
                      : 'bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border-gray-300 hover:shadow-md'
                  }`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Products Grid/List - Scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pos-products-scroll pr-2" style={{ minHeight: 0 }}>
          {displayProducts.length > 0 ? (
            viewMode === 'grid' ? (
              <div className="w-full max-w-full pb-6">
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
                    gap: 'clamp(1rem, 2vw, 1.5rem)',
                    gridAutoRows: '1fr'
                  }}
                >
                  {/* Spare Parts Section */}
                  {spareParts.length > 0 && searchQuery.trim() && (
                    <>
                      <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                        <div className="flex items-center gap-2 mb-3">
                          <Wrench className="w-5 h-5 text-orange-600" />
                          <h3 className="text-lg font-semibold text-gray-700">Spare Parts ({spareParts.length})</h3>
                        </div>
                      </div>
                      {spareParts.map((sparePart) => (
                        <div
                          key={`spare-${sparePart.id}`}
                          className="bg-white rounded-lg border-2 border-orange-200 hover:border-orange-400 shadow-md hover:shadow-lg transition-all p-4"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2">
                                {sparePart.name}
                              </h4>
                              {sparePart.part_number && (
                                <p className="text-xs text-gray-500 mb-2">Part: {sparePart.part_number}</p>
                              )}
                            </div>
                            <div className="ml-2">
                              <Wrench className="w-5 h-5 text-orange-600" />
                            </div>
                          </div>
                          
                          {sparePart.images && sparePart.images.length > 0 && (
                            <div className="w-full h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                              <img
                                src={sparePart.images[0]}
                                alt={sparePart.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          
                          <div className="mb-2">
                            <StockLevelIndicator
                              quantity={sparePart.quantity || 0}
                              minLevel={sparePart.min_quantity || 0}
                              size="sm"
                            />
                          </div>
                          
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-xs text-gray-500">Price</p>
                              <p className="text-lg font-bold text-gray-900">
                                ${(sparePart.selling_price || 0).toFixed(2)}
                              </p>
                            </div>
                            {sparePart.cost_price && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">Cost</p>
                                <p className="text-sm text-gray-600">
                                  ${sparePart.cost_price.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {onAddSparePartToCart && (
                            <button
                              onClick={() => {
                                playClickSound();
                                onAddSparePartToCart(sparePart);
                              }}
                              disabled={(sparePart.quantity || 0) === 0}
                              className="w-full py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                            >
                              {(sparePart.quantity || 0) > 0 ? 'Add to Cart' : 'Out of Stock'}
                            </button>
                          )}
                        </div>
                      ))}
                      {displayProducts.length > 0 && (
                        <div style={{ gridColumn: '1 / -1', marginTop: '1rem', marginBottom: '1rem' }}>
                          <div className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-semibold text-gray-700">Products ({displayProducts.length})</h3>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  
                  {displayProducts.map((product) => (
                    <VariantProductCard
                      key={product.id}
                      product={product as any}
                      onAddToCart={onAddToCart as any}
                      realTimeStockData={realTimeStockData}
                      className="w-full h-full"
                    />
                  ))}
                </div>
                
                {/* Product Count - Inside scroll area */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 text-center">
                    Showing {displayProducts.length} of {sortedProducts.length} products
                  </div>
                </div>
              </div>
            ) : (
              <div className="pb-6">
                <div className="space-y-3 mb-6">
                {displayProducts.map((product) => {
                  // Normalize variants data - handle both database formats
                  const normalizedVariants = product.variants?.map((v: any) => ({
                    ...v,
                    id: v.id,
                    name: v.name || v.variant_name,
                    sku: v.sku,
                    barcode: v.barcode,
                    price: v.selling_price || v.sellingPrice || v.price || 0,
                    sellingPrice: v.selling_price || v.sellingPrice || v.price || 0,
                    costPrice: v.costPrice || v.cost_price || 0,
                    quantity: v.quantity ?? v.stockQuantity ?? v.stock_quantity ?? 0,
                    stockQuantity: v.stockQuantity ?? v.quantity ?? v.stock_quantity ?? 0,
                    minStockLevel: v.minStockLevel || v.min_stock_level || v.minQuantity || v.min_quantity || 0,
                    attributes: v.attributes || {}
                  }));
                  
                  const primaryVariant = normalizedVariants?.[0];
                  const hasMultipleVariants = normalizedVariants && normalizedVariants.length > 1;
                  const productPrice = Number(primaryVariant?.sellingPrice || product.price || 0);
                  
                  // Get stock from multiple possible sources with proper fallbacks
                  let productStock = 0;
                  const realtimeStock = realTimeStockData.get(product.id);
                  
                  if (realtimeStock !== undefined && realtimeStock !== null) {
                    // Use real-time stock data if available
                    productStock = realtimeStock;
                  } else if (primaryVariant) {
                    // Use normalized variant stock
                    productStock = primaryVariant.stockQuantity || 0;
                  } else {
                    // Fallback to product-level stock
                    productStock = product.stockQuantity ?? product.totalQuantity ?? 0;
                  }
                  
                  const isOutOfStock = productStock <= 0;
                  const isLowStock = productStock > 0 && productStock <= 10;
                  
                  return (
                    <div 
                      key={product.id} 
                      className="group bg-gradient-to-r from-white to-gray-50/30 rounded-xl border border-gray-200/80 hover:border-blue-300 hover:shadow-lg transition-all duration-200 p-4"
                    >
                      <div className="flex items-center gap-5">
                        {/* Product Image with Badge */}
                        <div className="relative flex-shrink-0">
                          <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden shadow-sm ring-2 ring-white group-hover:ring-blue-100 transition-all">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                                <Package className="w-10 h-10 text-blue-300" />
                              </div>
                            )}
                          </div>
                          {/* Stock Status Badge */}
                          <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-sm ${
                            isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'
                          }`} />
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Product Name */}
                          <h4 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-700 transition-colors" title={product.name}>
                            {product.name}
                          </h4>
                          
                          {/* Meta Information Row */}
                          <div className="flex items-center gap-4 flex-wrap">
                            {/* SKU */}
                            {(primaryVariant?.sku || product.sku) && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                <span className="font-mono">{primaryVariant?.sku || product.sku}</span>
                              </div>
                            )}
                            
                            {/* Variants Badge */}
                            {normalizedVariants && normalizedVariants.length > 1 && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200/50">
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                {normalizedVariants.length} Variants
                              </span>
                            )}
                            
                            {/* Category Badge */}
                            {product.category?.name && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                                {product.category.name}
                              </span>
                            )}
                            
                            {/* Stock Status with Icon */}
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isOutOfStock 
                                ? 'bg-red-50 text-red-700 border border-red-200/50' 
                                : isLowStock 
                                ? 'bg-orange-50 text-orange-700 border border-orange-200/50' 
                                : 'bg-green-50 text-green-700 border border-green-200/50'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-green-500'
                              }`} />
                              {isOutOfStock ? 'Out of Stock' : `${productStock} units`}
                            </div>
                          </div>
                        </div>

                        {/* Price and Action */}
                        <div className="flex-shrink-0 flex items-center gap-6">
                          {/* Price Display */}
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                              TSh {productPrice.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">per unit</div>
                          </div>

                          {/* Add to Cart Button */}
                          <button
                            onClick={() => {
                              playClickSound();
                              // Create a product object with normalized variants for proper handling
                              const productWithNormalizedVariants = {
                                ...product,
                                variants: normalizedVariants
                              };
                              
                              if (primaryVariant) {
                                // Add primary variant directly to cart
                                onAddToCart(productWithNormalizedVariants, primaryVariant);
                              } else {
                                // Add product without variant
                                onAddToCart(productWithNormalizedVariants);
                              }
                            }}
                            disabled={isOutOfStock}
                            className={`
                              px-6 py-3 rounded-lg font-medium text-sm transition-all duration-200 whitespace-nowrap
                              ${isOutOfStock
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : hasMultipleVariants
                                ? 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800'
                                : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
                              }
                            `}
                          >
                            {isOutOfStock 
                              ? 'Unavailable' 
                              : hasMultipleVariants 
                              ? 'Select Variant' 
                              : 'Add to Cart'
                            }
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
                
                {/* Product Count - Inside scroll area */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500 text-center">
                    Showing {displayProducts.length} of {sortedProducts.length} products
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Package className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No products found</p>
              <p className="text-sm text-center mb-4">
                {products.length === 0 
                  ? 'No products available. Please check if products are loaded from the database.'
                  : `Found ${products.length} products, but none match your current filters.`
                }
              </p>
              {products.length === 0 && (
                <button
                  onClick={() => {
                    // Force reload products
                    window.location.reload();
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Reload Page
                </button>
              )}
              {products.length > 0 && (
                <p className="text-sm text-center">
                  Try adjusting your search or filters to find what you're looking for.
                </p>
              )}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
};

export default ProductSearchSection;
