import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { storageRoomApi, StorageRoom } from '../../../settings/utils/storageRoomApi';
import { storeShelfApi, StoreShelf } from '../../../settings/utils/storeShelfApi';
import StorageLocationPickerModal from './StorageLocationPickerModal';

type PickerResult = {
  roomId: string;
  shelfId: string;
  label: string;
  room: StorageRoom;
  shelf: StoreShelf;
};

type OpenOptions = {
  initialRoomId?: string;
  search?: string;
};

interface StorageLocationPickerContextValue {
  open: (options?: OpenOptions) => Promise<PickerResult | null>;
  close: () => void;
}

const StorageLocationPickerContext = createContext<StorageLocationPickerContextValue | undefined>(undefined);

export const StorageLocationPickerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [storageRooms, setStorageRooms] = useState<StorageRoom[]>([]);
  const [allShelves, setAllShelves] = useState<Record<string, StoreShelf[]>>({});
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const resolverRef = useRef<((value: PickerResult | null) => void) | null>(null);

  const loadRoomsAndShelves = useCallback(async () => {
    try {
      const rooms = await storageRoomApi.getAll();
      setStorageRooms(rooms || []);
      const firstId = rooms?.[0]?.id || '';
      setSelectedRoomId((prev) => prev || firstId);

      const shelvesData: Record<string, StoreShelf[]> = {};
      for (const room of rooms) {
        const shelves = await storeShelfApi.getShelvesByStorageRoom(room.id);
        shelvesData[room.id] = shelves || [];
      }
      setAllShelves(shelvesData);
    } catch (error) {
      console.error('Failed to load storage rooms or shelves:', error);
      setStorageRooms([]);
      setAllShelves({});
    }
  }, []);

  const open = useCallback(
    async (options?: OpenOptions) => {
      await loadRoomsAndShelves();
      if (options?.initialRoomId) {
        setSelectedRoomId(options.initialRoomId);
      }
      if (options?.search) {
        setSearchTerm(options.search);
      } else {
        setSearchTerm('');
      }
      setIsOpen(true);
      return new Promise<PickerResult | null>((resolve) => {
        resolverRef.current = resolve;
      });
    },
    [loadRoomsAndShelves]
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setSearchTerm('');
    if (resolverRef.current) {
      resolverRef.current(null);
      resolverRef.current = null;
    }
  }, []);

  const handleSelect = useCallback(
    (roomId: string, shelfId: string) => {
      const room = storageRooms.find((r) => r.id === roomId);
      const shelf = allShelves[roomId]?.find((s) => s.id === shelfId);
      if (!room || !shelf) {
        return;
      }
      const labelParts = [room.code || room.name, shelf.code || shelf.name].filter(Boolean);
      const label = labelParts.join(' • ');

      const result: PickerResult = {
        roomId,
        shelfId,
        label,
        room,
        shelf
      };
      if (resolverRef.current) {
        resolverRef.current(result);
        resolverRef.current = null;
      }
      setIsOpen(false);
      setSearchTerm('');
    },
    [allShelves, storageRooms]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <StorageLocationPickerContext.Provider value={{ open, close }}>
      {children}
      <StorageLocationPickerModal
        isOpen={isOpen}
        storageRooms={storageRooms}
        selectedRoomId={selectedRoomId}
        onChangeRoom={setSelectedRoomId}
        searchTerm={searchTerm}
        onChangeSearch={setSearchTerm}
        shelvesByRoom={allShelves}
        onSelect={handleSelect}
        onClose={close}
      />
    </StorageLocationPickerContext.Provider>
  );
};

export const useStorageLocationPicker = (): StorageLocationPickerContextValue => {
  const ctx = useContext(StorageLocationPickerContext);
  if (!ctx) {
    throw new Error('useStorageLocationPicker must be used within StorageLocationPickerProvider');
  }
  return ctx;
};


