import React, { useState } from 'react';
import { X, Package, PackageCheck } from 'lucide-react';
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
  
  const totalItems = purchaseOrder?.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
  const receivedItems = purchaseOrder?.items?.reduce((sum: number, item: any) => sum + (item.receivedQuantity || 0), 0) || 0;
  const pendingItems = totalItems - receivedItems;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header */}
        <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">Receive Purchase Order</h3>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Order Info */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">Order Number</p>
                <p className="font-bold text-gray-900 text-base">{purchaseOrder?.orderNumber}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 mb-2">Supplier</p>
                <p className="font-bold text-gray-900 text-base">{purchaseOrder?.supplier?.name || 'N/A'}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-200 shadow-sm text-center">
                <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                <div className="text-xs text-blue-700 font-medium mt-1">Total Quantity</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border-2 border-green-200 shadow-sm text-center">
                <div className="text-2xl font-bold text-green-600">{receivedItems}</div>
                <div className="text-xs text-green-700 font-medium mt-1">Received</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 rounded-xl border-2 border-orange-200 shadow-sm text-center">
                <div className="text-2xl font-bold text-orange-600">{pendingItems}</div>
                <div className="text-xs text-orange-700 font-medium mt-1">Pending</div>
              </div>
            </div>
          </div>

          {/* Receive Type Selection */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Full Receive Option */}
            <button
              type="button"
              onClick={() => setReceiveType('full')}
              className={`p-5 rounded-2xl transition-all duration-200 border-2 shadow-sm ${
                receiveType === 'full' 
                  ? 'bg-white shadow-xl border-green-500 ring-4 ring-green-200' 
                  : 'bg-white border-gray-200 hover:border-green-300 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                  receiveType === 'full' 
                    ? 'bg-green-500' 
                    : 'bg-green-50'
                }`}>
                  <Package className={`w-7 h-7 ${
                    receiveType === 'full' ? 'text-white' : 'text-green-600'
                  }`} />
                </div>
                <div className={`font-bold text-base mb-1 ${
                  receiveType === 'full' ? 'text-green-600' : 'text-gray-900'
                }`}>
                  Full Receive
                </div>
                <div className="text-xs text-gray-500">
                  All {pendingItems} units
                </div>
              </div>
            </button>
            
            {/* Partial Receive Option */}
            <button
              type="button"
              onClick={() => setReceiveType('partial')}
              className={`p-5 rounded-2xl transition-all duration-200 border-2 shadow-sm ${
                receiveType === 'partial' 
                  ? 'bg-white shadow-xl border-orange-500 ring-4 ring-orange-200' 
                  : 'bg-white border-gray-200 hover:border-orange-300 hover:shadow-md'
              }`}
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-3 ${
                  receiveType === 'partial' 
                    ? 'bg-orange-500' 
                    : 'bg-orange-50'
                }`}>
                  <PackageCheck className={`w-7 h-7 ${
                    receiveType === 'partial' ? 'text-white' : 'text-orange-600'
                  }`} />
                </div>
                <div className={`font-bold text-base mb-1 ${
                  receiveType === 'partial' ? 'text-orange-600' : 'text-gray-900'
                }`}>
                  Partial Receive
                </div>
                <div className="text-xs text-gray-500">
                  Select quantities
                </div>
              </div>
            </button>
          </div>
          
          {/* Quality Check Option */}
          <button
            type="button"
            onClick={() => setIncludeQualityCheck(!includeQualityCheck)}
            className={`w-full p-5 rounded-2xl transition-all duration-200 border-2 shadow-sm ${
              includeQualityCheck 
                ? 'bg-white shadow-xl border-purple-500 ring-4 ring-purple-200' 
                : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                includeQualityCheck 
                  ? 'bg-purple-500 border-purple-500' 
                  : 'bg-purple-50 border-purple-300'
              }`}>
                {includeQualityCheck && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className={`flex-1 text-left font-semibold ${
                includeQualityCheck ? 'text-purple-600' : 'text-gray-900'
              }`}>
                Include Quality Check
              </div>
            </div>
          </button>
        </div>
        
        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={handleReceive}
            className="w-full px-6 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl text-lg"
          >
            Proceed to Receive
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsolidatedReceiveModal;

