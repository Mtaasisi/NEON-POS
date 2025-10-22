import React, { useState, useEffect } from 'react';
import { PackageCheck, X, AlertCircle, Package, ChevronDown, ChevronUp, Plus, Minus, Hash } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name?: string;
  quantity: number;
  receivedQuantity?: number;
  cost_price: number;
  product?: {
    name: string;
    sku?: string;
  };
  variant?: {
    name: string;
    sku?: string;
  };
}

interface ItemReceiveData {
  itemId: string;
  quantity: number;
  includeIMEI: boolean;
  imeiNumbers: string[];
}

interface EnhancedPartialReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: {
    id: string;
    items: PurchaseOrderItem[];
  };
  onConfirm: (receivedData: ItemReceiveData[]) => Promise<void>;
  isLoading?: boolean;
  mode?: 'full' | 'partial'; // NEW: Support both full and partial receive
}

const EnhancedPartialReceiveModal: React.FC<EnhancedPartialReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirm,
  isLoading = false,
  mode = 'partial' // Default to partial mode for backward compatibility
}) => {
  const [receiveData, setReceiveData] = useState<Map<string, ItemReceiveData>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Initialize receive data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData = new Map<string, ItemReceiveData>();
      purchaseOrder.items.forEach(item => {
        const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
        if (pendingQuantity > 0) {
          initialData.set(item.id, {
            itemId: item.id,
            quantity: mode === 'full' ? pendingQuantity : 0, // Full mode: auto-fill all quantities
            includeIMEI: false,
            imeiNumbers: []
          });
        }
      });
      setReceiveData(initialData);
      setExpandedItems(new Set());
    }
  }, [isOpen, purchaseOrder.items, mode]);

  const updateQuantity = (itemId: string, quantity: number) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        newMap.set(itemId, {
          ...current,
          quantity,
          // If quantity changed, reset IMEI array to match new quantity
          imeiNumbers: current.includeIMEI 
            ? Array(quantity).fill('').map((_, i) => current.imeiNumbers[i] || '')
            : []
        });
      }
      return newMap;
    });
  };

  const toggleIMEI = (itemId: string) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        const newIncludeIMEI = !current.includeIMEI;
        newMap.set(itemId, {
          ...current,
          includeIMEI: newIncludeIMEI,
          imeiNumbers: newIncludeIMEI ? Array(current.quantity).fill('') : []
        });
      }
      return newMap;
    });
  };

  const updateIMEI = (itemId: string, index: number, value: string) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        const newIMEIs = [...current.imeiNumbers];
        newIMEIs[index] = value;
        newMap.set(itemId, {
          ...current,
          imeiNumbers: newIMEIs
        });
      }
      return newMap;
    });
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleConfirm = async () => {
    try {
      // Validate: at least one item must have quantity > 0
      const itemsToReceive = Array.from(receiveData.values()).filter(data => data.quantity > 0);
      
      if (itemsToReceive.length === 0) {
        toast.error('Please select at least one item to receive');
        return;
      }

      // Validate: if IMEI is included, all IMEI numbers must be filled
      const hasEmptyIMEI = itemsToReceive.some(data => 
        data.includeIMEI && data.imeiNumbers.some(imei => !imei.trim())
      );

      if (hasEmptyIMEI) {
        toast.error('Please fill in all IMEI numbers or uncheck "Include IMEI"');
        return;
      }

      await onConfirm(itemsToReceive);
    } catch (error) {
      console.error('Error confirming partial receive:', error);
      toast.error('Failed to process partial receive');
    }
  };

  const getTotalReceiving = () => {
    return Array.from(receiveData.values()).reduce((sum, data) => sum + data.quantity, 0);
  };

  const getTotalWithIMEI = () => {
    return Array.from(receiveData.values()).filter(data => data.includeIMEI && data.quantity > 0).length;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop - respects sidebar and topbar */}
      <div 
        className="fixed bg-black/50"
        onClick={onClose}
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 35
        }}
      />
      
      {/* Modal Container */}
      <div 
        className="fixed flex items-center justify-center p-4"
        style={{
          left: 'var(--sidebar-width, 0px)',
          top: 'var(--topbar-height, 64px)',
          right: 0,
          bottom: 0,
          zIndex: 50,
          pointerEvents: 'none'
        }}
      >
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <PackageCheck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {mode === 'full' ? 'Full Receive with Optional IMEI' : 'Partial Receive with Optional IMEI'}
                </h3>
                <p className="text-sm text-gray-600">
                  {mode === 'full' 
                    ? 'Optionally add IMEI/Serial numbers for tracking (or skip)'
                    : 'Select quantities and optionally add IMEI numbers'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Summary Info */}
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-orange-200">
              <AlertCircle className="w-4 h-4 text-orange-600" />
              <span className="text-gray-900 font-medium">
                Receiving: <span className="text-orange-600">{getTotalReceiving()}</span> items
              </span>
            </div>
            {getTotalWithIMEI() > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-purple-200">
                <Hash className="w-4 h-4 text-purple-600" />
                <span className="text-gray-900 font-medium">
                  With IMEI: <span className="text-purple-600">{getTotalWithIMEI()}</span> products
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Items List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {purchaseOrder.items.map((item) => {
              const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
              if (pendingQuantity <= 0) return null;

              const productName = item.name || 
                                 (item.product?.name || '') + 
                                 (item.variant?.name ? ` - ${item.variant.name}` : '');
              
              const data = receiveData.get(item.id);
              if (!data) return null;

              const isExpanded = expandedItems.has(item.id);

              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-lg border-2 transition-all ${
                    data.quantity > 0 ? 'border-orange-300 shadow-sm' : 'border-gray-200'
                  }`}
                >
                  {/* Item Header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-gray-900">{productName}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Pending: <span className="font-semibold">{pendingQuantity}</span> • 
                          Cost: <span className="font-semibold">${(item.cost_price || 0).toFixed(2)}</span>
                        </p>
                      </div>

                      {/* Quantity Controls - Only show if partial mode */}
                      {mode === 'partial' ? (
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-600 font-medium">Receive:</div>
                          <button
                            onClick={() => updateQuantity(item.id, Math.max(0, data.quantity - 1))}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={pendingQuantity}
                            value={data.quantity}
                            onChange={(e) => updateQuantity(item.id, Math.min(pendingQuantity, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="w-16 px-2 py-1 text-center border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:outline-none focus:border-orange-500"
                          />
                          <button
                            onClick={() => updateQuantity(item.id, Math.min(pendingQuantity, data.quantity + 1))}
                            className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                          <button
                            onClick={() => updateQuantity(item.id, pendingQuantity)}
                            className="px-3 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded font-medium transition-colors"
                          >
                            All
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                          <span className="text-sm text-green-700 font-medium">Receiving:</span>
                          <span className="text-lg font-bold text-green-900">{data.quantity}</span>
                          <span className="text-sm text-green-600">units</span>
                        </div>
                      )}
                    </div>

                    {/* IMEI Toggle (only show if quantity > 0) */}
                    {data.quantity > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={data.includeIMEI}
                              onChange={() => toggleIMEI(item.id)}
                              className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Include IMEI/Serial Numbers
                            </span>
                            {data.includeIMEI && (
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                {data.quantity} items
                              </span>
                            )}
                          </label>

                          {data.includeIMEI && (
                            <button
                              onClick={() => toggleExpanded(item.id)}
                              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700 font-medium"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="w-4 h-4" />
                                  Hide IMEI
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-4 h-4" />
                                  Enter IMEI
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* IMEI Input Fields (expanded) */}
                        {data.includeIMEI && isExpanded && (
                          <div className="mt-3 space-y-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            {data.imeiNumbers.map((imei, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-sm font-medium text-purple-700 w-8">#{index + 1}</span>
                                <input
                                  type="text"
                                  placeholder={`IMEI for ${productName} #${index + 1}`}
                                  value={imei}
                                  onChange={(e) => updateIMEI(item.id, index, e.target.value)}
                                  className={`flex-1 px-3 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                    !imei.trim() 
                                      ? 'border-red-300 bg-red-50' 
                                      : 'border-purple-200 bg-white'
                                  }`}
                                />
                              </div>
                            ))}
                            <p className="text-xs text-purple-700 mt-2 italic">
                              * Enter IMEI or Serial Number for each unit
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info Banner */}
        <div className="px-6 py-3 bg-blue-50 border-t border-b border-blue-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <strong>How it works:</strong> {mode === 'full' ? 'All pending items are selected. ' : ''}
              You can optionally add IMEI/Serial numbers for tracking (or skip). 
              After confirming, you'll set selling prices before items are added to inventory.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || getTotalReceiving() === 0}
              className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <PackageCheck className="w-5 h-5" />
              {isLoading ? 'Processing...' : `Receive ${getTotalReceiving()} Items & Set Prices`}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-3">
            {getTotalWithIMEI() > 0 
              ? `✓ ${getTotalWithIMEI()} product(s) with IMEI tracking • ${getTotalReceiving() - getTotalWithIMEI()} without IMEI`
              : '✓ All items will be added without IMEI tracking (bulk mode)'}
          </p>
        </div>
      </div>
        </div>
      </div>
    </>
  );
};

export default EnhancedPartialReceiveModal;

