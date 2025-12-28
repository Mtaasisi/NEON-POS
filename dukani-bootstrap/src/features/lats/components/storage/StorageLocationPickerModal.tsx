import React from 'react';
import { X } from 'lucide-react';
import { StorageRoom } from '../../../settings/utils/storageRoomApi';
import { StoreShelf } from '../../../settings/utils/storeShelfApi';

interface StorageLocationPickerModalProps {
  isOpen: boolean;
  storageRooms: StorageRoom[];
  selectedRoomId: string;
  onChangeRoom: (roomId: string) => void;
  searchTerm: string;
  onChangeSearch: (value: string) => void;
  shelvesByRoom: Record<string, StoreShelf[]>;
  onSelect: (roomId: string, shelfId: string) => void;
  onClose: () => void;
}

const StorageLocationPickerModal: React.FC<StorageLocationPickerModalProps> = ({
  isOpen,
  storageRooms,
  selectedRoomId,
  onChangeRoom,
  searchTerm,
  onChangeSearch,
  shelvesByRoom,
  onSelect,
  onClose
}) => {
  if (!isOpen) return null;

  const getFilteredShelves = (): StoreShelf[] => {
    if (!selectedRoomId) return [];
    const shelves = shelvesByRoom[selectedRoomId] || [];
    if (!searchTerm.trim()) return shelves;
    const query = searchTerm.toLowerCase();
    return shelves.filter((shelf) => {
      return (
        shelf.code.toLowerCase().includes(query) ||
        (shelf.name && shelf.name.toLowerCase().includes(query)) ||
        (shelf.row_number && shelf.row_number.toString().includes(query)) ||
        (shelf.column_number && shelf.column_number.toString().includes(query))
      );
    });
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h4 className="text-lg font-bold text-gray-900">Select Storage Location</h4>
            <p className="text-sm text-gray-500">Choose a storage room and shelf position.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row">
          <div className="md:w-72 border-b md:border-b-0 md:border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => onChangeSearch(e.target.value)}
                placeholder="Search shelves, codes, rows..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              {storageRooms.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No storage rooms found.</div>
              ) : (
                storageRooms.map((room) => {
                  const isActive = selectedRoomId === room.id;
                  return (
                    <button
                      key={room.id}
                      onClick={() => onChangeRoom(room.id)}
                      className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${
                        isActive
                          ? 'border-orange-500 bg-orange-50 text-orange-700 font-semibold'
                          : 'border-transparent hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="text-sm">{room.name || room.code}</div>
                      <div className="text-xs text-gray-500">
                        Floor {room.floor_level} • {room.code}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex-1">
            <div className="p-4">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">
                {selectedRoomId
                  ? `Shelves in ${storageRooms.find((room) => room.id === selectedRoomId)?.name || 'selected room'}`
                  : 'Select a storage room'}
              </h5>

              <div className="max-h-[320px] overflow-y-auto border border-gray-100 rounded-xl p-3 bg-gray-50">
                {selectedRoomId ? (
                  (() => {
                    const shelves = getFilteredShelves();
                    if (shelves.length === 0) {
                      return (
                        <div className="py-12 text-center text-sm text-gray-500">
                          No shelves found. Adjust your search.
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {shelves.map((shelf) => (
                          <button
                            key={shelf.id}
                            onClick={() => onSelect(selectedRoomId, shelf.id)}
                            className="p-4 rounded-xl bg-white border border-gray-200 hover:border-orange-300 hover:shadow-md text-left transition-all"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-900">{shelf.code}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                                {shelf.shelf_type}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{shelf.name || 'No name'}</p>
                            <div className="text-xs text-gray-400">
                              Row {shelf.row_number || '-'} • Column {shelf.column_number || '-'}
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="py-12 text-center text-sm text-gray-500">
                    Select a storage room to view shelves.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageLocationPickerModal;


