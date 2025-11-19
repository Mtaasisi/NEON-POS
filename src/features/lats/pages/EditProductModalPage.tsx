import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import EditProductModal from '../components/product/EditProductModal';
import { getLatsProvider } from '../lib/data/provider';
import { Package, ArrowLeft, Search, Plus } from 'lucide-react';

interface ProductSummary {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock_quantity: number;
  category_id: string;
  category?: { name: string };
}

const EditProductModalPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(!!productId);
  const [productExists, setProductExists] = useState<boolean | null>(null);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Load products for selection
  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const dataProvider = getLatsProvider();
      const response = await dataProvider.getProducts({
        pagination: { page: 1, perPage: 50 }
      });

      if (response.ok && response.data) {
        setProducts(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if product exists when component mounts
  useEffect(() => {
    if (productId) {
      // If productId is provided, check if it exists
      const checkProduct = async () => {
        try {
          const dataProvider = getLatsProvider();
          const response = await dataProvider.getProduct(productId);

          if (response.ok && response.data) {
            setProductExists(true);
            setSelectedProductId(productId);
          } else {
            setProductExists(false);
            toast.error('Product not found');
          }
        } catch (error) {
          console.error('Error checking product:', error);
          setProductExists(false);
          toast.error('Failed to load product');
        }
      };

      checkProduct();
    } else {
      // If no productId, load products for selection
      loadProducts();
    }
  }, [productId, loadProducts]);

  const handleClose = () => {
    setIsModalOpen(false);
    navigate('/lats/unified-inventory');
  };

  const handleSuccess = () => {
    toast.success('Product updated successfully!');
    navigate('/lats/unified-inventory');
  };

  const handleProductSelect = (product: ProductSummary) => {
    setSelectedProductId(product.id);
    setIsModalOpen(true);
    // Update URL without causing a page reload
    window.history.replaceState(null, '', `/lats/products/${product.id}/edit-modal`);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If product doesn't exist, show error
  if (productId && productExists === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <Package className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">
            The product you're trying to edit doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/lats/unified-inventory')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/lats/unified-inventory')}
              className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Inventory
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-gray-600">Select a product to edit</p>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selection */}
      {!productId && !isModalOpen && (
        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search products by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-blue-300 cursor-pointer transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 truncate flex-1">{product.name}</h3>
                    <span className="text-sm text-gray-500 ml-2">#{product.sku}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Stock: {product.stock_quantity}</span>
                    <span className="font-medium text-green-600">
                      TZS {product.price?.toLocaleString() || '0'}
                    </span>
                  </div>
                  {product.category?.name && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {product.category.name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredProducts.length === 0 && !loading && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'No products available to edit'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isModalOpen}
        onClose={handleClose}
        productId={selectedProductId || productId || ''}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default EditProductModalPage;
