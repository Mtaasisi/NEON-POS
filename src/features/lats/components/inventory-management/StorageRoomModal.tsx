import React, { useState, useEffect } from 'react';
import { X, Building, MapPin, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { storeLocationApi } from '../../../../features/settings/utils/storeLocationApi';
import { storageRoomApi, StorageRoom as StorageRoomType } from '../../../../features/settings/utils/storageRoomApi';

type StorageRoom = StorageRoomType;

interface StorageRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageRoom?: StorageRoom | null;
  onSave: (storageRoom: any) => void;
}

const StorageRoomModal: React.FC<StorageRoomModalProps> = ({
  isOpen,
  onClose,
  storageRoom,
  onSave
}) => {
  const [storeLocations, setStoreLocations] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    store_location_id: '',
    name: '',
    code: '',
    description: '',
    floor_level: 1,
    area_sqm: '',
    is_secure: false,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      loadStoreLocations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (storageRoom) {
      setFormData({
        store_location_id: storageRoom.store_location_id || '',
        name: storageRoom.name || '',
        code: storageRoom.code || '',
        description: storageRoom.description || '',
        floor_level: storageRoom.floor_level || 1,
        area_sqm: storageRoom.area_sqm ? String(storageRoom.area_sqm) : '',
        is_secure: storageRoom.is_secure || false,
        is_active: storageRoom.is_active !== false
      });
    } else {
      setFormData({
        store_location_id: '',
        name: '',
        code: '',
        description: '',
        floor_level: 1,
        area_sqm: '',
        is_secure: false,
        is_active: true
      });
    }
  }, [storageRoom, isOpen]);

  const loadStoreLocations = async () => {
    try {
      const locations = await storeLocationApi.getAll();
      setStoreLocations(locations);
      if (locations.length > 0 && !formData.store_location_id) {
        setFormData(prev => ({ ...prev, store_location_id: locations[0].id }));
      }
    } catch (err) {
      console.error('Error loading store locations:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.store_location_id || !formData.name.trim() || !formData.code.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      const roomPayload = {
        store_location_id: formData.store_location_id,
        name: formData.name,
        code: formData.code,
        description: formData.description,
        floor_level: formData.floor_level,
        area_sqm: formData.area_sqm ? parseFloat(formData.area_sqm) : null,
        is_active: formData.is_active,
        is_secure: formData.is_secure,
        requires_access_card: formData.is_secure
      };

      if (storageRoom) {
        await storageRoomApi.update({ id: storageRoom.id, ...roomPayload });
        toast.success('Storage room updated successfully');
      } else {
        await storageRoomApi.create(roomPayload);
        toast.success('Storage room created successfully');
      }

      onSave(roomPayload);
      onClose();
    } catch (err: any) {
      console.error('Save error', err);
      if (err?.code === '23505' || err?.message?.includes('duplicate')) {
        toast.error('Room code already exists in this location');
      } else {
        toast.error('Failed to save storage room');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {storageRoom ? 'Edit Storage Room' : 'New Storage Room'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {storageRoom ? 'Update room details' : 'Add shelves after creating the room'}
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

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Room Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                placeholder="e.g., Main Storage Room"
                required
              />
            </div>

            {/* Room Code & Floor Level */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  placeholder="e.g., 01"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Level
                </label>
                <input
                  type="number"
                  min={1}
                  value={formData.floor_level}
                  onChange={(e) => setFormData({ ...formData, floor_level: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                />
              </div>
            </div>

            {/* Store Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Store Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={formData.store_location_id}
                  onChange={(e) => setFormData({ ...formData, store_location_id: e.target.value })}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                  required
                >
                  <option value="">Select location</option>
                  {storeLocations.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Area (sqm)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.area_sqm}
                onChange={(e) => setFormData({ ...formData, area_sqm: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900"
                placeholder="e.g., 50.5"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 transition-colors text-gray-900 resize-none"
                placeholder="Optional description"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Active Room
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <input
                  type="checkbox"
                  id="is_secure"
                  checked={formData.is_secure}
                  onChange={(e) => setFormData({ ...formData, is_secure: e.target.checked })}
                  className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="is_secure" className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                  <Shield size={16} />
                  Secure Room (requires access)
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex-shrink-0 p-6 pt-4 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {storageRoom ? 'Update Room' : 'Create Room'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageRoomModal;
