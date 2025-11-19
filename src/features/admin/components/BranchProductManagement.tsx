import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import { 
  deleteAllBranchProducts, 
  getCurrentBranchProductCount,
  DeleteProductsResult 
} from '../../../lib/branchProductManagement';
import { getCurrentBranchId } from '../../../lib/branchAwareApi';

export const BranchProductManagement: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [productCount, setProductCount] = useState<number>(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<DeleteProductsResult | null>(null);
  const branchId = getCurrentBranchId();

  // Load product count
  const loadProductCount = async () => {
    if (!branchId) return;
    const count = await getCurrentBranchProductCount();
    setProductCount(count);
  };

  useEffect(() => {
    loadProductCount();
  }, [branchId]);

  const handleDeleteClick = () => {
    setShowConfirmation(true);
    setResult(null);
    setConfirmText('');
  };

  const handleConfirmDelete = async () => {
    // Require exact confirmation
    if (confirmText !== 'DELETE ALL PRODUCTS') {
      alert('Please type "DELETE ALL PRODUCTS" to confirm');
      return;
    }

    setIsLoading(true);
    try {
      const deleteResult = await deleteAllBranchProducts();
      setResult(deleteResult);
      setShowConfirmation(false);
      setConfirmText('');
      
      // Reload product count
      await loadProductCount();
      
      // Refresh the page to update UI
      if (deleteResult.success) {
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error('Error deleting products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!branchId) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-yellow-600" size={20} />
          <p className="text-yellow-800 font-medium">
            Please select a branch first to manage products
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Product Count Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="text-blue-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Branch Products
              </h3>
              <p className="text-sm text-gray-600">
                Manage products for this branch
              </p>
            </div>
          </div>
          <button
            onClick={loadProductCount}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh count"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-1">Total Products in Current Branch</p>
          <p className="text-3xl font-bold text-gray-900">{productCount}</p>
        </div>

        {/* Delete Button */}
        {productCount > 0 && (
          <button
            onClick={handleDeleteClick}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <Trash2 size={18} />
            Delete All Products in This Branch
          </button>
        )}

        {productCount === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No products to delete</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Confirm Deletion</h2>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-700">
                You are about to delete <span className="font-bold text-red-600">{productCount} products</span> from this branch.
              </p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium mb-2">⚠️ Warning:</p>
                <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                  <li>This action cannot be undone</li>
                  <li>All product variants will be deleted</li>
                  <li>Sales history will be preserved (items set to NULL)</li>
                  <li>Purchase order history will be preserved</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-bold text-red-600">DELETE ALL PRODUCTS</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE ALL PRODUCTS"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setConfirmText('');
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isLoading || confirmText !== 'DELETE ALL PRODUCTS'}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isLoading ? 'Deleting...' : 'Delete All Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div className={`rounded-lg border p-4 ${
          result.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <>
                <div className="text-2xl">✅</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">
                    Products Deleted Successfully!
                  </h3>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>• Branch: <span className="font-medium">{result.branchName}</span></p>
                    <p>• Products deleted: <span className="font-medium">{result.productsDeleted}</span></p>
                    <p>• Variants deleted: <span className="font-medium">{result.variantsDeleted}</span></p>
                  </div>
                  <p className="text-sm text-green-700 mt-3">
                    The page will refresh in 2 seconds...
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl">❌</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-2">
                    Failed to Delete Products
                  </h3>
                  <p className="text-sm text-red-800">
                    {result.error || 'An unknown error occurred'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

