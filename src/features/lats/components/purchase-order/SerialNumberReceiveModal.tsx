import React, { useState, useEffect } from 'react';
import { PackageCheck, Plus, X, AlertCircle, ChevronDown, ChevronUp, Calendar, DollarSign, Shield, Smartphone } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  variant_id?: string;
  name: string;
  quantity: number;
  receivedQuantity?: number;
  cost_price: number;
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
  };
  onConfirm: (receivedItems: Array<{
    id: string;
    receivedQuantity: number;
    serialNumbers?: SerialNumberData[];
  }>) => Promise<void>;
  isLoading?: boolean;
}

const SerialNumberReceiveModal: React.FC<SerialNumberReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirm,
  isLoading = false
}) => {
  const [receivedItems, setReceivedItems] = useState<Map<string, {
    quantity: number;
    serialNumbers: SerialNumberData[];
  }>>(new Map());
  
  const [expandedSerials, setExpandedSerials] = useState<Set<string>>(new Set());

  // Initialize received items when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialItems = new Map();
      purchaseOrder.items.forEach(item => {
        initialItems.set(item.id, {
          quantity: item.receivedQuantity || 0,
          serialNumbers: []
        });
      });
      setReceivedItems(initialItems);
    }
  }, [isOpen, purchaseOrder.items]);

  const updateReceivedQuantity = (itemId: string, quantity: number) => {
    const maxQuantity = purchaseOrder.items.find(item => item.id === itemId)?.quantity || 0;
    if (quantity < 0 || quantity > maxQuantity) return;

    setReceivedItems(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { quantity: 0, serialNumbers: [] };
      newMap.set(itemId, {
        ...current,
        quantity
      });
      return newMap;
    });
  };

  const addSerialNumber = (itemId: string) => {
    setReceivedItems(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { quantity: 0, serialNumbers: [] };
      const item = purchaseOrder.items.find(i => i.id === itemId);
      
      // Calculate warranty end date (12 months from today by default)
      const warrantyStart = new Date().toISOString().split('T')[0];
      const warrantyEndDate = new Date();
      warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 12);
      const warrantyEnd = warrantyEndDate.toISOString().split('T')[0];
      
      newMap.set(itemId, {
        ...current,
        serialNumbers: [...current.serialNumbers, {
          serial_number: '',
          imei: '',
          mac_address: '',
          barcode: '',
          location: '',
          warranty_start: warrantyStart,
          warranty_end: warrantyEnd,
          warranty_months: 12,
          cost_price: item?.cost_price || 0,
          selling_price: undefined,
          notes: ''
        }]
      });
      return newMap;
    });
  };

  const removeSerialNumber = (itemId: string, index: number) => {
    setReceivedItems(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(itemId) || { quantity: 0, serialNumbers: [] };
      newMap.set(itemId, {
        ...current,
        serialNumbers: current.serialNumbers.filter((_, i) => i !== index)
      });
      return newMap;
    });
  };

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

  const handleConfirm = async () => {
    try {
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
  
  const toggleSerialExpanded = (key: string) => {
    setExpandedSerials(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3 mb-4 p-6 border-b border-gray-100">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <PackageCheck className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Receive Stock with Serial Numbers</h3>
            <p className="text-sm text-gray-600">Optional: Add serial numbers for individual items</p>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">
                Total items to receive: {getTotalReceivedItems()}
              </span>
            </div>
          </div>
          
          <div className="space-y-6">
            {purchaseOrder.items.map((item) => {
              const itemData = receivedItems.get(item.id) || { quantity: 0, serialNumbers: [] };
              
              return (
                <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-600">Cost: ${item.cost_price}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateReceivedQuantity(item.id, Math.max(0, itemData.quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="w-12 text-center">{itemData.quantity}</span>
                      <button
                        onClick={() => updateReceivedQuantity(item.id, Math.min(item.quantity, itemData.quantity + 1))}
                        className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  {itemData.quantity > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Serial Numbers ({itemData.serialNumbers.length})
                        </span>
                        <button
                          onClick={() => addSerialNumber(item.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Add Serial
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {itemData.serialNumbers.map((serial, index) => {
                          const serialKey = `${item.id}-${index}`;
                          const isExpanded = expandedSerials.has(serialKey);
                          
                          return (
                            <div key={index} className="border border-gray-200 rounded-lg bg-gray-50">
                              {/* Header - Always Visible */}
                              <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <Smartphone className="w-4 h-4 text-gray-500" />
                                  <input
                                    type="text"
                                    placeholder="Serial Number *"
                                    value={serial.serial_number}
                                    onChange={(e) => updateSerialNumber(item.id, index, 'serial_number', e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                                  />
                                  <button
                                    onClick={() => toggleSerialExpanded(serialKey)}
                                    className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                                    title={isExpanded ? "Show less" : "Show more"}
                                  >
                                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => removeSerialNumber(item.id, index)}
                                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Remove serial"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                                
                                {/* Expanded Details */}
                                {isExpanded && (
                                  <div className="mt-3 space-y-4 pt-3 border-t border-gray-200">
                                    {/* Device Identifiers Section */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Smartphone className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-semibold text-gray-700 uppercase">Device Identifiers</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <input
                                          type="text"
                                          placeholder="IMEI (optional)"
                                          value={serial.imei || ''}
                                          onChange={(e) => updateSerialNumber(item.id, index, 'imei', e.target.value)}
                                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                          type="text"
                                          placeholder="MAC Address (optional)"
                                          value={serial.mac_address || ''}
                                          onChange={(e) => updateSerialNumber(item.id, index, 'mac_address', e.target.value)}
                                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Barcode (optional)"
                                          value={serial.barcode || ''}
                                          onChange={(e) => updateSerialNumber(item.id, index, 'barcode', e.target.value)}
                                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                        <input
                                          type="text"
                                          placeholder="Location (optional)"
                                          value={serial.location || ''}
                                          onChange={(e) => updateSerialNumber(item.id, index, 'location', e.target.value)}
                                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                      </div>
                                    </div>
                                    
                                    {/* Warranty Section */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <Shield className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-semibold text-gray-700 uppercase">Warranty Information</span>
                                      </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-600 mb-1 block">Start Date</label>
                                          <input
                                            type="date"
                                            value={serial.warranty_start || ''}
                                            onChange={(e) => updateSerialNumber(item.id, index, 'warranty_start', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 mb-1 block">Months</label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="120"
                                            value={serial.warranty_months || 12}
                                            onChange={(e) => updateSerialNumber(item.id, index, 'warranty_months', parseInt(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 mb-1 block">End Date</label>
                                          <input
                                            type="date"
                                            value={serial.warranty_end || ''}
                                            readOnly
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 cursor-not-allowed"
                                            title="Auto-calculated from start date and months"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Pricing Section */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <DollarSign className="w-4 h-4 text-yellow-600" />
                                        <span className="text-xs font-semibold text-gray-700 uppercase">Pricing</span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-600 mb-1 block">Cost Price</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={serial.cost_price || item.cost_price}
                                            onChange={(e) => updateSerialNumber(item.id, index, 'cost_price', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 mb-1 block">Selling Price (optional)</label>
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={serial.selling_price || ''}
                                            onChange={(e) => updateSerialNumber(item.id, index, 'selling_price', parseFloat(e.target.value) || 0)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="Leave empty to use variant price"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Notes Section */}
                                    <div>
                                      <label className="text-xs text-gray-600 mb-1 block">Notes (optional)</label>
                                      <textarea
                                        value={serial.notes || ''}
                                        onChange={(e) => updateSerialNumber(item.id, index, 'notes', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                                        rows={2}
                                        placeholder="Any additional notes about this item..."
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {itemData.serialNumbers.length === 0 && (
                        <div className="text-center py-4 text-sm text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          No serial numbers added yet. Click "Add Serial" to begin.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading || getTotalReceivedItems() === 0}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Confirm Receive'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SerialNumberReceiveModal;
