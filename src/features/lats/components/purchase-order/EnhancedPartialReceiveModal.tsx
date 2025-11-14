import React, { useState, useEffect, useMemo } from 'react';
import { PackageCheck, X, MapPin, Zap, PlusCircle, RotateCcw, Plus, Minus, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStorageLocationPicker } from '../storage/StorageLocationPickerProvider';
import { formatCurrency } from '../../../../lib/paymentUtils';

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name?: string;
  quantity: number;
  receivedQuantity?: number;
  cost_price?: number;
  costPrice?: number;
  unitCost?: number;
  product?: {
    name: string;
    sku?: string;
  };
  variant?: {
    name?: string;
    sku?: string;
    variant_name?: string;
  };
}

interface ImeiEntry {
  value: string;
  imei?: string;
  location?: string;
  roomId?: string;
  shelfId?: string;
}

interface ItemReceiveData {
  itemId: string;
  quantity: number;
  includeIMEI: boolean;
  imeiEntries: ImeiEntry[];
}

interface EnhancedPartialReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: {
    id: string;
    items: PurchaseOrderItem[];
    currency?: string;
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

  // Debug state for showing filtered items
  const [debugInfo, setDebugInfo] = useState<{
    totalItems: number;
    visibleItems: number;
    hiddenItems: number;
    hiddenItemsList: Array<{
      id: string;
      name: string;
      ordered: number;
      received: number;
      reason: string;
    }>;
  } | null>(null);

  // Global storage location picker
  const { open: openStoragePicker } = useStorageLocationPicker();



  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Legacy local modal effects removed (now using global picker)

  // Initialize receive data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData = new Map<string, ItemReceiveData>();

      // DEBUG: Log purchase order items and their quantities
      console.log('🛒 [EnhancedPartialReceiveModal] Purchase Order Items:', purchaseOrder.items.length);

      const hiddenItemsList: Array<{
        id: string;
        name: string;
        ordered: number;
        received: number;
        reason: string;
      }> = [];

      purchaseOrder.items.forEach(item => {
        const receivedQuantity = item.receivedQuantity || 0;
        const pendingQuantity = item.quantity - receivedQuantity;
        const variantName = item.variant?.variant_name || item.variant?.name || 'N/A';
        const productName = item.name || (item.product?.name || 'Unknown Product');

        console.log(`📦 Item ${item.id}:`, {
          product: productName,
          variant: variantName,
          ordered: item.quantity,
          received: receivedQuantity,
          pending: pendingQuantity,
          willShow: pendingQuantity > 0
        });

        if (pendingQuantity > 0) {
          const defaultQuantity = mode === 'full' ? pendingQuantity : Math.min(1, pendingQuantity);
          const includeIMEI = defaultQuantity > 0;

          initialData.set(item.id, {
            itemId: item.id,
            quantity: defaultQuantity,
            includeIMEI,
          imeiEntries: includeIMEI
            ? Array(defaultQuantity)
                .fill(null)
                .map(() => createEmptyImeiEntry())
            : []
          });
        } else {
          // Collect information about hidden items
          let reason = 'Unknown';
          if (pendingQuantity <= 0) {
            reason = receivedQuantity >= item.quantity ? 'Fully received' : 'Invalid data (received > ordered)';
          }

          hiddenItemsList.push({
            id: item.id,
            name: productName + (variantName !== 'N/A' ? ` - ${variantName}` : ''),
            ordered: item.quantity,
            received: receivedQuantity,
            reason
          });
        }
      });

      const totalItems = purchaseOrder.items.length;
      const visibleItems = initialData.size;
      const hiddenItems = totalItems - visibleItems;

      console.log(`🎯 [EnhancedPartialReceiveModal] Summary:`, {
        totalItems,
        visibleItems,
        hiddenItems,
        mode
      });

      // Store debug info for UI display
      setDebugInfo({
        totalItems,
        visibleItems,
        hiddenItems,
        hiddenItemsList
      });

      if (hiddenItems > 0) {
        console.warn(`⚠️ [EnhancedPartialReceiveModal] ${hiddenItems} items are hidden (fully received or invalid data)`);
        // Show a toast to inform the user
        toast(`${hiddenItems} item(s) are already fully received and won't appear in the receive list`, {
          icon: '⚠️',
          duration: 5000
        });
      }

      setReceiveData(initialData);
    }
  }, [isOpen, purchaseOrder.items, mode]);

  const createEmptyImeiEntry = (): ImeiEntry => {
    return {
      value: '',
      imei: '',
      location: '',
      roomId: undefined,
      shelfId: undefined
    };
  };

  // Local data loading removed (handled inside global picker)

  const updateLocation = (itemId: string, index: number, location: { roomId: string; shelfId: string; label: string }) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        const entries = [...current.imeiEntries];
        entries[index] = {
          ...entries[index],
          roomId: location.roomId,
          shelfId: location.shelfId,
          location: location.label
        };
        newMap.set(itemId, {
          ...current,
          imeiEntries: entries
        });
      }
      return newMap;
    });
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        const includeIMEI = quantity > 0;
        const imeiEntries = includeIMEI
          ? Array(quantity)
              .fill(null)
              .map((_, i) => {
                const existing = current.imeiEntries?.[i];
                return existing
                  ? { ...existing }
                  : createEmptyImeiEntry();
              })
          : [];

        newMap.set(itemId, {
          ...current,
          quantity,
          includeIMEI,
          imeiEntries
        });
      }
      return newMap;
    });
  };

  const openLocationModal = async (itemId: string, index: number) => {
    try {
      const result = await openStoragePicker();
      if (result) {
        updateLocation(itemId, index, {
          roomId: result.roomId,
          shelfId: result.shelfId,
          label: result.label
        });
      }
    } catch (error) {
      console.error('Error selecting storage location:', error);
    }
  };

  // Removed legacy local modal handlers


  const updateIMEI = (itemId: string, index: number, value: string) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId);
      if (current) {
        const entries = [...current.imeiEntries];
        const currentEntry = entries[index];

        // 🔧 SMART DETECTION: If serial_number is being updated, detect if it's an IMEI or serial number
        // Remove spaces, dashes, and other common separators
        const cleanValue = value.replace(/[\s\-_.]/g, '');

        // Detect if it's an IMEI: exactly 15 digits
        const isIMEI = /^\d{15}$/.test(cleanValue);

        if (isIMEI) {
          // ✅ It's an IMEI: Populate both value and imei fields
          entries[index] = {
            ...currentEntry,
            value: value,      // Keep original format (with spaces/dashes)
            imei: cleanValue   // Clean version for IMEI field
          };
        } else {
          // ⚠️ It's a serial number (not IMEI): Only populate value
          entries[index] = {
            ...currentEntry,
            value: value,
            imei: ''           // Clear IMEI field if it was set before
          };
        }

        newMap.set(itemId, {
          ...current,
          imeiEntries: entries
        });
      }
      return newMap;
    });
  };





  const receiveDataValues = useMemo(() => Array.from(receiveData.values()), [receiveData]);
  const selectedItemCount = useMemo(
    () => receiveDataValues.filter(data => data.quantity > 0).length,
    [receiveDataValues]
  );
  const isAllPendingSelected = useMemo(() => {
    return purchaseOrder.items.every(item => {
      const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
      if (pendingQuantity <= 0) return true;
      const data = receiveData.get(item.id);
      return data?.quantity === pendingQuantity;
    });
  }, [purchaseOrder.items, receiveData]);

  const isOneEachSelected = useMemo(() => {
    return purchaseOrder.items.every(item => {
      const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
      if (pendingQuantity <= 0) return true;
      const data = receiveData.get(item.id);
      return data?.quantity === 1;
    });
  }, [purchaseOrder.items, receiveData]);

  type QuickActionType = 'fill_all' | 'fill_one_each' | 'clear_all';

  const applyQuickAction = (action: QuickActionType) => {
    setReceiveData(prev => {
      const newMap = new Map(prev);

      purchaseOrder.items.forEach(item => {
        const current = newMap.get(item.id);
        if (!current) return;

        const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
        if (pendingQuantity <= 0) return;

        let nextQuantity = current.quantity;
        let nextIncludeIMEI = current.includeIMEI;

        switch (action) {
          case 'fill_all':
            nextQuantity = pendingQuantity;
            break;
          case 'fill_one_each':
            nextQuantity = pendingQuantity > 0 ? 1 : 0;
            break;
          case 'clear_all':
            nextQuantity = 0;
            break;
          default:
            break;
        }

        if (nextQuantity === 0) {
          nextIncludeIMEI = false;
        } else {
          nextIncludeIMEI = nextQuantity > 0;
        }

        const imeiEntries = nextIncludeIMEI
          ? Array(nextQuantity)
              .fill(null)
              .map((_, index) => {
                const existing = current.imeiEntries?.[index];
                return existing
                  ? { ...existing }
                  : createEmptyImeiEntry();
              })
          : [];

        newMap.set(item.id, {
          ...current,
          quantity: nextQuantity,
          includeIMEI: nextIncludeIMEI,
          imeiEntries
        });
      });

      return newMap;
    });

    switch (action) {
      case 'fill_all':
        toast.success('All pending quantities selected');
        break;
      case 'fill_one_each':
        toast.success('Set quantity to 1 for each pending item');
        break;
      case 'clear_all':
        toast.success('Selections cleared');
        break;
      default:
        break;
    }
  };

  const handleConfirm = async () => {
    try {
      // Validate: at least one item must have quantity > 0
      const itemsToReceive = Array.from(receiveData.values()).filter(data => data.quantity > 0);
      
      if (itemsToReceive.length === 0) {
        toast.error('Please select at least one item to receive');
        return;
      }

      // Validate: if IMEI is included, all serial numbers must be filled
      const hasEmptySerial = itemsToReceive.some(data =>
        data.includeIMEI && data.imeiEntries.some(entry => !entry.value.trim())
      );

      if (hasEmptySerial) {
        toast.error('Please fill in Serial Number or IMEI for all items.');
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

  const itemCostMap = useMemo(() => {
    const map = new Map<string, number>();
    purchaseOrder.items.forEach(item => {
      const rawCost = (item.cost_price ?? item.costPrice ?? item.unitCost ?? 0) as unknown as number | string;
      const numericCost = typeof rawCost === 'string' ? parseFloat(rawCost) || 0 : Number(rawCost) || 0;
      map.set(item.id, numericCost);
    });
    return map;
  }, [purchaseOrder.items]);

  const totalSelectedCost = useMemo(() => {
    return Array.from(receiveData.values()).reduce((sum, data) => {
      const cost = itemCostMap.get(data.itemId) || 0;
      return sum + cost * data.quantity;
    }, 0);
  }, [receiveData, itemCostMap]);

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
          zIndex: 50
        }}
        onClick={onClose}
      >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-lg">
              <PackageCheck className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Summary */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {mode === 'full' ? 'Full Receive with Serial Numbers' : 'Partial Receive with Serial Numbers'}
              </h3>
              
              {/* Summary Info */}
              <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <span className="text-gray-600">Total:</span>
                <span className="text-gray-900 font-bold ml-1">
                  {getTotalReceiving()} {getTotalReceiving() === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                <span className="text-gray-600">Products:</span>
                <span className="text-gray-900 font-bold ml-1">
                  {selectedItemCount} {selectedItemCount === 1 ? 'product' : 'products'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                <span className="text-orange-700 font-medium">Cost:</span>
                <span className="text-orange-900 font-bold">
                  {formatCurrency(totalSelectedCost, purchaseOrder.currency || 'TZS')}
                </span>
              </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          {mode === 'partial' && (
            <div className="mt-6 space-y-3">
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Quick Actions</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyQuickAction('fill_all');
                  }}
                  disabled={isAllPendingSelected}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                    isAllPendingSelected
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Receive All Pending
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyQuickAction('fill_one_each');
                  }}
                  disabled={isOneEachSelected}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                    isOneEachSelected
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-orange-500 text-white hover:bg-orange-600'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Receive 1 Each
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    applyQuickAction('clear_all');
                  }}
                  disabled={selectedItemCount === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm ${
                    selectedItemCount === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear Selections
                </button>

              </div>
            </div>
          )}
        </div>

        {/* Debug Info - Hidden Items */}
        {debugInfo && debugInfo.hiddenItems > 0 && (
          <div className="px-8 pb-6 border-b border-gray-100">
            <details className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <summary className="cursor-pointer font-medium text-yellow-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {debugInfo.hiddenItems} item(s) not shown (already fully received)
              </summary>
              <div className="mt-3 space-y-2">
                <p className="text-sm text-yellow-700">
                  The following items are hidden because they have already been fully received or have invalid data:
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {debugInfo.hiddenItemsList.map(item => (
                    <div key={item.id} className="flex items-center justify-between bg-white p-2 rounded border text-xs">
                      <span className="font-medium text-gray-900 truncate flex-1">{item.name}</span>
                      <span className="text-gray-600 ml-2">
                        {item.received}/{item.ordered} received
                      </span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                        item.reason === 'Fully received' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.reason}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-yellow-600 mt-2">
                  💡 If you believe some items should appear here, check the purchase order's received quantities in the database.
                </p>
              </div>
            </details>
          </div>
        )}

        {/* Empty State - No items to receive */}
        {debugInfo && debugInfo.visibleItems === 0 && (
          <div className="flex-1 flex items-center justify-center px-6 py-12">
            <div className="text-center">
              <PackageCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All items received</h3>
              <p className="text-gray-600 mb-4">
                All products in this purchase order have been fully received.
              </p>
              {debugInfo.hiddenItems > 0 && (
                <p className="text-sm text-gray-500">
                  {debugInfo.hiddenItems} item(s) are fully received and hidden from view.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Items List - Scrollable */}
        {debugInfo && debugInfo.visibleItems > 0 && (
          <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-4 py-4">
              {purchaseOrder.items.map((item) => {
                const pendingQuantity = item.quantity - (item.receivedQuantity || 0);
                if (pendingQuantity <= 0) return null;

                const variantName = item.variant?.variant_name || item.variant?.name || '';
                const productName = item.name ||
                                   (item.product?.name || '') +
                                   (variantName ? ` - ${variantName}` : '');

                const data = receiveData.get(item.id);
                if (!data) return null;

              return (
                <div
                  key={item.id}
                  className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                    data.quantity > 0
                      ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-gray-900">{productName}</h4>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                          </svg>
                          Active
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {variantName ? `Variant: ${variantName}` : ''}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Cost: <span className="font-semibold text-gray-900">{formatCurrency(Number(item.cost_price ?? item.costPrice ?? item.unitCost ?? 0), purchaseOrder.currency || 'TZS')}</span> • Available: {pendingQuantity} units
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="ml-4">
                        <label className="block text-xs font-medium text-gray-600 mb-1 text-right">Receiving:</label>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.id, Math.max(0, data.quantity - 1));
                            }}
                            className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            max={pendingQuantity}
                            value={data.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                item.id,
                                Math.min(pendingQuantity, Math.max(0, parseInt(e.target.value) || 0))
                              )
                            }
                            className="w-28 px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-200/50 text-center font-bold text-xl [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              updateQuantity(item.id, Math.min(pendingQuantity, data.quantity + 1));
                            }}
                            className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Serial Numbers Table */}
                  {data.quantity > 0 && (
                    <div className="px-6 pb-6">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 w-12">#</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">Product Name</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[250px]">Serial Number / IMEI *</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[180px]">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {data.imeiEntries.map((entry, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center font-medium text-gray-600">{index + 1}</td>
                                <td className="px-4 py-3 font-medium text-gray-900">{productName}</td>
                                <td className="px-4 py-3">
                                  <input
                                    type="text"
                                    placeholder="Enter Serial Number or IMEI (auto-detects)"
                                    value={entry.value}
                                    onChange={(e) => updateIMEI(item.id, index, e.target.value)}
                                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      !entry.value.trim()
                                        ? 'border-red-300 bg-red-50'
                                        : 'border-gray-300 bg-white'
                                    }`}
                                    title="Enter either Serial Number or IMEI - system auto-detects IMEI (15 digits)"
                                  />
                                  {entry.imei && (
                                    <div className="text-xs mt-1">
                                      <span className="text-green-600 font-medium">✓ IMEI detected</span>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openLocationModal(item.id, index);
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-400 bg-white text-left flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <span className={entry.location ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                                      {entry.location || 'Select shelf'}
                                    </span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-purple-700 mt-3 italic">
                        * Enter Serial Number or IMEI for each unit. System auto-detects IMEI (15 digits).
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={async () => {
                // Skip serial numbers - proceed with empty serial data but preserve quantities
                const skipItems = Array.from(receiveData.values()).filter(data => data.quantity > 0);
                try {
                  await onConfirm(skipItems);
                } catch (error) {
                  console.error('Error skipping serial numbers:', error);
                  toast.error('Failed to skip serial numbers');
                }
              }}
              disabled={isLoading || getTotalReceiving() === 0}
              className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 text-lg"
            >
              Skip Serial Numbers {'\u2192'}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || getTotalReceiving() === 0}
              className="flex-1 px-6 py-3.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-lg flex items-center justify-center gap-2 bg-orange-500 text-white hover:bg-orange-600 hover:shadow-xl"
            >
              <PackageCheck className="w-5 h-5" />
              {isLoading
                ? 'Processing...'
                : `Continue to Pricing (${getTotalReceiving()} ${getTotalReceiving() === 1 ? 'item' : 'items'})`}
            </button>
          </div>
        </div>
      </div>
      </div>

    </>
  );
};


export default EnhancedPartialReceiveModal;

