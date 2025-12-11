import React, { useState, useEffect } from 'react';
import { X, Package, MapPin } from 'lucide-react';
import { SparePart } from '../../types/spareParts';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../../lib/supabaseClient';

interface SparePartTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  sparePart: SparePart | null;
  onTransfer: (toLocation: string, quantity: number, notes?: string) => void;
}

const SparePartTransferModal: React.FC<SparePartTransferModalProps> = ({
  isOpen,
  onClose,
  sparePart,
  onTransfer
}) => {
  const [quantity, setQuantity] = useState<number>(1);
  const [toLocation, setToLocation] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  useEffect(() => {
    if (isOpen && sparePart) {
      setQuantity(1);
      setToLocation('');
      setNotes('');
      loadLocations();
    }
  }, [isOpen, sparePart]);

  const loadLocations = async () => {
    setLoadingLocations(true);
    try {
      // Load store locations
      const { data: storeLocations, error: storeError } = await supabase
        .from('store_locations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (storeError) throw storeError;

      // Load storage rooms
      const { data: storageRooms, error: roomError } = await supabase
        .from('storage_rooms')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (roomError) throw roomError;

      // Combine and format locations
      const allLocations = [
        ...(storeLocations || []).map(loc => ({ id: `store-${loc.id}`, name: `Store: ${loc.name}` })),
        ...(storageRooms || []).map(room => ({ id: `room-${room.id}`, name: `Room: ${room.name}` }))
      ];

      setLocations(allLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  if (!isOpen || !sparePart) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantity > sparePart.quantity) {
      toast.error('Cannot transfer more than available quantity');
      return;
    }

    if (!toLocation.trim()) {
      toast.error('Please select a destination location');
      return;
    }

    onTransfer(toLocation, quantity, notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Transfer Spare Part</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-1">Spare Part</p>
            <p className="font-semibold text-gray-900">{sparePart.name}</p>
            <p className="text-sm text-gray-500">Available: {sparePart.quantity} units</p>
            {sparePart.location && (
              <p className="text-sm text-gray-500">Current Location: {sparePart.location}</p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity to Transfer *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity <= 1}
                >
                  <X className="w-5 h-5 rotate-45" />
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  min={1}
                  max={sparePart.quantity}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 text-xl font-bold bg-white text-center"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(sparePart.quantity, quantity + 1))}
                  className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-gray-700 hover:text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity >= sparePart.quantity}
                >
                  <X className="w-5 h-5 -rotate-45" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Remaining after transfer: {sparePart.quantity - quantity} units
              </p>
            </div>

            {/* Destination Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Destination Location *
              </label>
              {loadingLocations ? (
                <div className="px-4 py-3 border-2 border-gray-300 rounded-xl bg-gray-50 text-center text-gray-500">
                  Loading locations...
                </div>
              ) : (
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white"
                  required
                >
                  <option value="">Select destination location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.name}>{loc.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-gray-900 bg-white"
                placeholder="Transfer notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={quantity > sparePart.quantity || !toLocation}
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Transfer
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SparePartTransferModal;

