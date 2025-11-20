import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { PackageCheck, X, AlertCircle, Package, MapPin, Zap, PlusCircle, RotateCcw, Plus, Minus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStorageLocationPicker } from '../storage/StorageLocationPickerProvider';
import { supabase } from '../../../../lib/supabaseClient';

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name?: string;
  quantity: number;
  receivedQuantity?: number;
  cost_price?: number;     // snake_case (legacy)
  costPrice?: number;       // camelCase (current)
  unitCost?: number;        // alternative name
  product?: {
    name: string;
    sku?: string;
  };
  variant?: {
    name: string;
    sku?: string;
    variant_name?: string;  // Added for proper variant name display
  };
}

interface SerialNumberData {
  serial_number: string;
  imei?: string;
  mac_address?: string;
  barcode?: string;
  location?: string;
  warranty_start?: string;
  warranty_end?: string;
  warranty_months?: number;
  cost_price?: number;
  selling_price?: number;
  notes?: string;
}

interface SerialNumberReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: {
    id: string;
    items: PurchaseOrderItem[];
    currency?: string; // Currency used in the PO
  };
  onConfirm: (receivedItems: Array<{
    id: string;
    receivedQuantity: number;
    serialNumbers?: SerialNumberData[];
  }>) => Promise<void>;
  isLoading?: boolean;
  mode?: 'full' | 'partial'; // Receive mode from previous step
  initialReceivedItems?: Array<{
    id: string;
    receivedQuantity: number;
    serialNumbers?: SerialNumberData[];
  }>;
}

const SerialNumberReceiveModal: React.FC<SerialNumberReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirm,
  isLoading = false,
  mode = 'partial',
  initialReceivedItems
}) => {
  const [receivedItems, setReceivedItems] = useState<Map<string, {
    quantity: number;
    serialNumbers: SerialNumberData[];
  }>>(new Map());

  // Track duplicate status for each serial number (itemId -> index -> isDuplicate)
  const [duplicateStatus, setDuplicateStatus] = useState<Map<string, Map<number, boolean>>>(new Map());
  
  // Debounce timers for duplicate checking
  const debounceTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Global storage picker
  const { open: openStoragePicker } = useStorageLocationPicker();

  // Block body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      // Clear all debounce timers when modal closes
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
      // Clear duplicate status
      setDuplicateStatus(new Map());
    }

    return () => {
      document.body.style.overflow = '';
      // Cleanup timers on unmount
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, [isOpen]);

  // Legacy local storage-room modal removed in favor of global picker

  // Initialize received items when modal opens - Auto-generate rows based on quantity
  useEffect(() => {
    if (isOpen) {
      // Check if we have saved data to restore
      if (initialReceivedItems && initialReceivedItems.length > 0) {
        console.log('📦 Restoring saved serial number data');
        const restoredItems = new Map();
        initialReceivedItems.forEach(savedItem => {
          restoredItems.set(savedItem.id, {
            quantity: savedItem.receivedQuantity,
            serialNumbers: savedItem.serialNumbers || []
          });
        });
        setReceivedItems(restoredItems);
        return;
      }
      
      const initialItems = new Map();
      purchaseOrder.items.forEach(item => {
        const remainingQty = item.quantity - (item.receivedQuantity || 0);

        // For FULL mode: receive all remaining items
        // For PARTIAL mode: start with 1 if available
        const initialQuantity = mode === 'full'
          ? remainingQty
          : remainingQty > 0
            ? 1
            : 0;
        
        // Auto-generate empty serial number rows for each quantity
        const serialNumbers: SerialNumberData[] = [];
        for (let i = 0; i < initialQuantity; i++) {
          serialNumbers.push(createEmptySerialNumber(item));
        }
        
        initialItems.set(item.id, {
          quantity: initialQuantity,
          serialNumbers
        });
      });
      setReceivedItems(initialItems);
    }
  }, [isOpen, purchaseOrder.items, mode, initialReceivedItems]);

  // Data loading handled in provider

  const createEmptySerialNumber = (item: PurchaseOrderItem): SerialNumberData => {
    const warrantyStart = new Date().toISOString().split('T')[0];
    const warrantyEndDate = new Date();
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 12);
    const warrantyEnd = warrantyEndDate.toISOString().split('T')[0];

    return {
      serial_number: '',
      imei: '',
      mac_address: '',
      barcode: '',
      location: '',
      warranty_start: warrantyStart,
      warranty_end: warrantyEnd,
      warranty_months: 12,
      cost_price: Number(item.costPrice || item.cost_price || item.unitCost || 0),
      selling_price: undefined,
      notes: ''
    };
  };

  const openLocationPicker = async (itemId: string, index: number) => {
    try {
      const result = await openStoragePicker();
      if (result) {
        updateSerialNumber(itemId, index, 'location', result.label);
      }
    } catch (error) {
      console.error('Error opening storage location picker:', error);
    }
  };

  // Check for duplicate serial number/IMEI in database
  const checkDuplicate = useCallback(async (serialNumber: string, imei: string | undefined, itemId: string, index: number) => {
    if (!serialNumber || !serialNumber.trim()) {
      // Clear duplicate status if field is empty
      setDuplicateStatus(prev => {
        const newMap = new Map(prev);
        const itemMap = newMap.get(itemId) || new Map();
        itemMap.delete(index);
        if (itemMap.size === 0) {
          newMap.delete(itemId);
        } else {
          newMap.set(itemId, itemMap);
        }
        return newMap;
      });
      return;
    }

    try {
      // Check both serial_number and imei fields
      const queries = [];
      
      if (serialNumber.trim()) {
        queries.push(
          supabase
            .from('inventory_items')
            .select('id, serial_number, imei')
            .eq('serial_number', serialNumber.trim())
            .limit(1)
        );
      }
      
      if (imei && imei.trim()) {
        queries.push(
          supabase
            .from('inventory_items')
            .select('id, serial_number, imei')
            .eq('imei', imei.trim())
            .limit(1)
        );
      }

      // Also check IMEI child variants
      if (imei && imei.trim()) {
        queries.push(
          supabase
            .from('lats_product_variants')
            .select('id, variant_attributes')
            .eq('variant_type', 'imei_child')
            .filter("variant_attributes->>'imei'", 'eq', imei.trim())
            .limit(1)
        );
      }

      const results = await Promise.all(queries);
      
      // Check if any query found a duplicate
      const isDuplicate = results.some(result => {
        if (result.error) {
          console.warn('Error checking duplicate:', result.error);
          return false;
        }
        return result.data && result.data.length > 0;
      });

      // Update duplicate status
      setDuplicateStatus(prev => {
        const newMap = new Map(prev);
        const itemMap = newMap.get(itemId) || new Map();
        if (isDuplicate) {
          itemMap.set(index, true);
        } else {
          itemMap.delete(index);
        }
        if (itemMap.size === 0) {
          newMap.delete(itemId);
        } else {
          newMap.set(itemId, itemMap);
        }
        return newMap;
      });
    } catch (error) {
      console.error('Error checking duplicate:', error);
    }
  }, []);

  const updateSerialNumber = (itemId: string, index: number, field: keyof SerialNumberData, value: string | number) => {
    setReceivedItems(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { quantity: 0, serialNumbers: [] };
      const updatedSerialNumbers = [...current.serialNumbers];
      const currentSerial = updatedSerialNumbers[index];
      
      // If warranty_months changed, auto-calculate warranty_end
      if (field === 'warranty_months' && typeof value === 'number' && currentSerial.warranty_start) {
        const startDate = new Date(currentSerial.warranty_start);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + value);
        updatedSerialNumbers[index] = {
          ...currentSerial,
          warranty_months: value,
          warranty_end: endDate.toISOString().split('T')[0]
        };
      } 
      // If warranty_start changed, recalculate warranty_end based on months
      else if (field === 'warranty_start' && typeof value === 'string') {
        const months = currentSerial.warranty_months || 12;
        const startDate = new Date(value);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + months);
        updatedSerialNumbers[index] = {
          ...currentSerial,
          warranty_start: value,
          warranty_end: endDate.toISOString().split('T')[0]
        };
      }
      // ✅ FIX: Save serial_number EXACTLY as entered - no auto-detection or changes
      else if (field === 'serial_number' && typeof value === 'string') {
        // ✅ SAVE EXACTLY AS ENTERED - no processing, no detection, no changes
        const newSerial = {
          ...currentSerial,
          serial_number: value  // Save exactly as user typed it (e.g., "SDHJAGS" stays "SDHJAGS")
          // IMEI field remains unchanged - user can enter it separately if needed
        };
        
        updatedSerialNumbers[index] = newSerial;
        
        // Debounce duplicate check (wait 500ms after user stops typing)
        const timerKey = `${itemId}-${index}`;
        const existingTimer = debounceTimers.current.get(timerKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(() => {
          checkDuplicate(newSerial.serial_number, newSerial.imei, itemId, index);
          debounceTimers.current.delete(timerKey);
        }, 500);
        
        debounceTimers.current.set(timerKey, timer);
      }
      // ✅ Handle IMEI field separately
      else if (field === 'imei' && typeof value === 'string') {
        // ✅ SAVE IMEI EXACTLY AS ENTERED - no processing, no changes
        const newSerial = {
            ...currentSerial,
          imei: value  // Save exactly as user typed it
        };
        
        updatedSerialNumbers[index] = newSerial;
        
        // Debounce duplicate check for IMEI
        const timerKey = `${itemId}-${index}-imei`;
        const existingTimer = debounceTimers.current.get(timerKey);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }
        
        const timer = setTimeout(() => {
          checkDuplicate(newSerial.serial_number, newSerial.imei, itemId, index);
          debounceTimers.current.delete(timerKey);
        }, 500);
        
        debounceTimers.current.set(timerKey, timer);
      }
      else {
        updatedSerialNumbers[index] = {
          ...currentSerial,
          [field]: value
        };
      }
      
      newMap.set(itemId, {
        ...current,
        serialNumbers: updatedSerialNumbers
      });
      return newMap;
    });
  };

  // Update quantity for partial receive mode - regenerate serial number fields
  const updateReceivingQuantity = (itemId: string, newQuantity: number) => {
    const item = purchaseOrder.items.find(i => i.id === itemId);
    if (!item) return;

    const remainingQty = item.quantity - (item.receivedQuantity || 0);
    const validQuantity = Math.min(Math.max(0, newQuantity), remainingQty);

    setReceivedItems(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { quantity: 0, serialNumbers: [] };
      
      // Generate serial number fields based on new quantity
      const serialNumbers: SerialNumberData[] = [];
      for (let i = 0; i < validQuantity; i++) {
        // Keep existing serial data if available, otherwise create new
        const existingSerial = current.serialNumbers[i];
        serialNumbers.push(existingSerial || createEmptySerialNumber(item));
      }
      
      newMap.set(itemId, {
        quantity: validQuantity,
        serialNumbers
      });
      return newMap;
    });
  };

  const receivedItemsEntries = useMemo(() => Array.from(receivedItems.entries()), [receivedItems]);

  const selectedItemCount = useMemo(() => {
    return receivedItemsEntries.filter(([, data]) => data.quantity > 0).length;
  }, [receivedItemsEntries]);

  const isAllPendingSelected = useMemo(() => {
    return purchaseOrder.items.every(item => {
      const remainingQty = item.quantity - (item.receivedQuantity || 0);
      if (remainingQty <= 0) return true;
      const entry = receivedItems.get(item.id);
      return entry?.quantity === remainingQty;
    });
  }, [purchaseOrder.items, receivedItems]);

  const isOneEachSelected = useMemo(() => {
    return purchaseOrder.items.every(item => {
      const remainingQty = item.quantity - (item.receivedQuantity || 0);
      if (remainingQty <= 0) return true;
      const entry = receivedItems.get(item.id);
      return entry?.quantity === 1;
    });
  }, [purchaseOrder.items, receivedItems]);

  type QuickActionType = 'fill_all' | 'fill_one_each' | 'clear_all';

  const applyQuickAction = (action: QuickActionType) => {
    if (mode !== 'partial') return;

    const hasPendingItems = purchaseOrder.items.some(item => {
      const remainingQty = item.quantity - (item.receivedQuantity || 0);
      return remainingQty > 0;
    });

    if (!hasPendingItems) {
      toast.error('No pending items available for this action');
      return;
    }

    setReceivedItems(prev => {
      const newMap = new Map(prev);

      purchaseOrder.items.forEach(item => {
        const remainingQty = item.quantity - (item.receivedQuantity || 0);
        const current = newMap.get(item.id) || { quantity: 0, serialNumbers: [] };

        if (remainingQty <= 0) {
          newMap.set(item.id, {
            quantity: 0,
            serialNumbers: []
          });
          return;
        }

        let nextQuantity = current.quantity;

        switch (action) {
          case 'fill_all':
            nextQuantity = remainingQty;
            break;
          case 'fill_one_each':
            nextQuantity = Math.min(1, remainingQty);
            break;
          case 'clear_all':
            nextQuantity = 0;
            break;
          default:
            break;
        }

        const serialNumbers: SerialNumberData[] = [];
        for (let i = 0; i < nextQuantity; i++) {
          const existingSerial = current.serialNumbers[i];
          serialNumbers.push(existingSerial || createEmptySerialNumber(item));
        }

        newMap.set(item.id, {
          quantity: nextQuantity,
          serialNumbers
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

  const adjustReceivingQuantity = (itemId: string, delta: number) => {
    const currentQuantity = receivedItems.get(itemId)?.quantity || 0;
    updateReceivingQuantity(itemId, currentQuantity + delta);
  };

  const handleConfirm = async () => {
    try {
      // ✅ FIX: Validate that EITHER serial number OR IMEI is filled (at least one required)
      let hasErrors = false;
      receivedItems.forEach((data, itemId) => {
        data.serialNumbers.forEach((serial, index) => {
          const hasSerialNumber = serial.serial_number && serial.serial_number.trim() !== '';
          const hasIMEI = serial.imei && serial.imei.trim() !== '';
          
          // Require at least one: serial number OR IMEI
          if (!hasSerialNumber && !hasIMEI) {
            hasErrors = true;
          }
        });
      });

      if (hasErrors) {
        toast.error('Please fill in Serial Number OR IMEI (at least one required) for all items');
        return;
      }

      const receivedItemsArray: Array<{
        id: string;
        receivedQuantity: number;
        serialNumbers?: SerialNumberData[];
      }> = [];

      // Convert Map to Array
      receivedItems.forEach((data, itemId) => {
        if (data.quantity > 0) {
          receivedItemsArray.push({
            id: itemId,
            receivedQuantity: data.quantity,
            serialNumbers: data.serialNumbers.length > 0 ? data.serialNumbers : undefined
          });
        }
      });

      await onConfirm(receivedItemsArray);
      onClose();
    } catch (error) {
      console.error('Error confirming receive:', error);
      toast.error('Failed to process receive');
    }
  };

  const getTotalReceivedItems = () => {
    let total = 0;
    receivedItems.forEach(data => {
      total += data.quantity;
    });
    return total;
  };

  const getTotalCost = () => {
    let totalCost = 0;
    receivedItems.forEach((data, itemId) => {
      const item = purchaseOrder.items.find(i => i.id === itemId);
      if (item) {
        const cost = Number(item.costPrice || item.cost_price || item.unitCost || 0);
        totalCost += cost * data.quantity;
      }
    });
    return totalCost;
  };

  // Format currency with PO currency, thousand separator, and no decimals
  const formatCurrency = (amount: number): string => {
    const currency = purchaseOrder.currency || 'USD';
    const roundedAmount = Math.round(amount); // Remove decimals
    
    // Handle different currencies
    if (currency === 'TSh' || currency === 'TZS') {
      return `TSh ${roundedAmount.toLocaleString('en-US')}`;
    }
    
    // For other currencies, use their symbol
    try {
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(roundedAmount);
      return formatted;
    } catch (error) {
      // Fallback for unsupported currencies
      return `${currency} ${roundedAmount.toLocaleString('en-US')}`;
    }
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
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
        style={{ pointerEvents: 'auto' }}
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
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            
            {/* Text and Summary */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {mode === 'full' ? 'Add Serial Numbers' : 'Select Items & Add Serial Numbers'}
              </h3>
              
              {/* Summary Info */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <span className="text-gray-600">Total:</span>
                  <span className="text-gray-900 font-bold ml-1">
                    {getTotalReceivedItems()} items
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <span className="text-gray-900 font-medium">
                    {purchaseOrder.items.length} {purchaseOrder.items.length === 1 ? 'product' : 'products'}
                  </span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-green-700 font-medium">Cost: </span>
                  <span className="text-green-900 font-bold">
                    {formatCurrency(getTotalCost())}
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
                  onClick={() => applyQuickAction('fill_all')}
                  disabled={isAllPendingSelected}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                    isAllPendingSelected
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  Receive All Pending
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickAction('fill_one_each')}
                  disabled={isOneEachSelected}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                    isOneEachSelected
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <PlusCircle className="w-4 h-4" />
                  Receive 1 Each
                </button>

                <button
                  type="button"
                  onClick={() => applyQuickAction('clear_all')}
                  disabled={selectedItemCount === 0}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${
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

        {/* Scrollable Products List Section */}
        <div className="flex-1 overflow-y-auto px-6 border-t border-gray-100">
          <div className="space-y-4 py-4">
            {purchaseOrder.items.map((item) => {
              const itemData = receivedItems.get(item.id) || { quantity: 0, serialNumbers: [] };
              const remainingQty = item.quantity - (item.receivedQuantity || 0);
              
              // For partial mode, show all items even if quantity is 0 (to allow selection)
              // For full mode, only show items being received
              if (mode === 'full' && itemData.quantity === 0) return null;
              
              // Get product name from different possible sources
              // Priority: variant_name (main variant field) > name (legacy) > product name
              const variantName = item.variant?.variant_name || item.variant?.name || null;
              const productName = item.name || 
                                 (item.product?.name || '') + 
                                 (variantName ? ` - ${variantName}` : '');
              
              const hasSerialNumbers = itemData.quantity > 0;

              return (
                <div key={item.id} className={`border-2 rounded-2xl bg-white shadow-sm transition-all duration-300 ${
                  hasSerialNumbers
                    ? 'border-green-200 hover:border-green-300 hover:shadow-md'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}>
                  {/* Item Header */}
                  <div className="flex items-start justify-between p-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-gray-900">{productName}</h4>
                        {/* Status Badge */}
                        {hasSerialNumbers && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-500 text-white shadow-sm">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Active
                          </span>
                        )}
                      </div>
                      {variantName && (
                        <p className="text-sm text-gray-600 mt-1">Variant: {variantName}</p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        Cost: <span className="font-semibold text-gray-900">{formatCurrency(Number(item.costPrice || item.cost_price || item.unitCost || 0))}</span> • 
                        Available: {remainingQty} units
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {mode === 'partial' && (
                        <div className="ml-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1 text-right">
                            Receiving:
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => adjustReceivingQuantity(item.id, -1)}
                              disabled={itemData.quantity <= 0}
                              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                            >
                              <Minus className="w-5 h-5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={remainingQty}
                              value={itemData.quantity}
                              onChange={(e) => updateReceivingQuantity(item.id, parseInt(e.target.value, 10) || 0)}
                              className="w-28 px-4 py-3 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-200/50 text-center font-bold text-xl [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <button
                              type="button"
                              onClick={() => adjustReceivingQuantity(item.id, 1)}
                              disabled={itemData.quantity >= remainingQty}
                              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 text-gray-700 hover:bg-gray-100 transition disabled:opacity-40 disabled:cursor-not-allowed text-lg"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      )}
                      {mode === 'full' && (
                        <div className="px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                          <p className="text-xs text-gray-600">Receiving:</p>
                          <p className="text-lg font-bold text-green-700">{itemData.quantity} pcs</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Section - Always Visible */}
                  {itemData.quantity > 0 ? (
                  <div className="px-6 pb-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 w-12">#</th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">
                              Product Name
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">
                              Serial Number <span className="text-gray-400 font-normal">(Optional)</span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">
                              IMEI <span className="text-gray-400 font-normal">(Optional)</span>
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[180px]">
                              Location
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                        {itemData.serialNumbers.map((serial, index) => (
                          <tr 
                            key={index} 
                            className="hover:bg-gray-50"
                          >
                            {/* Row Number */}
                            <td className="px-4 py-3 text-center font-medium text-gray-600">
                              {index + 1}
                            </td>
                            
                            {/* Product Name */}
                            <td className="px-4 py-3 font-medium text-gray-900">
                              {productName}
                            </td>
                            
                            {/* Serial Number Field */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Enter Serial Number (optional, e.g., SDHJAGS)"
                                value={serial.serial_number}
                                onChange={(e) => updateSerialNumber(item.id, index, 'serial_number', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                  duplicateStatus.get(item.id)?.get(index)
                                    ? 'border-red-500 bg-red-50 focus:ring-red-500'
                                    : (!serial.serial_number.trim() && !serial.imei?.trim())
                                    ? 'border-orange-300 bg-orange-50 focus:ring-blue-500'
                                    : 'border-gray-300 bg-white focus:ring-blue-500'
                                }`}
                                title="Enter Serial Number exactly as it appears (optional - at least Serial Number OR IMEI required)"
                              />
                              {/* Show duplicate warning */}
                              {serial.serial_number && duplicateStatus.get(item.id)?.get(index) && (
                                <div className="text-xs mt-1">
                                  <div className="flex items-center gap-1 text-red-600 font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>⚠️ Duplicate serial number</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            
                            {/* IMEI Field (Separate) */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Enter IMEI (15 digits, optional)"
                                value={serial.imei || ''}
                                onChange={(e) => updateSerialNumber(item.id, index, 'imei', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                                  duplicateStatus.get(item.id)?.get(index)
                                    ? 'border-red-500 bg-red-50 focus:ring-red-500'
                                    : serial.imei && serial.imei.trim().length === 15
                                    ? 'border-green-300 bg-green-50 focus:ring-green-500'
                                    : serial.imei && serial.imei.trim().length > 0
                                    ? 'border-orange-300 bg-orange-50 focus:ring-orange-500'
                                    : (!serial.serial_number?.trim() && !serial.imei?.trim())
                                    ? 'border-orange-300 bg-orange-50 focus:ring-blue-500'
                                    : 'border-gray-300 bg-white focus:ring-blue-500'
                                }`}
                                title="Enter IMEI number (15 digits) - optional, at least Serial Number OR IMEI required"
                                maxLength={15}
                              />
                              {/* Show IMEI status */}
                              {serial.imei && (
                                <div className="text-xs mt-1">
                                  {serial.imei.trim().length === 15 ? (
                                    <span className="text-green-600 font-medium">✓ Valid IMEI (15 digits)</span>
                                  ) : serial.imei.trim().length > 0 ? (
                                    <span className="text-orange-600">⚠️ IMEI should be 15 digits</span>
                                  ) : null}
                                </div>
                              )}
                              {serial.imei && duplicateStatus.get(item.id)?.get(index) && (
                                <div className="text-xs mt-1">
                                  <div className="flex items-center gap-1 text-red-600 font-medium">
                                    <AlertCircle className="w-3 h-3" />
                                    <span>⚠️ Duplicate IMEI</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            
                            {/* Location */}
                            <td className="px-4 py-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openLocationPicker(item.id, index);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-blue-400 bg-white text-left flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className={serial.location ? 'text-gray-900' : 'text-gray-400'}>
                                  {serial.location || 'Select shelf'}
                                </span>
                              </button>
                            </td>
                          </tr>
                        ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  ) : mode === 'partial' ? (
                    <div className="px-6 pb-6">
                      <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                        <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">Set quantity above to add serial numbers</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                // Skip serial numbers - proceed with empty serial data but preserve quantities
                const emptyItems = Array.from(purchaseOrder.items).map(item => {
                  const itemData = receivedItems.get(item.id) || { quantity: 0, serialNumbers: [] };
                  return {
                    id: item.id,
                    receivedQuantity: itemData.quantity, // Use the quantity from state (works for both full and partial)
                    serialNumbers: []
                  };
                });
                onConfirm(emptyItems);
              }}
              disabled={isLoading}
              className="flex-1 px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50 text-lg"
            >
              Skip Serial Numbers →
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || getTotalReceivedItems() === 0}
              className="flex-1 px-6 py-3.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
            >
              {isLoading ? 'Processing...' : `Continue (${getTotalReceivedItems()} items)`}
            </button>
          </div>
        </div>
      </div>

      {/* Global storage picker provided at app root; no local modal needed */}
      </div>
    </>
  );
};

export default SerialNumberReceiveModal;
