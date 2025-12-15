import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import ProductCard from '../components/ProductCard';
import { useLoadingJob } from '../../../hooks/useLoadingJob';
import { ProductGridSkeleton } from '../../../components/ui/SkeletonLoaders';
import {
  Search,
  SlidersHorizontal,
  X,
  TrendingUp,
  Grid,
  List
} from 'lucide-react';
import { CustomerProduct } from '../types';
import toast from 'react-hot-toast';
import customerPortalService from '../services/customerPortalService';

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const { startLoading, completeLoading, failLoading } = useLoadingJob();
  
  // State
  const [products, setProducts] = useState<CustomerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedBrand, setSelectedBrand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'popular' | 'price-low' | 'price-high' | 'newest'>('popular');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  
  // Categories and Brands (will be loaded from database)
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);

  // Load products
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async (isRetry = false) => {
    const jobId = startLoading('Loading products...');
    
    try {
      console.log('🛒 ProductsPage: Loading products...', isRetry ? `(Retry ${retryCount + 1})` : '');
      setLoading(true);
      setError(null);
      
      // Use the customer portal service with enhanced error handling
      const productsData = await customerPortalService.getProducts();
      
      console.log(`✅ ProductsPage: Received ${productsData.length} products from service`);

      if (productsData.length === 0) {
        console.warn('⚠️  ProductsPage: No products returned - checking database connection...');
        setError('no_products');
        failLoading(jobId, 'No products found');
      } else {
        setProducts(productsData);
        setError(null);

        // Extract unique categories and brands
        const uniqueCategories = [...new Set(productsData.map(p => p.category).filter(Boolean))] as string[];
        const uniqueBrands = [...new Set(productsData.map(p => p.brand).filter(Boolean))] as string[];
        
        setCategories(uniqueCategories);
        setBrands(uniqueBrands);

        console.log(`📊 Categories: ${uniqueCategories.length}, Brands: ${uniqueBrands.length}`);
        completeLoading(jobId);
      }

    } catch (error) {
      console.error('❌ ProductsPage: Error loading products:', error);
      setError('fetch_failed');
      failLoading(jobId, 'Failed to load products');
      
      // Show user-friendly error
      toast.error('Failed to load products. Please check your connection.', {
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    loadProducts(true);
  };


  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter out products without prices
    filtered = filtered.filter(p => {
      const price = p.variants?.[0]?.price || p.price;
      return price && price > 0;
    });

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Brand filter
    if (selectedBrand !== 'all') {
      filtered = filtered.filter(p => p.brand === selectedBrand);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        // Already sorted by created_at desc
        break;
      case 'popular':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    return filtered;
  }, [products, searchQuery, selectedCategory, selectedBrand, sortBy]);

  const handleProductClick = (product: CustomerProduct) => {
    navigate(`/customer-portal/products/${product.id}`);
  };

  const handleAddToCart = (product: CustomerProduct) => {
    // For now, navigate to product detail to select variant
    navigate(`/customer-portal/products/${product.id}`);
  };

  return (
    <MobileLayout title="Shop">
      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                <X size={20} />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 border rounded-lg ${
              showFilters ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-700'
            }`}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 p-4 space-y-4">
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">View Mode</span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <List size={18} />
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Brand Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Brand</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Brands</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedBrand('all');
              setSortBy('popular');
              setSearchQuery('');
            }}
            className="w-full py-2 text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Products Grid/List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <X size={40} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {error === 'no_products' ? 'No Products Available' : 'Failed to Load Products'}
          </h3>
          <p className="text-gray-600 text-center mb-4 max-w-sm">
            {error === 'no_products' 
              ? 'There are no products in the catalog yet. Please check back soon!'
              : 'We couldn\'t load the products. This might be a connection issue.'}
          </p>
          <div className="space-y-2">
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry {retryCount > 0 && `(${retryCount + 1})`}
            </button>
            {error === 'fetch_failed' && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Refresh Page
              </button>
            )}
          </div>
          {/* Debug info for admins */}
          <div className="mt-6 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 max-w-sm">
            <p className="font-medium mb-1">Troubleshooting:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Check your internet connection</li>
              <li>Verify database is accessible</li>
              <li>Contact support if issue persists</li>
            </ul>
          </div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <TrendingUp size={64} className="text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-600 text-center mb-4">
            Try adjusting your filters or search terms
          </p>
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSelectedBrand('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
          >
            Clear Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div
          className="px-4 pt-6 pb-4 sm:px-5 md:px-6 lg:px-8 grid gap-4 sm:gap-5 md:gap-6 auto-rows-fr max-w-6xl mx-auto"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))'
          }}
        >
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onProductClick={handleProductClick}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onProductClick={handleProductClick}
              onAddToCart={handleAddToCart}
            />
          ))}
        </div>
      )}
    </MobileLayout>
  );
};

export default ProductsPage;

