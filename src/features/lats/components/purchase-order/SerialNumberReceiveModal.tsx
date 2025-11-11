import React, { useState, useEffect } from 'react';
import { PackageCheck, X, AlertCircle, Package, MapPin, Building, LayoutGrid } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { storageRoomApi, StorageRoom } from '../../../settings/utils/storageRoomApi';
import { storeShelfApi, StoreShelf } from '../../../settings/utils/storeShelfApi';

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

  // Storage location state
  const [storageRooms, setStorageRooms] = useState<StorageRoom[]>([]);
  const [allShelves, setAllShelves] = useState<Record<string, StoreShelf[]>>({});
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<{ itemId: string; index: number } | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Load storage rooms on mount
  useEffect(() => {
    loadStorageRooms();
  }, []);

  // Load all shelves for all rooms
  useEffect(() => {
    if (storageRooms.length > 0) {
      loadAllShelves();
    }
  }, [storageRooms]);

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
        // For PARTIAL mode: start with 0, let user choose
        const initialQuantity = mode === 'full' ? remainingQty : 0;
        
        // Auto-generate empty serial number rows for each quantity
        const serialNumbers: SerialNumberData[] = [];
        for (let i = 0; i < initialQuantity; i++) {
          const warrantyStart = new Date().toISOString().split('T')[0];
          const warrantyEndDate = new Date();
          warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 12);
          const warrantyEnd = warrantyEndDate.toISOString().split('T')[0];
          
          serialNumbers.push({
            serial_number: '',
            imei: '',
            mac_address: '',
            barcode: '',
            location: '',
            warranty_start: warrantyStart,
            warranty_end: warrantyEnd,
            warranty_months: 12,
            cost_price: item.costPrice || item.cost_price || item.unitCost || 0,
            selling_price: undefined,
            notes: ''
          });
        }
        
        initialItems.set(item.id, {
          quantity: initialQuantity,
          serialNumbers
        });
      });
      setReceivedItems(initialItems);
    }
  }, [isOpen, purchaseOrder.items, mode, initialReceivedItems]);

  const loadStorageRooms = async () => {
    try {
      const rooms = await storageRoomApi.getAll();
      setStorageRooms(rooms || []);
    } catch (error) {
      console.error('Error loading storage rooms:', error);
      setStorageRooms([]);
    }
  };

  const loadAllShelves = async () => {
    try {
      const shelvesData: Record<string, StoreShelf[]> = {};
      
      for (const room of storageRooms) {
        const roomShelves = await storeShelfApi.getShelvesByStorageRoom(room.id);
        shelvesData[room.id] = roomShelves || [];
      }
      
      setAllShelves(shelvesData);
    } catch (error) {
      console.error('Error loading shelves:', error);
      setAllShelves({});
    }
  };

  const handleLocationSelect = (roomId: string, shelfId: string) => {
    console.log('handleLocationSelect called:', { roomId, shelfId, selectedLocationIndex });
    
    if (!selectedLocationIndex) {
      console.log('No selectedLocationIndex, returning');
      return;
    }

    const room = storageRooms.find(r => r.id === roomId);
    const shelf = allShelves[roomId]?.find(s => s.id === shelfId);
    
    console.log('Found room and shelf:', { room, shelf });
    
    if (room && shelf) {
      const locationText = `${room.code} - ${shelf.code}`;
      console.log('Updating location to:', locationText);
      updateSerialNumber(
        selectedLocationIndex.itemId, 
        selectedLocationIndex.index, 
        'location', 
        locationText
      );
    }
    
    setShowLocationModal(false);
    setSelectedLocationIndex(null);
  };

  const openLocationModal = (itemId: string, index: number) => {
    setSelectedLocationIndex({ itemId, index });
    setSelectedRoomId(storageRooms[0]?.id || '');
    setShowLocationModal(true);
  };

  const getFilteredShelves = () => {
    const shelves = allShelves[selectedRoomId] || [];
    if (!searchTerm) return shelves;
    
    return shelves.filter(shelf => 
      shelf.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shelf.name && shelf.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
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
      // 🔧 SMART DETECTION: If serial_number is being updated, detect if it's an IMEI or serial number
      else if (field === 'serial_number' && typeof value === 'string') {
        // Remove spaces, dashes, and other common separators
        const cleanValue = value.replace(/[\s\-_.]/g, '');
        
        // Detect if it's an IMEI: exactly 15 digits
        const isIMEI = /^\d{15}$/.test(cleanValue);
        
        // Detect if it's primarily numeric (could be other ID format)
        const isNumeric = /^\d+$/.test(cleanValue);
        
        if (isIMEI) {
          // ✅ It's an IMEI: Populate both serial_number and imei fields
          updatedSerialNumbers[index] = {
            ...currentSerial,
            serial_number: value,      // Keep original format (with spaces/dashes)
            imei: cleanValue           // Clean version for IMEI field
          };
        } else {
          // ⚠️ It's a serial number (not IMEI): Only populate serial_number
          updatedSerialNumbers[index] = {
            ...currentSerial,
            serial_number: value,
            imei: ''                   // Clear IMEI field if it was set before
          };
        }
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
        const warrantyStart = new Date().toISOString().split('T')[0];
        const warrantyEndDate = new Date();
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + 12);
        const warrantyEnd = warrantyEndDate.toISOString().split('T')[0];
        
        // Keep existing serial data if available, otherwise create new
        const existingSerial = current.serialNumbers[i];
        serialNumbers.push(existingSerial || {
          serial_number: '',
          imei: '',
          mac_address: '',
          barcode: '',
          location: '',
          warranty_start: warrantyStart,
          warranty_end: warrantyEnd,
          warranty_months: 12,
          cost_price: item.cost_price,
          selling_price: undefined,
          notes: ''
        });
      }
      
      newMap.set(itemId, {
        quantity: validQuantity,
        serialNumbers
      });
      return newMap;
    });
  };

  const handleConfirm = async () => {
    try {
      // Validate all serial numbers are filled
      let hasErrors = false;
      receivedItems.forEach((data, itemId) => {
        data.serialNumbers.forEach((serial, index) => {
          if (!serial.serial_number.trim()) {
            hasErrors = true;
          }
        });
      });

      if (hasErrors) {
        toast.error('Please fill in Serial Number or IMEI for all items');
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

        {/* Icon Header */}
        <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {mode === 'full' ? 'Add Serial Numbers' : 'Select Items & Add Serial Numbers'}
          </h3>
          
          {/* Summary Info */}
          <div className="flex items-center justify-center gap-3 text-sm mt-4">
            <div className="px-4 py-2 bg-white rounded-lg shadow-sm">
              <span className="text-gray-600">Total:</span>
              <span className="text-gray-900 font-bold ml-1">
                {getTotalReceivedItems()} items
              </span>
            </div>
            <div className="px-4 py-2 bg-white rounded-lg shadow-sm">
              <span className="text-gray-900 font-medium">
                {purchaseOrder.items.length} {purchaseOrder.items.length === 1 ? 'product' : 'products'}
              </span>
            </div>
            <div className="px-4 py-2 bg-green-100 rounded-lg shadow-sm border border-green-300">
              <span className="text-green-700 font-medium">Cost: </span>
              <span className="text-green-900 font-bold">
                {formatCurrency(getTotalCost())}
              </span>
            </div>
          </div>
        </div>

        {/* Table Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
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
              
              return (
                <div key={item.id} className={`rounded-xl p-5 border ${
                  itemData.quantity > 0 ? 'bg-white border-gray-300 shadow-sm' : 'bg-gray-50 border-gray-200'
                }`}>
                  {/* Product Header */}
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900">{productName}</h4>
                        <p className="text-sm text-gray-500 mt-1">
                          Cost: <span className="font-semibold text-gray-900">{formatCurrency(Number(item.costPrice || item.cost_price || item.unitCost || 0))}</span>
                        </p>
                      </div>
                      {mode === 'partial' && (
                        <div className="ml-4">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Receiving:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={remainingQty}
                            value={itemData.quantity}
                            onChange={(e) => updateReceivingQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-center font-bold text-lg"
                          />
                        </div>
                      )}
                      {mode === 'full' && (
                        <div className="ml-4 px-4 py-2 bg-blue-50 rounded-lg">
                          <p className="text-xs text-gray-600">Receiving:</p>
                          <p className="text-lg font-bold text-blue-700">{itemData.quantity} pcs</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Table - Only show if items selected */}
                  {itemData.quantity > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 w-12">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[200px]">
                            Product Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 min-w-[250px]">
                            Serial Number / IMEI *
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
                            
                            {/* Serial Number / IMEI */}
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                placeholder="Enter Serial Number or IMEI (auto-detects)"
                                value={serial.serial_number}
                                onChange={(e) => updateSerialNumber(item.id, index, 'serial_number', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  !serial.serial_number.trim() 
                                    ? 'border-red-300 bg-red-50' 
                                    : 'border-gray-300 bg-white'
                                }`}
                                title="Enter either Serial Number or IMEI - system auto-detects IMEI (15 digits)"
                              />
                              {/* Show detection indicator */}
                              {serial.serial_number && (
                                <div className="text-xs mt-1">
                                  {serial.imei ? (
                                    <span className="text-green-600 font-medium">✓ IMEI detected</span>
                                  ) : (
                                    <span className="text-blue-600">Serial Number</span>
                                  )}
                                </div>
                              )}
                            </td>
                            
                            {/* Location */}
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
                  ) : mode === 'partial' ? (
                    <div className="p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-center">
                      <Package className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">Set quantity above to add serial numbers</p>
                    </div>
                  ) : null}

                  {/* Table Footer Info */}
                  {itemData.quantity > 0 && (
                    <div className="mt-3 text-xs text-gray-500">
                      * Serial Number / IMEI is required
                    </div>
                  )}
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

      {/* Storage Location Modal */}
      {showLocationModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4"
          onClick={() => {
            setShowLocationModal(false);
            setSelectedLocationIndex(null);
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Select Storage Location</h3>
              </div>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setSelectedLocationIndex(null);
                }}
                className="p-2 hover:bg-white/50 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Storage Room Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex overflow-x-auto px-4 py-2 gap-2">
                {storageRooms.map((room) => (
                  <button
                    key={room.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRoomId(room.id);
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded font-medium text-sm transition-colors cursor-pointer ${
                      selectedRoomId === room.id
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span>{room.name}</span>
                      <span className="text-xs opacity-75">({room.code})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search shelves by code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
            </div>

            {/* Shelves Grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {getFilteredShelves().length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3" style={{ pointerEvents: 'auto' }}>
                  {getFilteredShelves().map((shelf) => {
                    if (!shelf || !shelf.code) return null;
                    
                    const currentRoom = storageRooms.find(r => r.id === selectedRoomId);
                    const roomCode = currentRoom?.code || '';
                    const completeCellNumber = shelf.code.startsWith(roomCode) 
                      ? shelf.code 
                      : `${roomCode}${shelf.code}`;
                    
                    const foundLetter = shelf.code.toUpperCase().match(/[A-Z]/)?.[0];
                    
                    const getLetterColor = (letter: string) => {
                      const colors: { [key: string]: string } = {
                        'A': 'bg-blue-500',
                        'B': 'bg-green-500',
                        'C': 'bg-purple-500',
                        'D': 'bg-orange-500',
                        'E': 'bg-red-500',
                        'F': 'bg-teal-500',
                        'G': 'bg-pink-500',
                        'H': 'bg-indigo-500'
                      };
                      return colors[letter] || 'bg-gray-500';
                    };
                    
                    const bgColor = foundLetter ? getLetterColor(foundLetter) : 'bg-gray-500';
                    
                    return (
                      <button
                        key={shelf.id}
                        type="button"
                        onClick={(e) => {
                          console.log('Shelf button clicked:', shelf.code);
                          e.preventDefault();
                          e.stopPropagation();
                          handleLocationSelect(selectedRoomId, shelf.id);
                        }}
                        onMouseDown={(e) => {
                          console.log('Shelf button mouse down:', shelf.code);
                          e.stopPropagation();
                        }}
                        className={`py-3 px-2 rounded-lg border-2 font-bold text-center text-white text-sm ${bgColor} border-transparent hover:border-white hover:shadow-lg transition-all cursor-pointer`}
                        style={{ pointerEvents: 'auto', zIndex: 1 }}
                      >
                        {completeCellNumber}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <LayoutGrid size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shelves Found</h3>
                  <p className="text-sm text-gray-600">
                    {searchTerm 
                      ? 'Try adjusting your search.'
                      : 'No shelves available in this room.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {getFilteredShelves().length} shelf{getFilteredShelves().length !== 1 ? 'ves' : ''} available
              </div>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setSelectedLocationIndex(null);
                }}
                className="px-4 py-2 text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default SerialNumberReceiveModal;
