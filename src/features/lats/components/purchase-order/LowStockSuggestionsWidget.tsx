import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, RefreshCw, X, TrendingDown, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';

interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stockQuantity: number;
  minStockLevel: number;
  supplierId?: string;
  supplierName?: string;
  costPrice: number;
  categoryName?: string;
  variantId: string;
  variantName: string;
}

interface LowStockSuggestionsWidgetProps {
  selectedSupplierId?: string;
  selectedSupplierName?: string;
  onAddToCart: (product: any, variant: any, quantity: number) => void;
  className?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
}

const LowStockSuggestionsWidget: React.FC<LowStockSuggestionsWidgetProps> = ({
  selectedSupplierId,
  selectedSupplierName,
  onAddToCart,
  className = '',
  isExpanded = false,
  onToggle
}) => {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadLowStockProducts();
  }, [selectedSupplierId]);

  const loadLowStockProducts = async () => {
    setIsLoading(true);
    try {
      // First get variants with low stock
      let variantsQuery = supabase
        .from('lats_product_variants')
        .select('id, variant_name, sku, quantity, min_quantity, cost_price, product_id')
        .eq('is_active', true)
        .order('quantity', { ascending: true });

      const { data: variants, error: variantsError } = await variantsQuery;

      if (variantsError) throw variantsError;

      if (!variants || variants.length === 0) {
        setLowStockProducts([]);
        return;
      }

      // Filter for low stock items
      const lowStockVariants = variants.filter((item: any) =>
        (item.quantity || 0) <= (item.min_quantity || 0)
      ).slice(0, 20); // Limit to 20 items

      // Get unique product IDs
      const productIds = [...new Set(lowStockVariants.map(v => v.product_id).filter(Boolean))];

      // Fetch products with related data
      const { data: products, error: productsError } = await supabase
        .from('lats_products')
        .select(`
          id,
          name,
          supplier_id
        `)
        .in('id', productIds);

      if (productsError) throw productsError;

      // Get supplier IDs for fetching supplier and category data
      const supplierIds = products?.map(p => p.supplier_id).filter(Boolean) || [];

      // Fetch suppliers and categories
      const [suppliersResult, categoriesResult] = await Promise.all([
        supplierIds.length > 0
          ? supabase.from('lats_suppliers').select('id, name').in('id', supplierIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('lats_categories').select('id, name')
      ]);

      // Create lookup maps
      const productsMap = new Map(products?.map(p => [p.id, p]) || []);
      const suppliersMap = new Map(suppliersResult.data?.map(s => [s.id, s]) || []);
      const categoriesMap = new Map(categoriesResult.data?.map(c => [c.id, c]) || []);

      // Fetch category relationships for products
      const { data: productCategories, error: pcError } = await supabase
        .from('lats_products')
        .select('id, category_id')
        .in('id', productIds);

      // Create product to category mapping
      const productCategoryMap = new Map(productCategories?.map(pc => [pc.id, pc.category_id]) || []);

      // Transform the data
      const transformed: LowStockProduct[] = lowStockVariants.map((item: any) => {
        const product = productsMap.get(item.product_id);
        const supplierId = product?.supplier_id;
        const categoryId = productCategoryMap.get(item.product_id);

        return {
          id: product?.id || item.product_id,
          name: product?.name || 'Unknown Product',
          sku: item.sku,
          stockQuantity: item.quantity || 0,
          minStockLevel: item.min_quantity || 0,
          supplierId: supplierId,
          supplierName: supplierId ? suppliersMap.get(supplierId)?.name || 'Unknown' : 'Unknown',
          costPrice: item.cost_price || 0,
          categoryName: categoryId ? categoriesMap.get(categoryId)?.name || 'Uncategorized' : 'Uncategorized',
          variantId: item.id,
          variantName: item.variant_name
        };
      });

      // Apply supplier filter if selected
      const filtered = selectedSupplierId
        ? transformed.filter(item => item.supplierId === selectedSupplierId)
        : transformed;

      setLowStockProducts(filtered);
    } catch (error) {
      console.error('Error loading low stock products:', error);
      toast.error('Failed to load low stock products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = (product: LowStockProduct) => {
    const suggestedQuantity = Math.max(
      product.minStockLevel - product.stockQuantity,
      product.minStockLevel
    );

    const productData = {
      id: product.id,
      name: product.name,
      supplierId: product.supplierId
    };

    const variantData = {
      id: product.variantId,
      name: product.variantName,
      sku: product.sku,
      costPrice: product.costPrice
    };

    onAddToCart(productData, variantData, suggestedQuantity);
    toast.success(`Added ${product.name} (Qty: ${suggestedQuantity})`);
  };

  const handleAddAll = () => {
    if (lowStockProducts.length === 0) {
      toast.error('No low stock products to add');
      return;
    }

    lowStockProducts.forEach(product => {
      handleAddProduct(product);
    });

    toast.success(`Added ${lowStockProducts.length} low stock items to cart`);
  };

  if (!isExpanded) {
    return (
      <div className={`bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-3 cursor-pointer hover:bg-red-50/80 transition-colors ${className}`}>
        <div
          onClick={onToggle}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-gray-900">Low Stock Items</span>
            {lowStockProducts.length > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                {lowStockProducts.length}
              </span>
            )}
          </div>
          <ChevronDown className="w-5 h-5 text-red-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div 
        className="p-4 border-b border-red-200 bg-white/50 cursor-pointer hover:bg-red-50/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Low Stock Alert
                {lowStockProducts.length > 0 && (
                  <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                    {lowStockProducts.length}
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-600">
                {selectedSupplierId && selectedSupplierName ? `From ${selectedSupplierName}` : selectedSupplierId ? 'From selected supplier' : 'All suppliers'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadLowStockProducts();
              }}
              disabled={isLoading}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <div className="p-2 text-red-600">
              <ChevronUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-red-500 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading low stock items...</p>
          </div>
        ) : lowStockProducts.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900 mb-1">All Good! 🎉</p>
            <p className="text-xs text-gray-600">No low stock items found</p>
          </div>
        ) : (
          <>
            {/* Add All Button */}
            <button
              onClick={handleAddAll}
              className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add All {lowStockProducts.length} Items to Cart
            </button>

            {/* Products List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {lowStockProducts.map((product) => {
                const urgencyLevel = product.stockQuantity === 0 ? 'critical' : 
                                    product.stockQuantity <= Math.floor(product.minStockLevel / 2) ? 'high' : 'medium';
                const urgencyColor = urgencyLevel === 'critical' ? 'bg-red-600' : 
                                    urgencyLevel === 'high' ? 'bg-orange-500' : 'bg-yellow-500';

                return (
                  <div
                    key={`${product.id}-${product.variantId}`}
                    className="bg-white border border-red-200 rounded-lg p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate">
                            {product.name}
                          </h4>
                          <span className={`px-2 py-0.5 ${urgencyColor} text-white text-xs font-bold rounded-full flex-shrink-0`}>
                            {urgencyLevel.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">
                          {product.variantName} • SKU: {product.sku}
                        </p>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Stock:</span>
                            <span className="font-bold text-red-600">{product.stockQuantity}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-500">{product.minStockLevel} min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Need:</span>
                            <span className="font-bold text-orange-600">
                              {Math.max(product.minStockLevel - product.stockQuantity, product.minStockLevel)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddProduct(product)}
                        className="flex-shrink-0 p-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                        title="Add to cart"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LowStockSuggestionsWidget;

