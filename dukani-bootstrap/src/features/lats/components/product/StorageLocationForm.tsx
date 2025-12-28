import React, { useState, useEffect } from 'react';
import { MapPin, LayoutGrid, Building, Package, X, Check, Search, Filter } from 'lucide-react';
import { storageRoomApi, StorageRoom } from '../../../settings/utils/storageRoomApi';
import { storeShelfApi, StoreShelf } from '../../../settings/utils/storeShelfApi';
import { storeLocationApi } from '../../../settings/utils/storeLocationApi';
import { useStorageLocationPicker } from '../storage/StorageLocationPickerProvider';

interface StorageLocationFormProps {
  formData: {
    storageRoomId: string;
    shelfId: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  currentErrors: Record<string, string>;
}

const StorageLocationForm: React.FC<StorageLocationFormProps> = ({
  formData,
  setFormData,
  currentErrors
}) => {
  const { open: openStoragePicker } = useStorageLocationPicker();
  const [storageRooms, setStorageRooms] = useState<StorageRoom[]>([]);
  const [allShelves, setAllShelves] = useState<Record<string, StoreShelf[]>>({});
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLetter, setSelectedLetter] = useState<string>('');

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

  // Set selected room when modal opens
  useEffect(() => {
    if (showModal) {
      setSelectedRoomId(formData.storageRoomId || storageRooms[0]?.id || '');
    }
  }, [showModal, formData.storageRoomId, storageRooms]);

  const loadStorageRooms = async () => {
    try {
      setLoading(true);
      const rooms = await storageRoomApi.getAll();
      setStorageRooms(rooms || []);
    } catch (error) {
      console.error('Error loading storage rooms:', error);
      setStorageRooms([]);
    } finally {
      setLoading(false);
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

  const handleShelfSelect = (roomId: string, shelfId: string) => {
    setFormData(prev => ({
      ...prev,
      storageRoomId: roomId,
      shelfId: shelfId
    }));
    setShowModal(false);
  };

  const getSelectedDisplay = () => {
    if (!formData.storageRoomId || !formData.shelfId) {
      return 'Select storage location';
    }

    const room = storageRooms.find(r => r.id === formData.storageRoomId);
    const shelf = allShelves[formData.storageRoomId]?.find(s => s.id === formData.shelfId);
    
    if (room && shelf) {
      return `${room.code} - ${shelf.code}`;
    }
    
    return 'Select storage location';
  };

  const getCurrentShelves = () => {
    const shelves = allShelves[selectedRoomId] || [];
    return shelves.filter(shelf => shelf && shelf.code).sort((a, b) => {
      // Safety check for name property
      const aName = a.name || a.code || '';
      const bName = b.name || b.code || '';
      
      // First sort by name (case-insensitive)
      const nameComparison = aName.toLowerCase().localeCompare(bName.toLowerCase());
      if (nameComparison !== 0) {
        return nameComparison;
      }
      // If names are the same, sort by ID for consistent ordering
      return a.id.localeCompare(b.id);
    });
  };

  const getRoomColor = (roomCode: string) => {
    // Safety check: ensure roomCode exists and is not empty
    if (!roomCode || roomCode.length === 0) {
      return { bg: 'bg-gray-500', hover: 'hover:bg-gray-600', border: 'border-gray-500', text: 'text-gray-600', bgLight: 'bg-gray-50' };
    }
    
    const firstLetter = roomCode.charAt(0).toUpperCase();
    const colors = {
      'A': { bg: 'bg-green-500', hover: 'hover:bg-green-600', border: 'border-green-500', text: 'text-green-600', bgLight: 'bg-green-50' },
      'B': { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', border: 'border-blue-500', text: 'text-blue-600', bgLight: 'bg-blue-50' },
      'C': { bg: 'bg-purple-500', hover: 'hover:bg-purple-600', border: 'border-purple-500', text: 'text-purple-600', bgLight: 'bg-purple-50' },
      'D': { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', border: 'border-orange-500', text: 'text-orange-600', bgLight: 'bg-orange-50' },
      'E': { bg: 'bg-red-500', hover: 'hover:bg-red-600', border: 'border-red-500', text: 'text-red-600', bgLight: 'bg-red-50' },
      'F': { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', border: 'border-indigo-500', text: 'text-indigo-600', bgLight: 'bg-indigo-50' },
      'G': { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', border: 'border-pink-500', text: 'text-pink-600', bgLight: 'bg-pink-50' },
      'H': { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-600', border: 'border-yellow-500', text: 'text-yellow-600', bgLight: 'bg-yellow-50' }
    };
    return colors[firstLetter as keyof typeof colors] || colors['A'];
  };

  const getShelfColor = (letter: string) => {
    // Letter-based background colors - Strong vibrant colors
    const getLetterBackgroundColor = (letter: string) => {
      const letterColors: { [key: string]: string } = {
        // Each letter gets a completely unique strong color - no repeats anywhere
        'A': 'bg-gradient-to-br from-blue-400 to-blue-500',
        'B': 'bg-gradient-to-br from-green-400 to-green-500',
        'C': 'bg-gradient-to-br from-purple-400 to-purple-500',
        'D': 'bg-gradient-to-br from-orange-400 to-orange-500',
        'E': 'bg-gradient-to-br from-red-400 to-red-500',
        'F': 'bg-gradient-to-br from-teal-400 to-teal-500',
        'G': 'bg-gradient-to-br from-pink-400 to-pink-500',
        'H': 'bg-gradient-to-br from-indigo-400 to-indigo-500',
        'I': 'bg-gradient-to-br from-emerald-400 to-emerald-500',
        'J': 'bg-gradient-to-br from-cyan-400 to-cyan-500',
        'K': 'bg-gradient-to-br from-lime-400 to-lime-500',
        'L': 'bg-gradient-to-br from-amber-400 to-amber-500',
        'M': 'bg-gradient-to-br from-rose-400 to-rose-500',
        'N': 'bg-gradient-to-br from-violet-400 to-violet-500',
        'O': 'bg-gradient-to-br from-sky-400 to-sky-500',
        'P': 'bg-gradient-to-br from-fuchsia-400 to-fuchsia-500',
        'Q': 'bg-gradient-to-br from-slate-400 to-slate-500',
        'R': 'bg-gradient-to-br from-zinc-400 to-zinc-500',
        'S': 'bg-gradient-to-br from-stone-400 to-stone-500',
        'T': 'bg-gradient-to-br from-neutral-400 to-neutral-500',
        'U': 'bg-gradient-to-br from-yellow-400 to-yellow-500',
        'V': 'bg-gradient-to-br from-orange-500 to-orange-600',
        'W': 'bg-gradient-to-br from-red-500 to-red-600',
        'X': 'bg-gradient-to-br from-pink-500 to-pink-600',
        'Y': 'bg-gradient-to-br from-purple-500 to-purple-600',
        'Z': 'bg-gradient-to-br from-indigo-500 to-indigo-600',
        // Numbers - Each gets a unique strong color from different families
        '0': 'bg-gradient-to-br from-gray-300 to-gray-400',
        '1': 'bg-gradient-to-br from-blue-600 to-blue-700',
        '2': 'bg-gradient-to-br from-green-600 to-green-700',
        '3': 'bg-gradient-to-br from-teal-600 to-teal-700',
        '4': 'bg-gradient-to-br from-cyan-600 to-cyan-700',
        '5': 'bg-gradient-to-br from-lime-600 to-lime-700',
        '6': 'bg-gradient-to-br from-amber-600 to-amber-700',
        '7': 'bg-gradient-to-br from-emerald-600 to-emerald-700',
        '8': 'bg-gradient-to-br from-rose-600 to-rose-700',
        '9': 'bg-gradient-to-br from-violet-600 to-violet-700'
      };
      return letterColors[letter] || 'bg-gradient-to-br from-gray-200 to-gray-300';
    };
    
    const columnColor = letter ? getLetterBackgroundColor(letter) : 'bg-gradient-to-br from-gray-200 to-gray-300';
    
    // Return color object for compatibility
    return { 
      bg: columnColor, 
      hover: columnColor, 
      border: 'border-gray-200', 
      text: 'text-white', 
      bgLight: columnColor 
    };
  };

  const getFilteredShelves = () => {
    let shelves = getCurrentShelves();
    
    // Filter by search term
    if (searchTerm) {
      shelves = shelves.filter(shelf => 
        shelf.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (shelf.name && shelf.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by selected letter
    if (selectedLetter) {
      shelves = shelves.filter(shelf => 
        shelf.code.toUpperCase().includes(selectedLetter)
      );
    }
    
    return shelves;
  };

  const getAvailableLetters = () => {
    const shelves = getCurrentShelves();
    const letters = new Set<string>();
    
    shelves.forEach(shelf => {
      const upperName = shelf.code.toUpperCase();
      for (let i = 0; i < upperName.length; i++) {
        const char = upperName[i];
        if (char >= 'A' && char <= 'Z') {
          letters.add(char);
          break;
        }
      }
    });
    
    return Array.from(letters).sort();
  };

  return (
    <div className="border-b border-gray-200 pb-4">
      <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <MapPin size={18} className="text-blue-600" />
        Storage Location
      </h3>
      
      {storageRooms.length === 0 && !loading && (
        <div className="mb-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-3 text-amber-800">
            <Package size={24} className="text-amber-600" />
            <div>
              <h4 className="font-semibold text-lg">No Storage Data Available</h4>
              <p className="text-sm text-amber-700 mt-1">
                You need to create storage rooms and shelves before adding products. 
                Go to <strong>Settings → Storage Management</strong> to set up your storage infrastructure.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Storage Location Button */}
      <div>
        <label className="block mb-2 text-sm font-medium text-gray-700">
          Storage Location (optional)
        </label>
        <button
          type="button"
          onClick={async () => {
            try {
              const result = await openStoragePicker();
              if (result) {
                setFormData((prev: any) => ({
                  ...prev,
                  storageRoomId: result.roomId,
                  shelfId: result.shelfId
                }));
              }
            } catch (error) {
              console.error('Error opening global storage picker:', error);
            }
          }}
          disabled={loading || storageRooms.length === 0}
          className={`relative w-full py-3 pl-10 pr-4 bg-white border-2 rounded text-left ${
            currentErrors.storageRoomId || currentErrors.shelfId
              ? 'border-red-500 focus:border-red-600' 
              : 'border-gray-300 focus:border-blue-500 hover:border-blue-400'
          } ${loading || storageRooms.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <span className={formData.storageRoomId && formData.shelfId ? 'text-gray-900 font-medium' : 'text-gray-500'}>
            {getSelectedDisplay()}
          </span>
          {formData.storageRoomId && formData.shelfId && (
            <Check className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" size={18} />
          )}
        </button>
        {(currentErrors.storageRoomId || currentErrors.shelfId) && (
          <p className="mt-1 text-sm text-red-600">
            {currentErrors.storageRoomId || currentErrors.shelfId}
          </p>
        )}
      </div>

      {/* Storage Location Modal */}
              {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-gray-700" />
                <h2 className="text-lg font-semibold text-gray-900">Select Storage Location</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Storage Room Tabs */}
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex overflow-x-auto px-4 py-2 gap-2">
                {storageRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoomId(room.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded font-medium text-sm ${
                      selectedRoomId === room.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Building size={14} />
                      <span>{room.name}</span>
                      <span className="text-xs opacity-75">({room.code})</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex gap-3">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search shelves..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                {/* Letter Filter */}
                <div className="flex gap-1">
                  {getAvailableLetters().map(letter => (
                    <button
                      key={letter}
                      onClick={() => setSelectedLetter(selectedLetter === letter ? '' : letter)}
                      className={`px-3 py-2 rounded font-medium text-sm ${
                        selectedLetter === letter
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                      }`}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Shelves Grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              {getFilteredShelves().length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                  {getFilteredShelves().map((shelf, index) => {
                    // Safety check: ensure shelf.code exists
                    if (!shelf || !shelf.code) {
                      return null;
                    }
                    
                    // Get current room to build complete cell number
                    const currentRoom = storageRooms.find(r => r.id === selectedRoomId);
                    const roomCode = currentRoom?.code || '';
                    
                    // Build complete cell number (e.g., "01A1")
                    const completeCellNumber = shelf.code.startsWith(roomCode) 
                      ? shelf.code 
                      : `${roomCode}${shelf.code}`;
                    
                    const isSelected = formData.storageRoomId === selectedRoomId && formData.shelfId === shelf.id;
                    const foundLetter = shelf.code.toUpperCase().match(/[A-Z]/)?.[0];
                    
                    // Simple color mapping for letters
                    const getLetterColor = (letter: string) => {
                      const colors: { [key: string]: string } = {
                        'A': 'bg-blue-500',
                        'B': 'bg-green-500',
                        'C': 'bg-purple-500',
                        'D': 'bg-orange-500',
                        'E': 'bg-red-500',
                        'F': 'bg-teal-500',
                        'G': 'bg-pink-500',
                        'H': 'bg-indigo-500',
                        'I': 'bg-emerald-500',
                        'J': 'bg-cyan-500',
                        'K': 'bg-lime-500',
                        'L': 'bg-amber-500',
                        'M': 'bg-rose-500',
                        'N': 'bg-violet-500',
                        'O': 'bg-sky-500',
                        'P': 'bg-fuchsia-500',
                        'Q': 'bg-slate-500',
                        'R': 'bg-zinc-500',
                        'S': 'bg-stone-500',
                        'T': 'bg-neutral-500',
                        'U': 'bg-yellow-500',
                        'V': 'bg-orange-600',
                        'W': 'bg-red-600',
                        'X': 'bg-pink-600',
                        'Y': 'bg-purple-600',
                        'Z': 'bg-indigo-600'
                      };
                      return colors[letter] || 'bg-gray-500';
                    };
                    
                    const bgColor = foundLetter ? getLetterColor(foundLetter) : 'bg-gray-500';
                    
                    return (
                      <button
                        key={shelf.id}
                        onClick={() => handleShelfSelect(selectedRoomId, shelf.id)}
                        className={`py-3 px-2 rounded border-2 font-bold text-center text-white text-sm ${
                          isSelected
                            ? `${bgColor} border-white ring-2 ring-blue-600`
                            : `${bgColor} border-transparent hover:border-white`
                        }`}
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
                    {searchTerm || selectedLetter 
                      ? 'Try adjusting your search or filter.'
                      : 'No shelves available in this room.'
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {getFilteredShelves().length} shelf{getFilteredShelves().length !== 1 ? 'ves' : ''} found
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StorageLocationForm;
