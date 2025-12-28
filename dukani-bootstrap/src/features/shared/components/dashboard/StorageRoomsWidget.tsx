import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, ExternalLink, MapPin, Package } from 'lucide-react';
import { supabase } from '../../../../lib/supabaseClient';
import { getCurrentBranchId } from '../../../../lib/branchAwareApi';
import Modal from '../../../shared/components/ui/Modal';
import toast from 'react-hot-toast';

interface StorageRoomsWidgetProps {
  className?: string;
}

interface StorageRoomsMetrics {
  totalRooms: number;
  totalItems: number;
  totalCapacity: number;
  usedCapacity: number;
  utilizationRate: number;
}

export const StorageRoomsWidget: React.FC<StorageRoomsWidgetProps> = ({ className }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<StorageRoomsMetrics>({
    totalRooms: 0,
    totalItems: 0,
    totalCapacity: 0,
    usedCapacity: 0,
    utilizationRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);

  useEffect(() => {
    loadStorageRoomsData();
  }, []);

  const loadStorageRoomsData = async () => {
    try {
      setIsLoading(true);
      const currentBranchId = getCurrentBranchId();
      
      // Query storage rooms
      let roomsQuery = supabase
        .from('lats_storage_rooms')
        .select('id, capacity');

      // Note: lats_storage_rooms may not have branch_id column
      // if (currentBranchId) {
      //   roomsQuery = roomsQuery.eq('branch_id', currentBranchId);
      // }

      const { data: rooms, error: roomsError } = await roomsQuery;

      // Get items in storage rooms
      let itemsQuery = supabase
        .from('lats_inventory_items')
        .select('id, storage_room_id, quantity');

      if (currentBranchId) {
        itemsQuery = itemsQuery.eq('branch_id', currentBranchId);
      }

      const { data: items, error: itemsError } = await itemsQuery;

      // Handle missing tables gracefully
      if (roomsError && roomsError.code === '42P01') {
        setMetrics({
          totalRooms: 0,
          totalItems: 0,
          totalCapacity: 0,
          usedCapacity: 0,
          utilizationRate: 0
        });
        setIsLoading(false);
        return;
      }
      if (itemsError && itemsError.code === '42P01') {
        setMetrics({
          totalRooms: rooms?.length || 0,
          totalItems: 0,
          totalCapacity: rooms?.reduce((sum, r) => sum + (r.capacity || 0), 0) || 0,
          usedCapacity: 0,
          utilizationRate: 0
        });
        setIsLoading(false);
        return;
      }
      if (roomsError || itemsError) {
        throw roomsError || itemsError;
      }

      const totalRooms = rooms?.length || 0;
      const totalItems = items?.length || 0;
      const totalCapacity = rooms?.reduce((sum, r) => sum + (r.capacity || 0), 0) || 0;
      const usedCapacity = items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
      const utilizationRate = totalCapacity > 0 ? (usedCapacity / totalCapacity) * 100 : 0;

      setMetrics({
        totalRooms,
        totalItems,
        totalCapacity,
        usedCapacity,
        utilizationRate
      });
    } catch (error) {
      console.error('Error loading storage rooms data:', error);
      setMetrics({
        totalRooms: 0,
        totalItems: 0,
        totalCapacity: 0,
        usedCapacity: 0,
        utilizationRate: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-2xl p-7 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-75"></div>
            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl p-7 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <Building className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Storage Rooms</h3>
            <p className="text-xs text-gray-400 mt-0.5">Storage management</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/storage-rooms')}
          className="px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors flex items-center gap-1.5"
        >
          <ExternalLink size={14} />
          <span>View All</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Rooms</p>
          <p className="text-2xl font-semibold text-gray-900">{metrics.totalRooms}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Total Items</p>
          <p className="text-2xl font-semibold text-blue-600">{metrics.totalItems}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Utilization</p>
          <p className="text-xl font-semibold text-emerald-600">{metrics.utilizationRate.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Capacity</p>
          <p className="text-xl font-semibold text-gray-900">{metrics.totalCapacity.toLocaleString()}</p>
        </div>
      </div>

      {/* Capacity Breakdown */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Used Capacity</span>
          </div>
          <span className="text-sm font-medium text-gray-900">{metrics.usedCapacity.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-purple-50">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-purple-600" />
            <span className="text-xs text-gray-500">Available</span>
          </div>
          <span className="text-sm font-medium text-purple-700">{(metrics.totalCapacity - metrics.usedCapacity).toLocaleString()}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-auto pt-4 border-t">
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCreateModal(true);
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 hover:scale-110 shadow-sm hover:shadow-md transition-all duration-200"
          title="New Room"
        >
          <Plus size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMapModal(true);
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-900 text-sm text-white hover:bg-black hover:scale-105 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <MapPin size={14} />
          <span>View Map</span>
        </button>
      </div>

      {/* Create Room Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Storage Room" maxWidth="md">
        <div className="p-4">
          <p className="text-gray-600">Storage room creation form will be implemented here.</p>
          <button
            onClick={() => {
              toast.success('Feature coming soon');
              setShowCreateModal(false);
            }}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Map Modal */}
      <Modal isOpen={showMapModal} onClose={() => setShowMapModal(false)} title="Storage Room Map" maxWidth="lg">
        <div className="p-4">
          <p className="text-gray-600">Storage room map view will be implemented here.</p>
          <button
            onClick={() => setShowMapModal(false)}
            className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-black"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};

