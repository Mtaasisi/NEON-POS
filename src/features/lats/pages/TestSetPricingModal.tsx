import React, { useState } from 'react';
import { BackButton } from '../../shared/components/ui/BackButton';
import GlassButton from '../../shared/components/ui/GlassButton';
import SetPricingModal from '../components/purchase-order/SetPricingModal';
import { DollarSign, Package, TrendingUp } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TestSetPricingModal: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sample purchase order for testing
  const samplePurchaseOrder = {
    id: 'PO-TEST-001',
    items: [
      {
        id: 'po-item-1',
        productId: 'prod-001',
        variantId: 'var-001',
        quantity: 10,
        receivedQuantity: 0,
        costPrice: 899.99,
        product: {
          id: 'prod-001',
          name: 'iPhone 14 Pro',
          sku: 'IPH14PRO'
        },
        variant: {
          id: 'var-001',
          name: '256GB Space Black',
          sku: 'IPH14PRO-256-BLK'
        }
      },
      {
        id: 'po-item-2',
        productId: 'prod-002',
        variantId: 'var-002',
        quantity: 15,
        receivedQuantity: 5, // Partially received
        costPrice: 749.50,
        product: {
          id: 'prod-002',
          name: 'Samsung Galaxy S23',
          sku: 'SAMS23'
        },
        variant: {
          id: 'var-002',
          name: '128GB Phantom Black',
          sku: 'SAMS23-128-BLK'
        }
      },
      {
        id: 'po-item-3',
        productId: 'prod-003',
        quantity: 8,
        receivedQuantity: 0,
        costPrice: 499.00,
        product: {
          id: 'prod-003',
          name: 'iPad Air',
          sku: 'IPADAIR'
        }
      },
      {
        id: 'po-item-4',
        productId: 'prod-004',
        quantity: 5,
        receivedQuantity: 0,
        costPrice: 1099.00,
        product: {
          id: 'prod-004',
          name: 'MacBook Air M2',
          sku: 'MBA-M2'
        }
      },
      {
        id: 'po-item-5',
        productId: 'prod-005',
        variantId: 'var-005',
        quantity: 25,
        receivedQuantity: 0,
        costPrice: 199.99,
        product: {
          id: 'prod-005',
          name: 'AirPods Pro',
          sku: 'AIRPODSPRO'
        },
        variant: {
          id: 'var-005',
          name: '2nd Generation',
          sku: 'AIRPODSPRO-2GEN'
        }
      }
    ]
  };

  const handleConfirmPricing = async (pricingData: Map<string, any>) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Pricing Data:', Array.from(pricingData.entries()));
      toast.success('Pricing saved successfully! (Test mode)');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to save pricing');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalCost = () => {
    return samplePurchaseOrder.items.reduce((sum, item) => {
      const qty = item.quantity - (item.receivedQuantity || 0);
      return sum + (item.costPrice * qty);
    }, 0);
  };

  const calculateTotalItems = () => {
    return samplePurchaseOrder.items.reduce((sum, item) => {
      return sum + (item.quantity - (item.receivedQuantity || 0));
    }, 0);
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <BackButton />
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              Test Set Pricing Modal
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Preview the SetPricingModal component (used BEFORE receiving items)
            </p>
          </div>
        </div>

        {/* Comparison Card */}
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mb-6 border-2 border-purple-200 dark:border-gray-600">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
            📊 Modal Comparison
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border-2 border-blue-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="font-bold text-blue-700">SetPricingModal (This One)</span>
              </div>
              <ul className="space-y-1 text-gray-700 dark:text-gray-300 ml-4">
                <li>• Used BEFORE receiving items</li>
                <li>• Product/variant level pricing</li>
                <li>• Quantity-based calculations</li>
                <li>• Quick markup buttons</li>
                <li>• Sets default prices for products</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6 mb-6 border-2 border-blue-200 dark:border-gray-600">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Purchase Order: {samplePurchaseOrder.id}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {calculateTotalItems()}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Products</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {samplePurchaseOrder.items.length}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Total Cost</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    ${calculateTotalCost().toFixed(2)}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                This modal helps you set selling prices for products in the purchase order 
                before you start receiving individual items.
              </p>
            </div>
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Ready to Test
            </h3>
            <GlassButton
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-4 text-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              <DollarSign className="w-6 h-6" />
              Open Set Pricing Modal
            </GlassButton>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
              Click the button above to preview the pricing modal
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Modal Features:
          </h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Quick markup buttons (20%, 30%, 50%, 100%)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Total stats dashboard (cost, selling, profit, avg markup)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Per-product pricing with cost, selling, markup, and profit fields</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Automatic profit calculations based on quantities</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Loads current selling prices from product database</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Visual warnings for prices below cost</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Handles partially received orders</span>
            </li>
          </ul>
        </div>

        {/* Products Preview */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Products in Test PO:
          </h3>
          <div className="space-y-2">
            {samplePurchaseOrder.items.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {item.product?.name}
                    </p>
                    {item.variant?.name && (
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {item.variant.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-right">
                    <p className="text-gray-600 dark:text-gray-400">Qty:</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {item.quantity - (item.receivedQuantity || 0)} units
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 dark:text-gray-400">Cost:</p>
                    <p className="font-bold text-blue-600">${item.costPrice}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The Modal Component */}
      <SetPricingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        purchaseOrder={samplePurchaseOrder}
        onConfirm={handleConfirmPricing}
        isLoading={isLoading}
      />
    </div>
  );
};

export default TestSetPricingModal;

