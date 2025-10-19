import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Building, 
  MapPin, 
  Package, 
  Shield, 
  Edit, 
  Trash2,
  RefreshCw,
  X,
  LayoutGrid,
  Warehouse,
  Check
} from 'lucide-react';
import { storageRoomApi, StorageRoom } from '../../../features/settings/utils/storageRoomApi';
import { storeLocationApi } from '../../../features/settings/utils/storeLocationApi';
import { storeShelfApi, StoreShelf, CreateStoreShelfData } from '../../../features/settings/utils/storeShelfApi';
import StorageRoomModal from '../components/inventory-management/StorageRoomModal';
import ShelfModal from '../components/inventory-management/ShelfModal';
import { BackButton } from '../../shared/components/ui/BackButton';

interface StoreLocation {
  id: string;
  name: string;
  city: string;
}

const StorageRoomManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [storageRooms, setStorageRooms] = useState<StorageRoom[]>([]);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<StorageRoom[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<StorageRoom | null>(null);
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<StoreShelf | null>(null);
  const [selectedRoomForShelves, setSelectedRoomForShelves] = useState<StorageRoom | null>(null);
  const [roomShelves, setRoomShelves] = useState<StoreShelf[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);
  const [showShelfDetails, setShowShelfDetails] = useState(false);
  const [shelfSearchQuery, setShelfSearchQuery] = useState('');
  const [preSelectedRow, setPreSelectedRow] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    secure: 0,
    totalShelves: 0,
    activeShelves: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [storageRooms, searchQuery, selectedLocation]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roomsData, locationsData, statsData] = await Promise.all([
        storageRoomApi.getAll(),
        storeLocationApi.getAll(),
        storageRoomApi.getStats()
      ]);
      
      setStorageRooms(roomsData);
      setStoreLocations(locationsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load storage room data');
    } finally {
      setLoading(false);
    }
  };

  const filterRooms = () => {
    let filtered = storageRooms;

    if (searchQuery) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedLocation !== 'all') {
      filtered = filtered.filter(room => room.store_location_id === selectedLocation);
    }

    setFilteredRooms(filtered);
  };

  const handleCreateRoom = () => {
    setEditingRoom(null);
    setIsModalOpen(true);
  };

  const handleEditRoom = (room: StorageRoom) => {
    setEditingRoom(room);
    setIsModalOpen(true);
  };

  const handleDeleteRoom = async (room: StorageRoom) => {
    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) {
      return;
    }

    try {
      await storageRoomApi.delete(room.id);
      toast.success('Storage room deleted successfully');
      loadData();
    } catch (error) {
      console.error('Error deleting storage room:', error);
      toast.error('Failed to delete storage room');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  const handleModalSave = async () => {
    await loadData();
    handleModalClose();
  };

  const handleManageShelves = async (room: StorageRoom) => {
    setSelectedRoomForShelves(room);
    setShowShelfDetails(true);
    await loadRoomShelves(room.id);
  };

  const loadRoomShelves = async (roomId: string) => {
    try {
      setLoadingShelves(true);
      console.log('📦 Loading shelves for room:', roomId);
      const shelves = await storeShelfApi.getShelvesByStorageRoom(roomId);
      console.log('✅ Loaded shelves:', shelves.length, 'shelves', shelves);
      setRoomShelves(shelves);
    } catch (error) {
      console.error('❌ Error loading room shelves:', error);
      toast.error('Failed to load shelves');
    } finally {
      setLoadingShelves(false);
    }
  };

  const handleQuickAddShelf = async (rowLetter: string) => {
    if (!selectedRoomForShelves) return;
    
    // Find the highest column number in this row
    const rowShelves = roomShelves.filter(s => {
      const match = s.code.match(/([A-Z])(\d+)$/);
      return match && match[1] === rowLetter;
    });
    
    const maxCol = rowShelves.length > 0 
      ? Math.max(...rowShelves.map(s => {
          const match = s.code.match(/([A-Z])(\d+)$/);
          return match ? parseInt(match[2]) : 0;
        }))
      : 0;
    
    const nextCol = maxCol + 1;
    const rowNum = rowLetter.charCodeAt(0) - 64; // A=1, B=2, etc.
    const shelfCode = `${selectedRoomForShelves.code}${rowLetter}${nextCol}`;
    
    const shelfData: CreateStoreShelfData = {
      store_location_id: selectedRoomForShelves.store_location_id,
      storage_room_id: selectedRoomForShelves.id,
      name: shelfCode,
      code: shelfCode,
      shelf_type: 'standard',
      row_number: rowNum,
      column_number: nextCol,
      floor_level: selectedRoomForShelves?.floor_level || 1,
      zone: 'center',
      is_active: true,
      is_accessible: true,
      requires_ladder: false,
      is_refrigerated: false,
      priority_order: 0
    };
    
    try {
      await storeShelfApi.create(shelfData);
      toast.success(`✅ Created shelf ${shelfCode}`);
      await loadRoomShelves(selectedRoomForShelves.id);
    } catch (error) {
      console.error('Error creating shelf:', error);
      toast.error('Failed to create shelf');
    }
  };

  const handleCreateShelf = (rowLetter?: string) => {
    setEditingShelf(null);
    setPreSelectedRow(rowLetter);
    setIsShelfModalOpen(true);
  };

  const handleEditShelf = (shelf: StoreShelf) => {
    setEditingShelf(shelf);
    setIsShelfModalOpen(true);
  };

  const handleDeleteShelf = async (shelf: StoreShelf) => {
    if (!confirm(`Are you sure you want to delete shelf "${shelf.code}"?`)) {
      return;
    }

    try {
      await storeShelfApi.delete(shelf.id);
      toast.success('Shelf deleted successfully');
      if (selectedRoomForShelves) {
        await loadRoomShelves(selectedRoomForShelves.id);
      }
    } catch (error) {
      console.error('Error deleting shelf:', error);
      toast.error('Failed to delete shelf');
    }
  };

  const handleShelfModalClose = () => {
    setIsShelfModalOpen(false);
    setEditingShelf(null);
    setPreSelectedRow(undefined);
  };

  const handleShelfModalSave = async (shelfData: CreateStoreShelfData) => {
    try {
      if (editingShelf) {
        await storeShelfApi.update(editingShelf.id, shelfData);
        toast.success('Shelf updated successfully');
      } else {
        const created = await storeShelfApi.create(shelfData);
        console.log('✅ Shelf created:', created);
        toast.success('Shelf created successfully');
      }
      
      // Refresh the shelf list
      if (selectedRoomForShelves) {
        console.log('🔄 Refreshing shelf list for room:', selectedRoomForShelves.id);
        await loadRoomShelves(selectedRoomForShelves.id);
      }
      
      // Close modal only after everything is done
      handleShelfModalClose();
    } catch (error: any) {
      console.error('❌ Error saving shelf:', error);
      toast.error(error?.message || 'Failed to save shelf');
      throw error; // Re-throw to prevent modal from closing
    }
  };

  const getLocationName = (locationId: string) => {
    const location = storeLocations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown';
  };

  const filteredShelves = roomShelves.filter(shelf =>
    !shelfSearchQuery || 
      shelf.code.toLowerCase().includes(shelfSearchQuery.toLowerCase()) ||
      (shelf.name && shelf.name.toLowerCase().includes(shelfSearchQuery.toLowerCase()))
    );

  // Group shelves by row - extract row letter from full code (e.g., "01A1" → "A")
  const groupedShelves = filteredShelves.reduce((groups, shelf) => {
    // Try to extract row letter from code
    // Formats: "A1", "B2", "01A1", "Shop01A1"
    // Match the last letter before digits
    const rowMatch = shelf.code.match(/([A-Z])(\d+)$/);
    const row = rowMatch ? rowMatch[1] : 'Other';
    if (!groups[row]) groups[row] = [];
    groups[row].push(shelf);
    return groups;
  }, {} as Record<string, StoreShelf[]>);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 font-medium">Loading storage rooms...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <BackButton to="/dashboard" />
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Storage Rooms</h1>
            <p className="text-gray-600 mt-1">Manage storage rooms and shelves</p>
        </div>
        </div>

        <button
            onClick={handleCreateRoom}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
        >
          <Plus size={18} />
          New Room
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-lg p-5 hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-3">
            <Building className="w-7 h-7 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
            </div>
        
        <div className="bg-green-50 rounded-lg p-5 hover:bg-green-100 transition-colors">
          <div className="flex items-center gap-3">
            <Check className="w-7 h-7 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Active</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
            </div>
        
        <div className="bg-purple-50 rounded-lg p-5 hover:bg-purple-100 transition-colors">
          <div className="flex items-center gap-3">
            <LayoutGrid className="w-7 h-7 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Total Shelves</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalShelves}</p>
            </div>
          </div>
            </div>
        
        <div className="bg-red-50 rounded-lg p-5 hover:bg-red-100 transition-colors">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-red-600 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-600 mb-1">Secure</p>
              <p className="text-2xl font-bold text-gray-900">{stats.secure}</p>
            </div>
          </div>
            </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 w-full md:w-auto min-w-[300px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search storage rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Locations</option>
              {storeLocations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
        </div>

      {/* Storage Rooms List */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
        {filteredRooms.length === 0 ? (
          <div className="text-center py-12">
            <Warehouse className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No storage rooms found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || selectedLocation !== 'all' 
              ? 'Try adjusting your search or filters'
                : 'Create your first storage room to get started'}
            </p>
            {!searchQuery && selectedLocation === 'all' && (
              <button
                onClick={handleCreateRoom}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors mx-auto"
              >
                <Plus size={18} />
                Add Storage Room
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
          {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="border-2 rounded-lg p-4 hover:border-gray-300 transition-colors bg-white border-gray-200"
              >
                <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 font-mono">
                        {room.code}
                      </span>
                    {room.is_secure && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                          <Shield size={12} />
                          Secure
                        </span>
                    )}
                    {!room.is_active && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Inactive</span>
                    )}
                  </div>
                    
                    {room.description && (
                      <p className="text-sm text-gray-600 mb-3">{room.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{getLocationName(room.store_location_id)}</span>
                </div>
                      <div className="flex items-center gap-1">
                        <Package size={14} />
                        <span>Floor {room.floor_level}</span>
                      </div>
                      {room.area_sqm && (
                        <span>{room.area_sqm} sqm</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                  <button
                    onClick={() => handleManageShelves(room)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    title="Manage Shelves"
                  >
                      <LayoutGrid size={13} />
                      Shelves
                  </button>
                  <button
                    onClick={() => handleEditRoom(room)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-gray-600 text-white hover:bg-gray-700 transition-colors"
                      title="Edit"
                  >
                      <Edit size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      title="Delete"
                  >
                      <Trash2 size={13} />
                  </button>
                </div>
              </div>
                </div>
          ))}
        </div>
      )}
      </div>

      {/* Shelf Details Modal - Clean Popup */}
      {showShelfDetails && selectedRoomForShelves && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Building className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedRoomForShelves.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-600 mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getLocationName(selectedRoomForShelves.store_location_id)}
                      </span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{selectedRoomForShelves.code}</span>
                      <span className="flex items-center gap-1">
                        <LayoutGrid className="w-3 h-3" />
                      {roomShelves.length} shelves
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button
                  onClick={handleCreateShelf}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm"
                    >
                  <Plus size={16} />
                  Add Shelves
                    </button>
                    <button
                  onClick={() => {
                    setShowShelfDetails(false);
                    setShelfSearchQuery('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                    </button>
                  </div>
                  </div>
                  
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                      {/* Search */}
              {roomShelves.length > 0 && (
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                      placeholder="Search shelves by code or name..."
                          value={shelfSearchQuery}
                          onChange={(e) => setShelfSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    {shelfSearchQuery && (
                        <button
                        onClick={() => setShelfSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                        </button>
                    )}
                    </div>
                  </div>
                )}
                
                {loadingShelves ? (
                  <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600 font-medium">Loading shelves...</span>
                  </div>
              ) : filteredShelves.length === 0 ? (
                  <div className="text-center py-12">
                  <LayoutGrid className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No shelves found</h3>
                  <p className="text-gray-500 mb-6">
                    {shelfSearchQuery 
                      ? 'Try a different search term'
                      : 'This storage room doesn\'t have any shelves yet'}
                  </p>
                  {!shelfSearchQuery && (
                    <button
                      onClick={handleCreateShelf}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors mx-auto"
                    >
                      <Plus size={18} />
                      Create Shelf Grid
                    </button>
                                )}
                              </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedShelves)
                    .sort(([rowA], [rowB]) => {
                      // Sort: "Other" goes last, otherwise alphabetical
                      if (rowA === 'Other') return 1;
                      if (rowB === 'Other') return -1;
                      return rowA.localeCompare(rowB);
                    })
                    .map(([row, shelves]) => (
                    <div key={row}>
                      {/* Simple Row Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                          {row}
                        </div>
                        <h4 className="font-semibold text-gray-900">Row {row}</h4>
                        <span className="text-sm text-gray-500">• {shelves.length} shelf{shelves.length !== 1 ? 'es' : ''}</span>
                      </div>
                      
                      {/* Simple Shelf Cards */}
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                        {shelves
                          .sort((a, b) => {
                            // Extract column numbers from codes for sorting (e.g., "01A2" → 2)
                            const aMatch = a.code.match(/([A-Z])(\d+)$/);
                            const bMatch = b.code.match(/([A-Z])(\d+)$/);
                            const aCol = aMatch ? parseInt(aMatch[2]) : a.column_number || 0;
                            const bCol = bMatch ? parseInt(bMatch[2]) : b.column_number || 0;
                            return aCol - bCol;
                          })
                          .map((shelf) => {
                            const fullCode = (() => {
                              const roomCode = selectedRoomForShelves?.code || '';
                              if (roomCode && !shelf.code.startsWith(roomCode)) {
                                return `${roomCode}${shelf.code}`;
                              }
                              return shelf.code;
                            })();
                            
                            return (
                              <div
                                key={shelf.id}
                                className="bg-white border-2 border-gray-200 rounded-lg p-3 hover:border-purple-400 hover:shadow-md transition-all group"
                              >
                                <div className="space-y-2">
                                  {/* Shelf Code */}
                                  <div className="flex items-center justify-between">
                                    <div className="font-mono font-bold text-sm text-gray-900">
                                      {fullCode}
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${
                                      shelf.is_active ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                  </div>
                                  
                                  {/* Type Badge - only if not standard */}
                                  {shelf.shelf_type && shelf.shelf_type !== 'standard' && (
                                    <div className={`inline-block px-2 py-0.5 text-[10px] rounded-full font-medium ${
                                      shelf.shelf_type === 'refrigerated' ? 'bg-blue-100 text-blue-700' :
                                      shelf.shelf_type === 'display' ? 'bg-purple-100 text-purple-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {shelf.shelf_type}
                                    </div>
                                  )}
                                  
                                  {/* Actions */}
                                  <div className="flex gap-1 pt-1">
                                    <button
                                      onClick={() => handleEditShelf(shelf)}
                                      className="flex-1 px-2 py-1 rounded text-[10px] font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                                      title="Edit"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteShelf(shelf)}
                                      className="flex-1 px-2 py-1 rounded text-[10px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                      title="Delete"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        
                        {/* Quick Add Shelf Button */}
                        <button
                          onClick={() => handleQuickAddShelf(row)}
                          className="bg-purple-50 border-2 border-dashed border-purple-300 rounded-lg p-3 hover:border-purple-500 hover:bg-purple-100 transition-all flex flex-col items-center justify-center gap-1 min-h-[80px]"
                          title={`Quick add next shelf to Row ${row}`}
                        >
                          <Plus className="w-8 h-8 text-purple-600" />
                          <span className="text-xs font-bold text-purple-700">Quick Add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <StorageRoomModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        storageRoom={editingRoom}
        onSave={handleModalSave}
      />

      <ShelfModal
        isOpen={isShelfModalOpen}
        onClose={handleShelfModalClose}
        shelf={editingShelf}
        storageRoom={selectedRoomForShelves}
        onSave={handleShelfModalSave}
        preSelectedRow={preSelectedRow}
      />
    </div>
  );
};

export default StorageRoomManagementPage;
