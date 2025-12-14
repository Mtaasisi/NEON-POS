import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, LayoutGrid, MapPin, AlertCircle } from 'lucide-react';
import { StoreShelf, CreateStoreShelfData, storeShelfApi } from '../../../settings/utils/storeShelfApi';
import { StorageRoom } from '../../../settings/utils/storageRoomApi';

interface ShelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  shelf?: StoreShelf | null;
  storageRoom?: StorageRoom | null;
  onSave: (shelf: CreateStoreShelfData) => void;
  preSelectedRow?: string; // Row letter like "A", "B", etc.
}

const ShelfModal: React.FC<ShelfModalProps> = ({ 
  isOpen, 
  onClose, 
  shelf, 
  storageRoom,
  onSave,
  preSelectedRow
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    shelf_type: 'standard' as 'standard' | 'refrigerated' | 'display' | 'storage' | 'specialty',
    start_row: 1,
    end_row: 1,
    start_column: 1,
    end_column: 1,
    row_number: 1, // For editing mode
    column_number: 1, // For editing mode
    max_capacity: '',
    zone: 'center' as 'center' | 'front' | 'back' | 'left' | 'right',
    description: '',
    is_accessible: true,
    requires_ladder: false,
    is_refrigerated: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingShelves, setExistingShelves] = useState<StoreShelf[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // Load existing shelves when modal opens
  useEffect(() => {
    if (isOpen && storageRoom) {
      loadExistingShelves();
    }
  }, [isOpen, storageRoom?.id]);

  const loadExistingShelves = async () => {
    if (!storageRoom) return;
    
    try {
      setLoadingExisting(true);
      const shelves = await storeShelfApi.getShelvesByStorageRoom(storageRoom.id);
      setExistingShelves(shelves);
      console.log('📦 Loaded existing shelves:', shelves.length, shelves.map(s => s.code));
    } catch (error) {
      console.error('Error loading existing shelves:', error);
    } finally {
      setLoadingExisting(false);
    }
  };

  // Calculate next available position
  const getNextAvailablePosition = () => {
    if (existingShelves.length === 0) {
      return { startRow: 1, endRow: 1, startCol: 1, endCol: 1, code: 'A1' };
    }

    // Find the highest row and column used
    let maxRow = 0;
    let maxCol = 0;
    existingShelves.forEach(shelf => {
      const match = shelf.code.match(/([A-Z])(\d+)/);
      if (match) {
        const rowNum = match[1].charCodeAt(0) - 64; // A=1, B=2, etc.
        const colNum = parseInt(match[2]);
        if (rowNum > maxRow) maxRow = rowNum;
        if (colNum > maxCol) maxCol = colNum;
      }
    });

    // Suggest starting from next row
    const nextStartRow = maxRow + 1;
    const rowLetter = String.fromCharCode(64 + nextStartRow);
    
    return { 
      startRow: nextStartRow, 
      endRow: nextStartRow,
      startCol: 1, 
      endCol: 1,
      code: `${rowLetter}1` 
    };
  };

  useEffect(() => {
    if (isOpen) {
      if (shelf) {
        setFormData({
          name: shelf.name,
          code: shelf.code,
          shelf_type: shelf.shelf_type,
          start_row: shelf.row_number || 1,
          end_row: shelf.row_number || 1,
          start_column: shelf.column_number || 1,
          end_column: shelf.column_number || 1,
          row_number: shelf.row_number || 1,
          column_number: shelf.column_number || 1,
          max_capacity: shelf.max_capacity?.toString() || '',
          zone: shelf.zone || 'center',
          description: shelf.description || '',
          is_accessible: shelf.is_accessible,
          requires_ladder: shelf.requires_ladder,
          is_refrigerated: shelf.is_refrigerated
        });
      } else {
        // Suggest next available position for new shelves
        const nextPos = getNextAvailablePosition();
        setFormData({
          name: '',
          code: nextPos.code,
          shelf_type: 'standard',
          start_row: nextPos.startRow,
          end_row: nextPos.endRow,
          start_column: nextPos.startCol,
          end_column: nextPos.endCol,
          row_number: 1,
          column_number: 1,
          max_capacity: '',
          zone: 'center',
          description: '',
          is_accessible: true,
          requires_ladder: false,
          is_refrigerated: false
        });
      }
    }
  }, [isOpen, shelf?.id, existingShelves, preSelectedRow]);

  // Check if code already exists
  const isCodeDuplicate = (code: string) => {
    if (shelf) return false; // Skip check if editing existing shelf
    return existingShelves.some(s => s.code.toLowerCase() === code.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storageRoom) {
      toast.error('Storage room is required');
      return;
    }

    setIsSubmitting(true);

    try {
      if (shelf) {
        // EDIT MODE - Update single shelf
        const trimmedName = formData.name.trim();
        const trimmedCode = formData.code.trim();
        
        const shelfData: CreateStoreShelfData = {
          store_location_id: storageRoom.store_location_id,
          storage_room_id: storageRoom.id,
          name: trimmedName || trimmedCode,
          code: trimmedCode,
          shelf_type: formData.shelf_type,
          row_number: formData.row_number,
          column_number: formData.column_number,
          floor_level: storageRoom?.floor_level || 1,
          zone: formData.zone,
          is_active: true,
          is_accessible: formData.is_accessible,
          requires_ladder: formData.requires_ladder,
          is_refrigerated: formData.is_refrigerated,
          priority_order: 0
        };

        if (formData.description && formData.description.trim()) {
          shelfData.description = formData.description.trim();
        }
        
        if (formData.max_capacity && parseInt(formData.max_capacity) > 0) {
          shelfData.max_capacity = parseInt(formData.max_capacity);
        }

        await onSave(shelfData);
      } else {
        // CREATE MODE - Create ALL shelves in the specified range
        const startRow = formData.start_row || 1;
        const endRow = formData.end_row || 1;
        const startCol = formData.start_column || 1;
        const endCol = formData.end_column || 1;
        
        const totalRows = endRow - startRow + 1;
        const totalCols = endCol - startCol + 1;
        const totalShelves = totalRows * totalCols;

        const firstRowLetter = String.fromCharCode(64 + startRow);
        const lastRowLetter = String.fromCharCode(64 + endRow);
        console.log(`📦 Creating ${totalShelves} shelves (${firstRowLetter}${startCol} to ${lastRowLetter}${endCol})...`);

        let createdCount = 0;
        let skippedCount = 0;
        const skippedCodes: string[] = [];

        // Create all shelves in the specified range
        for (let row = startRow; row <= endRow; row++) {
          for (let col = startCol; col <= endCol; col++) {
            const rowLetter = String.fromCharCode(64 + row); // A, B, C...
            const positionCode = `${rowLetter}${col}`; // A1, A2, B1, etc.
            const shelfCode = storageRoom.code ? `${storageRoom.code}${rowLetter}${col}` : positionCode; // 01A1, 01A2, etc.
            
            // Skip if already exists
            if (existingShelves.some(s => s.code === shelfCode)) {
              console.log(`⚠️ Skipping ${shelfCode} - already exists`);
              skippedCount++;
              skippedCodes.push(shelfCode);
              continue;
            }

            const shelfData: CreateStoreShelfData = {
              store_location_id: storageRoom.store_location_id,
              storage_room_id: storageRoom.id,
              name: shelfCode, // Full code as name
              code: shelfCode, // Full code: 01A1, 01A2, etc.
              shelf_type: formData.shelf_type,
              row_number: row,
              column_number: col,
              floor_level: storageRoom?.floor_level || 1,
              zone: formData.zone,
              is_active: true,
              is_accessible: formData.is_accessible,
              requires_ladder: formData.requires_ladder,
              is_refrigerated: formData.is_refrigerated,
              priority_order: (row - startRow) * totalCols + (col - startCol)
            };

            if (formData.max_capacity && parseInt(formData.max_capacity) > 0) {
              shelfData.max_capacity = parseInt(formData.max_capacity);
            }

            try {
              await onSave(shelfData);
              createdCount++;
              console.log(`✅ Created shelf: ${shelfCode}`);
            } catch (error) {
              console.error(`❌ Failed to create ${shelfCode}:`, error);
            }
          }
        }

        // Show summary
        if (createdCount > 0) {
          const roomCode = storageRoom.code || '';
          const firstFullCode = `${roomCode}${firstRowLetter}${startCol}`;
          const lastFullCode = `${roomCode}${lastRowLetter}${endCol}`;
          const range = `${firstFullCode} to ${lastFullCode}`;
          toast.success(`✅ Created ${createdCount} shelves (${range})!${skippedCount > 0 ? ` Skipped ${skippedCount} existing.` : ''}`);
        } else if (skippedCount > 0) {
          toast.error(`All ${skippedCount} shelves already exist. No new shelves created.`);
        }
      }
    } catch (error) {
      console.error('Error saving shelf:', error);
      toast.error('Failed to save shelf');
    } finally {
      setIsSubmitting(false);
    }
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
        <div 
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
          style={{ pointerEvents: 'auto' }}
        >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {shelf ? 'Edit Shelf' : 'Create Shelves Grid'}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {shelf 
                  ? `${storageRoom?.name} (${storageRoom?.code})`
                  : `Create all shelves at once • ${storageRoom?.name}`
                }
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
            {/* Shelf Code & Name - Only show when editing */}
            {shelf && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shelf Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                    placeholder="e.g., A1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shelf Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}

            {/* Simple Row & Column Count with +/- Buttons */}
            {!shelf ? (
              // Grid Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                      How Many Rows?
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={26}
                        value={formData.end_row - formData.start_row + 1}
                        onChange={(e) => {
                          const numRows = Math.max(1, Math.min(26, parseInt(e.target.value) || 1));
                          const nextPos = getNextAvailablePosition();
                          setFormData({ 
                            ...formData, 
                            start_row: nextPos.startRow,
                            end_row: nextPos.startRow + numRows - 1
                          });
                        }}
                        className="w-full py-4 px-16 border-2 border-gray-200 rounded-lg text-center text-2xl font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="1"
                      />
                      
                      {/* Minus button */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentRows = formData.end_row - formData.start_row + 1;
                          const newRows = Math.max(1, currentRows - 1);
                          const nextPos = getNextAvailablePosition();
                          setFormData({ 
                            ...formData, 
                            start_row: nextPos.startRow,
                            end_row: nextPos.startRow + newRows - 1
                          });
                        }}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold transition-colors"
                      >
                        −
                      </button>
                      
                      {/* Plus button */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentRows = formData.end_row - formData.start_row + 1;
                          const newRows = Math.min(26, currentRows + 1);
                          const nextPos = getNextAvailablePosition();
                          setFormData({ 
                            ...formData, 
                            start_row: nextPos.startRow,
                            end_row: nextPos.startRow + newRows - 1
                          });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center text-2xl font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                      Starting from Row {String.fromCharCode(64 + (formData.start_row || 1))}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                      How Many Columns?
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={formData.end_column - formData.start_column + 1}
                        onChange={(e) => {
                          const numCols = Math.max(1, Math.min(50, parseInt(e.target.value) || 1));
                          setFormData({ 
                            ...formData,
                            start_column: 1,
                            end_column: numCols
                          });
                        }}
                        className="w-full py-4 px-16 border-2 border-gray-200 rounded-lg text-center text-2xl font-bold text-gray-900 focus:outline-none focus:border-purple-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="1"
                      />
                      
                      {/* Minus button */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentCols = formData.end_column - formData.start_column + 1;
                          const newCols = Math.max(1, currentCols - 1);
                          setFormData({ 
                            ...formData,
                            start_column: 1,
                            end_column: newCols
                          });
                        }}
                        className="absolute left-1 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-500 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center text-2xl font-bold transition-colors"
                      >
                        −
                      </button>
                      
                      {/* Plus button */}
                      <button
                        type="button"
                        onClick={() => {
                          const currentCols = formData.end_column - formData.start_column + 1;
                          const newCols = Math.min(50, currentCols + 1);
                          setFormData({ 
                            ...formData,
                            start_column: 1,
                            end_column: newCols
                          });
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-12 h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center text-2xl font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center font-medium">
                      Columns 1 to {formData.end_column}
                    </p>
                  </div>
                </div>
                </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Row Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={formData.row_number}
                    onChange={(e) => setFormData({ ...formData, row_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Row {String.fromCharCode(64 + (formData.row_number || 1))}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Column Number
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={formData.column_number}
                    onChange={(e) => setFormData({ ...formData, column_number: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">Column {formData.column_number}</p>
                </div>
              </div>
            )}

            {/* Grid Draft Preview */}
            <div className="bg-white border-2 border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-purple-600" />
                  <h4 className="text-sm font-semibold text-gray-900">Grid Layout Preview</h4>
                </div>
                  <div className="bg-purple-100 px-3 py-1 rounded-full">
                    <span className="text-xs font-bold text-purple-900">
                      {(() => {
                        if (shelf) return formData.code;
                        const roomCode = storageRoom?.code || '';
                        const startRowLetter = String.fromCharCode(64 + formData.start_row);
                        const endRowLetter = String.fromCharCode(64 + formData.end_row);
                        const firstCode = `${roomCode}${startRowLetter}${formData.start_column}`;
                        const lastCode = `${roomCode}${endRowLetter}${formData.end_column}`;
                        return `${firstCode} → ${lastCode}`;
                      })()}
                    </span>
                  </div>
              </div>
              
              {/* Grid Display */}
              <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                <div className="inline-block">
                  {(() => {
                    // Get dynamic row and column ranges
                    const startRow = shelf ? 1 : (formData.start_row || 1);
                    const endRow = shelf ? (formData.row_number || 1) : (formData.end_row || 1);
                    const startCol = shelf ? 1 : (formData.start_column || 1);
                    const endCol = shelf ? (formData.column_number || 1) : (formData.end_column || 1);
                    
                    const rowsToShow = Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i);
                    const colsToShow = Array.from({ length: endCol - startCol + 1 }, (_, i) => startCol + i);
                    
                    return (
                      <>
                          {/* Column Headers */}
                          <div className="flex mb-2">
                            <div className="w-12"></div>
                            {colsToShow.map((col) => (
                              <div key={col} className="w-20 text-center text-xs font-medium text-gray-600">
                                Col {col}
                              </div>
                            ))}
                          </div>
                        
                        {/* Grid Rows */}
                        {rowsToShow.map((rowNum) => {
                          const rowLetter = String.fromCharCode(64 + rowNum);
                          return (
                            <div key={rowNum} className="flex items-center mb-2">
                              {/* Row Label */}
                              <div className="w-12 text-center">
                                <div className="inline-flex items-center justify-center w-8 h-8 bg-purple-600 text-white rounded font-bold text-sm">
                                  {rowLetter}
                                </div>
                              </div>
                              
                                {/* Row Cells */}
                                {colsToShow.map((colNum) => {
                                  const positionCode = `${rowLetter}${colNum}`; // A1, B2, etc.
                                  const fullShelfCode = storageRoom?.code ? `${storageRoom.code}${rowLetter}${colNum}` : positionCode; // 01A1, 01B2, etc.
                                  const existingShelf = existingShelves.find(s => s.code === fullShelfCode);
                                  const isOccupied = !!existingShelf && !shelf; // Show occupied only when creating new
                                  const willBeCreated = !isOccupied && !shelf; // New shelf will be created here
                                  const isEditingThis = shelf && rowNum === formData.row_number && colNum === formData.column_number;
                                  
                                  return (
                                    <div key={colNum} className="w-20 px-1">
                                      <div 
                                        className={`h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all ${
                                          isOccupied
                                            ? 'bg-gray-300 border-gray-400 cursor-not-allowed opacity-60'
                                            : willBeCreated || isEditingThis
                                            ? 'bg-purple-600 border-purple-700'
                                            : 'bg-white border-gray-300'
                                        }`}
                                        title={isOccupied ? `Already exists: ${existingShelf.code}` : `Will create: ${fullShelfCode}`}
                                      >
                                        <div className={`font-mono font-bold text-xs ${
                                          isOccupied ? 'text-gray-600' : (willBeCreated || isEditingThis) ? 'text-white' : 'text-gray-700'
                                        }`}>
                                          {fullShelfCode}
                                        </div>
                                        {(willBeCreated || isEditingThis) && (
                                          <div className="text-[10px] text-white font-medium mt-0.5">
                                            {isEditingThis ? 'EDIT' : 'NEW'}
                                          </div>
                                        )}
                                        {isOccupied && (
                                          <div className="text-[10px] text-gray-600 font-medium mt-0.5">
                                            TAKEN
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Max Capacity - for all modes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Capacity {!shelf && '(per shelf)'}
              </label>
              <input
                type="number"
                min={1}
                value={formData.max_capacity}
                onChange={(e) => setFormData({ ...formData, max_capacity: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                placeholder="Optional"
              />
              <p className="text-xs text-gray-500 mt-1">Maximum items each shelf can hold</p>
            </div>

            {/* Shelf Type & Zone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shelf Type
                </label>
                <select
                  value={formData.shelf_type}
                  onChange={(e) => setFormData({ ...formData, shelf_type: e.target.value as any })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                >
                  <option value="standard">Standard</option>
                  <option value="refrigerated">Refrigerated</option>
                  <option value="display">Display</option>
                  <option value="storage">Storage</option>
                  <option value="specialty">Specialty</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zone
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value as any })}
                    className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900"
                  >
                    <option value="center">Center</option>
                    <option value="front">Front</option>
                    <option value="back">Back</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description - Only for editing single shelf */}
            {shelf && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 transition-colors text-gray-900 resize-none"
                    placeholder="Optional description"
                  />
                </div>

                {/* Checkboxes */}
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <input
                      type="checkbox"
                      id="is_accessible"
                      checked={formData.is_accessible}
                      onChange={(e) => setFormData({ ...formData, is_accessible: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="is_accessible" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Easily accessible
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <input
                      type="checkbox"
                      id="requires_ladder"
                      checked={formData.requires_ladder}
                      onChange={(e) => setFormData({ ...formData, requires_ladder: e.target.checked })}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <label htmlFor="requires_ladder" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Requires ladder
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <input
                      type="checkbox"
                      id="is_refrigerated"
                      checked={formData.is_refrigerated}
                      onChange={(e) => setFormData({ ...formData, is_refrigerated: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_refrigerated" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Refrigerated shelf
                    </label>
                  </div>
                </div>
              </>
            )}
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
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : shelf ? (
                'Update Shelf'
              ) : (() => {
                const totalShelves = (formData.end_row - formData.start_row + 1) * (formData.end_column - formData.start_column + 1);
                return `Create ${totalShelves} Shelf${totalShelves !== 1 ? 'es' : ''}`;
              })()}
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default ShelfModal;
