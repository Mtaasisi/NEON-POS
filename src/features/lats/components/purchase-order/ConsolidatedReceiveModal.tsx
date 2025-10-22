import React, { useState } from 'react';
import { X, Package, PackageCheck, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

type ReceiveType = 'full' | 'partial';

interface ConsolidatedReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: any;
  onReceiveFull: () => void;
  onReceivePartial: () => void;
}

export const ConsolidatedReceiveModal: React.FC<ConsolidatedReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onReceiveFull,
  onReceivePartial
}) => {
  const [receiveType, setReceiveType] = useState<ReceiveType>('full');
  const [includeQualityCheck, setIncludeQualityCheck] = useState(false);
  
  if (!isOpen) return null;
  
  const handleReceive = () => {
    // Store quality check preference in sessionStorage for the receive process to use
    if (includeQualityCheck) {
      sessionStorage.setItem('includeQualityCheck', 'true');
    } else {
      sessionStorage.removeItem('includeQualityCheck');
    }
    
    // Call appropriate receive handler based on selected type
    switch (receiveType) {
      case 'full':
        onReceiveFull();
        break;
      case 'partial':
        onReceivePartial();
        break;
      default:
        toast.error('Please select a receive type');
    }
  };
  
  const totalItems = purchaseOrder?.items?.length || 0;
  const receivedItems = purchaseOrder?.items?.filter((item: any) => item.receivedQuantity > 0).length || 0;
  const pendingItems = totalItems - receivedItems;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Receive Purchase Order</h2>
            <p className="text-sm text-gray-500 mt-1">Choose how you want to receive this order</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Order Number</div>
                <div className="text-lg font-bold text-blue-900">
                  {purchaseOrder?.orderNumber}
                </div>
              </div>
              <div>
                <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Supplier</div>
                <div className="text-lg font-bold text-blue-900">
                  {purchaseOrder?.supplier?.name || 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Items Summary */}
            <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                <div className="text-xs text-blue-700">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{receivedItems}</div>
                <div className="text-xs text-green-700">Received</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{pendingItems}</div>
                <div className="text-xs text-orange-700">Pending</div>
              </div>
            </div>
          </div>
          
          {/* Receive Type Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Choose Receive Method
            </label>
            
            <div className="space-y-3">
              {/* Full Receive Option */}
              <label 
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                  receiveType === 'full' 
                    ? 'border-green-500 bg-green-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="receiveType"
                  value="full"
                  checked={receiveType === 'full'}
                  onChange={(e) => setReceiveType(e.target.value as ReceiveType)}
                  className="mt-1 mr-4 w-4 h-4 text-green-600 focus:ring-green-500"
                />
                <Package className={`w-6 h-6 mr-3 flex-shrink-0 ${
                  receiveType === 'full' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Full Receive</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Receive all {pendingItems} pending items at once.
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Fastest
                    </span>
                    <span className="text-xs text-gray-500">Recommended for most orders</span>
                  </div>
                </div>
              </label>
              
              {/* Partial Receive Option */}
              <label 
                className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-md ${
                  receiveType === 'partial' 
                    ? 'border-orange-500 bg-orange-50 shadow-sm' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="receiveType"
                  value="partial"
                  checked={receiveType === 'partial'}
                  onChange={(e) => setReceiveType(e.target.value as ReceiveType)}
                  className="mt-1 mr-4 w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <PackageCheck className={`w-6 h-6 mr-3 flex-shrink-0 ${
                  receiveType === 'partial' ? 'text-orange-600' : 'text-gray-400'
                }`} />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Partial Receive</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Select specific quantities per item. Receive some now, rest later.
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                      Flexible
                    </span>
                    <span className="text-xs text-gray-500">Track progress easily</span>
                  </div>
                </div>
              </label>
            </div>
          </div>
          
          {/* Quality Check Option */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl">
            <div className="flex items-start">
              <input
                type="checkbox"
                id="includeQC"
                checked={includeQualityCheck}
                onChange={(e) => setIncludeQualityCheck(e.target.checked)}
                className="mt-1 mr-3 w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
              />
              <label htmlFor="includeQC" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-semibold text-purple-900">Include Quality Check</div>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                    Optional
                  </span>
                </div>
                <div className="text-sm text-purple-700">
                  Perform quality inspection during the receiving process. You can inspect each item and mark defects if found.
                </div>
              </label>
            </div>
          </div>
          
          {/* Info Message */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>What happens next:</strong> After clicking "Proceed", you'll add serial numbers/IMEI (optional), then set pricing, and finally add items to inventory.
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleReceive}
            className="px-8 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20 hover:shadow-xl hover:shadow-green-600/30"
          >
            Proceed to Receive
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedReceiveModal;

