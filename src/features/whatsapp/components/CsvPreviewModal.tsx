import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Trash2, Filter, Trash, FileSpreadsheet, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Recipient {
  phone: string;
  name?: string;
}

interface Props {
  isOpen: boolean;
  recipients: Recipient[];
  existingPhones?: string[]; // phones already selected/in system to detect duplicates
  blacklistPhones?: string[]; // optional blocked numbers
  isUploading?: boolean; // indicates if CSV is being uploaded/parsed
  onClose: () => void;
  onConfirm: (selectedPhones: string[]) => void;
}

type Row = {
  id: string;
  phone: string;
  name?: string;
  valid: boolean;
  duplicate: boolean;
  blacklisted: boolean;
};

const phoneIsValid = (phone: string) => {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.length >= 10 && /^\+?\d{10,15}$/.test(cleaned);
};

type FilterType = 'all' | 'duplicates' | 'no-duplicates';

const CsvPreviewModal: React.FC<Props> = ({ isOpen, recipients, existingPhones = [], blacklistPhones = [], isUploading = false, onClose, onConfirm }) => {
  const [isConfirming, setIsConfirming] = React.useState(false);

  // Helper to check if a row is the first occurrence (original) in its phone group
  const isOriginalInGroup = (row: Row, allRows: Row[]) => {
    const phoneRows = allRows.filter(r => r.phone === row.phone);
    return phoneRows.indexOf(row) === 0;
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Prevent scrolling on html element as well
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalBodyOverflow = document.body.style.overflow;

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      return () => {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.overflow = originalBodyOverflow;
      };
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);
  const [allRows, setAllRows] = React.useState<Row[]>([]);
  const [filter, setFilter] = React.useState<FilterType>('all');
  const [selectedSet, setSelectedSet] = React.useState<Set<string>>(new Set());

  // Build rows from recipients and compute initial flags
  React.useEffect(() => {
    const rows: Row[] = recipients.map((r, idx) => {
      const phone = (r.phone || '').toString().replace(/\s+/g, '');
      const valid = phoneIsValid(phone);
      const blacklisted = blacklistPhones.includes(phone);
      return {
        id: `${phone}-${idx}-${Math.random().toString(36).slice(2, 8)}`,
        phone,
        name: r.name,
        valid,
        duplicate: false, // will compute below
        blacklisted
      };
    });

    // mark duplicates (within file or against existingPhones)
    const counts = new Map<string, number>();
    rows.forEach(row => counts.set(row.phone, (counts.get(row.phone) || 0) + 1));
    const updated = rows.map(row => ({
      ...row,
      duplicate: counts.get(row.phone)! > 1 || existingPhones.includes(row.phone)
    }));

    setAllRows(updated);
    setSelectedSet(new Set(updated.map(r => r.phone)));
  }, [recipients, isOpen, existingPhones, blacklistPhones]);

  // Filter rows based on selected filter
  const visibleRows = React.useMemo(() => {
    switch (filter) {
      case 'duplicates':
        // Group duplicates with their originals
        const groupedMap = new Map<string, Row[]>();
        allRows.forEach(row => {
          if (!groupedMap.has(row.phone)) {
            groupedMap.set(row.phone, []);
          }
          groupedMap.get(row.phone)!.push(row);
        });

        const groupedRows: Row[] = [];
        groupedMap.forEach((rows, phone) => {
          if (rows.length > 1 || existingPhones.includes(phone)) {
            // Add all occurrences of this phone number
            rows.forEach(row => groupedRows.push(row));
          }
        });
        return groupedRows;
      case 'no-duplicates':
        return allRows.filter(row => !row.duplicate);
      default:
        return allRows;
    }
  }, [allRows, filter, existingPhones]);

  const toggleSelect = (phone: string) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone); else next.add(phone);
      return next;
    });
  };

  const selectAll = (value: boolean) => {
    if (value) {
      // Select all visible rows in current filter
      setSelectedSet(new Set(visibleRows.map(r => r.phone)));
    } else {
      setSelectedSet(new Set());
    }
  };

  const removeRecipient = (phone: string) => {
    setAllRows(prev => prev.filter(r => r.phone !== phone));
    setSelectedSet(prev => {
      const next = new Set(prev);
      next.delete(phone);
      return next;
    });
  };

  const updateRow = (id: string, patch: Partial<Row>) => {
    setAllRows(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...patch } : r);
      // If phone changed, update selection set to use new phone instead of old
      const oldRow = prev.find(r => r.id === id);
      const newRow = next.find(r => r.id === id);
      if (oldRow && newRow && oldRow.phone !== newRow.phone) {
        setSelectedSet(prevSel => {
          const nextSel = new Set(prevSel);
          // remove old phone, add new if present
          if (nextSel.has(oldRow.phone)) nextSel.delete(oldRow.phone);
          if (newRow.phone) nextSel.add(newRow.phone);
          return nextSel;
        });
      }
      // recompute duplicates after edits
      const counts = new Map<string, number>();
      next.forEach(row => counts.set(row.phone, (counts.get(row.phone) || 0) + 1));
      return next.map(row => ({
        ...row,
        duplicate: counts.get(row.phone)! > 1 || existingPhones.includes(row.phone),
        valid: phoneIsValid(row.phone),
        blacklisted: blacklistPhones.includes(row.phone)
      }));
    });
  };

  const removeDuplicates = () => {
    setAllRows(prev => prev.filter(row => !row.duplicate));
    toast.success('Duplicate recipients removed');
  };

  const handleConfirm = async () => {
    if (selectedSet.size === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    setIsConfirming(true);

    try {
      const selectedPhones = Array.from(selectedSet);
      // filter out invalid, blacklisted, and duplicate phones automatically and inform user
      const rowsByPhone = new Map(allRows.map(r => [r.phone, r]));
      const validPhones: string[] = [];
      const invalidPhones: string[] = [];
      const blacklisted: string[] = [];
      const duplicates: string[] = [];

      selectedPhones.forEach(p => {
        const row = rowsByPhone.get(p);
        if (!row) return;
        if (row.blacklisted) blacklisted.push(p);
        else if (!row.valid) invalidPhones.push(p);
        else if (row.duplicate) duplicates.push(p); // Automatically filter out duplicates
        else validPhones.push(p);
      });

      if (blacklisted.length > 0) {
        toast.error(`${blacklisted.length} blocked number(s) were excluded`);
      }
      if (invalidPhones.length > 0) {
        toast.error(`${invalidPhones.length} invalid phone(s) were excluded`);
      }
      if (duplicates.length > 0) {
        toast.success(`${duplicates.length} duplicate number(s) were automatically filtered out`);
      }

      if (validPhones.length === 0) {
        toast.error('No valid recipients to add after automatic filtering');
        return;
      }

      await onConfirm(validPhones);
      onClose();
    } catch (error) {
      console.error('Error confirming recipients:', error);
      toast.error('Failed to add recipients. Please try again.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed bg-black/60 flex items-center justify-center p-4 z-[99999]"
      style={{
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        overscrollBehavior: 'none'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-preview-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden relative"
        style={{ pointerEvents: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={isConfirming}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-lg z-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon Header - Fixed */}
        <div className="p-8 bg-gradient-to-r from-white to-blue-50 border-b border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-[auto,1fr] gap-6 items-center">
            {/* Icon */}
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <FileSpreadsheet className="w-8 h-8 text-white" />
            </div>

            {/* Text */}
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2" id="csv-preview-title">
                CSV Recipients Preview
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Review and manage your imported recipients in a structured table format. Use filters to focus on duplicates or clean entries.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{allRows.filter(r => !r.duplicate).length} Clean</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>{allRows.filter(r => r.duplicate).length} Duplicates</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>{allRows.filter(r => r.blacklisted).length} Blocked</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Controls - Fixed */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Filter className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-900">Filter Recipients:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    disabled={isConfirming}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      filter === 'all'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-blue-300'
                    }`}
                  >
                    All ({allRows.length})
                  </button>
                  <button
                    onClick={() => setFilter('duplicates')}
                    disabled={isConfirming}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      filter === 'duplicates'
                        ? 'bg-yellow-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-yellow-300'
                    }`}
                  >
                    Duplicates ({allRows.filter(r => r.duplicate).length})
                  </button>
                  <button
                    onClick={() => setFilter('no-duplicates')}
                    disabled={isConfirming}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      filter === 'no-duplicates'
                        ? 'bg-green-600 text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-green-300'
                    }`}
                  >
                    Clean ({allRows.filter(r => !r.duplicate).length})
                  </button>
                </div>
              </div>
            </div>

            {/* Remove Duplicates Button */}
            {allRows.some(r => r.duplicate) && (
              <button
                onClick={removeDuplicates}
                disabled={isConfirming}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                title="Remove all duplicate recipients"
              >
                <Trash className="w-4 h-4" />
                Remove Duplicates
              </button>
            )}
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Recipients Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              {visibleRows.length === 0 ? (
                <div className="p-8 text-center">
                  {isUploading ? (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent"></div>
                      </div>
                      <p className="text-blue-600 font-medium">Processing CSV file...</p>
                      <p className="text-sm text-gray-500 mt-1">
                        Parsing recipients and checking for duplicates
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium">No recipients found</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {filter === 'duplicates' ? 'No duplicate recipients in this view' :
                         filter === 'no-duplicates' ? 'All recipients have duplicates' :
                         'Upload a CSV file to get started'}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Table Header */}
                  <div className="grid grid-cols-[60px,2fr,2fr,1fr,80px] gap-4 p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={visibleRows.length > 0 && visibleRows.every(r => selectedSet.has(r.phone))}
                        onChange={(e) => selectAll(e.target.checked)}
                        disabled={isConfirming}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="text-sm text-gray-900 font-semibold">Name</div>
                    <div className="text-sm text-gray-900 font-semibold">Phone Number</div>
                    <div className="text-sm text-gray-900 font-semibold">Status</div>
                    <div className="text-sm text-gray-900 font-semibold text-center">Actions</div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200">
                    {visibleRows.map((r) => (
                      <div key={r.id} className="grid grid-cols-[60px,2fr,2fr,1fr,80px] gap-4 p-4 hover:bg-gray-50 transition-colors">
                        {/* Select Column */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedSet.has(r.phone)}
                            onChange={() => toggleSelect(r.phone)}
                            disabled={isConfirming}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Name Column */}
                        <div className="min-w-0">
                          <input
                            value={r.name || ''}
                            onChange={(e) => updateRow(r.id, { name: e.target.value })}
                            disabled={isConfirming}
                            placeholder="Enter name"
                            className="w-full text-sm font-medium text-gray-900 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent"
                          />
                        </div>

                        {/* Phone Column */}
                        <div className="min-w-0">
                          <input
                            value={r.phone}
                            onChange={(e) => updateRow(r.id, { phone: e.target.value })}
                            disabled={isConfirming}
                            placeholder="Enter phone number"
                            className="w-full text-sm font-mono text-gray-700 bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-transparent"
                          />
                        </div>

                        {/* Status Column */}
                        <div className="flex flex-wrap items-center gap-1">
                          {filter === 'duplicates' && r.duplicate && (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isOriginalInGroup(r, allRows)
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            }`}>
                              {isOriginalInGroup(r, allRows) ? 'Original' : 'Duplicate'}
                            </span>
                          )}
                          {filter !== 'duplicates' && r.blacklisted && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                              Blocked
                            </span>
                          )}
                          {filter !== 'duplicates' && r.duplicate && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
                              Duplicate
                            </span>
                          )}
                          {!r.valid && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              Invalid
                            </span>
                          )}
                          {r.valid && !r.duplicate && !r.blacklisted && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Valid
                            </span>
                          )}
                        </div>

                        {/* Actions Column */}
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => removeRecipient(r.phone)}
                            disabled={isConfirming}
                            className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            title="Remove recipient"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - Fixed Footer */}
        <div className="flex gap-4 pt-6 border-t border-gray-200 flex-shrink-0 bg-gradient-to-r from-gray-50 to-blue-50 px-8 pb-8">
          {/* Stats Summary */}
          <div className="flex-1 flex items-center gap-6">
            <div className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selectedSet.size}</span> of{' '}
              <span className="font-semibold text-gray-900">{visibleRows.length}</span> recipients selected
            </div>
            {selectedSet.size > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Ready to add</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isConfirming}
              className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming || selectedSet.size === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[140px]"
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Adding Recipients...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Confirm & Add ({selectedSet.size})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CsvPreviewModal;


