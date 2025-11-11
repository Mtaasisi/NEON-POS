import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Package, AlertTriangle, TrendingUp, Plus, ArrowUp, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { useMobileBranch, applyBranchFilter } from '../hooks/useMobileBranch';
import { useResponsiveSizes, useScreenInfo } from '../../../hooks/useResponsiveSize';
import { ResponsiveMobileWrapper } from '../components/ResponsiveMobileWrapper';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  price: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  image?: string;
}

const MobileInventory: React.FC = () => {
  const navigate = useNavigate();
  const { currentBranch, loading: branchLoading, isDataShared } = useMobileBranch();
  const sizes = useResponsiveSizes();
  const screenInfo = useScreenInfo();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  // Fetch branch-aware products from database
  useEffect(() => {
    const fetchProducts = async () => {
      // Wait for branch to load
      if (branchLoading) return;
      
      setIsLoading(true);
      try {
        console.log('🔍 [MobileInventory] Fetching products for branch:', currentBranch?.name);

        // Start with base query - include image_url
        let query = supabase
          .from('lats_products')
          .select('*, image_url')
          .eq('is_active', true)
          .order('created_at', { ascending: false});

        // Apply branch filter if branch is selected
        if (currentBranch) {
          const productsShared = isDataShared('products');
          console.log('🏪 [MobileInventory] Branch filter:', {
            branchId: currentBranch.id,
            mode: currentBranch.data_isolation_mode,
            isShared: productsShared
          });

          query = applyBranchFilter(
            query,
            currentBranch.id,
            currentBranch.data_isolation_mode,
            productsShared
          );
        }

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching products:', error);
          throw error;
        }

        if (!data) {
          console.warn('No data returned from products query');
          setProducts([]);
          return;
        }

        console.log(`✅ [MobileInventory] Loaded ${data.length} products`);

        // Transform database data to match Product interface
        const transformedProducts: Product[] = data.map(p => ({
          id: p.id,
          name: p.name || 'Unnamed Product',
          sku: p.sku || 'N/A',
          category: p.category || 'Uncategorized',
          stock: p.stock_quantity || 0,
          price: p.selling_price || 0,
          status: p.stock_quantity === 0 ? 'out-of-stock' as const : 
                  (p.min_stock_level && p.stock_quantity <= p.min_stock_level) ? 'low-stock' as const : 
                  'in-stock' as const,
          image: p.image_url || undefined // Use image_url as fallback
        }));

        console.log('📦 [MobileInventory] Transformed products:', transformedProducts.length, 'products');
        console.log('📦 [MobileInventory] Products with image_url from lats_products:', 
          transformedProducts.filter(p => p.image).length);
        
        setProducts(transformedProducts);

        // Fetch product images separately from product_images table
        if (data.length > 0) {
          fetchProductImages(data.map(p => p.id));
        } else {
          console.log('⚠️ [MobileInventory] No products to fetch images for');
        }
      } catch (error: any) {
        console.error('Error fetching products:', error);
        toast.error(error?.message || 'Failed to load products');
        setProducts([]); // Set empty array on error to prevent UI crashes
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();

    // Listen for branch changes
    const handleBranchChange = () => {
      console.log('🔄 [MobileInventory] Branch changed, reloading products...');
      fetchProducts();
    };

    window.addEventListener('branchChanged', handleBranchChange);
    return () => {
      window.removeEventListener('branchChanged', handleBranchChange);
    };
  }, [currentBranch, branchLoading, isDataShared]);

  // Fetch product images from product_images table
  const fetchProductImages = async (productIds: string[]) => {
    try {
      console.log('🖼️ [MobileInventory] Fetching images for', productIds.length, 'products');
      
      const { data: images, error } = await supabase
        .from('product_images')
        .select('product_id, image_url, is_primary')
        .in('product_id', productIds)
        .eq('is_primary', true);
      
      if (error) {
        console.error('❌ [MobileInventory] Error fetching product_images:', error);
        return; // Don't throw, just skip image loading
      }
      
      if (images && images.length > 0) {
        const imageMap = images.reduce((acc, img) => {
          if (img.image_url) {
            acc[img.product_id] = img.image_url;
          }
          return acc;
        }, {} as Record<string, string>);
        
        setProductImages(imageMap);
        console.log('✅ [MobileInventory] Loaded', images.length, 'product images from product_images table');
        console.log('🖼️ [MobileInventory] Image map:', imageMap);
      } else {
        console.log('⚠️ [MobileInventory] No images found in product_images table');
        console.log('💡 [MobileInventory] Will use image_url from lats_products as fallback');
      }
    } catch (error) {
      console.error('❌ [MobileInventory] Error loading product images:', error);
      // Don't crash, just continue without images from product_images table
    }
  };

  // Mock data for fallback - replace with real data
  const mockProducts: Product[] = [
    { 
      id: '1', 
      name: 'iPhone 13 Pro 256GB', 
      sku: 'IPH13P-256', 
      category: 'Smartphones',
      stock: 15, 
      price: 2500000, 
      status: 'in-stock',
      image: '📱'
    },
    { 
      id: '2', 
      name: 'Samsung Galaxy S21', 
      sku: 'SAM-S21', 
      category: 'Smartphones',
      stock: 3, 
      price: 1800000, 
      status: 'low-stock',
      image: '📱'
    },
    { 
      id: '3', 
      name: 'MacBook Pro M2', 
      sku: 'MBP-M2-14', 
      category: 'Laptops',
      stock: 0, 
      price: 4500000, 
      status: 'out-of-stock',
      image: '💻'
    },
    { 
      id: '4', 
      name: 'AirPods Pro 2nd Gen', 
      sku: 'APP-2ND', 
      category: 'Accessories',
      stock: 45, 
      price: 450000, 
      status: 'in-stock',
      image: '🎧'
    },
    { 
      id: '5', 
      name: 'iPad Air 5th Gen', 
      sku: 'IPAD-AIR5', 
      category: 'Tablets',
      stock: 8, 
      price: 1500000, 
      status: 'low-stock',
      image: '📱'
    }
  ];

  // Get unique categories from products
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const comparison = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const stats = [
    { label: 'Total Products', value: products.length, icon: Package, color: 'blue' },
    { label: 'Low Stock', value: products.filter(p => p.status === 'low-stock').length, icon: AlertTriangle, color: 'yellow' },
    { label: 'Out of Stock', value: products.filter(p => p.status === 'out-of-stock').length, icon: AlertTriangle, color: 'red' },
    { label: 'Total Value', value: `TSh ${(products.reduce((sum, p) => sum + (p.price * p.stock), 0) / 1000000).toFixed(1)}M`, icon: TrendingUp, color: 'green' }
  ];

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <ResponsiveMobileWrapper>
      <div className="flex flex-col h-full bg-white">
        {/* Header with Title and Add Button */}
        <div style={{ 
          paddingLeft: `${sizes.spacing4}px`, 
          paddingRight: `${sizes.spacing4}px`,
          paddingTop: `${sizes.spacing3}px`,
          paddingBottom: `${sizes.spacing2}px`
        }}>
          <div className="flex items-center justify-between" style={{ marginBottom: `${sizes.spacing3}px` }}>
            <h1 style={{ fontSize: `${sizes.text3xl}px` }} className="font-bold text-black tracking-tight">Inventory</h1>
            <button
              onClick={() => navigate('/mobile/inventory/add')}
              className="flex items-center justify-center text-blue-500 hover:text-blue-600 active:text-blue-700 transition-colors flex-shrink-0"
              style={{ padding: `${sizes.spacing1}px` }}
              aria-label="Add product"
            >
              <Plus size={sizes.iconSizeLg} strokeWidth={2.5} />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative" style={{ marginBottom: `${sizes.spacing2}px` }}>
            <Search 
              className="absolute text-gray-400" 
              size={sizes.iconSize} 
              strokeWidth={2}
              style={{ 
                left: `${sizes.spacing3}px`, 
                top: '50%', 
                transform: 'translateY(-50%)' 
              }}
            />
            <input
              type="text"
              placeholder="Search products"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#f2f2f7] border-0 focus:outline-none focus:ring-0 text-gray-900 placeholder-gray-400 font-light"
              style={{ 
                WebkitAppearance: 'none',
                paddingLeft: `${sizes.spacing3 + sizes.iconSize + sizes.spacing2}px`,
                paddingRight: `${sizes.spacing4}px`,
                paddingTop: `${sizes.spacing2}px`,
                paddingBottom: `${sizes.spacing2}px`,
                borderRadius: `${sizes.radiusLg}px`,
                fontSize: `${sizes.textBase}px`
              }}
            />
          </div>

          {/* Sort Section */}
          <div className="flex items-center justify-between" style={{ 
            paddingTop: `${sizes.spacing2}px`,
            paddingBottom: `${sizes.spacing2}px`,
            paddingLeft: `${sizes.spacing1}px`,
            paddingRight: `${sizes.spacing1}px`
          }}>
            <div className="flex items-center" style={{ gap: `${sizes.spacing2}px` }}>
              <SlidersHorizontal size={sizes.iconSize} className="text-blue-500" strokeWidth={2.5} />
              <span style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-900 font-normal">Sorted alphabetically</span>
            </div>
            <button
              onClick={toggleSortOrder}
              className="hover:opacity-70 transition-opacity"
              style={{ padding: `${sizes.spacing1}px` }}
              aria-label="Toggle sort order"
            >
              <ArrowUp 
                size={sizes.iconSize} 
                strokeWidth={2.5}
                className={`text-blue-500 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* Category Filter Toggle */}
          <div style={{ paddingTop: `${sizes.spacing2}px`, paddingBottom: `${sizes.spacing2}px` }}>
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center text-blue-500 font-medium"
              style={{ gap: `${sizes.spacing2}px`, fontSize: `${sizes.textBase}px` }}
            >
              <Filter size={sizes.iconSize} strokeWidth={2.5} />
              <span>Filter by Category</span>
              {selectedCategory !== 'All' && (
                <span 
                  className="bg-blue-100 text-blue-700 rounded-full font-semibold"
                  style={{
                    paddingLeft: `${sizes.spacing2}px`,
                    paddingRight: `${sizes.spacing2}px`,
                    paddingTop: `${sizes.spacing1}px`,
                    paddingBottom: `${sizes.spacing1}px`,
                    fontSize: `${sizes.textSm}px`
                  }}
                >
                  {selectedCategory}
                </span>
              )}
            </button>
          </div>

          {/* Category Filter */}
          {filterOpen && (
            <div 
              className="flex overflow-x-auto scrollbar-hide"
              style={{ 
                gap: `${sizes.spacing2}px`,
                paddingBottom: `${sizes.spacing3}px`,
                paddingTop: `${sizes.spacing1}px`,
                marginLeft: `-${sizes.spacing4}px`,
                marginRight: `-${sizes.spacing4}px`,
                paddingLeft: `${sizes.spacing4}px`,
                paddingRight: `${sizes.spacing4}px`
              }}
            >
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setFilterOpen(false);
                  }}
                  className={`whitespace-nowrap transition-colors font-medium ${
                    selectedCategory === category
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{
                    paddingLeft: `${sizes.spacing4}px`,
                    paddingRight: `${sizes.spacing4}px`,
                    paddingTop: `${sizes.spacing2}px`,
                    paddingBottom: `${sizes.spacing2}px`,
                    borderRadius: `${sizes.radiusFull}px`,
                    fontSize: `${sizes.textSm}px`
                  }}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Stats Summary - Compact */}
        <div 
          className="bg-gray-50 border-y border-gray-200"
          style={{ 
            paddingLeft: `${sizes.spacing4}px`,
            paddingRight: `${sizes.spacing4}px`,
            paddingTop: `${sizes.spacing3}px`,
            paddingBottom: `${sizes.spacing3}px`
          }}
        >
          <div className="grid grid-cols-4 text-center" style={{ gap: `${sizes.spacing2}px` }}>
            {stats.map((stat, index) => (
              <div key={index}>
                <div style={{ fontSize: `${sizes.textLg}px` }} className="font-bold text-gray-900">{stat.value}</div>
                <div style={{ fontSize: `${sizes.textXs}px`, marginTop: `${sizes.spacing1}px` }} className="text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div 
                className="animate-spin rounded-full border-b-2 border-blue-500 mx-auto"
                style={{ 
                  width: `${sizes.spacing10}px`,
                  height: `${sizes.spacing10}px`,
                  marginBottom: `${sizes.spacing3}px`
                }}
              ></div>
              <p style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-500">Loading products...</p>
            </div>
          </div>
        )}

        {/* Products List */}
        {!isLoading && (
          <div className="flex-1 overflow-y-auto" style={{ paddingBottom: `${sizes.spacing8 + sizes.buttonHeight}px` }}>
            {filteredProducts.map((product, index) => (
              <div 
                key={product.id}
                onClick={() => navigate(`/mobile/inventory/${product.id}`)}
                className="flex items-center justify-between border-b border-[#e5e5ea] hover:bg-gray-50 active:bg-gray-100 cursor-pointer transition-colors"
                style={{ 
                  paddingLeft: `${sizes.spacing4}px`,
                  paddingRight: `${sizes.spacing4}px`,
                  paddingTop: `${sizes.spacing3}px`,
                  paddingBottom: `${sizes.spacing3}px`,
                  borderBottomWidth: index === filteredProducts.length - 1 ? '0' : '0.5px'
                }}
              >
                <div className="flex items-center flex-1 min-w-0" style={{ gap: `${sizes.spacing3}px` }}>
                  {/* Product Image/Icon */}
                  <div 
                    className="flex-shrink-0 overflow-hidden bg-gray-100 flex items-center justify-center"
                    style={{
                      width: `${sizes.avatarSize}px`,
                      height: `${sizes.avatarSize}px`,
                      borderRadius: `${sizes.radiusLg}px`
                    }}
                  >
                    {(productImages[product.id] || product.image) ? (
                      <img 
                        src={productImages[product.id] || product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `<div class="text-gray-400 flex items-center justify-center w-full h-full"><svg width="${sizes.iconSizeLg}" height="${sizes.iconSizeLg}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg></div>`;
                          }
                        }}
                      />
                    ) : (
                      <Package size={sizes.iconSizeLg} className="text-gray-400" strokeWidth={1.5} />
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center" style={{ gap: `${sizes.spacing2}px`, marginBottom: `${sizes.spacing1}px` }}>
                      <span style={{ fontSize: `${sizes.textLg}px` }} className="text-black font-normal truncate">
                        {product.name}
                      </span>
                      {product.status === 'low-stock' && (
                        <span 
                          className="inline-flex items-center rounded-full bg-yellow-100 text-yellow-700 font-semibold flex-shrink-0"
                          style={{
                            paddingLeft: `${sizes.spacing2}px`,
                            paddingRight: `${sizes.spacing2}px`,
                            paddingTop: `${sizes.spacing1}px`,
                            paddingBottom: `${sizes.spacing1}px`,
                            fontSize: `${sizes.textXs}px`
                          }}
                        >
                          LOW
                        </span>
                      )}
                      {product.status === 'out-of-stock' && (
                        <span 
                          className="inline-flex items-center rounded-full bg-red-100 text-red-700 font-semibold flex-shrink-0"
                          style={{
                            paddingLeft: `${sizes.spacing2}px`,
                            paddingRight: `${sizes.spacing2}px`,
                            paddingTop: `${sizes.spacing1}px`,
                            paddingBottom: `${sizes.spacing1}px`,
                            fontSize: `${sizes.textXs}px`
                          }}
                        >
                          OUT
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-gray-500" style={{ gap: `${sizes.spacing2}px`, fontSize: `${sizes.textSm}px` }}>
                      <span className="font-mono">{product.sku}</span>
                      <span>•</span>
                      <span>{product.stock} units</span>
                    </div>
                  </div>
                </div>

                {/* Price and Arrow */}
                <div className="flex items-center flex-shrink-0" style={{ gap: `${sizes.spacing2}px` }}>
                  <span style={{ fontSize: `${sizes.textLg}px` }} className="text-gray-900 font-medium">
                    TSh {product.price.toLocaleString()}
                  </span>
                  <ChevronRight size={sizes.iconSize} className="text-gray-400" strokeWidth={2} />
                </div>
              </div>
            ))}

            {filteredProducts.length === 0 && (
              <div className="text-center" style={{ paddingTop: `${sizes.spacing6 * 2}px`, paddingBottom: `${sizes.spacing6 * 2}px`, paddingLeft: `${sizes.spacing4}px`, paddingRight: `${sizes.spacing4}px` }}>
                <div 
                  className="rounded-full bg-gray-100 flex items-center justify-center mx-auto"
                  style={{
                    width: `${sizes.avatarSize * 1.5}px`,
                    height: `${sizes.avatarSize * 1.5}px`,
                    marginBottom: `${sizes.spacing4}px`
                  }}
                >
                  <Package size={sizes.iconSizeXl} className="text-gray-400" strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: `${sizes.textBase}px` }} className="text-gray-500 font-normal">No products found</p>
                <p style={{ fontSize: `${sizes.textSm}px`, marginTop: `${sizes.spacing2}px` }} className="text-gray-400 font-light">
                  {products.length === 0 ? 'Add your first product to get started' : 'Try a different search term'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ResponsiveMobileWrapper>
  );
};

export default MobileInventory;

