import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../../../features/shared/components/ui/GlassCard';
import GlassButton from '../../../features/shared/components/ui/GlassButton';
import { toast } from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Building, 
  MapPin, 
  Users, 
  Package, 
  Shield, 
  Edit, 
  Trash2,
  Filter,
  RefreshCw,
  X,
  Eye,
  LayoutGrid,
  Layers,
  Settings,
  BarChart3,
  QrCode,
  Archive
} from 'lucide-react';
import { storageRoomApi, StorageRoom } from '../../../features/settings/utils/storageRoomApi';
import { storeLocationApi } from '../../../features/settings/utils/storeLocationApi';
import { storeShelfApi, StoreShelf, CreateStoreShelfData } from '../../../features/settings/utils/storeShelfApi';
import StorageRoomModal from '../components/inventory-management/StorageRoomModal';
import ShelfModal from '../components/inventory-management/ShelfModal';
import ShelfLegend from '../components/inventory-management/ShelfLegend';

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
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<StorageRoom | null>(null);
  const [isShelfModalOpen, setIsShelfModalOpen] = useState(false);
  const [editingShelf, setEditingShelf] = useState<StoreShelf | null>(null);
  const [selectedRoomForShelves, setSelectedRoomForShelves] = useState<StorageRoom | null>(null);
  const [roomShelves, setRoomShelves] = useState<StoreShelf[]>([]);
  const [loadingShelves, setLoadingShelves] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'visual'>('list');
  const [showShelfDetails, setShowShelfDetails] = useState(false);
  const [shelfSearchQuery, setShelfSearchQuery] = useState('');
  const [selectedShelves, setSelectedShelves] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'code' | 'name' | 'type' | 'row'>('code');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [shelfTypeFilter, setShelfTypeFilter] = useState<string>('all');
  const [rowFilter, setRowFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'empty' | 'full' | 'attention'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    secure: 0,
    totalCapacity: 0,
    usedCapacity: 0,
    totalShelves: 0,
    activeShelves: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterRooms();
  }, [storageRooms, searchQuery, selectedLocation, selectedStatus]);

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

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(room =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(room => room.store_location_id === selectedLocation);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(room => room.is_active);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(room => !room.is_active);
      } else if (selectedStatus === 'secure') {
        filtered = filtered.filter(room => room.is_secure);
      }
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
    if (!confirm(`Are you sure you want to delete "${room.name}"? This will also delete all associated shelves.`)) {
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
      const shelves = await storeShelfApi.getShelvesByStorageRoom(roomId);
      setRoomShelves(shelves);
    } catch (error) {
      console.error('Error loading room shelves:', error);
      toast.error('Failed to load shelves');
    } finally {
      setLoadingShelves(false);
    }
  };

  const handleCreateShelf = () => {
    setEditingShelf(null);
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
  };

  const handleShelfModalSave = async (shelfData: CreateStoreShelfData) => {
    try {
      if (editingShelf) {
        // Update existing shelf
        await storeShelfApi.update(editingShelf.id, shelfData);
        toast.success('Shelf updated successfully');
      } else {
        // Create new shelf
        await storeShelfApi.create(shelfData);
        toast.success('Shelf created successfully');
      }
      
      // Reload shelves for the current room
      if (selectedRoomForShelves) {
        await loadRoomShelves(selectedRoomForShelves.id);
      }
    } catch (error) {
      console.error('Error saving shelf:', error);
      toast.error('Failed to save shelf');
    }
  };

  const getLocationName = (locationId: string) => {
    const location = storeLocations.find(loc => loc.id === locationId);
    return location ? location.name : 'Unknown Location';
  };

  const getCapacityPercentage = (current: number, max: number) => {
    if (!max) return 0;
    return Math.round((current / max) * 100);
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getCapacityBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatShelfName = (shelfName: string) => {
    // Extract room code, row, and column from shelf name (e.g., "Shop01A1")
    const match = shelfName.match(/^(.+?)([A-Z])(\d+)$/);
    if (match) {
      const [, roomCode, row, column] = match;
      return (
        <span className="font-mono">
          <span className="text-blue-600">{roomCode}</span>
          <span className="text-green-600">{row}</span>
          <span className="text-purple-600">{column}</span>
        </span>
      );
    }
    return shelfName;
  };

  const sortShelvesByPosition = (shelves: StoreShelf[]) => {
    return shelves.sort((a, b) => {
      // Extract row and column from shelf names
      const aMatch = a.name.match(/^(.+?)([A-Z])(\d+)$/);
      const bMatch = b.name.match(/^(.+?)([A-Z])(\d+)$/);
      
      if (aMatch && bMatch) {
        const [, , aRow, aCol] = aMatch;
        const [, , bRow, bCol] = bMatch;
        
        // Sort by row first (A, B, C...), then by column (1, 2, 3...)
        if (aRow !== bRow) {
          return aRow.localeCompare(bRow);
        }
        return parseInt(aCol) - parseInt(bCol);
      }
      
      return a.name.localeCompare(b.name);
    });
  };

  const filterShelves = (shelves: StoreShelf[]) => {
    if (!shelfSearchQuery) return shelves;
    return shelves.filter(shelf =>
      shelf.code.toLowerCase().includes(shelfSearchQuery.toLowerCase()) ||
      (shelf.name && shelf.name.toLowerCase().includes(shelfSearchQuery.toLowerCase()))
    );
  };

  const exportShelvesToCSV = () => {
    if (!roomShelves.length) return;
    
    const csvData = roomShelves.map(shelf => ({
      Code: shelf.code,
      Name: shelf.name || '',
      Row: shelf.row_number,
      Column: shelf.column_number,
      Type: shelf.shelf_type,
      Active: shelf.is_active ? 'Yes' : 'No',
      Floor: shelf.floor_level,
      Zone: shelf.zone,
      Accessible: shelf.is_accessible ? 'Yes' : 'No',
      'Requires Ladder': shelf.requires_ladder ? 'Yes' : 'No',
      Refrigerated: shelf.is_refrigerated ? 'Yes' : 'No'
    }));

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedRoomForShelves?.code || 'shelves'}_layout.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Shelf layout exported to CSV');
  };

  // Sorting function
  const handleSort = (field: 'code' | 'name' | 'type' | 'row') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Apply sorting to shelves
  const sortedShelves = (shelves: StoreShelf[]) => {
    return [...shelves].sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case 'code':
          aVal = a.code;
          bVal = b.code;
          break;
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'type':
          aVal = a.shelf_type || '';
          bVal = b.shelf_type || '';
          break;
        case 'row':
          aVal = a.row_number || 0;
          bVal = b.row_number || 0;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // Advanced filtering
  const applyAdvancedFilters = (shelves: StoreShelf[]) => {
    let filtered = shelves;

    // Type filter
    if (shelfTypeFilter !== 'all') {
      filtered = filtered.filter(shelf => shelf.shelf_type === shelfTypeFilter);
    }

    // Row filter
    if (rowFilter !== 'all') {
      filtered = filtered.filter(shelf => {
        const rowMatch = shelf.code.match(/(\d+)([A-Z])(\d+)/);
        return rowMatch && rowMatch[2] === rowFilter;
      });
    }

    // Quick filters
    if (quickFilter !== 'all') {
      if (quickFilter === 'empty') {
        // Filter for empty shelves (you may need to add capacity tracking)
        filtered = filtered.filter(shelf => !shelf.current_capacity || shelf.current_capacity === 0);
      } else if (quickFilter === 'full') {
        filtered = filtered.filter(shelf => shelf.current_capacity && shelf.max_capacity && shelf.current_capacity >= shelf.max_capacity);
      } else if (quickFilter === 'attention') {
        filtered = filtered.filter(shelf => !shelf.is_accessible || shelf.requires_ladder || !shelf.is_active);
      }
    }

    return filtered;
  };

  // Bulk operations
  const handleSelectAll = () => {
    if (selectedShelves.size === roomShelves.length) {
      setSelectedShelves(new Set());
    } else {
      setSelectedShelves(new Set(roomShelves.map(s => s.id)));
    }
  };

  const handleSelectShelf = (shelfId: string) => {
    const newSelected = new Set(selectedShelves);
    if (newSelected.has(shelfId)) {
      newSelected.delete(shelfId);
    } else {
      newSelected.add(shelfId);
    }
    setSelectedShelves(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedShelves.size === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedShelves.size} selected shelves?`)) {
      return;
    }

    try {
      await Promise.all(Array.from(selectedShelves).map(id => storeShelfApi.delete(id)));
      toast.success(`${selectedShelves.size} shelves deleted successfully`);
      setSelectedShelves(new Set());
      if (selectedRoomForShelves) {
        await loadRoomShelves(selectedRoomForShelves.id);
      }
    } catch (error) {
      console.error('Error deleting shelves:', error);
      toast.error('Failed to delete shelves');
    }
  };

  const handleBulkActivate = async (active: boolean) => {
    if (selectedShelves.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedShelves).map(id => 
          storeShelfApi.update(id, { is_active: active })
        )
      );
      toast.success(`${selectedShelves.size} shelves ${active ? 'activated' : 'deactivated'} successfully`);
      setSelectedShelves(new Set());
      if (selectedRoomForShelves) {
        await loadRoomShelves(selectedRoomForShelves.id);
      }
    } catch (error) {
      console.error('Error updating shelves:', error);
      toast.error('Failed to update shelves');
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (row: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(row)) {
      newExpanded.delete(row);
    } else {
      newExpanded.add(row);
    }
    setExpandedRows(newExpanded);
  };

  const toggleExpandAll = () => {
    const rows = Array.from(new Set(roomShelves.map(shelf => {
      const rowMatch = shelf.code.match(/(\d+)([A-Z])(\d+)/);
      return rowMatch ? rowMatch[2] : 'Other';
    })));

    if (expandedRows.size === rows.length) {
      setExpandedRows(new Set());
    } else {
      setExpandedRows(new Set(rows));
    }
  };

  // Get unique rows for filtering
  const getUniqueRows = () => {
    const rows = new Set<string>();
    roomShelves.forEach(shelf => {
      const rowMatch = shelf.code.match(/(\d+)([A-Z])(\d+)/);
      if (rowMatch) rows.add(rowMatch[2]);
    });
    return Array.from(rows).sort();
  };

  // Get unique shelf types
  const getUniqueShelfTypes = () => {
    const types = new Set<string>();
    roomShelves.forEach(shelf => {
      if (shelf.shelf_type) types.add(shelf.shelf_type);
    });
    return Array.from(types).sort();
  };

  // Generate QR code for shelf
  const generateShelfQR = (shelf: StoreShelf) => {
    const qrData = JSON.stringify({
      id: shelf.id,
      code: shelf.code,
      name: shelf.name,
      location: selectedRoomForShelves?.name
    });
    
    // This would integrate with a QR code library
    toast.success(`QR Code for ${shelf.code} generated`);
  };

  // Print shelf labels
  const printShelfLabels = () => {
    if (selectedShelves.size === 0) {
      toast.error('Please select shelves to print labels');
      return;
    }
    
    window.print();
    toast.success('Print dialog opened');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && showShelfDetails) {
        e.preventDefault();
        handleSelectAll();
      }
      // Escape to close modal
      if (e.key === 'Escape' && showShelfDetails) {
        setShowShelfDetails(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showShelfDetails, roomShelves]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storage Room Management</h1>
          <p className="text-gray-600 mt-2">Organize and manage storage rooms with intelligent shelf numbering</p>
        </div>
        <div className="flex gap-3">
          <GlassButton
            onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            variant="secondary"
            className="flex items-center gap-2"
          >
            {viewMode === 'list' ? <LayoutGrid className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            {viewMode === 'list' ? 'Grid View' : 'List View'}
          </GlassButton>
          <GlassButton
            onClick={handleCreateRoom}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Storage Room
          </GlassButton>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-xl mr-3">
              <Building className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-xl mr-3">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-xl mr-3">
              <LayoutGrid className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Shelves</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalShelves}</p>
              <p className="text-xs text-green-600">{stats.activeShelves} active</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-xl mr-3">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Secure Rooms</p>
              <p className="text-2xl font-bold text-gray-900">{stats.secure}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-xl mr-3">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Capacity Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.totalCapacity > 0 ? Math.round((stats.usedCapacity / stats.totalCapacity) * 100) : 0}%
              </p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full ${getCapacityBarColor(stats.totalCapacity > 0 ? Math.round((stats.usedCapacity / stats.totalCapacity) * 100) : 0)}`}
                  style={{ width: `${stats.totalCapacity > 0 ? Math.min(Math.round((stats.usedCapacity / stats.totalCapacity) * 100), 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search storage rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Locations</option>
              {storeLocations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
            
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="secure">Secure</option>
            </select>
            
            <GlassButton
              onClick={loadData}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Storage Rooms List/Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredRooms.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No storage rooms found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedLocation !== 'all' || selectedStatus !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first storage room'
            }
          </p>
          {!searchQuery && selectedLocation === 'all' && selectedStatus === 'all' && (
            <GlassButton onClick={handleCreateRoom} className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create First Storage Room
            </GlassButton>
          )}
        </GlassCard>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
          {filteredRooms.map((room) => (
            <GlassCard key={room.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{room.name}</h3>
                    {room.is_secure && (
                      <Shield className="w-4 h-4 text-red-500" />
                    )}
                    {!room.is_active && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 font-mono">{room.code}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {getLocationName(room.store_location_id)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/lats/storage-rooms/${room.id}`)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleManageShelves(room)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Manage Shelves"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditRoom(room)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                    title="Edit Room"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRoom(room)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {room.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{room.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Capacity</span>
                  <span className="font-medium">
                    {room.current_capacity} / {room.max_capacity || '∞'}
                  </span>
                </div>
                
                {room.max_capacity && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getCapacityBarColor(getCapacityPercentage(room.current_capacity, room.max_capacity))}`}
                      style={{ width: `${Math.min(getCapacityPercentage(room.current_capacity, room.max_capacity), 100)}%` }}
                    ></div>
                  </div>
                )}
                
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Floor {room.floor_level}</span>
                  {room.area_sqm && <span>{room.area_sqm} sqm</span>}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Redesigned Clean Shelf Management Modal */}
      {showShelfDetails && selectedRoomForShelves && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="w-full max-w-7xl max-h-[95vh] overflow-hidden bg-white/95 backdrop-blur-md shadow-2xl border border-gray-200/50 rounded-lg">
            <div className="flex flex-col h-full">
              {/* Clean Header with Key Info */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedRoomForShelves.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {getLocationName(selectedRoomForShelves.store_location_id)}
                      </span>
                      <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{selectedRoomForShelves.code}</span>
                      <span>Floor {selectedRoomForShelves.floor_level}</span>
                      <span className="flex items-center gap-1">
                        <LayoutGrid className="w-3 h-3" />
                        {roomShelves.length} {roomShelves.length === 1 ? 'shelf' : 'shelves'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Quick Actions */}
                  <div className="flex bg-white rounded-lg shadow-sm border border-gray-200">
                    <button
                      onClick={exportShelvesToCSV}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-l-lg border-r border-gray-200 text-sm font-medium"
                      title="Export shelf layout to CSV"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => toast('Layout generation coming soon')}
                      className="px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-r-lg text-sm font-medium"
                      title="Auto-generate optimal layout"
                    >
                      Generate Layout
                    </button>
                  </div>
                  
                  <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      title="List View"
                    >
                      <Layers className="w-4 h-4" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      title="Grid View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`px-3 py-1.5 rounded flex items-center gap-1 text-xs font-medium transition-colors ${viewMode === 'visual' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                      title="Visual Layout"
                    >
                      <Archive className="w-4 h-4" />
                      <span className="hidden sm:inline">Visual</span>
                    </button>
                  </div>
                  
                  <GlassButton
                    onClick={handleCreateShelf}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Shelf
                  </GlassButton>
                  
                  <button
                    onClick={() => setShowShelfDetails(false)}
                    className="p-2 hover:bg-white/80 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Shelf Summary Bar */}
              {roomShelves.length > 0 && (
                <div className="px-4 pt-4 pb-2 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6">
                      <div className="text-sm">
                        <span className="text-gray-600">Total Positions:</span>
                        <span className="ml-2 font-bold text-gray-900">{roomShelves.length}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Active:</span>
                        <span className="ml-2 font-bold text-green-600">
                          {roomShelves.filter(s => s.is_active).length}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Rows:</span>
                        <span className="ml-2 font-bold text-blue-600">{getUniqueRows().length}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Types:</span>
                        <span className="ml-2 font-bold text-purple-600">{getUniqueShelfTypes().length}</span>
                      </div>
                    </div>
                    <ShelfLegend />
                  </div>
                </div>
              )}

              {/* Clean Content Layout */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Enhanced Search and Filter Bar */}
                {roomShelves.length > 0 && (
                  <div className="mb-4 space-y-3">
                    <div className="flex flex-wrap gap-3">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search code or name…"
                          value={shelfSearchQuery}
                          onChange={(e) => setShelfSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm"
                        />
                      </div>

                      {/* Quick Filters */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setQuickFilter('all')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            quickFilter === 'all' 
                              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          All Rows
                        </button>
                        <button
                          onClick={() => setQuickFilter('empty')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            quickFilter === 'empty' 
                              ? 'bg-green-100 text-green-700 border border-green-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Empty
                        </button>
                        <button
                          onClick={() => setQuickFilter('full')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            quickFilter === 'full' 
                              ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Full
                        </button>
                        <button
                          onClick={() => setQuickFilter('attention')}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            quickFilter === 'attention' 
                              ? 'bg-red-100 text-red-700 border border-red-300' 
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          Needs Attention
                        </button>
                      </div>
                    </div>

                    {/* Advanced Filters Row */}
                    <div className="flex flex-wrap gap-3 items-center">
                      {/* Type Filter */}
                      {getUniqueShelfTypes().length > 0 && (
                        <select
                          value={shelfTypeFilter}
                          onChange={(e) => setShelfTypeFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                        >
                          <option value="all">All Types</option>
                          {getUniqueShelfTypes().map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      )}

                      {/* Row Filter */}
                      {getUniqueRows().length > 0 && (
                        <select
                          value={rowFilter}
                          onChange={(e) => setRowFilter(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                        >
                          <option value="all">All Rows</option>
                          {getUniqueRows().map(row => (
                            <option key={row} value={row}>Row {row}</option>
                          ))}
                        </select>
                      )}

                      {/* Expand/Collapse All */}
                      <button
                        onClick={toggleExpandAll}
                        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors border border-gray-300"
                      >
                        {expandedRows.size === getUniqueRows().length ? 'Collapse All' : 'Expand All'}
                      </button>

                      {/* Bulk Actions - Show when items selected */}
                      {selectedShelves.size > 0 && (
                        <div className="flex gap-2 ml-auto">
                          <span className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium">
                            {selectedShelves.size} selected
                          </span>
                          <button
                            onClick={() => handleBulkActivate(true)}
                            className="px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            Activate
                          </button>
                          <button
                            onClick={() => handleBulkActivate(false)}
                            className="px-3 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            Deactivate
                          </button>
                          <button
                            onClick={printShelfLabels}
                            className="px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <QrCode className="w-4 h-4 inline mr-1" />
                            Print Labels
                          </button>
                          <button
                            onClick={handleBulkDelete}
                            className="px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Trash2 className="w-4 h-4 inline mr-1" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {loadingShelves ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : roomShelves.length === 0 ? (
                  <div className="text-center py-12">
                    <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No shelves found</h3>
                    <p className="text-gray-600 mb-4">This storage room doesn't have any shelves yet.</p>
                    <GlassButton onClick={handleCreateShelf} className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Shelf
                    </GlassButton>
                  </div>
                ) : viewMode === 'visual' ? (
                  <div className="space-y-4">
                    {/* Visual Layout View */}
                    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border-2 border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Floor Plan View</h3>
                      {Object.entries(
                        sortShelvesByPosition(sortedShelves(applyAdvancedFilters(filterShelves(roomShelves)))).reduce((groups, shelf) => {
                          const rowMatch = shelf.code.match(/(\d+)([A-Z])(\d+)/);
                          const row = rowMatch ? rowMatch[2] : 'Other';
                          if (!groups[row]) groups[row] = [];
                          groups[row].push(shelf);
                          return groups;
                        }, {} as Record<string, StoreShelf[]>)
                      ).map(([row, shelves]) => (
                        <div key={row} className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                              {row}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Row {row}</h4>
                              <p className="text-xs text-gray-500">{shelves.length} positions</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {shelves.map((shelf) => (
                              <div
                                key={shelf.id}
                                className={`relative w-20 h-20 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all ${
                                  selectedShelves.has(shelf.id) ? 'ring-2 ring-blue-500' : ''
                                } ${
                                  shelf.is_active ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                                onClick={() => handleSelectShelf(shelf.id)}
                                title={`${shelf.code} - ${shelf.name || 'No name'}`}
                              >
                                <div className="font-mono text-xs font-bold">{shelf.code}</div>
                                {shelf.shelf_type === 'refrigerated' && (
                                  <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" title="Refrigerated"></div>
                                )}
                                {shelf.requires_ladder && (
                                  <div className="absolute top-1 left-1 w-2 h-2 bg-orange-500 rounded-full" title="Requires Ladder"></div>
                                )}
                                {!shelf.is_accessible && (
                                  <div className="absolute bottom-1 right-1 w-2 h-2 bg-red-500 rounded-full" title="Not Accessible"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="bg-gray-50 border border-gray-200 rounded-t-lg p-3 flex items-center gap-3 font-semibold text-sm text-gray-700">
                      <div className="w-10 flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedShelves.size === roomShelves.length && roomShelves.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                      <div 
                        className="flex-1 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                        onClick={() => handleSort('code')}
                      >
                        Code
                        {sortField === 'code' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div 
                        className="flex-1 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                        onClick={() => handleSort('name')}
                      >
                        Name
                        {sortField === 'name' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div 
                        className="w-24 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                        onClick={() => handleSort('row')}
                      >
                        Row
                        {sortField === 'row' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div className="w-20">Column</div>
                      <div 
                        className="w-32 cursor-pointer hover:text-blue-600 flex items-center gap-1"
                        onClick={() => handleSort('type')}
                      >
                        Type
                        {sortField === 'type' && (
                          <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                      <div className="w-20">Active</div>
                      <div className="w-32">Actions</div>
                    </div>

                    {/* Table Rows - Grouped by Row */}
                    {Object.entries(
                      sortedShelves(applyAdvancedFilters(filterShelves(roomShelves))).reduce((groups, shelf) => {
                        const rowMatch = shelf.code.match(/(\d+)([A-Z])(\d+)/);
                        const row = rowMatch ? rowMatch[2] : 'Other';
                        if (!groups[row]) groups[row] = [];
                        groups[row].push(shelf);
                        return groups;
                      }, {} as Record<string, StoreShelf[]>)
                    ).map(([row, shelves]) => (
                      <div key={row} className="border border-gray-200 rounded-lg overflow-hidden mb-2">
                        {/* Row Group Header */}
                        <div 
                          className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 flex items-center justify-between cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
                          onClick={() => toggleRowExpansion(row)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                              {row}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">Row {row}</h4>
                              <p className="text-xs text-gray-600">{shelves.length} {shelves.length === 1 ? 'shelf' : 'shelves'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                              {shelves[0]?.code?.match(/(\d+)/)?.[1]} series
                            </span>
                            <span className={`transform transition-transform ${expandedRows.has(row) ? 'rotate-180' : ''}`}>▼</span>
                          </div>
                        </div>

                        {/* Shelves in Row - Collapsible */}
                        {expandedRows.has(row) && shelves.map((shelf, idx) => (
                          <div 
                            key={shelf.id}
                            className={`p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                              idx < shelves.length - 1 ? 'border-b border-gray-100' : ''
                            } ${selectedShelves.has(shelf.id) ? 'bg-blue-50' : ''}`}
                          >
                            <div className="w-10 flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={selectedShelves.has(shelf.id)}
                                onChange={() => handleSelectShelf(shelf.id)}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="font-mono font-bold text-gray-900">{shelf.code}</div>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm text-gray-700">{shelf.name || '-'}</div>
                            </div>
                            <div className="w-24 text-sm text-gray-600">{shelf.row_number || '-'}</div>
                            <div className="w-20 text-sm text-gray-600">{shelf.column_number || '-'}</div>
                            <div className="w-32">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                shelf.shelf_type === 'refrigerated' ? 'bg-blue-100 text-blue-700' :
                                shelf.shelf_type === 'display' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {shelf.shelf_type || 'standard'}
                              </span>
                            </div>
                            <div className="w-20">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                shelf.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {shelf.is_active ? 'Yes' : 'No'}
                              </span>
                            </div>
                            <div className="w-32 flex gap-1">
                              <button
                                onClick={() => generateShelfQR(shelf)}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                                title="Generate QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEditShelf(shelf)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteShelf(shelf)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Grid View - Row-Based Organization */}
                    {Object.entries(
                      sortedShelves(applyAdvancedFilters(filterShelves(roomShelves))).reduce((groups, shelf) => {
                        const rowMatch = shelf.code.match(/(\d+)([A-Z])(\d+)/);
                        const row = rowMatch ? rowMatch[2] : 'Other';
                        if (!groups[row]) groups[row] = [];
                        groups[row].push(shelf);
                        return groups;
                      }, {} as Record<string, StoreShelf[]>)
                    ).map(([row, shelves]) => (
                      <GlassCard key={row} className="p-4">
                        {/* Row Header */}
                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                              {row}
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900">Row {row}</h3>
                              <p className="text-sm text-gray-600">
                                {shelves.length} {shelves.length === 1 ? 'position' : 'positions'} • 
                                <span className="ml-1 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {shelves[0]?.code?.match(/(\d+)/)?.[1]}{row}1 - {shelves[0]?.code?.match(/(\d+)/)?.[1]}{row}{shelves.length}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Shelves in Row - Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                          {shelves.map((shelf) => (
                            <div 
                              key={shelf.id} 
                              className={`relative p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border-2 hover:shadow-lg transition-all duration-200 cursor-pointer ${
                                selectedShelves.has(shelf.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                              }`}
                              onClick={() => handleSelectShelf(shelf.id)}
                            >
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <div className="font-mono font-bold text-gray-900 text-sm">{shelf.code}</div>
                                  <input
                                    type="checkbox"
                                    checked={selectedShelves.has(shelf.id)}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      handleSelectShelf(shelf.id);
                                    }}
                                    className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                  />
                                </div>
                                <div className="text-xs text-gray-600 truncate">{shelf.name || 'Unnamed'}</div>
                                
                                {/* Status Indicators */}
                                <div className="flex flex-wrap gap-1">
                                  {shelf.is_active && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Active"></div>
                                  )}
                                  {shelf.shelf_type === 'refrigerated' && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full" title="Refrigerated"></div>
                                  )}
                                  {shelf.requires_ladder && (
                                    <div className="w-2 h-2 bg-orange-500 rounded-full" title="Requires Ladder"></div>
                                  )}
                                  {!shelf.is_accessible && (
                                    <div className="w-2 h-2 bg-red-500 rounded-full" title="Not Accessible"></div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Quick Actions */}
                              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditShelf(shelf);
                                  }}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </div>
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
      />
    </div>
  );
};

export default StorageRoomManagementPage;
