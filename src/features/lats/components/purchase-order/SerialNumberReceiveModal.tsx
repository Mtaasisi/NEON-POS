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
  mode?: 'full' | 'partial'; // Receive mode from previous step
}

const SerialNumberReceiveModal: React.FC<SerialNumberReceiveModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirm,
  isLoading = false,
  mode = 'partial'
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
            cost_price: item.cost_price,
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
  }, [isOpen, purchaseOrder.items, mode]);

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
    if (!selectedLocationIndex) return;

    const room = storageRooms.find(r => r.id === roomId);
    const shelf = allShelves[roomId]?.find(s => s.id === shelfId);
    
    if (room && shelf) {
      const locationText = `${room.code} - ${shelf.code}`;
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
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <PackageCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {mode === 'full' ? 'Full Receive - Add Serial Numbers' : 'Partial Receive - Select Items & Add Serial Numbers'}
                </h3>
                <p className="text-xs text-gray-500">
                  {mode === 'full' 
                    ? 'Enter Serial Number or IMEI for all remaining items' 
                    : 'Choose quantities and enter serial numbers for items you want to receive now'}
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
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <span className="text-blue-900 font-medium">
                Total Items: {getTotalReceivedItems()}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg">
              <Package className="w-4 h-4 text-green-600" />
              <span className="text-green-900 font-medium">
                Products: {purchaseOrder.items.length}
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
              const productName = item.name || 
                                 (item.product?.name || '') + 
                                 (item.variant?.name ? ` - ${item.variant.name}` : '');
              
              return (
                <div key={item.id} className={`rounded-lg p-4 border-2 ${
                  itemData.quantity > 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                }`}>
                  {/* Product Header */}
                  <div className="mb-4 pb-3 border-b-2 border-gray-300">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-gray-900">{productName}</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {mode === 'partial' && (
                            <>
                              <span className="text-blue-700">Ordered: {item.quantity}</span> • 
                              <span className="text-green-700">Already Received: {item.receivedQuantity || 0}</span> • 
                              <span className="text-orange-700">Remaining: {remainingQty}</span> • 
                            </>
                          )}
                          Cost: <span className="font-semibold text-gray-900">${(item.cost_price || 0).toFixed(2)}</span>
                        </p>
                      </div>
                      {mode === 'partial' && (
                        <div className="ml-4">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Receiving Now:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={remainingQty}
                            value={itemData.quantity}
                            onChange={(e) => updateReceivingQuantity(item.id, parseInt(e.target.value) || 0)}
                            className="w-24 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-center font-bold text-lg"
                          />
                          <p className="text-xs text-gray-500 mt-1">Max: {remainingQty}</p>
                        </div>
                      )}
                      {mode === 'full' && (
                        <div className="ml-4 px-4 py-2 bg-green-100 rounded-lg">
                          <p className="text-xs text-gray-600">Receiving:</p>
                          <p className="text-lg font-bold text-green-700">{itemData.quantity} pcs</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Excel-like Table - Only show if items selected for partial mode */}
                  {itemData.quantity > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-green-600 text-white">
                          <th className="border-2 border-green-700 px-3 py-2 text-center text-sm font-semibold w-12">#</th>
                          <th className="border-2 border-green-700 px-3 py-2 text-left text-sm font-semibold min-w-[200px]">
                            Product Name
                          </th>
                          <th className="border-2 border-green-700 px-3 py-2 text-left text-sm font-semibold min-w-[250px]">
                            Serial Number / IMEI *
                          </th>
                          <th className="border-2 border-green-700 px-3 py-2 text-left text-sm font-semibold min-w-[180px]">
                            Location
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itemData.serialNumbers.map((serial, index) => (
                          <tr 
                            key={index} 
                            className={index % 2 === 0 ? 'bg-white' : 'bg-gray-100'}
                          >
                            {/* Row Number */}
                            <td className="border-2 border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">
                              {index + 1}
                            </td>
                            
                            {/* Product Name */}
                            <td className="border-2 border-gray-300 px-3 py-2 font-medium text-gray-900">
                              {productName}
                            </td>
                            
                            {/* Serial Number / IMEI */}
                            <td className="border-2 border-gray-300 p-1">
                              <input
                                type="text"
                                placeholder="Enter Serial Number or IMEI"
                                value={serial.serial_number}
                                onChange={(e) => updateSerialNumber(item.id, index, 'serial_number', e.target.value)}
                                className={`w-full px-3 py-2 border-2 rounded focus:outline-none focus:ring-2 focus:ring-green-500 ${
                                  !serial.serial_number.trim() 
                                    ? 'border-red-300 bg-red-50' 
                                    : 'border-transparent bg-white'
                                }`}
                              />
                            </td>
                            
                            {/* Location */}
                            <td className="border-2 border-gray-300 p-1">
                              <button
                                type="button"
                                onClick={() => openLocationModal(item.id, index)}
                                className="w-full px-3 py-2 border-2 border-transparent rounded hover:border-green-500 bg-white text-left flex items-center gap-2 transition-colors"
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
                    <div className="mt-4 p-6 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 text-center">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 font-medium">Set quantity above to add serial numbers</p>
                      <p className="text-xs text-gray-500 mt-1">Enter how many items you want to receive</p>
                    </div>
                  ) : null}

                  {/* Table Footer Info */}
                  {itemData.quantity > 0 && (
                    <div className="mt-3 text-xs text-gray-500 italic">
                      * Serial Number / IMEI is required (enter either one)
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
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
              className="flex-1 px-4 py-3 border-2 border-blue-500 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              Skip Serial Numbers →
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading || getTotalReceivedItems() === 0}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : `Continue with Serials (${getTotalReceivedItems()} items)`}
            </button>
          </div>
          <p className="text-xs text-center text-gray-500 mt-3">
            Serial numbers are optional - you can skip this step or add them for tracking
          </p>
        </div>
      </div>

      {/* Storage Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
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
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded font-medium text-sm transition-colors ${
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
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
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
                        onClick={() => handleLocationSelect(selectedRoomId, shelf.id)}
                        className={`py-3 px-2 rounded-lg border-2 font-bold text-center text-white text-sm ${bgColor} border-transparent hover:border-white hover:shadow-lg transition-all`}
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
      </div>
    </>
  );
};

export default SerialNumberReceiveModal;
