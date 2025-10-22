import React, { useState, useEffect, useRef } from 'react';
import { X, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';

interface InventoryItem {
  id: string;
  product_id: string;
  variant_id?: string;
  serial_number: string;
  imei?: string;
  mac_address?: string;
  status: 'available' | 'reserved' | 'sold' | 'damaged' | 'returned' | 'repair' | 'warranty';
  selling_price?: number;
}

interface SerialNumberSelectorProps {
  productId: string;
  productName: string;
  variantId?: string;
  quantity: number;
  isOpen: boolean;
  onClose: () => void;
  onItemsSelected: (selectedItems: InventoryItem[]) => void;
  branchId?: string;
  excludeItemIds?: string[]; // IDs of items already selected in cart
}

const SerialNumberSelector: React.FC<SerialNumberSelectorProps> = ({
  productId,
  productName,
  variantId,
  quantity,
  isOpen,
  onClose,
  onItemsSelected,
  branchId,
  excludeItemIds = []
}) => {
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && productId) {
      loadAvailableItems();
      setSelectedItems([]);
      setSearchTerm('');
      // Auto-focus search after modal renders
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, productId, variantId, branchId]);

  // Keyboard shortcuts for faster interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
      }
      
      // Enter to confirm (only if correct number selected)
      if (e.key === 'Enter' && selectedItems.length === quantity) {
        handleConfirmSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedItems, quantity]);

  const loadAvailableItems = async () => {
    try {
      setLoading(true);
      // Optimized query - only load essential fields and limit to reasonable number
      let query = supabase
        .from('inventory_items')
        .select('id, product_id, variant_id, serial_number, imei, mac_address, status, selling_price')
        .eq('product_id', productId)
        .eq('status', 'available')
        .limit(100); // Limit for performance

      // Note: branch_id and is_shared columns don't exist in inventory_items table
      // Branch filtering is managed at a different level
      // if (branchId) {
      //   query = query.or(`branch_id.eq.${branchId},is_shared.eq.true`);
      // }

      if (variantId) {
        query = query.eq('variant_id', variantId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading available items:', error);
        toast.error('Failed to load items');
        onClose();
        return;
      }

      // Check if items have tracking info (serial, IMEI, or MAC)
      const itemsWithTracking = (data || []).filter(item => 
        item.serial_number || item.imei || item.mac_address
      );

      // Filter out items that are already selected in the cart
      const availableForSelection = itemsWithTracking.filter(item => 
        !excludeItemIds.includes(item.id)
      );

      if (availableForSelection.length === 0) {
        // No more items available - close modal silently
        console.log('No more serialized items available for this product');
        onClose();
        return;
      }

      setAvailableItems(availableForSelection);
    } catch (error) {
      console.error('Error loading available items:', error);
      toast.error('Failed to load items');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (item: InventoryItem) => {
    if (selectedItems.length >= quantity) {
      return;
    }

    if (selectedItems.find(selected => selected.id === item.id)) {
      return;
    }

    const newSelectedItems = [...selectedItems, item];
    setSelectedItems(newSelectedItems);

    // Auto-confirm when required quantity is reached
    if (newSelectedItems.length === quantity) {
      setTimeout(() => {
        onItemsSelected(newSelectedItems);
        onClose();
      }, 200); // Quick confirmation
    }
  };

  const handleItemDeselect = (itemId: string) => {
    setSelectedItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleConfirmSelection = () => {
    if (selectedItems.length !== quantity) {
      toast.error(`Please select exactly ${quantity} item(s)`);
      return;
    }

    onItemsSelected(selectedItems);
    onClose();
  };

  const filteredItems = availableItems.filter(item => {
    const matchesSearch = item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.imei?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.mac_address?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const isNotSelected = !selectedItems.find(selected => selected.id === item.id);
    
    return matchesSearch && isNotSelected;
  });

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
      
      {/* Modal Container - Compact & Fast */}
      <div 
        className="fixed flex items-center justify-center p-3"
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
          className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        <div className="p-3 flex-1 flex flex-col min-h-0">
          {/* Compact Header */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{productName}</h3>
              <p className="text-xs text-gray-500">{selectedItems.length}/{quantity} selected</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Compact Selection Summary */}
          {selectedItems.length > 0 && (
            <div className="bg-green-50 rounded p-2 mb-2 flex flex-wrap gap-1">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex items-center gap-1 bg-white rounded px-2 py-1 text-xs border border-green-300">
                  <span className="font-medium text-gray-900">{item.serial_number}</span>
                  <button
                    onClick={() => handleItemDeselect(item.id)}
                    className="text-gray-400 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Compact Search */}
          <div className="mb-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search serial, IMEI, MAC..."
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Compact Items List */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-1 mb-2">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto"></div>
                <p className="text-xs text-gray-500 mt-2">Loading...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-600">
                  {availableItems.length === 0 ? 'No items available' : 'No matches'}
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isDisabled = selectedItems.length >= quantity;
                return (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && handleItemSelect(item)}
                    disabled={isDisabled}
                    className={`w-full flex items-center justify-between p-2 border rounded text-left text-sm ${
                      isDisabled
                        ? 'border-gray-200 opacity-40 cursor-not-allowed bg-gray-50'
                        : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{item.serial_number}</div>
                      {item.imei && <div className="text-xs text-gray-500 truncate">IMEI: {item.imei}</div>}
                      {item.mac_address && <div className="text-xs text-gray-500 truncate">MAC: {item.mac_address}</div>}
                    </div>
                    {!isDisabled && (
                      <div className="ml-2 text-blue-600 text-xs font-medium shrink-0">
                        Select
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Compact Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSelection}
              disabled={selectedItems.length !== quantity}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
                selectedItems.length !== quantity
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Confirm ({selectedItems.length}/{quantity})
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default SerialNumberSelector;
